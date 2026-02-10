import * as NearleyAST from "../nearley/types";
import {
  hasDegreeInUnits,
  UnitResolutionContext,
} from "../ast-helpers";
import { Temporal } from "@js-temporal/polyfill";
import type { EvaluatorDeps } from "./eval-helpers";
import { createError } from "./eval-helpers";
import type {
  Value,
  EvaluationContext,
} from "./values";
import {
  numVal,
  numValUnit,
  numValTerms,
} from "./values";
import {
  parseNumericalValue,
  resolveNearleyUnit,
  resolveCurrencyUnit,
  resolveNearleyUnitTerms,
} from "./unit-resolution";
import { convertTimeToDuration, durationToMilliseconds } from "./datetime";

/**
 * Evaluate a Value node (number with optional unit)
 */
export function evaluateValue(
  deps: EvaluatorDeps,
  expr: NearleyAST.ValueNode,
): Value {
  const numResult = parseNumericalValue(
    expr.value as NearleyAST.NumericalValueNode,
  );
  if (typeof numResult !== "number") return numResult; // ErrorValue
  const numValue = numResult;

  if (expr.unit === null) {
    return numVal(numValue);
  }

  const unitNode = expr.unit as
    | NearleyAST.UnitsNode
    | NearleyAST.CurrencyUnitNode;

  // Handle currency units
  if (unitNode.type === "CurrencyUnit") {
    const unit = resolveCurrencyUnit(deps, unitNode);
    if (!unit) {
      return createError(`Unknown currency: ${unitNode.name}`);
    }
    return numValUnit(numValue, unit);
  }

  // Handle UnitsNode
  const unitsNode = unitNode as NearleyAST.UnitsNode;

  // Check if it's a derived unit (multiple terms or exponent != 1)
  if (
    unitsNode.terms.length > 1 ||
    (unitsNode.terms.length === 1 && unitsNode.terms[0].exponent !== 1)
  ) {
    const terms = resolveNearleyUnitTerms(deps, unitsNode);
    if (!terms) {
      return createError(
        `Unknown unit "${unitsNode.terms.map((t) => t.unit.name).join(" ")}" in derived unit literal`,
      );
    }
    return numValTerms(numValue, terms);
  }

  // Simple unit
  const unit = resolveNearleyUnit(deps, unitNode);
  if (!unit) {
    return createError(
      `Unknown unit "${unitsNode.terms.map((t) => t.unit.name).join(" ")}" in literal`,
    );
  }

  // Auto-convert dimensionless units to pure numbers
  if (unit.dimension === "dimensionless") {
    const convertedValue = deps.unitConverter.toBaseUnit(numValue, unit);
    return numVal(convertedValue);
  }

  return numValUnit(numValue, unit);
}

/**
 * Evaluate a CompositeValue node (e.g., "5 ft 7 in")
 */
export function evaluateCompositeValue(
  deps: EvaluatorDeps,
  expr: NearleyAST.CompositeValueNode,
): Value {
  let hasDegreeUnit = false;
  const components: Array<{ value: number; unit: import("../types/types").Unit }> = [];

  const values = expr.values as NearleyAST.ValueNode[];
  for (const valueNode of values) {
    const numResult = parseNumericalValue(
      valueNode.value as NearleyAST.NumericalValueNode,
    );
    if (typeof numResult !== "number") return numResult;
    const numValue = numResult;

    if (valueNode.unit === null) {
      return createError("Composite value component must have a unit");
    }

    const unitNode = valueNode.unit as
      | NearleyAST.UnitsNode
      | NearleyAST.CurrencyUnitNode;
    const unitContext: UnitResolutionContext = { hasDegreeUnit };

    // Check for degree unit before resolving (for prime/doublePrime context)
    if (unitNode.type === "Units") {
      const unitsNode = unitNode as NearleyAST.UnitsNode;
      if (hasDegreeInUnits(unitsNode)) {
        hasDegreeUnit = true;
      }
    }

    const unit = resolveNearleyUnit(deps, unitNode, unitContext);
    if (!unit) {
      return createError(
        `Unknown unit "${(unitNode as NearleyAST.UnitsNode).terms.map((t) => t.unit.name).join(" ")}" in composite literal`,
      );
    }
    components.push({ value: numValue, unit });
  }

  return { kind: "composite", components };
}

/**
 * Evaluate a Variable node
 */
export function evaluateVariable(
  deps: EvaluatorDeps,
  expr: NearleyAST.VariableNode,
  context: EvaluationContext,
): Value {
  // Check for relative instant keywords first
  const relativeInstant = evaluateRelativeInstantKeyword(deps, expr.name);
  if (relativeInstant) {
    return relativeInstant;
  }

  // Try to look up as a variable
  const value = context.variables.get(expr.name);
  if (value !== undefined) {
    return value;
  }

  // If not found as variable, check if it's a unit name
  const unit = deps.dataLoader.getUnitByName(expr.name);
  if (unit) {
    return numValUnit(1, unit);
  }

  return createError(`Undefined variable: ${expr.name}`);
}

/**
 * Evaluate PlainDate node
 */
export function evaluatePlainDate(expr: NearleyAST.PlainDateNode): Value {
  return {
    kind: "plainDate",
    date: { year: expr.year, month: expr.month, day: expr.day },
  };
}

/**
 * Evaluate PlainTime node
 */
export function evaluatePlainTime(expr: NearleyAST.PlainTimeNode): Value {
  return {
    kind: "plainTime",
    time: {
      hour: expr.hour,
      minute: expr.minute,
      second: expr.second,
      millisecond: 0,
    },
  };
}

/**
 * Evaluate PlainDateTime node
 */
export function evaluatePlainDateTime(expr: NearleyAST.PlainDateTimeNode): Value {
  const date = expr.date as NearleyAST.PlainDateNode;
  const time = expr.time as NearleyAST.PlainTimeNode;
  return {
    kind: "plainDateTime",
    dateTime: {
      date: { year: date.year, month: date.month, day: date.day },
      time: {
        hour: time.hour,
        minute: time.minute,
        second: time.second,
        millisecond: 0,
      },
    },
  };
}

/**
 * Evaluate Instant node (keyword like 'now' or relative like '2 days ago')
 */
export function evaluateInstant(
  deps: EvaluatorDeps,
  expr: NearleyAST.InstantNode,
): Value {
  // Keyword instant (now, today, yesterday, tomorrow)
  if ("keyword" in expr) {
    const keywordExpr = expr as NearleyAST.InstantKeywordNode;
    const result = evaluateRelativeInstantKeyword(deps, keywordExpr.keyword);
    if (result) return result;
    return createError(
      `Unknown instant keyword: ${keywordExpr.keyword}`,
    );
  }

  // Relative instant (e.g., "2 days ago", "5 minutes from now")
  const relativeExpr = expr as NearleyAST.InstantRelativeNode;
  const numResult = parseNumericalValue(
    relativeExpr.amount as NearleyAST.NumericalValueNode,
  );
  if (typeof numResult !== "number") return numResult;
  const numValue = numResult;

  // Resolve the time unit
  const timeUnit = deps.dataLoader.getUnitByName(relativeExpr.unit);
  if (!timeUnit) {
    return createError(`Unknown time unit: ${relativeExpr.unit}`);
  }

  const duration = convertTimeToDuration(deps, numValue, timeUnit);
  const now = deps.dateTimeEngine.getCurrentInstant();

  if (relativeExpr.direction === "sinceEpoch") {
    // "N units since epoch" → instant from epoch
    const durationMs = durationToMilliseconds(duration);
    return { kind: "instant", instant: { timestamp: durationMs } };
  }

  const result =
    relativeExpr.direction === "ago"
      ? deps.dateTimeEngine.subtractFromInstant(now, duration)
      : deps.dateTimeEngine.addToInstant(now, duration);

  return { kind: "instant", instant: result };
}

/**
 * Evaluate ZonedDateTime node
 */
export function evaluateZonedDateTime(
  deps: EvaluatorDeps,
  expr: NearleyAST.ZonedDateTimeNode,
): Value {
  const dateTime = expr.dateTime as NearleyAST.PlainDateTimeNode;
  const date = dateTime.date as NearleyAST.PlainDateNode | null;
  const time = dateTime.time as NearleyAST.PlainTimeNode;
  const tz = expr.timezone as NearleyAST.TimezoneNode;

  // Resolve timezone: TimezoneName through DataLoader, UTCOffset uses offsetStr
  const rawTimezone =
    tz.type === "TimezoneName"
      ? tz.zoneName
      : (tz as NearleyAST.UTCOffsetNode).offsetStr;
  const timezone =
    deps.dataLoader.resolveTimezone(rawTimezone) || rawTimezone;

  // Handle time-only ZonedDateTime (no date component, e.g., "12:30 UTC")
  if (!date) {
    // Use today's date in the specified timezone
    const now = Temporal.Now.zonedDateTimeISO(timezone);
    return {
      kind: "zonedDateTime",
      zonedDateTime: {
        dateTime: {
          date: { year: now.year, month: now.month, day: now.day },
          time: {
            hour: time.hour,
            minute: time.minute,
            second: time.second,
            millisecond: 0,
          },
        },
        timezone,
      },
    };
  }

  return {
    kind: "zonedDateTime",
    zonedDateTime: {
      dateTime: {
        date: { year: date.year, month: date.month, day: date.day },
        time: {
          hour: time.hour,
          minute: time.minute,
          second: time.second,
          millisecond: 0,
        },
      },
      timezone,
    },
  };
}

/**
 * Evaluate relative instant keywords (now, today, tomorrow, yesterday)
 * Returns null if not a relative instant keyword
 */
export function evaluateRelativeInstantKeyword(
  deps: EvaluatorDeps,
  name: string,
): Value | null {
  const lowerName = name.toLowerCase();

  switch (lowerName) {
    case "now":
    case "today": {
      const instant = deps.dateTimeEngine.getCurrentInstant();
      return { kind: "instant", instant };
    }

    case "tomorrow": {
      const instant = deps.dateTimeEngine.getCurrentInstant();
      return {
        kind: "instant",
        instant: { timestamp: instant.timestamp + 86400000 },
      };
    }

    case "yesterday": {
      const instant = deps.dateTimeEngine.getCurrentInstant();
      return {
        kind: "instant",
        instant: { timestamp: instant.timestamp - 86400000 },
      };
    }

    default:
      return null;
  }
}

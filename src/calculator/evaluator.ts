import * as NearleyAST from "./nearley/types";
import { Document, ParsedLine } from "./document";
import { DataLoader } from "./data-loader";
import { UnitConverter, ConversionSettings } from "./unit-converter";
import {
  DateTimeEngine,
  Duration,
  PlainDate,
  PlainTime,
  PlainDateTime,
  Instant,
  ZonedDateTime,
  toTemporalZonedDateTime,
  toTemporalPlainDateTime,
  toTemporalPlainDate,
  toTemporalInstant,
} from "./date-time";
import { CurrencyConverter, CurrencyValue } from "./currency";
import { MathFunctions } from "./functions";
import type { Unit } from "./types/types";
import { getConstant } from "./constants";
import { Temporal } from "@js-temporal/polyfill";
import {
  resolveUnitFromNode,
  isDegreeUnit,
  hasDegreeInUnits,
  UnitResolutionContext,
} from "./ast-helpers";
import { SUPERSCRIPTS } from "@/constants";

/**
 * Presentation format strings
 * Defines the valid string formats for value presentation/conversion.
 */
export type PresentationFormat =
  | "binary"
  | "bin"
  | "octal"
  | "oct"
  | "decimal"
  | "dec"
  | "hex"
  | "hexadecimal"
  | "fraction"
  | "scientific"
  | "ordinal"
  | "ISO 8601"
  | "RFC 9557"
  | "RFC 2822"
  | "unix"
  | "unixMilliseconds";

/**
 * Runtime value types
 * These represent actual evaluated values (not just types)
 */

export type Value =
  | NumberValue
  | DerivedUnitValue
  | CompositeUnitValue
  | DateTimeValue
  | BooleanValue
  | ErrorValue
  | PresentationValue;

/**
 * Presentation wrapper - wraps any value with presentation format or base
 * Applies formatting to numeric values while preserving units
 */
export interface PresentationValue {
  kind: "presentation";
  format: PresentationFormat | number; // Format string OR base number (2-36)
  innerValue: Value; // Can be NumberValue, DerivedUnitValue, or CompositeUnitValue
}

/**
 * Number value (with optional unit)
 */
export interface NumberValue {
  kind: "number";
  value: number;
  unit?: Unit; // undefined = dimensionless
  precision?: { count: number; mode: "decimals" | "sigfigs" }; // For formatting
}

/**
 * Derived unit value (e.g., "50 km/h", "9.8 m/s²")
 * Uses signed exponents: positive for numerator, negative for denominator
 */
export interface DerivedUnitValue {
  kind: "derivedUnit";
  value: number;
  terms: Array<{
    unit: Unit;
    exponent: number;
  }>;
  precision?: { count: number; mode: "decimals" | "sigfigs" };
}

/**
 * Composite unit value (e.g., "5 ft 7 in")
 */
export interface CompositeUnitValue {
  kind: "composite";
  components: Array<{
    value: number;
    unit: Unit;
    precision?: { count: number; mode: "decimals" | "sigfigs" };
  }>;
}

/**
 * Date/Time values
 */
export type DateTimeValue =
  | PlainDateValue
  | PlainTimeValue
  | PlainDateTimeValue
  | InstantValue
  | ZonedDateTimeValue
  | DurationValue;

export interface PlainDateValue {
  kind: "plainDate";
  date: PlainDate;
}

export interface PlainTimeValue {
  kind: "plainTime";
  time: PlainTime;
}

export interface PlainDateTimeValue {
  kind: "plainDateTime";
  dateTime: PlainDateTime;
}

export interface InstantValue {
  kind: "instant";
  instant: Instant;
}

export interface ZonedDateTimeValue {
  kind: "zonedDateTime";
  zonedDateTime: ZonedDateTime;
}

export interface DurationValue {
  kind: "duration";
  duration: Duration;
}

/**
 * Boolean value
 */
export interface BooleanValue {
  kind: "boolean";
  value: boolean;
}

/**
 * Simple runtime error
 */
export interface SimpleRuntimeError {
  type: "RuntimeError";
  message: string;
}

/**
 * Error value (propagated through evaluation)
 */
export interface ErrorValue {
  kind: "error";
  error: SimpleRuntimeError;
}

/**
 * Evaluation context - tracks variable values and scopes
 */
export interface EvaluationContext {
  variables: Map<string, Value>;
  parent?: EvaluationContext;
}

/**
 * Evaluator settings
 */
export interface EvaluatorSettings {
  variant: "us" | "uk";
  angleUnit: "degree" | "radian";
}

/**
 * Evaluator class - evaluates AST to produce values
 */
export class Evaluator {
  private dataLoader: DataLoader;
  private unitConverter: UnitConverter;
  private dateTimeEngine: DateTimeEngine;
  private currencyConverter: CurrencyConverter;
  private mathFunctions: MathFunctions;
  private settings: EvaluatorSettings;

  constructor(
    dataLoader: DataLoader,
    settings: EvaluatorSettings = { variant: "us", angleUnit: "radian" },
  ) {
    this.dataLoader = dataLoader;
    this.settings = settings;
    this.unitConverter = new UnitConverter(dataLoader, {
      variant: settings.variant,
    });
    this.dateTimeEngine = new DateTimeEngine(dataLoader);
    this.currencyConverter = new CurrencyConverter(dataLoader);
    this.mathFunctions = new MathFunctions();
  }

  /**
   * Load exchange rates for currency conversion
   */
  loadExchangeRates(rates: any): void {
    this.currencyConverter.loadExchangeRates(rates);
  }

  /**
   * Evaluate the entire document
   */
  evaluateDocument(document: Document): Map<ParsedLine, Value | null> {
    const context: EvaluationContext = { variables: new Map() };
    const lineValues = new Map<ParsedLine, Value | null>();

    for (const line of document.lines) {
      const lineValue = this.evaluateLine(line, context);
      lineValues.set(line, lineValue);
    }

    return lineValues;
  }

  /**
   * Evaluate a single line (ParsedLine union: Nearley AST | Heading | EmptyLine | PlainText)
   */
  private evaluateLine(
    line: ParsedLine,
    context: EvaluationContext,
  ): Value | null {
    if (line === null) return null;

    // Handle document-level wrapper types
    if (
      line.type === "Heading" ||
      line.type === "PlainText" ||
      line.type === "EmptyLine"
    ) {
      return null;
    }

    // Handle VariableAssignment (Nearley AST)
    if (line.type === "VariableAssignment") {
      const value = this.evaluateExpression(
        line.value as NearleyAST.ExpressionNode,
        context,
      );
      context.variables.set(line.name, value);
      return value;
    }

    // Everything else is an ExpressionNode - evaluate directly
    return this.evaluateExpression(line as NearleyAST.ExpressionNode, context);
  }

  /**
   * Evaluate an expression (Nearley AST ExpressionNode)
   */
  private evaluateExpression(
    expr: NearleyAST.ExpressionNode,
    context: EvaluationContext,
  ): Value {
    switch (expr.type) {
      case "ConditionalExpr":
        return this.evaluateConditional(
          expr as NearleyAST.ConditionalExprNode,
          context,
        );

      case "Conversion":
        return this.evaluateConversion(
          expr as NearleyAST.ConversionNode,
          context,
        );

      case "BinaryExpression":
        return this.evaluateBinary(
          expr as NearleyAST.BinaryExpressionNode,
          context,
        );

      case "UnaryExpression":
        return this.evaluateUnary(
          expr as NearleyAST.UnaryExpressionNode,
          context,
        );

      case "PostfixExpression":
        return this.evaluatePostfix(
          expr as NearleyAST.PostfixExpressionNode,
          context,
        );

      case "FunctionCall":
        return this.evaluateFunctionCall(
          expr as NearleyAST.FunctionCallNode,
          context,
        );

      case "Variable":
        return this.evaluateVariable(expr as NearleyAST.VariableNode, context);

      case "Constant":
        return this.evaluateConstant(expr as NearleyAST.ConstantNode);

      case "Value":
        return this.evaluateValue(expr as NearleyAST.ValueNode, context);

      case "CompositeValue":
        return this.evaluateCompositeValue(
          expr as NearleyAST.CompositeValueNode,
          context,
        );

      case "BooleanLiteral":
        return {
          kind: "boolean",
          value: (expr as NearleyAST.BooleanLiteralNode).value,
        };

      case "PlainDate":
        return this.evaluatePlainDate(expr as NearleyAST.PlainDateNode);

      case "PlainTime":
        return this.evaluatePlainTime(expr as NearleyAST.PlainTimeNode);

      case "PlainDateTime":
        return this.evaluatePlainDateTime(expr as NearleyAST.PlainDateTimeNode);

      case "Instant":
        return this.evaluateInstant(expr as NearleyAST.InstantNode, context);

      case "ZonedDateTime":
        return this.evaluateZonedDateTime(expr as NearleyAST.ZonedDateTimeNode);

      default:
        return this.createError(
          `Unknown expression type: ${(expr as any).type}`,
        );
    }
  }

  // ============================================================================
  // Nearley AST Value Evaluation
  // ============================================================================

  /**
   * Parse a numerical value node (NumberLiteral or PercentageLiteral) to a number or error
   */
  private parseNumericalValue(
    node: NearleyAST.NumericalValueNode,
  ): number | ErrorValue {
    if (node.type === "NumberLiteral") {
      const cleaned = node.value.replaceAll("_", "");
      // Validate base range
      if (node.base < 2 || node.base > 36) {
        return this.createError(
          `Base must be between 2 and 36, got ${node.base}`,
        );
      }
      // For arbitrary base literals (e.g., "ABC base 10"), validate digits
      // Regular decimal literals (subType !== ArbitraryBase*) skip validation
      const isArbitraryBase = node.subType?.startsWith("ArbitraryBase");
      if (isArbitraryBase || node.base !== 10) {
        const validationError = this.validateBaseDigits(cleaned, node.base);
        if (validationError) {
          return this.createError(validationError);
        }
      }
      if (node.base === 10) {
        return parseFloat(cleaned);
      }
      // Handle fractional parts for non-base-10 numbers
      return this.parseBaseNumber(cleaned, node.base);
    }
    if (node.type === "PercentageLiteral") {
      const cleaned = node.value.replaceAll("_", "");
      const numValue = parseFloat(cleaned);
      return node.symbol === "percent" ? numValue / 100 : numValue / 1000;
    }
    return 0;
  }

  /**
   * Validate that all digits in a string are valid for the given base
   * Returns error message if invalid, null if valid
   */
  private validateBaseDigits(str: string, base: number): string | null {
    const digitRange =
      base <= 10
        ? `0-${String.fromCharCode(47 + base)}`
        : `0-9A-${String.fromCharCode(54 + base)}`;
    const invalid = new RegExp(`[^.\\-${digitRange}]`, "i");
    const match = str.match(invalid);
    if (match) {
      return `Invalid digit '${match[0]}' for base ${base}`;
    }
    return null;
  }

  /**
   * Parse a number string in an arbitrary base, supporting fractional parts
   */
  private parseBaseNumber(str: string, base: number): number {
    const parts = str.split(".");
    const intPart = parseInt(parts[0] || "0", base);

    if (parts.length === 1 || !parts[1]) {
      return intPart;
    }

    // Parse fractional part digit by digit
    let fracValue = 0;
    let placeValue = 1 / base;
    for (const char of parts[1]) {
      const digit = parseInt(char, base);
      if (isNaN(digit)) break;
      fracValue += digit * placeValue;
      placeValue /= base;
    }

    return (intPart >= 0 ? 1 : -1) * (Math.abs(intPart) + fracValue);
  }

  /**
   * Resolve a Nearley UnitsNode or CurrencyUnitNode to a Unit object
   */
  private resolveNearleyUnit(
    unitNode: NearleyAST.UnitsNode | NearleyAST.CurrencyUnitNode,
    unitContext: UnitResolutionContext = { hasDegreeUnit: false },
  ): Unit | null {
    if (unitNode.type === "CurrencyUnit") {
      return this.resolveCurrencyUnit(unitNode);
    }

    // UnitsNode - should be a single term for simple resolution
    if (unitNode.terms.length === 1 && unitNode.terms[0].exponent === 1) {
      const resolved = resolveUnitFromNode(
        unitNode.terms[0].unit,
        this.dataLoader,
        unitContext,
      );
      return this.resolveUnitById(resolved.id, resolved.displayName);
    }

    // Multi-term or non-1 exponent: not a simple unit
    return null;
  }

  /**
   * Resolve a currency unit node to a Unit object
   */
  private resolveCurrencyUnit(node: NearleyAST.CurrencyUnitNode): Unit | null {
    const name = node.name;

    // Check if it's an unambiguous currency symbol (like €, ₹, ₽, ฿)
    const unambiguous =
      this.dataLoader.getCurrencyByAdjacentSymbol(name) ||
      this.dataLoader.getCurrencyBySpacedSymbol(name);
    if (unambiguous) {
      return this.createCurrencyUnit(unambiguous.code);
    }

    // Check if it's an ambiguous currency symbol (like $, £, ¥)
    const ambiguous =
      this.dataLoader.getAmbiguousCurrencyByAdjacentSymbol(name);
    if (ambiguous) {
      return {
        id: ambiguous.dimension, // Use dimension as ID for ambiguous currencies
        dimension: ambiguous.dimension,
        names: [ambiguous.symbol],
        conversion: { type: "linear", factor: 1.0 },
        displayName: {
          symbol: name, // Preserve original symbol
          singular: name,
          plural: name,
        },
      };
    }

    // Try as currency code
    const currency = this.dataLoader.getCurrencyByCode(name);
    if (currency) {
      return this.createCurrencyUnit(currency.code);
    }

    return null;
  }

  /**
   * Create a Unit object for a currency code
   */
  private createCurrencyUnit(code: string): Unit | null {
    const currency = this.dataLoader.getCurrencyByCode(code);
    if (!currency) return null;

    let exchangeRate: number;
    if (currency.code === "USD") {
      exchangeRate = 1.0;
    } else {
      try {
        const converted = this.currencyConverter.convert(
          { amount: 1.0, currencyCode: currency.code },
          "USD",
        );
        exchangeRate = converted.amount;
      } catch (e) {
        return null;
      }
    }

    return {
      id: code,
      dimension: "currency",
      names: [currency.code, ...currency.names],
      conversion: { type: "linear", factor: exchangeRate },
      displayName: {
        symbol: currency.code,
        singular: currency.displayName.singular,
        plural: currency.displayName.plural || currency.displayName.singular,
      },
    };
  }

  /**
   * Resolve a unit by its ID (after name→ID resolution from ast-helpers)
   */
  private resolveUnitById(unitId: string, displayName: string): Unit | null {
    // STEP 1: Try regular unit database
    const unit = this.dataLoader.getUnitById(unitId);
    if (unit) return unit;

    // STEP 2: Check unambiguous currency (ISO code)
    const currencyUnit = this.createCurrencyUnit(unitId);
    if (currencyUnit) return currencyUnit;

    // STEP 3: Check ambiguous currency symbol
    if (unitId.startsWith("currency_symbol_")) {
      const ambiguous =
        this.dataLoader.getAmbiguousCurrencyByAdjacentSymbol(displayName);
      if (ambiguous) {
        return {
          id: unitId,
          dimension: ambiguous.dimension,
          names: [ambiguous.symbol],
          conversion: { type: "linear", factor: 1.0 },
          displayName: {
            symbol: ambiguous.symbol,
            singular: ambiguous.symbol,
            plural: ambiguous.symbol,
          },
        };
      }
    }

    // STEP 4: User-defined unit fallback
    return {
      id: unitId,
      dimension: `user_defined_${unitId}`,
      names: [displayName],
      conversion: { type: "linear", factor: 1.0 },
      displayName: {
        symbol: displayName,
        singular: displayName,
        plural: displayName + "s",
      },
    };
  }

  /**
   * Resolve Nearley UnitsNode terms to DerivedUnitValue terms
   */
  private resolveNearleyUnitTerms(
    node: NearleyAST.UnitsNode,
    unitContext: UnitResolutionContext = { hasDegreeUnit: false },
  ): Array<{ unit: Unit; exponent: number }> | null {
    const terms: Array<{ unit: Unit; exponent: number }> = [];
    let hasDegree = unitContext.hasDegreeUnit;
    for (const term of node.terms) {
      if (isDegreeUnit(term.unit.name)) {
        hasDegree = true;
      }
      const ctx: UnitResolutionContext = { hasDegreeUnit: hasDegree };
      const resolved = resolveUnitFromNode(term.unit, this.dataLoader, ctx);
      const unit = this.resolveUnitById(resolved.id, resolved.displayName);
      if (!unit) return null;
      terms.push({ unit, exponent: term.exponent });
    }
    return terms;
  }

  /**
   * Evaluate a Value node (number with optional unit)
   */
  private evaluateValue(
    expr: NearleyAST.ValueNode,
    context: EvaluationContext,
  ): Value {
    const numResult = this.parseNumericalValue(
      expr.value as NearleyAST.NumericalValueNode,
    );
    if (typeof numResult !== "number") return numResult; // ErrorValue
    const numValue = numResult;

    if (expr.unit === null) {
      return { kind: "number", value: numValue };
    }

    const unitNode = expr.unit as
      | NearleyAST.UnitsNode
      | NearleyAST.CurrencyUnitNode;

    // Handle currency units
    if (unitNode.type === "CurrencyUnit") {
      const unit = this.resolveCurrencyUnit(unitNode);
      if (!unit) {
        return this.createError(`Unknown currency: ${unitNode.name}`);
      }
      return { kind: "number", value: numValue, unit };
    }

    // Handle UnitsNode
    const unitsNode = unitNode as NearleyAST.UnitsNode;

    // Check if it's a derived unit (multiple terms or exponent != 1)
    if (
      unitsNode.terms.length > 1 ||
      (unitsNode.terms.length === 1 && unitsNode.terms[0].exponent !== 1)
    ) {
      const terms = this.resolveNearleyUnitTerms(unitsNode);
      if (!terms) {
        return this.createError(
          `Unknown unit “${unitsNode.terms.map((t) => t.unit.name).join(" ")}” in derived unit literal`,
        );
      }
      return { kind: "derivedUnit", value: numValue, terms };
    }

    // Simple unit
    const unit = this.resolveNearleyUnit(unitNode);
    if (!unit) {
      return this.createError(
        `Unknown unit “${unitsNode.terms.map((t) => t.unit.name).join(" ")}” in literal`,
      );
    }

    // Auto-convert dimensionless units to pure numbers
    if (unit.dimension === "dimensionless") {
      const convertedValue = this.unitConverter.toBaseUnit(numValue, unit);
      return { kind: "number", value: convertedValue };
    }

    return { kind: "number", value: numValue, unit };
  }

  /**
   * Evaluate a CompositeValue node (e.g., "5 ft 7 in")
   */
  private evaluateCompositeValue(
    expr: NearleyAST.CompositeValueNode,
    context: EvaluationContext,
  ): Value {
    let hasDegreeUnit = false;
    const components: Array<{ value: number; unit: Unit }> = [];

    const values = expr.values as NearleyAST.ValueNode[];
    for (const valueNode of values) {
      const numResult = this.parseNumericalValue(
        valueNode.value as NearleyAST.NumericalValueNode,
      );
      if (typeof numResult !== "number") return numResult;
      const numValue = numResult;

      if (valueNode.unit === null) {
        return this.createError("Composite value component must have a unit");
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

      const unit = this.resolveNearleyUnit(unitNode, unitContext);
      if (!unit) {
        return this.createError(
          `Unknown unit “${(unitNode as NearleyAST.UnitsNode).terms.map((t) => t.unit.name).join(" ")}” in composite literal`,
        );
      }
      components.push({ value: numValue, unit });
    }

    return { kind: "composite", components };
  }

  /**
   * Evaluate a Variable node
   */
  private evaluateVariable(
    expr: NearleyAST.VariableNode,
    context: EvaluationContext,
  ): Value {
    // Check for relative instant keywords first
    const relativeInstant = this.evaluateRelativeInstantKeyword(expr.name);
    if (relativeInstant) {
      return relativeInstant;
    }

    // Try to look up as a variable
    const value = context.variables.get(expr.name);
    if (value !== undefined) {
      return value;
    }

    // If not found as variable, check if it's a unit name
    const unit = this.dataLoader.getUnitByName(expr.name);
    if (unit) {
      return { kind: "number", value: 1, unit };
    }

    return this.createError(`Undefined variable: ${expr.name}`);
  }

  /**
   * Evaluate a Constant node
   */
  private evaluateConstant(expr: NearleyAST.ConstantNode): Value {
    const constantValue = getConstant(expr.name);
    if (constantValue === undefined) {
      return this.createError(`Unknown constant: ${expr.name}`);
    }
    return { kind: "number", value: constantValue };
  }

  /**
   * Evaluate PlainDate node
   */
  private evaluatePlainDate(expr: NearleyAST.PlainDateNode): Value {
    return {
      kind: "plainDate",
      date: { year: expr.year, month: expr.month, day: expr.day },
    };
  }

  /**
   * Evaluate PlainTime node
   */
  private evaluatePlainTime(expr: NearleyAST.PlainTimeNode): Value {
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
  private evaluatePlainDateTime(expr: NearleyAST.PlainDateTimeNode): Value {
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
  private evaluateInstant(
    expr: NearleyAST.InstantNode,
    context: EvaluationContext,
  ): Value {
    // Keyword instant (now, today, yesterday, tomorrow)
    if ("keyword" in expr) {
      const keywordExpr = expr as NearleyAST.InstantKeywordNode;
      const result = this.evaluateRelativeInstantKeyword(keywordExpr.keyword);
      if (result) return result;
      return this.createError(
        `Unknown instant keyword: ${keywordExpr.keyword}`,
      );
    }

    // Relative instant (e.g., "2 days ago", "5 minutes from now")
    const relativeExpr = expr as NearleyAST.InstantRelativeNode;
    const numResult = this.parseNumericalValue(
      relativeExpr.amount as NearleyAST.NumericalValueNode,
    );
    if (typeof numResult !== "number") return numResult;
    const numValue = numResult;

    // Resolve the time unit
    const timeUnit = this.dataLoader.getUnitByName(relativeExpr.unit);
    if (!timeUnit) {
      return this.createError(`Unknown time unit: ${relativeExpr.unit}`);
    }

    const duration = this.convertTimeToDuration(numValue, timeUnit);
    const now = this.dateTimeEngine.getCurrentInstant();

    if (relativeExpr.direction === "sinceEpoch") {
      // "N units since epoch" → instant from epoch
      const durationMs = this.durationToMilliseconds(duration);
      return { kind: "instant", instant: { timestamp: durationMs } };
    }

    const result =
      relativeExpr.direction === "ago"
        ? this.dateTimeEngine.subtractFromInstant(now, duration)
        : this.dateTimeEngine.addToInstant(now, duration);

    return { kind: "instant", instant: result };
  }

  /**
   * Evaluate ZonedDateTime node
   */
  private evaluateZonedDateTime(expr: NearleyAST.ZonedDateTimeNode): Value {
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
      this.dataLoader.resolveTimezone(rawTimezone) || rawTimezone;

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
   * Convert duration to milliseconds (approximate for calendar durations)
   */
  private durationToMilliseconds(duration: Duration): number {
    return (
      (duration.years || 0) * 365.25 * 24 * 60 * 60 * 1000 +
      (duration.months || 0) * 30.4375 * 24 * 60 * 60 * 1000 +
      (duration.weeks || 0) * 7 * 24 * 60 * 60 * 1000 +
      (duration.days || 0) * 24 * 60 * 60 * 1000 +
      (duration.hours || 0) * 60 * 60 * 1000 +
      (duration.minutes || 0) * 60 * 1000 +
      (duration.seconds || 0) * 1000 +
      (duration.milliseconds || 0)
    );
  }

  /**
   * Evaluate a conditional expression (if-then-else)
   */
  private evaluateConditional(
    expr: NearleyAST.ConditionalExprNode,
    context: EvaluationContext,
  ): Value {
    const condition = this.evaluateExpression(
      expr.condition as NearleyAST.ExpressionNode,
      context,
    );

    if (condition.kind === "error") {
      return condition;
    }

    // Convert condition to boolean
    const conditionBool = this.toBoolean(condition);
    if (conditionBool.kind === "error") {
      return conditionBool;
    }

    if (conditionBool.value) {
      return this.evaluateExpression(
        expr.then as NearleyAST.ExpressionNode,
        context,
      );
    } else {
      return this.evaluateExpression(
        expr.else as NearleyAST.ExpressionNode,
        context,
      );
    }
  }

  /**
   * Evaluate a conversion expression (Nearley AST)
   */
  private evaluateConversion(
    expr: NearleyAST.ConversionNode,
    context: EvaluationContext,
  ): Value {
    const value = this.evaluateExpression(
      expr.expression as NearleyAST.ExpressionNode,
      context,
    );

    if (value.kind === "error") {
      return value;
    }

    const target = expr.target as NearleyAST.ConversionTargetNode;
    return this.evaluateConversionTarget(value, target);
  }

  /**
   * Evaluate a Nearley conversion target
   */
  private evaluateConversionTarget(
    value: Value,
    target: NearleyAST.ConversionTargetNode,
  ): Value {
    // Units target (simple unit, derived unit, or composite unit)
    if (target.type === "Units") {
      return this.convertToNearleyUnit(value, target as NearleyAST.UnitsNode);
    }

    // Presentation format target
    if (target.type === "PresentationFormat") {
      return this.convertToPresentationFormat(
        value,
        target as NearleyAST.PresentationFormatNode,
      );
    }

    // Property target (year, month, day, etc.)
    if (target.type === "PropertyTarget") {
      const propTarget = target as NearleyAST.PropertyTargetNode;
      return this.extractProperty(value, propTarget.property);
    }

    // Timezone target
    if (target.type === "UTCOffset" || target.type === "TimezoneName") {
      const tz = target as NearleyAST.TimezoneNode;
      const rawTz =
        tz.type === "TimezoneName"
          ? tz.zoneName
          : (tz as NearleyAST.UTCOffsetNode).offsetStr;
      const timezone = this.dataLoader.resolveTimezone(rawTz) || rawTz;
      return this.convertToTimezone(value, timezone);
    }

    return this.createError(
      `Unknown conversion target: ${(target as any).type}`,
    );
  }

  /**
   * Convert value to Nearley unit target (handles simple, derived, and composite)
   */
  private convertToNearleyUnit(
    value: Value,
    unitsNode: NearleyAST.UnitsNode,
  ): Value {
    const terms = unitsNode.terms as NearleyAST.UnitWithExponentNode[];

    // Check if this is a composite unit target (multiple simple units with exponent 1)
    // e.g., "to ft in" → composite conversion
    const isComposite =
      terms.length > 1 && terms.every((t) => t.exponent === 1);

    if (isComposite) {
      // Resolve each unit for composite conversion with context-aware prime/doublePrime
      // Rule: within the composite target, if degree appears before prime/doublePrime,
      // interpret them as arcminute/arcsecond. Otherwise, foot/inch.
      const resolvedUnits: Unit[] = [];
      let hasDegreeInTarget = false;
      for (const term of terms) {
        // Check if this term is a degree unit BEFORE resolving (for context)
        if (isDegreeUnit(term.unit.name)) {
          hasDegreeInTarget = true;
        }
        const unitContext: UnitResolutionContext = {
          hasDegreeUnit: hasDegreeInTarget,
        };
        const resolved = resolveUnitFromNode(
          term.unit,
          this.dataLoader,
          unitContext,
        );
        const unit = this.resolveUnitById(resolved.id, resolved.displayName);
        if (!unit) {
          return this.createError(
            `Unknown unit “${term.unit.name}” in composite target`,
          );
        }
        resolvedUnits.push(unit);
      }

      // Check if all targets have same dimension as source (true composite)
      if (value.kind === "number" && value.unit) {
        const allSameDimension = resolvedUnits.every(
          (u) => u.dimension === value.unit!.dimension,
        );
        if (allSameDimension) {
          return this.convertToCompositeUnitResolved(value, resolvedUnits);
        }
      }

      // Fall through to derived unit conversion
      return this.convertToDerivedUnitNearley(value, unitsNode);
    }

    // Single term or derived unit
    if (terms.length === 1 && terms[0].exponent === 1) {
      // Simple unit target
      const resolved = resolveUnitFromNode(terms[0].unit, this.dataLoader);
      const targetUnit = this.resolveUnitById(
        resolved.id,
        resolved.displayName,
      );
      if (!targetUnit) {
        return this.createError(`Unknown target unit “${terms[0].unit.name}”`);
      }
      return this.convertToSimpleUnit(value, targetUnit);
    }

    // Derived unit target
    return this.convertToDerivedUnitNearley(value, unitsNode);
  }

  /**
   * Convert value to a simple (single) unit
   */
  private convertToSimpleUnit(value: Value, targetUnit: Unit): Value {
    // Handle composite source
    if (value.kind === "composite") {
      for (const component of value.components) {
        if (component.unit.dimension !== targetUnit.dimension) {
          return this.createError(
            `Cannot convert from dimension ${component.unit.dimension} to ${targetUnit.dimension}`,
          );
        }
      }
      let totalInBase = 0;
      for (const component of value.components) {
        totalInBase += this.unitConverter.toBaseUnit(
          component.value,
          component.unit,
        );
      }
      const result = this.unitConverter.fromBaseUnit(totalInBase, targetUnit);
      return { kind: "number", value: result, unit: targetUnit };
    }

    if (value.kind === "derivedUnit") {
      const sourceTerms = value.terms;
      const targetTerms: Array<{ unit: Unit; exponent: number }> = [
        { unit: targetUnit, exponent: 1 },
      ];

      const sourceDim = this.computeDimension(sourceTerms);
      const targetDim = this.computeDimension(targetTerms);

      if (!this.areDimensionsCompatible(sourceDim, targetDim)) {
        return this.createError(
          `Cannot convert from dimensions ${this.formatDimension(sourceDim)} to ${this.formatDimension(targetDim)}`,
        );
      }

      let valueInBase = value.value;
      for (const term of sourceTerms) {
        const factorToBase = this.unitConverter.toBaseUnit(1, term.unit);
        valueInBase *= Math.pow(factorToBase, term.exponent);
      }

      const result = this.unitConverter.fromBaseUnit(valueInBase, targetUnit);
      return { kind: "number", value: result, unit: targetUnit };
    }

    if (value.kind !== "number") {
      return this.createError(
        `Cannot convert ${value.kind} to unit ${targetUnit.displayName.symbol}`,
      );
    }

    if (!value.unit) {
      return this.createError(
        `Cannot convert dimensionless value to unit ${targetUnit.displayName.symbol}`,
      );
    }

    if (value.unit.dimension !== targetUnit.dimension) {
      return this.createError(
        `Cannot convert from dimension ${value.unit.dimension} to ${targetUnit.dimension} for unit ${targetUnit.displayName.symbol}`,
      );
    }

    try {
      const converted = this.unitConverter.convert(
        value.value,
        value.unit,
        targetUnit,
      );
      return { kind: "number", value: converted, unit: targetUnit };
    } catch (e) {
      return this.createError(`Conversion error: ${e}`);
    }
  }

  /**
   * Convert value to derived unit using Nearley UnitsNode
   */
  private convertToDerivedUnitNearley(
    value: Value,
    targetNode: NearleyAST.UnitsNode,
  ): Value {
    // Resolve target terms
    const targetTerms = this.resolveNearleyUnitTerms(targetNode);
    if (!targetTerms) {
      return this.createError("Unknown unit in target");
    }

    // Extract source info
    let sourceValue: number;
    let sourceTerms: Array<{ unit: Unit; exponent: number }>;

    if (value.kind === "number") {
      if (!value.unit) {
        return this.createError(
          "Cannot convert dimensionless value to derived unit",
        );
      }
      sourceValue = value.value;
      sourceTerms = [{ unit: value.unit, exponent: 1 }];
    } else if (value.kind === "derivedUnit") {
      sourceValue = value.value;
      sourceTerms = value.terms;
    } else {
      return this.createError(`Cannot convert ${value.kind} to derived unit`);
    }

    // Check dimensional compatibility
    const sourceDimension = this.computeDimension(sourceTerms);
    const targetDimension = this.computeDimension(targetTerms);

    if (!this.areDimensionsCompatible(sourceDimension, targetDimension)) {
      const sourceDimStr = this.formatDimension(sourceDimension);
      const targetDimStr = this.formatDimension(targetDimension);
      return this.createError(
        `Cannot convert from dimensions ${sourceDimStr} to ${targetDimStr}`,
      );
    }

    // Convert through base units
    let valueInBase = sourceValue;
    for (const term of sourceTerms) {
      const factorToBase = this.unitConverter.toBaseUnit(1, term.unit);
      valueInBase *= Math.pow(factorToBase, term.exponent);
    }

    let result = valueInBase;
    for (const term of targetTerms) {
      const factorFromBase = this.unitConverter.fromBaseUnit(1, term.unit);
      result *= Math.pow(factorFromBase, term.exponent);
    }

    return {
      kind: "derivedUnit",
      value: result,
      terms: targetTerms,
    };
  }

  /**
   * Convert value to composite unit using resolved Unit objects
   */
  private convertToCompositeUnitResolved(
    value: Value,
    resolvedUnits: Unit[],
  ): Value {
    if (value.kind !== "number" || !value.unit) {
      return this.createError("Cannot convert to composite unit");
    }

    try {
      const result = this.unitConverter.convertComposite(
        [{ value: value.value, unitId: value.unit.id }],
        resolvedUnits.map((u) => u.id),
      );

      const components = result.components.map((comp) => {
        const unit = this.dataLoader.getUnitById(comp.unitId);
        if (!unit) throw new Error(`Unit not found: ${comp.unitId}`);
        return { value: comp.value, unit };
      });

      return { kind: "composite", components };
    } catch (e) {
      return this.createError(`Composite conversion error: ${e}`);
    }
  }

  /**
   * Convert Nearley PresentationFormatNode to presentation value
   */
  private convertToPresentationFormat(
    value: Value,
    node: NearleyAST.PresentationFormatNode,
  ): Value {
    switch (node.format) {
      case "value":
        // "to value" - unwrap presentation, identity otherwise
        return value;

      case "base": {
        const baseNode = node as NearleyAST.BaseFormatNode;
        return this.convertToPresentation(value, baseNode.base);
      }

      case "sigFigs": {
        const sfNode = node as NearleyAST.SigFigsFormatNode;
        return this.applyPrecision(value, sfNode.sigFigs, "sigfigs");
      }

      case "decimals": {
        const decNode = node as NearleyAST.DecimalsFormatNode;
        return this.applyPrecision(value, decNode.decimals, "decimals");
      }

      case "scientific":
        return this.convertToPresentation(value, "scientific");

      case "fraction":
        return this.convertToPresentation(value, "fraction");

      case "unix": {
        const unixNode = node as NearleyAST.UnixFormatNode;
        if (
          unixNode.unit === "millisecond" ||
          unixNode.unit === "milliseconds" ||
          unixNode.unit === "ms"
        ) {
          return this.convertToPresentation(value, "unixMilliseconds");
        }
        return this.convertToPresentation(value, "unix");
      }

      case "namedFormat": {
        const namedNode = node as NearleyAST.NamedFormatNode;
        const formatName = namedNode.name.toLowerCase();
        // Map named formats to PresentationFormat strings
        const formatMap: Record<string, PresentationFormat> = {
          binary: "binary",
          bin: "bin",
          octal: "octal",
          oct: "oct",
          decimal: "decimal",
          dec: "dec",
          hex: "hex",
          hexadecimal: "hexadecimal",
          fraction: "fraction",
          scientific: "scientific",
          ordinal: "ordinal",
        };
        const mapped = formatMap[formatName];
        if (mapped) {
          return this.convertToPresentation(value, mapped);
        }
        return this.createError(
          `Unknown presentation format: ${namedNode.name}`,
        );
      }

      default: {
        // Handle formats not in the TypeScript type system (ISO 8601, RFC 9557, RFC 2822)
        const rawFormat = (node as any).format as string;
        const normalizedFormat = rawFormat.toLowerCase().replace(/\s+/g, "");
        if (normalizedFormat === "iso8601")
          return this.convertToPresentation(value, "ISO 8601");
        if (normalizedFormat === "rfc9557")
          return this.convertToPresentation(value, "RFC 9557");
        if (normalizedFormat === "rfc2822")
          return this.convertToPresentation(value, "RFC 2822");
        return this.createError(`Unknown presentation format: ${rawFormat}`);
      }
    }
  }

  /**
   * Evaluate a binary expression (Nearley AST)
   */
  private evaluateBinary(
    expr: NearleyAST.BinaryExpressionNode,
    context: EvaluationContext,
  ): Value {
    const left = this.evaluateExpression(
      expr.left as NearleyAST.ExpressionNode,
      context,
    );
    if (left.kind === "error") return left;

    const right = this.evaluateExpression(
      expr.right as NearleyAST.ExpressionNode,
      context,
    );
    if (right.kind === "error") return right;

    const op = expr.operator;

    // Map Nearley operators to internal operator strings
    switch (op) {
      // Logical
      case "and":
        return this.evaluateLogical("&&", left, right);
      case "or":
        return this.evaluateLogical("||", left, right);

      // Comparison
      case "equals":
        return this.evaluateComparison("==", left, right);
      case "notEquals":
        return this.evaluateComparison("!=", left, right);
      case "lessThan":
        return this.evaluateComparison("<", left, right);
      case "lessThanOrEqual":
        return this.evaluateComparison("<=", left, right);
      case "greaterThan":
        return this.evaluateComparison(">", left, right);
      case "greaterThanOrEqual":
        return this.evaluateComparison(">=", left, right);

      // Arithmetic
      case "plus":
        return this.evaluateArithmetic("+", left, right);
      case "minus":
        return this.evaluateArithmetic("-", left, right);
      case "times":
        return this.evaluateArithmetic("*", left, right);
      case "slash":
      case "divide":
        return this.evaluateArithmetic("/", left, right);
      case "percent":
      case "kw_mod":
        return this.evaluateArithmetic("%", left, right);
      case "kw_per":
        return this.evaluateArithmetic("per", left, right);
      case "caret":
      case "superscript":
        return this.evaluateArithmetic("^", left, right);

      // Bitwise
      case "ampersand":
        return this.evaluateBitwise("&", left, right);
      case "pipe":
        return this.evaluateBitwise("|", left, right);
      case "kw_xor":
        return this.evaluateBitwise("xor", left, right);
      case "lShift":
        return this.evaluateBitwise("<<", left, right);
      case "rShift":
        return this.evaluateBitwise(">>", left, right);

      default:
        return this.createError(`Unknown binary operator: ${op}`);
    }
  }

  /**
   * Evaluate logical operators (&& and ||)
   */
  private evaluateLogical(op: "&&" | "||", left: Value, right: Value): Value {
    const leftBool = this.toBoolean(left);
    if (leftBool.kind === "error") return leftBool;

    const rightBool = this.toBoolean(right);
    if (rightBool.kind === "error") return rightBool;

    if (op === "&&") {
      return { kind: "boolean", value: leftBool.value && rightBool.value };
    } else {
      return { kind: "boolean", value: leftBool.value || rightBool.value };
    }
  }

  /**
   * Evaluate comparison operators
   */
  private evaluateComparison(
    op: "==" | "!=" | "<" | "<=" | ">" | ">=",
    left: Value,
    right: Value,
  ): Value {
    // Convert composite units to single units for comparison
    let convertedLeft: Value = left;
    let convertedRight: Value = right;
    if (left.kind === "composite") {
      convertedLeft = this.convertCompositeToSingleUnit(left);
      if (convertedLeft.kind === "error") return convertedLeft;
    }
    if (right.kind === "composite") {
      convertedRight = this.convertCompositeToSingleUnit(right);
      if (convertedRight.kind === "error") return convertedRight;
    }

    // For numbers, convert to same unit if needed
    if (convertedLeft.kind === "number" && convertedRight.kind === "number") {
      const leftNum = convertedLeft;
      const rightNum = convertedRight;
      const leftValue = leftNum.value;
      let rightValue = rightNum.value;

      // If both have units, convert right to left's unit
      if (leftNum.unit && rightNum.unit) {
        if (leftNum.unit.dimension !== rightNum.unit.dimension) {
          return this.createError(
            `Cannot compare values with dimensions ${leftNum.unit.dimension} and ${rightNum.unit.dimension}`,
          );
        }
        try {
          rightValue = this.unitConverter.convert(
            rightNum.value,
            rightNum.unit,
            leftNum.unit,
          );
        } catch (e) {
          return this.createError(`Conversion error: ${e}`);
        }
      } else if (leftNum.unit || rightNum.unit) {
        // One has unit, other doesn't
        return this.createError(
          `Cannot compare dimensioned and dimensionless values`,
        );
      }

      switch (op) {
        case "==":
          return { kind: "boolean", value: leftValue === rightValue };
        case "!=":
          return { kind: "boolean", value: leftValue !== rightValue };
        case "<":
          return { kind: "boolean", value: leftValue < rightValue };
        case "<=":
          return { kind: "boolean", value: leftValue <= rightValue };
        case ">":
          return { kind: "boolean", value: leftValue > rightValue };
        case ">=":
          return { kind: "boolean", value: leftValue >= rightValue };
      }
    }

    // For derived units or mixed number+derivedUnit comparisons
    const isNumeric = (v: Value) =>
      v.kind === "number" || v.kind === "derivedUnit";
    if (isNumeric(convertedLeft) && isNumeric(convertedRight)) {
      const l = convertedLeft as NumberValue | DerivedUnitValue;
      const r = convertedRight as NumberValue | DerivedUnitValue;
      const leftTerms = this.extractTerms(l);
      const rightTerms = this.extractTerms(r);

      // Both must have units (dimensionless numbers handled above)
      if (leftTerms.length === 0 || rightTerms.length === 0) {
        return this.createError(
          "Cannot compare dimensioned and dimensionless values",
        );
      }

      const leftDim = this.computeDimension(leftTerms);
      const rightDim = this.computeDimension(rightTerms);
      if (!this.areDimensionsCompatible(leftDim, rightDim)) {
        return this.createError(
          `Cannot compare values with dimensions ${this.formatDimension(leftDim)} and ${this.formatDimension(rightDim)}`,
        );
      }

      // Convert both values to base units
      let leftInBase = l.value;
      for (const term of leftTerms) {
        const factorToBase = this.unitConverter.toBaseUnit(1, term.unit);
        leftInBase *= Math.pow(factorToBase, term.exponent);
      }
      let rightInBase = r.value;
      for (const term of rightTerms) {
        const factorToBase = this.unitConverter.toBaseUnit(1, term.unit);
        rightInBase *= Math.pow(factorToBase, term.exponent);
      }

      switch (op) {
        case "==":
          return { kind: "boolean", value: leftInBase === rightInBase };
        case "!=":
          return { kind: "boolean", value: leftInBase !== rightInBase };
        case "<":
          return { kind: "boolean", value: leftInBase < rightInBase };
        case "<=":
          return { kind: "boolean", value: leftInBase <= rightInBase };
        case ">":
          return { kind: "boolean", value: leftInBase > rightInBase };
        case ">=":
          return { kind: "boolean", value: leftInBase >= rightInBase };
      }
    }

    // For booleans
    if (left.kind === "boolean" && right.kind === "boolean") {
      if (op === "==")
        return { kind: "boolean", value: left.value === right.value };
      if (op === "!=")
        return { kind: "boolean", value: left.value !== right.value };
      return this.createError(`Cannot use ${op} on boolean values`);
    }

    return this.createError(
      `Cannot compare values of types ${convertedLeft.kind} and ${convertedRight.kind}`,
    );
  }

  /**
   * Evaluate arithmetic operators
   */
  private evaluateArithmetic(
    op: "+" | "-" | "*" | "/" | "%" | "mod" | "per" | "^",
    left: Value,
    right: Value,
  ): Value {
    // Convert time-dimensioned numbers to durations for date arithmetic
    let convertedLeft = left;
    let convertedRight = right;

    // If left is a date/time type and right is a number with time dimension, convert right to duration
    if (this.isDateTime(left) && right.kind === "number" && right.unit) {
      if (right.unit.dimension === "time") {
        // Convert to duration
        const duration = this.convertTimeToDuration(right.value, right.unit);
        convertedRight = { kind: "duration", duration };
      }
    }

    // If left is a date/time type and right is a composite unit, check if all components are time-dimensioned
    if (this.isDateTime(left) && right.kind === "composite") {
      // Check if all components have time dimension
      const allTimeComponents = right.components.every(
        (comp) => comp.unit.dimension === "time",
      );
      if (allTimeComponents) {
        // Convert composite unit to duration
        const duration = this.convertCompositeTimeToDuration(right);
        convertedRight = { kind: "duration", duration };
      }
    }

    // Handle date/time arithmetic
    if (this.isDateTime(convertedLeft) || this.isDateTime(convertedRight)) {
      return this.evaluateDateTimeArithmetic(op, convertedLeft, convertedRight);
    }

    // Convert composite units to single units for arithmetic
    // This allows operations like: 10 ft - (5 ft 6 in)
    if (left.kind === "composite") {
      convertedLeft = this.convertCompositeToSingleUnit(left);
      if (convertedLeft.kind === "error") {
        return convertedLeft;
      }
    }
    if (right.kind === "composite") {
      convertedRight = this.convertCompositeToSingleUnit(right);
      if (convertedRight.kind === "error") {
        return convertedRight;
      }
    }

    // Handle number and derived unit arithmetic
    const isNumeric = (v: Value) =>
      v.kind === "number" || v.kind === "derivedUnit";
    if (isNumeric(convertedLeft) && isNumeric(convertedRight)) {
      return this.evaluateNumberArithmetic(
        op,
        convertedLeft as NumberValue | DerivedUnitValue,
        convertedRight as NumberValue | DerivedUnitValue,
      );
    }

    return this.createError(
      `Cannot perform ${op} on ${left.kind} and ${right.kind}`,
    );
  }

  /**
   * Evaluate arithmetic on numbers (with units or derived units)
   */
  private evaluateNumberArithmetic(
    op: "+" | "-" | "*" | "/" | "%" | "mod" | "per" | "^",
    left: NumberValue | DerivedUnitValue,
    right: NumberValue | DerivedUnitValue,
  ): Value {
    const leftValue = left.value;
    const rightValue = right.value;

    // Extract unit information
    const leftUnit = left.kind === "number" ? left.unit : undefined;
    const rightUnit = right.kind === "number" ? right.unit : undefined;
    const leftIsDerived = left.kind === "derivedUnit";
    const rightIsDerived = right.kind === "derivedUnit";

    // Addition and subtraction require same dimension
    if (op === "+" || op === "-") {
      // Both dimensionless numbers
      if (
        left.kind === "number" &&
        !left.unit &&
        right.kind === "number" &&
        !right.unit
      ) {
        const result =
          op === "+" ? leftValue + rightValue : leftValue - rightValue;
        return { kind: "number", value: result };
      }

      // Both simple units - must be same dimension
      if (
        left.kind === "number" &&
        left.unit &&
        right.kind === "number" &&
        right.unit
      ) {
        if (left.unit.dimension !== right.unit.dimension) {
          return this.createError(
            `Cannot ${op === "+" ? "add" : "subtract"} values between dimensions ${left.unit.dimension} and ${right.unit.dimension}`,
          );
        }

        try {
          const convertedRight = this.unitConverter.convert(
            rightValue,
            right.unit,
            left.unit,
          );
          const result =
            op === "+"
              ? leftValue + convertedRight
              : leftValue - convertedRight;
          return { kind: "number", value: result, unit: left.unit };
        } catch (e) {
          return this.createError(`Conversion error: ${e}`);
        }
      }

      // Derived units or mixed (NumberValue with unit + DerivedUnitValue)
      // Convert both to base units, perform op, convert back to left's form
      const leftTerms = this.extractTerms(left);
      const rightTerms = this.extractTerms(right);

      // Both must have units
      if (leftTerms.length === 0 || rightTerms.length === 0) {
        return this.createError(
          `Cannot ${op === "+" ? "add" : "subtract"} values between dimensionless and dimensioned values`,
        );
      }

      const leftDim = this.computeDimension(leftTerms);
      const rightDim = this.computeDimension(rightTerms);

      if (!this.areDimensionsCompatible(leftDim, rightDim)) {
        return this.createError(
          `Cannot ${op === "+" ? "add" : "subtract"} values between dimensions ${this.formatDimension(leftDim)} and ${this.formatDimension(rightDim)}`,
        );
      }

      // Convert both values to base units
      let leftInBase = leftValue;
      for (const term of leftTerms) {
        const factorToBase = this.unitConverter.toBaseUnit(1, term.unit);
        leftInBase *= Math.pow(factorToBase, term.exponent);
      }

      let rightInBase = rightValue;
      for (const term of rightTerms) {
        const factorToBase = this.unitConverter.toBaseUnit(1, term.unit);
        rightInBase *= Math.pow(factorToBase, term.exponent);
      }

      // Perform operation in base units
      const baseResult =
        op === "+" ? leftInBase + rightInBase : leftInBase - rightInBase;

      // Convert back to left operand's unit terms
      let finalResult = baseResult;
      for (const term of leftTerms) {
        const factorFromBase = this.unitConverter.fromBaseUnit(1, term.unit);
        finalResult *= Math.pow(factorFromBase, term.exponent);
      }

      // Return in the left operand's form
      if (left.kind === "number" && left.unit) {
        return { kind: "number", value: finalResult, unit: left.unit };
      }
      return {
        kind: "derivedUnit",
        value: finalResult,
        terms: leftTerms,
      };
    }

    // Multiplication - combine units
    if (op === "*") {
      const result = leftValue * rightValue;
      return this.multiplyValues(result, left, right);
    }

    // Division
    if (op === "/" || op === "per") {
      if (rightValue === 0) {
        return this.createError("Division by zero");
      }

      const result = leftValue / rightValue;

      // Special case: same dimension with simple units - try to convert and simplify
      if (
        left.kind === "number" &&
        right.kind === "number" &&
        left.unit &&
        right.unit &&
        left.unit.dimension === right.unit.dimension
      ) {
        try {
          const convertedRight = this.unitConverter.convert(
            rightValue,
            right.unit,
            left.unit,
          );
          return { kind: "number", value: leftValue / convertedRight };
        } catch (e) {
          // Conversion failed, fall through to general case
        }
      }

      // General case: use term combination
      return this.divideValues(result, left, right);
    }

    // Modulo
    if (op === "%" || op === "mod") {
      if (
        left.kind === "number" &&
        !left.unit &&
        right.kind === "number" &&
        !right.unit
      ) {
        if (rightValue === 0) {
          return this.createError("Modulo by zero");
        }
        return { kind: "number", value: leftValue % rightValue };
      }
      return this.createError("Modulo requires dimensionless values");
    }

    // Power
    if (op === "^") {
      if (right.kind === "number" && !right.unit) {
        const result = Math.pow(leftValue, rightValue);

        // Handle exponentiation of units
        if (left.kind === "number" && left.unit) {
          // (5 m)^2 → 25 m²
          // (16 m²)^0.5 → 4 m (need to expand derived dimensions)

          // Check if this unit's dimension is derived
          const dimension = this.dataLoader.getDimensionById(
            left.unit.dimension,
          );
          if (
            dimension &&
            dimension.derivedFrom &&
            dimension.derivedFrom.length > 0
          ) {
            // Expand the derived dimension and apply the exponent
            const expandedTerms: Array<{ unit: Unit; exponent: number }> = [];
            for (const baseDim of dimension.derivedFrom) {
              const baseDimension = this.dataLoader.getDimensionById(
                baseDim.dimension,
              );
              if (!baseDimension) {
                return this.createError(
                  `Unknown base dimension: ${baseDim.dimension}`,
                );
              }
              // Find the base unit for this dimension
              const baseUnit = this.dataLoader.getUnitById(
                baseDimension.baseUnit,
              );
              if (!baseUnit) {
                return this.createError(
                  `No base unit for dimension: ${baseDim.dimension}`,
                );
              }
              // Apply the exponent: (dimension^baseDim.exponent)^rightValue
              expandedTerms.push({
                unit: baseUnit,
                exponent: baseDim.exponent * rightValue,
              });
            }
            return {
              kind: "derivedUnit",
              value: result,
              terms: expandedTerms,
            };
          } else {
            // Simple base dimension unit
            return {
              kind: "derivedUnit",
              value: result,
              terms: [{ unit: left.unit, exponent: rightValue }],
            };
          }
        }

        if (left.kind === "derivedUnit") {
          // (3 m/s)^2 → 9 m²/s²
          // Multiply all term exponents by the power
          // Also need to expand any derived dimensions in the terms
          const newTerms: Array<{ unit: Unit; exponent: number }> = [];

          for (const term of left.terms) {
            const dimension = this.dataLoader.getDimensionById(
              term.unit.dimension,
            );
            if (
              dimension &&
              dimension.derivedFrom &&
              dimension.derivedFrom.length > 0
            ) {
              // Expand derived dimension
              for (const baseDim of dimension.derivedFrom) {
                const baseDimension = this.dataLoader.getDimensionById(
                  baseDim.dimension,
                );
                if (!baseDimension) {
                  return this.createError(
                    `Unknown base dimension: ${baseDim.dimension}`,
                  );
                }
                const baseUnit = this.dataLoader.getUnitById(
                  baseDimension.baseUnit,
                );
                if (!baseUnit) {
                  return this.createError(
                    `No base unit for dimension: ${baseDim.dimension}`,
                  );
                }
                // (term^term.exponent)^rightValue, where term has baseDim.exponent
                newTerms.push({
                  unit: baseUnit,
                  exponent: baseDim.exponent * term.exponent * rightValue,
                });
              }
            } else {
              // Simple base dimension
              newTerms.push({
                unit: term.unit,
                exponent: term.exponent * rightValue,
              });
            }
          }

          return {
            kind: "derivedUnit",
            value: result,
            terms: newTerms,
          };
        }

        // Dimensionless number
        if (left.kind === "number") {
          return { kind: "number", value: result };
        }

        return this.createError("Cannot exponentiate this type");
      }
      return this.createError(
        `Exponent must be dimensionless, got ${right.kind}`,
      );
    }

    return this.createError(`Unknown arithmetic operator: ${op}`);
  }

  /**
   * Helper: Check if duration has date components (years, months, weeks, days)
   */
  private hasDateComponents(duration: Duration): boolean {
    return (
      duration.years !== 0 ||
      duration.months !== 0 ||
      duration.weeks !== 0 ||
      duration.days !== 0
    );
  }

  /**
   * Helper: Check if duration has time components (hours, minutes, seconds, milliseconds)
   */
  private hasTimeComponents(duration: Duration): boolean {
    return (
      duration.hours !== 0 ||
      duration.minutes !== 0 ||
      duration.seconds !== 0 ||
      duration.milliseconds !== 0
    );
  }

  /**
   * Helper: Check if duration is date-only (only date components, no time components)
   */
  private isDateOnlyDuration(duration: Duration): boolean {
    return (
      this.hasDateComponents(duration) && !this.hasTimeComponents(duration)
    );
  }

  /**
   * Helper: Check if duration is time-only (only time components, no date components)
   */
  private isTimeOnlyDuration(duration: Duration): boolean {
    return (
      !this.hasDateComponents(duration) && this.hasTimeComponents(duration)
    );
  }

  /**
   * Helper: Check if duration is datetime (has both date and time components)
   */
  private isDateTimeDuration(duration: Duration): boolean {
    return this.hasDateComponents(duration) && this.hasTimeComponents(duration);
  }

  /**
   * Helper: Normalize PlainDate/PlainTime/PlainDateTime to PlainDateTime for cross-type subtraction
   */
  private normalizeToPlainDateTime(value: Value): PlainDateTime | null {
    if (value.kind === "plainDateTime") {
      return value.dateTime;
    }

    if (value.kind === "plainDate") {
      // PlainDate → PlainDateTime at 00:00:00
      return {
        date: value.date,
        time: { hour: 0, minute: 0, second: 0, millisecond: 0 },
      };
    }

    if (value.kind === "plainTime") {
      // PlainTime → PlainDateTime with today's date
      const today = this.dateTimeEngine.getCurrentPlainDate();
      return {
        date: today,
        time: value.time,
      };
    }

    return null;
  }

  /**
   * Helper: Normalize PlainDate/PlainTime/PlainDateTime/ZonedDateTime/Instant to Instant
   */
  private normalizeToInstant(value: Value): Instant | null {
    const systemTimezone = Temporal.Now.timeZoneId();

    if (value.kind === "instant") {
      return value.instant;
    }

    if (value.kind === "zonedDateTime") {
      return this.dateTimeEngine.toInstant(
        value.zonedDateTime.dateTime,
        value.zonedDateTime.timezone,
      );
    }

    if (value.kind === "plainDateTime") {
      // Interpret as system local timezone
      return this.dateTimeEngine.toInstant(value.dateTime, systemTimezone);
    }

    if (value.kind === "plainDate") {
      // PlainDate → PlainDateTime at 00:00:00, then to Instant
      const plainDateTime: PlainDateTime = {
        date: value.date,
        time: { hour: 0, minute: 0, second: 0, millisecond: 0 },
      };
      return this.dateTimeEngine.toInstant(plainDateTime, systemTimezone);
    }

    if (value.kind === "plainTime") {
      // PlainTime → PlainDateTime with today's date, then to Instant
      const today = this.dateTimeEngine.getCurrentPlainDate();
      const plainDateTime: PlainDateTime = {
        date: today,
        time: value.time,
      };
      return this.dateTimeEngine.toInstant(plainDateTime, systemTimezone);
    }

    return null;
  }

  /**
   * Evaluate date/time arithmetic
   */
  private evaluateDateTimeArithmetic(
    op: string,
    left: Value,
    right: Value,
  ): Value {
    // === PlainDate Operations ===

    // PlainDate + PlainTime → PlainDateTime (SPECS.md line 845)
    if (left.kind === "plainDate" && right.kind === "plainTime" && op === "+") {
      const result = this.dateTimeEngine.combineDateAndTime(
        left.date,
        right.time,
      );
      return { kind: "plainDateTime", dateTime: result };
    }

    // PlainDate + Duration → PlainDate or PlainDateTime (if duration has time components)
    if (left.kind === "plainDate" && right.kind === "duration") {
      if (op === "+") {
        const result = this.dateTimeEngine.addToPlainDate(
          left.date,
          right.duration,
        );
        // Result can be PlainDate or PlainDateTime depending on duration
        // PlainDate has 'year' property, PlainDateTime has 'date' and 'time' properties
        if ("year" in result) {
          return { kind: "plainDate", date: result };
        } else {
          return { kind: "plainDateTime", dateTime: result };
        }
      }
      if (op === "-") {
        // Negate duration
        const negated = this.dateTimeEngine.negateDuration(right.duration);
        const result = this.dateTimeEngine.addToPlainDate(left.date, negated);
        // Result can be PlainDate or PlainDateTime depending on duration
        // PlainDate has 'year' property, PlainDateTime has 'date' and 'time' properties
        if ("year" in result) {
          return { kind: "plainDate", date: result };
        } else {
          return { kind: "plainDateTime", dateTime: result };
        }
      }
    }

    // PlainDate - PlainDate → Duration
    if (left.kind === "plainDate" && right.kind === "plainDate" && op === "-") {
      const duration = this.dateTimeEngine.subtractPlainDates(
        left.date,
        right.date,
      );
      return { kind: "duration", duration };
    }

    // === PlainTime Operations ===

    // PlainTime + Duration → PlainTime or PlainDateTime (if crosses day boundary or has date components)
    if (left.kind === "plainTime" && right.kind === "duration") {
      if (op === "+") {
        const result = this.dateTimeEngine.addToPlainTime(
          left.time,
          right.duration,
        );
        if ("date" in result) {
          return { kind: "plainDateTime", dateTime: result };
        }
        return { kind: "plainTime", time: result };
      }
      if (op === "-") {
        const negated = this.dateTimeEngine.negateDuration(right.duration);
        const result = this.dateTimeEngine.addToPlainTime(left.time, negated);
        if ("date" in result) {
          return { kind: "plainDateTime", dateTime: result };
        }
        return { kind: "plainTime", time: result };
      }
    }

    // PlainTime - PlainTime → Duration
    if (left.kind === "plainTime" && right.kind === "plainTime" && op === "-") {
      const duration = this.dateTimeEngine.subtractPlainTimes(
        left.time,
        right.time,
      );
      return { kind: "duration", duration };
    }

    // === PlainDateTime Operations ===

    // PlainDateTime + Duration → PlainDateTime
    if (left.kind === "plainDateTime" && right.kind === "duration") {
      if (op === "+") {
        const result = this.dateTimeEngine.addToPlainDateTime(
          left.dateTime,
          right.duration,
        );
        return { kind: "plainDateTime", dateTime: result };
      }
      if (op === "-") {
        const negated = this.dateTimeEngine.negateDuration(right.duration);
        const result = this.dateTimeEngine.addToPlainDateTime(
          left.dateTime,
          negated,
        );
        return { kind: "plainDateTime", dateTime: result };
      }
    }

    // PlainDateTime - PlainDateTime → Duration (SPECS.md line 899)
    if (
      left.kind === "plainDateTime" &&
      right.kind === "plainDateTime" &&
      op === "-"
    ) {
      const duration = this.dateTimeEngine.subtractPlainDateTimes(
        left.dateTime,
        right.dateTime,
      );
      return { kind: "duration", duration };
    }

    // === Instant Operations ===

    // Instant + Duration → Instant (SPECS.md lines 867-869)
    if (left.kind === "instant" && right.kind === "duration") {
      if (op === "+") {
        const result = this.dateTimeEngine.addToInstant(
          left.instant,
          right.duration,
        );
        return { kind: "instant", instant: result };
      }
      if (op === "-") {
        const result = this.dateTimeEngine.subtractFromInstant(
          left.instant,
          right.duration,
        );
        return { kind: "instant", instant: result };
      }
    }

    // Instant - Instant → Duration (SPECS.md line 912)
    if (left.kind === "instant" && right.kind === "instant" && op === "-") {
      const duration = this.dateTimeEngine.subtractInstants(
        left.instant,
        right.instant,
      );
      return { kind: "duration", duration };
    }

    // === ZonedDateTime Operations ===

    // ZonedDateTime + Duration → ZonedDateTime (SPECS.md lines 871-873)
    if (left.kind === "zonedDateTime" && right.kind === "duration") {
      if (op === "+") {
        const result = this.dateTimeEngine.addToZonedDateTime(
          left.zonedDateTime,
          right.duration,
        );
        return { kind: "zonedDateTime", zonedDateTime: result };
      }
      if (op === "-") {
        const result = this.dateTimeEngine.subtractFromZonedDateTime(
          left.zonedDateTime,
          right.duration,
        );
        return { kind: "zonedDateTime", zonedDateTime: result };
      }
    }

    // ZonedDateTime - ZonedDateTime → Duration (SPECS.md line 920)
    if (
      left.kind === "zonedDateTime" &&
      right.kind === "zonedDateTime" &&
      op === "-"
    ) {
      const duration = this.dateTimeEngine.subtractZonedDateTimes(
        left.zonedDateTime,
        right.zonedDateTime,
      );
      return { kind: "duration", duration };
    }

    // ZonedDateTime - PlainTime → Duration (treat RHS as today in local timezone)
    if (
      left.kind === "zonedDateTime" &&
      right.kind === "plainTime" &&
      op === "-"
    ) {
      const duration = this.dateTimeEngine.subtractPlainTimeFromZonedDateTime(
        left.zonedDateTime,
        right.time,
      );
      return { kind: "duration", duration };
    }

    // === Duration Operations ===

    // Duration + Duration → Duration
    if (left.kind === "duration" && right.kind === "duration") {
      if (op === "+") {
        const result = this.dateTimeEngine.addDurations(
          left.duration,
          right.duration,
        );
        return { kind: "duration", duration: result };
      }
      if (op === "-") {
        const negated = this.dateTimeEngine.negateDuration(right.duration);
        const result = this.dateTimeEngine.addDurations(left.duration, negated);
        return { kind: "duration", duration: result };
      }
    }

    // === Cross-Type Subtraction Operations (SPECS.md lines 882-920) ===

    // Only support subtraction for cross-type operations
    if (op === "-") {
      // PlainDateTime - PlainDate → Duration (SPECS.md line 889)
      if (left.kind === "plainDateTime" && right.kind === "plainDate") {
        const rightAsDateTime = this.normalizeToPlainDateTime(right);
        if (rightAsDateTime) {
          const duration = this.dateTimeEngine.subtractPlainDateTimes(
            left.dateTime,
            rightAsDateTime,
          );
          return { kind: "duration", duration };
        }
      }

      // PlainDateTime - PlainTime → Duration (SPECS.md line 893)
      if (left.kind === "plainDateTime" && right.kind === "plainTime") {
        const rightAsDateTime = this.normalizeToPlainDateTime(right);
        if (rightAsDateTime) {
          const duration = this.dateTimeEngine.subtractPlainDateTimes(
            left.dateTime,
            rightAsDateTime,
          );
          return { kind: "duration", duration };
        }
      }

      // PlainTime - PlainDate → Duration (SPECS.md line 882)
      if (left.kind === "plainTime" && right.kind === "plainDate") {
        const leftAsDateTime = this.normalizeToPlainDateTime(left);
        const rightAsDateTime = this.normalizeToPlainDateTime(right);
        if (leftAsDateTime && rightAsDateTime) {
          const duration = this.dateTimeEngine.subtractPlainDateTimes(
            leftAsDateTime,
            rightAsDateTime,
          );
          return { kind: "duration", duration };
        }
      }

      // PlainDate - PlainTime → Duration (SPECS.md line 886)
      if (left.kind === "plainDate" && right.kind === "plainTime") {
        const leftAsDateTime = this.normalizeToPlainDateTime(left);
        const rightAsDateTime = this.normalizeToPlainDateTime(right);
        if (leftAsDateTime && rightAsDateTime) {
          const duration = this.dateTimeEngine.subtractPlainDateTimes(
            leftAsDateTime,
            rightAsDateTime,
          );
          return { kind: "duration", duration };
        }
      }

      // PlainDate - PlainDateTime → Duration (SPECS.md line 887)
      if (left.kind === "plainDate" && right.kind === "plainDateTime") {
        const leftAsDateTime = this.normalizeToPlainDateTime(left);
        if (leftAsDateTime) {
          const duration = this.dateTimeEngine.subtractPlainDateTimes(
            leftAsDateTime,
            right.dateTime,
          );
          return { kind: "duration", duration };
        }
      }

      // PlainTime - PlainDateTime → Duration (SPECS.md line 891)
      if (left.kind === "plainTime" && right.kind === "plainDateTime") {
        const leftAsDateTime = this.normalizeToPlainDateTime(left);
        if (leftAsDateTime) {
          const duration = this.dateTimeEngine.subtractPlainDateTimes(
            leftAsDateTime,
            right.dateTime,
          );
          return { kind: "duration", duration };
        }
      }

      // Instant - PlainDate → Duration (SPECS.md line 905)
      // Instant - PlainTime → Duration (SPECS.md line 909)
      // Instant - PlainDateTime → Duration (SPECS.md line 910)
      // Instant - ZonedDateTime → Duration (SPECS.md line 911)
      if (
        left.kind === "instant" &&
        (right.kind === "plainDate" ||
          right.kind === "plainTime" ||
          right.kind === "plainDateTime" ||
          right.kind === "zonedDateTime")
      ) {
        const rightAsInstant = this.normalizeToInstant(right);
        if (rightAsInstant) {
          const duration = this.dateTimeEngine.subtractInstants(
            left.instant,
            rightAsInstant,
          );
          return { kind: "duration", duration };
        }
      }

      // ZonedDateTime - PlainDate → Duration (SPECS.md line 913)
      // ZonedDateTime - PlainDateTime → Duration (SPECS.md line 917)
      // ZonedDateTime - Instant → Duration (SPECS.md line 918)
      if (
        left.kind === "zonedDateTime" &&
        (right.kind === "plainDate" ||
          right.kind === "plainDateTime" ||
          right.kind === "instant")
      ) {
        const leftAsInstant = this.normalizeToInstant(left);
        const rightAsInstant = this.normalizeToInstant(right);
        if (leftAsInstant && rightAsInstant) {
          const duration = this.dateTimeEngine.subtractInstants(
            leftAsInstant,
            rightAsInstant,
          );
          return { kind: "duration", duration };
        }
      }

      // PlainDate - Instant → Duration (reverse of Instant - PlainDate)
      // PlainTime - Instant → Duration (reverse of Instant - PlainTime)
      // PlainDateTime - Instant → Duration (reverse of Instant - PlainDateTime)
      if (
        (left.kind === "plainDate" ||
          left.kind === "plainTime" ||
          left.kind === "plainDateTime") &&
        right.kind === "instant"
      ) {
        const leftAsInstant = this.normalizeToInstant(left);
        if (leftAsInstant) {
          const duration = this.dateTimeEngine.subtractInstants(
            leftAsInstant,
            right.instant,
          );
          return { kind: "duration", duration };
        }
      }

      // PlainDate - ZonedDateTime → Duration (reverse of ZonedDateTime - PlainDate)
      // PlainTime - ZonedDateTime → Duration
      // PlainDateTime - ZonedDateTime → Duration (reverse of ZonedDateTime - PlainDateTime)
      if (
        (left.kind === "plainDate" ||
          left.kind === "plainTime" ||
          left.kind === "plainDateTime") &&
        right.kind === "zonedDateTime"
      ) {
        const leftAsInstant = this.normalizeToInstant(left);
        const rightAsInstant = this.normalizeToInstant(right);
        if (leftAsInstant && rightAsInstant) {
          const duration = this.dateTimeEngine.subtractInstants(
            leftAsInstant,
            rightAsInstant,
          );
          return { kind: "duration", duration };
        }
      }

      // ZonedDateTime - PlainTime → Duration (already handled above, but included for completeness)
      // This was already implemented earlier in the method

      // Instant - ZonedDateTime and ZonedDateTime - Instant (already covered above)
    }

    return this.createError(
      `Unsupported date/time arithmetic: ${left.kind} ${op} ${right.kind}`,
    );
  }

  /**
   * Evaluate bitwise operators
   */
  private evaluateBitwise(
    op: "&" | "|" | "xor" | "<<" | ">>",
    left: Value,
    right: Value,
  ): Value {
    if (left.kind !== "number" || right.kind !== "number") {
      return this.createError(
        `Bitwise operators require numbers, got ${left.kind} and ${right.kind}`,
      );
    }

    if (left.unit || right.unit) {
      return this.createError(
        `Bitwise operators require dimensionless values, got ${left.unit || "none"} and ${right.unit || "none"}`,
      );
    }

    const leftInt = Math.trunc(left.value);
    const rightInt = Math.trunc(right.value);

    let result: number;
    switch (op) {
      case "&":
        result = leftInt & rightInt;
        break;
      case "|":
        result = leftInt | rightInt;
        break;
      case "xor":
        result = leftInt ^ rightInt;
        break;
      case "<<":
        result = leftInt << rightInt;
        break;
      case ">>":
        result = leftInt >> rightInt;
        break;
    }

    return { kind: "number", value: result };
  }

  /**
   * Evaluate a unary expression (Nearley AST)
   */
  private evaluateUnary(
    expr: NearleyAST.UnaryExpressionNode,
    context: EvaluationContext,
  ): Value {
    const operand = this.evaluateExpression(
      expr.argument as NearleyAST.ExpressionNode,
      context,
    );
    if (operand.kind === "error") return operand;

    const op = expr.operator;

    if (op === "minus") {
      if (operand.kind === "number") {
        return { kind: "number", value: -operand.value, unit: operand.unit };
      }
      if (operand.kind === "composite") {
        // Negate each component of the composite unit
        const negatedComponents = operand.components.map((comp) => ({
          value: -comp.value,
          unit: comp.unit,
        }));
        return { kind: "composite", components: negatedComponents };
      }
      if (operand.kind === "duration") {
        return {
          kind: "duration",
          duration: this.dateTimeEngine.negateDuration(operand.duration),
        };
      }
      return this.createError(`Cannot negate ${operand.kind}`);
    }

    if (op === "bang") {
      const bool = this.toBoolean(operand);
      if (bool.kind === "error") return bool;
      return { kind: "boolean", value: !bool.value };
    }

    if (op === "tilde") {
      if (operand.kind !== "number") {
        return this.createError(
          `Bitwise NOT requires a number, got ${operand.kind}`,
        );
      }
      if (operand.unit) {
        return this.createError(
          `Bitwise NOT requires dimensionless value, got ${operand.unit}`,
        );
      }
      return { kind: "number", value: ~Math.trunc(operand.value) };
    }

    return this.createError(`Unknown unary operator: ${op}`);
  }

  /**
   * Evaluate a postfix expression (factorial)
   */
  private evaluatePostfix(
    expr: NearleyAST.PostfixExpressionNode,
    context: EvaluationContext,
  ): Value {
    const operand = this.evaluateExpression(
      expr.argument as NearleyAST.ExpressionNode,
      context,
    );
    if (operand.kind === "error") return operand;

    if (expr.operator === "bang") {
      if (operand.kind !== "number") {
        return this.createError(
          `Factorial requires a number, got ${operand.kind}`,
        );
      }
      if (operand.unit) {
        return this.createError(
          `Factorial requires dimensionless value, got ${operand.unit}`,
        );
      }

      const n = operand.value;
      if (n < 0 || !Number.isInteger(n)) {
        return this.createError(
          `Factorial requires non-negative integer, got ${n}`,
        );
      }

      let result = 1;
      for (let i = 2; i <= n; i++) {
        result *= i;
      }

      return { kind: "number", value: result };
    }

    return this.createError(`Unknown postfix operator: ${expr.operator}`);
  }

  /**
   * Evaluate a function call (Nearley AST)
   */
  private evaluateFunctionCall(
    expr: NearleyAST.FunctionCallNode,
    context: EvaluationContext,
  ): Value {
    // Check if function preserves units (round, floor, ceil, abs, trunc, frac)
    const preservesUnits = [
      "round",
      "floor",
      "ceil",
      "abs",
      "trunc",
      "frac",
    ].includes(expr.name.toLowerCase());

    // Evaluate all arguments
    const args: number[] = [];
    let firstArgUnit: Unit | undefined;
    let secondArgUnit: Unit | undefined;

    // Special handling for duration arguments with preservesUnits functions
    let durationArg: DurationValue | undefined;

    const funcArgs = expr.arguments as NearleyAST.ExpressionNode[];
    for (let i = 0; i < funcArgs.length; i++) {
      const argExpr = funcArgs[i];
      let argValue = this.evaluateExpression(argExpr, context);
      if (argValue.kind === "error") return argValue;

      // For abs, round, floor, ceil, trunc, frac on duration: handle directly
      if (preservesUnits && i === 0 && argValue.kind === "duration") {
        durationArg = argValue;
        break; // Duration functions only take one argument
      }

      if (argValue.kind !== "number") {
        return this.createError(
          `Function argument must be a number, got ${argValue.kind}`,
        );
      }

      // Capture the first argument's unit if the function preserves units
      if (preservesUnits && i === 0 && "unit" in argValue) {
        firstArgUnit = argValue.unit;
      }

      // For functions with "nearest" parameter (round, floor, ceil, trunc),
      // convert subsequent arguments with units to match the first argument's unit
      if (
        preservesUnits &&
        i > 0 &&
        firstArgUnit &&
        "unit" in argValue &&
        argValue.unit
      ) {
        // Capture the second argument's unit for result conversion
        if (i === 1) {
          secondArgUnit = argValue.unit;
        }
        try {
          const convertedValue = this.unitConverter.convert(
            argValue.value,
            argValue.unit,
            firstArgUnit,
          );
          args.push(convertedValue);
        } catch (error) {
          return this.createError(
            `Cannot convert ${argValue.unit.displayName.singular} to ${firstArgUnit.displayName.singular} in function call`,
          );
        }
      }
      // For trig functions, convert angle to radians if needed
      else if (
        (argValue.unit?.id || this.settings.angleUnit) === "degree" &&
        this.isTrigFunction(expr.name)
      ) {
        args.push(this.degreesToRadians(argValue.value));
      } else {
        args.push(argValue.value);
      }
    }

    // Handle duration argument
    if (durationArg) {
      const funcName = expr.name.toLowerCase();
      if (funcName === "abs") {
        // abs(duration) → make all components positive
        return {
          kind: "duration",
          duration: {
            years: Math.abs(durationArg.duration.years),
            months: Math.abs(durationArg.duration.months),
            weeks: Math.abs(durationArg.duration.weeks),
            days: Math.abs(durationArg.duration.days),
            hours: Math.abs(durationArg.duration.hours),
            minutes: Math.abs(durationArg.duration.minutes),
            seconds: Math.abs(durationArg.duration.seconds),
            milliseconds: Math.abs(durationArg.duration.milliseconds),
          },
        };
      }
      return this.createError(
        `Function ${expr.name} does not support duration arguments`,
      );
    }

    // Execute function
    const result = this.mathFunctions.execute(expr.name, args);
    if (result.error) {
      return this.createError(result.error);
    }

    // For inverse trig functions, convert result and attach angle unit
    if (this.isInverseTrigFunction(expr.name)) {
      const angleUnit =
        this.settings.angleUnit === "degree"
          ? this.dataLoader.getUnitByName("degree")
          : this.dataLoader.getUnitByName("radian");

      const numericValue =
        this.settings.angleUnit === "degree"
          ? this.radiansToDegrees(result.value)
          : result.value;

      if (angleUnit) {
        return { kind: "number", value: numericValue, unit: angleUnit };
      }

      return { kind: "number", value: numericValue };
    }

    // Return result with preserved unit if applicable
    if (firstArgUnit) {
      // If there's a second argument with units (nearest parameter),
      // convert result to that unit for better readability
      if (secondArgUnit) {
        try {
          const convertedValue = this.unitConverter.convert(
            result.value,
            firstArgUnit,
            secondArgUnit,
          );
          return { kind: "number", value: convertedValue, unit: secondArgUnit };
        } catch (error) {
          // If conversion fails, fall back to first argument's unit
          return { kind: "number", value: result.value, unit: firstArgUnit };
        }
      }
      return { kind: "number", value: result.value, unit: firstArgUnit };
    }

    return { kind: "number", value: result.value };
  }

  /**
   * Evaluate relative instant keywords (now, today, tomorrow, yesterday)
   * Returns null if not a relative instant keyword
   */
  private evaluateRelativeInstantKeyword(name: string): Value | null {
    const lowerName = name.toLowerCase();

    switch (lowerName) {
      case "now":
      case "today": {
        const instant = this.dateTimeEngine.getCurrentInstant();
        return { kind: "instant", instant };
      }

      case "tomorrow": {
        const instant = this.dateTimeEngine.getCurrentInstant();
        return {
          kind: "instant",
          instant: { timestamp: instant.timestamp + 86400000 },
        };
      }

      case "yesterday": {
        const instant = this.dateTimeEngine.getCurrentInstant();
        return {
          kind: "instant",
          instant: { timestamp: instant.timestamp - 86400000 },
        };
      }

      default:
        return null;
    }
  }

  /**
   * Convert value to presentation format or base
   * Accepts format string (binary, hex, etc.) OR numeric base (2-36)
   * Preserves units - only formats the numeric value(s)
   */
  private convertToPresentation(
    value: Value,
    format: PresentationFormat | number,
  ): Value {
    // Don't wrap error values
    if (value.kind === "error") {
      return value;
    }

    // Handle date/time presentation formats
    // Accept both lowercase and grammar-produced format names (with spaces, mixed case)
    const dateTimeFormats: PresentationFormat[] = [
      "ISO 8601",
      "RFC 9557",
      "RFC 2822",
      "unix",
      "unixMilliseconds",
    ];
    if (typeof format === "string" && dateTimeFormats.includes(format)) {
      // Unix timestamps: convert date/time to numeric value (seconds or milliseconds since epoch)
      if (format === "unix" || format === "unixMilliseconds") {
        return this.convertToUnixTimestamp(
          value,
          format === "unixMilliseconds",
        );
      }

      // String formats (ISO 8601, RFC 9557, RFC 2822): wrap date/time value for special formatting
      if (
        value.kind === "plainDate" ||
        value.kind === "plainTime" ||
        value.kind === "plainDateTime" ||
        value.kind === "zonedDateTime" ||
        value.kind === "instant"
      ) {
        return {
          kind: "presentation",
          format,
          innerValue: value,
        };
      }

      return this.createError(
        `${format} format requires a date/time value, got ${value.kind}`,
      );
    }

    // Validate that value is numeric type (number, derivedUnit, or composite)
    if (
      value.kind !== "number" &&
      value.kind !== "derivedUnit" &&
      value.kind !== "composite"
    ) {
      const formatName = typeof format === "number" ? `base ${format}` : format;
      return this.createError(
        `${formatName} format requires a numeric value, got ${value.kind}`,
      );
    }

    // Validate base range for numeric base conversions
    if (typeof format === "number") {
      if (format < 2 || format > 36) {
        return this.createError(`Base must be between 2 and 36, got ${format}`);
      }
    }

    // Ordinal format requires integers
    if (format === "ordinal") {
      if (value.kind === "number" && !Number.isInteger(value.value)) {
        return this.createError(
          `ordinal format requires integer values, got ${value.value}`,
        );
      } else if (
        value.kind === "derivedUnit" &&
        !Number.isInteger(value.value)
      ) {
        return this.createError(
          `ordinal format requires integer values, got ${value.value}`,
        );
      } else if (value.kind === "composite") {
        for (const comp of value.components) {
          if (!Number.isInteger(comp.value)) {
            return this.createError(
              `ordinal format requires integer values, got ${comp.value}`,
            );
          }
        }
      }
    }

    // All other formats (binary, octal, hex, fraction, scientific, base N) accept any numeric value

    // Wrap the value with presentation format
    // Units and derived units are preserved - formatting applies only to numeric values
    return {
      kind: "presentation",
      format,
      innerValue: value,
    };
  }

  /**
   * Convert date/time value to Unix timestamp (seconds or milliseconds since epoch)
   */
  private convertToUnixTimestamp(value: Value, milliseconds: boolean): Value {
    let instant: Temporal.Instant;

    if (value.kind === "zonedDateTime") {
      // Convert ZonedDateTime to Instant
      const zdt = toTemporalZonedDateTime(value.zonedDateTime);
      instant = zdt.toInstant();
    } else if (value.kind === "instant") {
      // Convert custom Instant to Temporal.Instant
      instant = toTemporalInstant(value.instant);
    } else if (value.kind === "plainDateTime") {
      // For PlainDateTime, assume local timezone (system timezone)
      const systemTimeZone = Temporal.Now.timeZoneId();
      const pdt = toTemporalPlainDateTime(value.dateTime);
      const zdt = pdt.toZonedDateTime(systemTimeZone);
      instant = zdt.toInstant();
    } else if (value.kind === "plainDate") {
      // For PlainDate, assume 00:00:00 in local timezone
      const systemTimeZone = Temporal.Now.timeZoneId();
      const pd = toTemporalPlainDate(value.date);
      const zdt = pd.toZonedDateTime({
        timeZone: systemTimeZone,
        plainTime: "00:00:00",
      });
      instant = zdt.toInstant();
    } else {
      return this.createError(`Cannot convert ${value.kind} to Unix timestamp`);
    }

    // Convert to seconds or milliseconds since epoch
    const epochNanoseconds = instant.epochNanoseconds;
    const result = milliseconds
      ? Number(epochNanoseconds / 1_000_000n) // Convert to milliseconds
      : Number(epochNanoseconds / 1_000_000_000n); // Convert to seconds

    return { kind: "number", value: result };
  }

  /**
   * Extract property from date/time value
   */
  private extractProperty(value: Value, property: string): Value {
    // Map Nearley property names to internal names
    if (property === "weekday") property = "dayOfWeek";
    if (value.kind === "plainDate") {
      const date = value.date;
      const temporal = Temporal.PlainDate.from({
        year: date.year,
        month: date.month,
        day: date.day,
      });

      switch (property) {
        case "year":
          return { kind: "number", value: date.year };
        case "month":
          return { kind: "number", value: date.month };
        case "day":
          return { kind: "number", value: date.day };
        case "dayOfWeek":
          return { kind: "number", value: temporal.dayOfWeek };
        case "dayOfYear":
          return { kind: "number", value: temporal.dayOfYear };
        case "weekOfYear":
          return { kind: "number", value: temporal.weekOfYear ?? 0 };
        default:
          return this.createError(`Cannot extract ${property} from PlainDate`);
      }
    }

    if (value.kind === "plainTime") {
      const time = value.time;
      switch (property) {
        case "hour":
          return { kind: "number", value: time.hour };
        case "minute":
          return { kind: "number", value: time.minute };
        case "second":
          return { kind: "number", value: time.second };
        case "millisecond":
          return { kind: "number", value: time.millisecond || 0 };
        default:
          return this.createError(`Cannot extract ${property} from PlainTime`);
      }
    }

    if (value.kind === "plainDateTime") {
      const dt = value.dateTime;
      const temporal = Temporal.PlainDateTime.from({
        year: dt.date.year,
        month: dt.date.month,
        day: dt.date.day,
        hour: dt.time.hour,
        minute: dt.time.minute,
        second: dt.time.second,
        millisecond: dt.time.millisecond || 0,
      });

      switch (property) {
        case "year":
          return { kind: "number", value: dt.date.year };
        case "month":
          return { kind: "number", value: dt.date.month };
        case "day":
          return { kind: "number", value: dt.date.day };
        case "hour":
          return { kind: "number", value: dt.time.hour };
        case "minute":
          return { kind: "number", value: dt.time.minute };
        case "second":
          return { kind: "number", value: dt.time.second };
        case "millisecond":
          return { kind: "number", value: dt.time.millisecond || 0 };
        case "dayOfWeek":
          return { kind: "number", value: temporal.dayOfWeek };
        case "dayOfYear":
          return { kind: "number", value: temporal.dayOfYear };
        case "weekOfYear":
          return { kind: "number", value: temporal.weekOfYear ?? 0 };
        default:
          return this.createError(
            `Cannot extract ${property} from PlainDateTime`,
          );
      }
    }

    if (value.kind === "zonedDateTime") {
      const zdt = value.zonedDateTime;
      const temporal = Temporal.ZonedDateTime.from({
        year: zdt.dateTime.date.year,
        month: zdt.dateTime.date.month,
        day: zdt.dateTime.date.day,
        hour: zdt.dateTime.time.hour,
        minute: zdt.dateTime.time.minute,
        second: zdt.dateTime.time.second,
        millisecond: zdt.dateTime.time.millisecond || 0,
        timeZone: zdt.timezone,
      });

      switch (property) {
        case "year":
          return { kind: "number", value: zdt.dateTime.date.year };
        case "month":
          return { kind: "number", value: zdt.dateTime.date.month };
        case "day":
          return { kind: "number", value: zdt.dateTime.date.day };
        case "hour":
          return { kind: "number", value: zdt.dateTime.time.hour };
        case "minute":
          return { kind: "number", value: zdt.dateTime.time.minute };
        case "second":
          return { kind: "number", value: zdt.dateTime.time.second };
        case "millisecond":
          return { kind: "number", value: zdt.dateTime.time.millisecond || 0 };
        case "dayOfWeek":
          return { kind: "number", value: temporal.dayOfWeek };
        case "dayOfYear":
          return { kind: "number", value: temporal.dayOfYear };
        case "weekOfYear":
          return { kind: "number", value: temporal.weekOfYear ?? 0 };
        case "offset": {
          // Return offset as a duration or number with minute unit
          const offsetNanoseconds = temporal.offsetNanoseconds;
          // Special case: when offset is 0, return as number with minute unit for proper formatting
          if (offsetNanoseconds === 0) {
            const minuteUnit = this.dataLoader.getUnitById("minute");
            if (!minuteUnit) {
              return this.createError("Minute unit not found");
            }
            return { kind: "number", value: 0, unit: minuteUnit };
          }
          try {
            const duration = Temporal.Duration.from({
              nanoseconds: offsetNanoseconds,
            });
            const rounded = duration.round({
              largestUnit: "hour",
              smallestUnit: "minute",
            });
            return { kind: "duration", duration: rounded };
          } catch (error) {
            return this.createError(
              `Error creating duration for offset: ${error}`,
            );
          }
        }
        default:
          return this.createError(
            `Cannot extract ${property} from ZonedDateTime`,
          );
      }
    }

    return this.createError(`Cannot extract property from ${value.kind}`);
  }

  /**
   * Convert value to timezone using Temporal polyfill
   * Plain values (PlainTime, PlainDateTime) are interpreted as being in the system's local timezone
   */
  private convertToTimezone(value: Value, timezone: string): Value {
    // Get system's local timezone using Temporal
    const systemTimezone = Temporal.Now.timeZoneId();

    // Convert PlainTime to ZonedDateTime
    // Use today's date in system local timezone
    if (value.kind === "plainTime") {
      const now = Temporal.Now.plainDateTimeISO(systemTimezone);
      const plainDateTime: PlainDateTime = {
        date: { year: now.year, month: now.month, day: now.day },
        time: value.time,
      };
      // Interpret as system local timezone, then convert to target
      const instant = this.dateTimeEngine.toInstant(
        plainDateTime,
        systemTimezone,
      );
      const zonedDateTime = this.dateTimeEngine.toZonedDateTime(
        instant,
        timezone,
      );
      return { kind: "zonedDateTime", zonedDateTime };
    }

    // Convert PlainDateTime to ZonedDateTime
    // Interpret as system local timezone
    if (value.kind === "plainDateTime") {
      const instant = this.dateTimeEngine.toInstant(
        value.dateTime,
        systemTimezone,
      );
      const zonedDateTime = this.dateTimeEngine.toZonedDateTime(
        instant,
        timezone,
      );
      return { kind: "zonedDateTime", zonedDateTime };
    }

    // Convert Instant to ZonedDateTime in target timezone
    if (value.kind === "instant") {
      const zonedDateTime = this.dateTimeEngine.toZonedDateTime(
        value.instant,
        timezone,
      );
      return { kind: "zonedDateTime", zonedDateTime };
    }

    // Convert ZonedDateTime from one timezone to another
    if (value.kind === "zonedDateTime") {
      // Convert to Instant first, then to target timezone
      const instant = this.dateTimeEngine.toInstant(
        value.zonedDateTime.dateTime,
        value.zonedDateTime.timezone,
      );
      const zonedDateTime = this.dateTimeEngine.toZonedDateTime(
        instant,
        timezone,
      );
      return { kind: "zonedDateTime", zonedDateTime };
    }

    return this.createError(`Cannot convert ${value.kind} to timezone`);
  }

  private applyPrecisionToNumber(
    value: number,
    precision: number,
    mode: "decimals" | "sigfigs",
  ): number {
    if (mode === "decimals") {
      const multiplier = Math.pow(10, precision);
      return Math.round(value * multiplier) / multiplier;
    } else {
      if (value === 0) {
        return 0;
      } else {
        const magnitude = Math.floor(Math.log10(Math.abs(value)));
        const scale = Math.pow(10, magnitude - precision + 1);
        return Math.round(value / scale) * scale;
      }
    }
  }

  /**
   * Apply precision specification (decimals or significant figures)
   */
  private applyPrecision(
    value: Value,
    precision: number,
    mode: "decimals" | "sigfigs",
  ): Value {
    if (value.kind === "number") {
      return {
        kind: "number",
        value: this.applyPrecisionToNumber(value.value, precision, mode),
        unit: value.unit,
        precision: { count: precision, mode },
      };
    } else if (value.kind === "derivedUnit") {
      return {
        kind: "derivedUnit",
        value: this.applyPrecisionToNumber(value.value, precision, mode),
        terms: value.terms,
        precision: { count: precision, mode },
      };
    } else if (value.kind === "composite") {
      const adjustedComponents = value.components.map((comp) => ({
        value: this.applyPrecisionToNumber(comp.value, precision, mode),
        unit: comp.unit,
        precision: { count: precision, mode },
      }));
      return { kind: "composite", components: adjustedComponents };
    } else {
      return this.createError(`Cannot apply precision to ${value.kind}`);
    }
  }

  // Helper methods

  /**
   * Extract terms from a numeric value (number, NumberValue, or DerivedUnitValue)
   */
  private extractTerms(
    value: NumberValue | DerivedUnitValue,
  ): Array<{ unit: Unit; exponent: number }> {
    if (value.kind === "number") {
      return value.unit ? [{ unit: value.unit, exponent: 1 }] : [];
    }
    return value.terms;
  }

  /**
   * Combine terms from multiplication or division operations
   * For division, negate exponents of right side before calling
   */
  private combineTerms(
    leftTerms: Array<{ unit: Unit; exponent: number }>,
    rightTerms: Array<{ unit: Unit; exponent: number }>,
  ): Array<{ unit: Unit; exponent: number }> {
    // Create map to combine exponents for same unit IDs
    const termMap = new Map<string, { unit: Unit; exponent: number }>();

    // Add left terms
    for (const term of leftTerms) {
      const existing = termMap.get(term.unit.id);
      if (existing) {
        existing.exponent += term.exponent;
      } else {
        termMap.set(term.unit.id, { unit: term.unit, exponent: term.exponent });
      }
    }

    // Add right terms
    for (const term of rightTerms) {
      const existing = termMap.get(term.unit.id);
      if (existing) {
        existing.exponent += term.exponent;
      } else {
        termMap.set(term.unit.id, { unit: term.unit, exponent: term.exponent });
      }
    }

    // Filter out zero exponents and return
    return Array.from(termMap.values()).filter((t) => t.exponent !== 0);
  }

  /**
   * Simplify terms by converting compatible units and canceling opposing exponents
   * Returns simplified terms and a conversion factor to apply to the numeric value
   */
  private simplifyTerms(terms: Array<{ unit: Unit; exponent: number }>): {
    simplified: Array<{ unit: Unit; exponent: number }>;
    factor: number;
  } {
    // Group terms by dimension
    const byDimension = new Map<
      string,
      Array<{ unit: Unit; exponent: number }>
    >();
    for (const term of terms) {
      const dimension = term.unit.dimension;
      if (!byDimension.has(dimension)) {
        byDimension.set(dimension, []);
      }
      byDimension.get(dimension)!.push(term);
    }

    let factor = 1.0;
    const simplified: Array<{ unit: Unit; exponent: number }> = [];

    // For each dimension, check if units can be converted and canceled
    for (const [dimension, dimTerms] of byDimension) {
      if (dimTerms.length === 1) {
        // Single unit for this dimension, keep as-is
        simplified.push(dimTerms[0]);
      } else {
        // Multiple units of same dimension - convert to common base unit and cancel
        // Calculate total exponent
        const totalExponent = dimTerms.reduce((sum, t) => sum + t.exponent, 0);

        // Apply conversion factors to the numeric value
        for (const term of dimTerms) {
          // Factor raised to the power of the exponent
          const unitFactor =
            term.unit.conversion.type === "linear"
              ? term.unit.conversion.factor
              : term.unit.conversion.type === "affine"
                ? term.unit.conversion.factor
                : 1.0; // variant conversion doesn't have a simple factor
          const conversionFactor = Math.pow(unitFactor, term.exponent);
          factor *= conversionFactor;
        }

        // If total exponent is not zero, keep one representative unit with the total exponent
        if (totalExponent !== 0) {
          // Use the first unit as the representative (arbitrary choice)
          simplified.push({ unit: dimTerms[0].unit, exponent: totalExponent });
        }
        // If total exponent is zero, the units cancel completely (no term added)
      }
    }

    return { simplified, factor };
  }

  /**
   * Create result value from combined terms
   */
  private createValueFromTerms(
    value: number,
    terms: Array<{ unit: Unit; exponent: number }>,
  ): NumberValue | DerivedUnitValue {
    // No terms - dimensionless
    if (terms.length === 0) {
      return { kind: "number", value };
    }

    // Single term with exponent 1 - simple unit
    if (terms.length === 1 && terms[0].exponent === 1) {
      return { kind: "number", value, unit: terms[0].unit };
    }

    // Multiple terms or non-unit exponent - derived unit
    return { kind: "derivedUnit", value, terms };
  }

  /**
   * Multiply two numeric values (handles all combinations of number/unit/derived)
   */
  private multiplyValues(
    value: number,
    left: NumberValue | DerivedUnitValue,
    right: NumberValue | DerivedUnitValue,
  ): NumberValue | DerivedUnitValue {
    const leftTerms = this.extractTerms(left);
    const rightTerms = this.extractTerms(right);
    const combinedTerms = this.combineTerms(leftTerms, rightTerms);
    const { simplified, factor } = this.simplifyTerms(combinedTerms);
    const finalValue = value * factor;
    return this.createValueFromTerms(finalValue, simplified);
  }

  /**
   * Divide two numeric values (handles all combinations of number/unit/derived)
   */
  private divideValues(
    value: number,
    left: NumberValue | DerivedUnitValue,
    right: NumberValue | DerivedUnitValue,
  ): NumberValue | DerivedUnitValue {
    const leftTerms = this.extractTerms(left);
    const rightTerms = this.extractTerms(right).map((t) => ({
      unit: t.unit,
      exponent: -t.exponent,
    }));
    const combinedTerms = this.combineTerms(leftTerms, rightTerms);
    const { simplified, factor } = this.simplifyTerms(combinedTerms);
    return this.createValueFromTerms(value * factor, simplified);
  }

  /**
   * Convert value to boolean
   */
  private toBoolean(value: Value): BooleanValue | ErrorValue {
    if (value.kind === "boolean") {
      return value;
    }
    if (value.kind === "number") {
      return { kind: "boolean", value: value.value !== 0 };
    }
    return this.createError(`Cannot convert ${value.kind} to boolean`);
  }

  /**
   * Check if value is a date/time type
   */
  private isDateTime(value: Value): value is DateTimeValue {
    return (
      value.kind === "plainDate" ||
      value.kind === "plainTime" ||
      value.kind === "plainDateTime" ||
      value.kind === "instant" ||
      value.kind === "zonedDateTime" ||
      value.kind === "duration"
    );
  }

  /**
   * Check if function name is a trig function for radian/degree conversion
   */
  private isTrigFunction(name: string): boolean {
    // Only regular trig functions (NOT hyperbolic) work with angles
    const trigFunctions = ["sin", "cos", "tan"];
    return trigFunctions.includes(name.toLowerCase());
  }

  /**
   * Check if function name is an inverse trig function for radian/degree conversion
   */
  private isInverseTrigFunction(name: string): boolean {
    // Only regular inverse trig functions (NOT hyperbolic) return angles
    const inverseTrigFunctions = [
      "asin",
      "acos",
      "atan",
      "arcsin",
      "arccos",
      "arctan",
    ];
    return inverseTrigFunctions.includes(name.toLowerCase());
  }

  /**
   * Convert degrees to radians
   */
  private degreesToRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Convert radians to degrees
   */
  private radiansToDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
  }

  /**
   * Create an error value
   */
  private createError(message: string): ErrorValue {
    return {
      kind: "error",
      error: {
        type: "RuntimeError",
        message,
      },
    };
  }

  /**
   * Compute dimension from derived unit terms
   *
   * Returns a map of base dimension ID → total exponent
   * Example: km/h → {length: 1, time: -1}
   */
  private computeDimension(
    terms: Array<{ unit: Unit; exponent: number }>,
  ): Map<string, number> {
    const dimensionMap = new Map<string, number>();

    for (const term of terms) {
      // Get the dimension of this unit
      const dimension = this.dataLoader.getDimensionById(term.unit.dimension);

      // Handle user-defined dimensions (not in dimension database)
      if (!dimension) {
        // User-defined units have dimensions like "user_defined_person"
        // Treat them as their own base dimensions
        if (term.unit.dimension.startsWith("user_defined_")) {
          const currentExp = dimensionMap.get(term.unit.dimension) || 0;
          dimensionMap.set(term.unit.dimension, currentExp + term.exponent);
          continue;
        }

        // Handle currency dimensions (not in units database)
        // Currency dimension or ambiguous currency dimensions (currency_symbol_*)
        if (
          term.unit.dimension === "currency" ||
          term.unit.dimension.startsWith("currency_symbol_")
        ) {
          const currentExp = dimensionMap.get(term.unit.dimension) || 0;
          dimensionMap.set(term.unit.dimension, currentExp + term.exponent);
          continue;
        }

        throw new Error(`Unknown dimension: ${term.unit.dimension}`);
      }

      // If it's a base dimension, add directly
      if (!dimension.derivedFrom || dimension.derivedFrom.length === 0) {
        const currentExp = dimensionMap.get(dimension.id) || 0;
        dimensionMap.set(dimension.id, currentExp + term.exponent);
      } else {
        // If it's a derived dimension, expand it
        for (const baseDim of dimension.derivedFrom) {
          const currentExp = dimensionMap.get(baseDim.dimension) || 0;
          // Multiply exponents: term.exponent * baseDim.exponent
          dimensionMap.set(
            baseDim.dimension,
            currentExp + term.exponent * baseDim.exponent,
          );
        }
      }
    }

    // Remove zero exponents
    for (const [key, value] of dimensionMap.entries()) {
      if (value === 0) {
        dimensionMap.delete(key);
      }
    }

    return dimensionMap;
  }

  /**
   * Convert a time-dimensioned number to duration components
   */
  private convertTimeToDuration(value: number, unit: Unit): Duration {
    // Map common time units to duration components
    const unitToDuration: Record<string, keyof Duration> = {
      year: "years",
      month: "months",
      week: "weeks",
      day: "days",
      hour: "hours",
      minute: "minutes",
      second: "seconds",
      millisecond: "milliseconds",
      ms: "milliseconds",
    };

    const durationKey = unitToDuration[unit.id];
    if (durationKey) {
      return this.dateTimeEngine.createDuration({ [durationKey]: value });
    }

    // For other time units (like fortnight, microsecond, etc.), convert to base unit first
    // Base unit for time is second
    const valueInSeconds = this.unitConverter.toBaseUnit(value, unit);
    return this.dateTimeEngine.createDuration({ seconds: valueInSeconds });
  }

  /**
   * Convert a composite unit to a single unit value for arithmetic
   * Example: (5 ft 6 in) → 5.5 ft
   */
  private convertCompositeToSingleUnit(
    composite: CompositeUnitValue,
  ): NumberValue | DerivedUnitValue | ErrorValue {
    if (composite.components.length === 0) {
      return this.createError("Empty composite unit");
    }

    // Use the first component's unit as the target unit
    const targetUnit = composite.components[0].unit;
    let totalValue = 0;

    // Convert all components to the target unit and sum them
    for (const component of composite.components) {
      try {
        const convertedValue = this.unitConverter.convert(
          component.value,
          component.unit,
          targetUnit,
        );
        totalValue += convertedValue;
      } catch (error) {
        return this.createError(
          `Cannot convert ${component.unit.displayName.singular} to ${targetUnit.displayName.singular}`,
        );
      }
    }

    // Return as NumberValue (simple unit) or DerivedUnitValue (derived unit)
    if (targetUnit.dimension) {
      // Simple unit with dimension
      return {
        kind: "number",
        value: totalValue,
        unit: targetUnit,
      };
    } else {
      // Dimensionless or derived unit
      return {
        kind: "number",
        value: totalValue,
        unit: targetUnit,
      };
    }
  }

  /**
   * Convert a composite unit with all time-dimensioned components to a duration
   */
  private convertCompositeTimeToDuration(
    composite: CompositeUnitValue,
  ): Duration {
    // Initialize empty duration
    const durationComponents: Partial<Duration> = {
      years: 0,
      months: 0,
      weeks: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    };

    // Map common time units to duration components
    const unitToDuration: Record<string, keyof Duration> = {
      year: "years",
      month: "months",
      week: "weeks",
      day: "days",
      hour: "hours",
      minute: "minutes",
      second: "seconds",
      millisecond: "milliseconds",
      ms: "milliseconds",
    };

    // Convert each component
    for (const comp of composite.components) {
      const durationKey = unitToDuration[comp.unit.id];
      if (durationKey) {
        durationComponents[durationKey] =
          (durationComponents[durationKey] || 0) + comp.value;
      } else {
        // For other time units, convert to seconds
        const valueInSeconds = this.unitConverter.toBaseUnit(
          comp.value,
          comp.unit,
        );
        durationComponents.seconds =
          (durationComponents.seconds || 0) + valueInSeconds;
      }
    }

    return this.dateTimeEngine.createDuration(durationComponents as Duration);
  }

  /**
   * Check if two dimension maps are compatible
   *
   * Two dimensions are compatible if they have the same base dimensions with the same exponents
   */
  private areDimensionsCompatible(
    dim1: Map<string, number>,
    dim2: Map<string, number>,
  ): boolean {
    // Check same number of dimensions
    if (dim1.size !== dim2.size) {
      return false;
    }

    // Check each dimension in dim1 exists in dim2 with same exponent
    for (const [dimId, exp1] of dim1.entries()) {
      const exp2 = dim2.get(dimId);
      if (exp2 === undefined || exp1 !== exp2) {
        return false;
      }
    }

    return true;
  }

  private formatDimension(dim: Map<string, number>): string {
    const parts: string[] = [];
    for (const [dimId, exp] of dim.entries()) {
      if (exp === 1) {
        parts.push(dimId);
      } else {
        const expStr = String(exp);
        let superscript = "";
        for (const char of expStr) {
          superscript += SUPERSCRIPTS[char] || char;
        }
        parts.push(`${dimId}${superscript}`);
      }
    }
    return parts.join(", ");
  }
}

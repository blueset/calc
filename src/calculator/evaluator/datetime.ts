import type { Duration, PlainDateTime, Instant } from "../date-time";
import type { Unit } from "../types/types";
import { Temporal } from "@js-temporal/polyfill";
import type { EvaluatorDeps } from "./eval-helpers";
import { createError } from "./eval-helpers";
import type {
  Value,
  DurationValue,
  NumericValue,
  CompositeUnitValue,
  ErrorValue,
} from "./values";
import {
  numVal,
  numValUnit,
  isDimensionless,
} from "./values";

// ── Duration predicates ─────────────────────────────────────────────

/** Check if duration has date components (years, months, weeks, days) */
export function hasDateComponents(duration: Duration): boolean {
  return (
    duration.years !== 0 ||
    duration.months !== 0 ||
    duration.weeks !== 0 ||
    duration.days !== 0
  );
}

/** Check if duration has time components (hours, minutes, seconds, milliseconds) */
export function hasTimeComponents(duration: Duration): boolean {
  return (
    duration.hours !== 0 ||
    duration.minutes !== 0 ||
    duration.seconds !== 0 ||
    duration.milliseconds !== 0
  );
}

/** Check if duration is date-only (only date components, no time components) */
export function isDateOnlyDuration(duration: Duration): boolean {
  return hasDateComponents(duration) && !hasTimeComponents(duration);
}

/** Check if duration is time-only (only time components, no date components) */
export function isTimeOnlyDuration(duration: Duration): boolean {
  return !hasDateComponents(duration) && hasTimeComponents(duration);
}

/** Check if duration is datetime (has both date and time components) */
export function isDateTimeDuration(duration: Duration): boolean {
  return hasDateComponents(duration) && hasTimeComponents(duration);
}

// ── Normalization helpers ───────────────────────────────────────────

/**
 * Normalize PlainDate/PlainTime/PlainDateTime to PlainDateTime for cross-type subtraction
 */
export function normalizeToPlainDateTime(
  deps: EvaluatorDeps,
  value: Value,
): PlainDateTime | null {
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
    const today = deps.dateTimeEngine.getCurrentPlainDate();
    return {
      date: today,
      time: value.time,
    };
  }

  return null;
}

/**
 * Normalize PlainDate/PlainTime/PlainDateTime/ZonedDateTime/Instant to Instant
 */
export function normalizeToInstant(
  deps: EvaluatorDeps,
  value: Value,
): Instant | null {
  const systemTimezone = Temporal.Now.timeZoneId();

  if (value.kind === "instant") {
    return value.instant;
  }

  if (value.kind === "zonedDateTime") {
    return deps.dateTimeEngine.toInstant(
      value.zonedDateTime.dateTime,
      value.zonedDateTime.timezone,
    );
  }

  if (value.kind === "plainDateTime") {
    // Interpret as system local timezone
    return deps.dateTimeEngine.toInstant(value.dateTime, systemTimezone);
  }

  if (value.kind === "plainDate") {
    // PlainDate → PlainDateTime at 00:00:00, then to Instant
    const plainDateTime: PlainDateTime = {
      date: value.date,
      time: { hour: 0, minute: 0, second: 0, millisecond: 0 },
    };
    return deps.dateTimeEngine.toInstant(plainDateTime, systemTimezone);
  }

  if (value.kind === "plainTime") {
    // PlainTime → PlainDateTime with today's date, then to Instant
    const today = deps.dateTimeEngine.getCurrentPlainDate();
    const plainDateTime: PlainDateTime = {
      date: today,
      time: value.time,
    };
    return deps.dateTimeEngine.toInstant(plainDateTime, systemTimezone);
  }

  return null;
}

// ── DateTime arithmetic ─────────────────────────────────────────────

/**
 * Evaluate date/time arithmetic
 */
export function evaluateDateTimeArithmetic(
  deps: EvaluatorDeps,
  op: string,
  left: Value,
  right: Value,
): Value {
  // === PlainDate Operations ===

  // PlainDate + PlainTime → PlainDateTime (SPECS.md line 845)
  if (left.kind === "plainDate" && right.kind === "plainTime" && op === "+") {
    const result = deps.dateTimeEngine.combineDateAndTime(
      left.date,
      right.time,
    );
    return { kind: "plainDateTime", dateTime: result };
  }

  // PlainDate + Duration → PlainDate or PlainDateTime (if duration has time components)
  if (left.kind === "plainDate" && right.kind === "duration") {
    if (op === "+") {
      const result = deps.dateTimeEngine.addToPlainDate(
        left.date,
        right.duration,
      );
      // Result can be PlainDate or PlainDateTime depending on duration
      if ("year" in result) {
        return { kind: "plainDate", date: result };
      } else {
        return { kind: "plainDateTime", dateTime: result };
      }
    }
    if (op === "-") {
      // Negate duration
      const negated = deps.dateTimeEngine.negateDuration(right.duration);
      const result = deps.dateTimeEngine.addToPlainDate(left.date, negated);
      if ("year" in result) {
        return { kind: "plainDate", date: result };
      } else {
        return { kind: "plainDateTime", dateTime: result };
      }
    }
  }

  // PlainDate - PlainDate → Duration
  if (left.kind === "plainDate" && right.kind === "plainDate" && op === "-") {
    const duration = deps.dateTimeEngine.subtractPlainDates(
      left.date,
      right.date,
    );
    return { kind: "duration", duration };
  }

  // === PlainTime Operations ===

  // PlainTime + Duration → PlainTime or PlainDateTime (if crosses day boundary or has date components)
  if (left.kind === "plainTime" && right.kind === "duration") {
    if (op === "+") {
      const result = deps.dateTimeEngine.addToPlainTime(
        left.time,
        right.duration,
      );
      if ("date" in result) {
        return { kind: "plainDateTime", dateTime: result };
      }
      return { kind: "plainTime", time: result };
    }
    if (op === "-") {
      const negated = deps.dateTimeEngine.negateDuration(right.duration);
      const result = deps.dateTimeEngine.addToPlainTime(left.time, negated);
      if ("date" in result) {
        return { kind: "plainDateTime", dateTime: result };
      }
      return { kind: "plainTime", time: result };
    }
  }

  // PlainTime - PlainTime → Duration
  if (left.kind === "plainTime" && right.kind === "plainTime" && op === "-") {
    const duration = deps.dateTimeEngine.subtractPlainTimes(
      left.time,
      right.time,
    );
    return { kind: "duration", duration };
  }

  // === PlainDateTime Operations ===

  // PlainDateTime + Duration → PlainDateTime
  if (left.kind === "plainDateTime" && right.kind === "duration") {
    if (op === "+") {
      const result = deps.dateTimeEngine.addToPlainDateTime(
        left.dateTime,
        right.duration,
      );
      return { kind: "plainDateTime", dateTime: result };
    }
    if (op === "-") {
      const negated = deps.dateTimeEngine.negateDuration(right.duration);
      const result = deps.dateTimeEngine.addToPlainDateTime(
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
    const duration = deps.dateTimeEngine.subtractPlainDateTimes(
      left.dateTime,
      right.dateTime,
    );
    return { kind: "duration", duration };
  }

  // === Instant Operations ===

  // Instant + Duration → Instant (SPECS.md lines 867-869)
  if (left.kind === "instant" && right.kind === "duration") {
    if (op === "+") {
      const result = deps.dateTimeEngine.addToInstant(
        left.instant,
        right.duration,
      );
      return { kind: "instant", instant: result };
    }
    if (op === "-") {
      const result = deps.dateTimeEngine.subtractFromInstant(
        left.instant,
        right.duration,
      );
      return { kind: "instant", instant: result };
    }
  }

  // Instant - Instant → Duration (SPECS.md line 912)
  if (left.kind === "instant" && right.kind === "instant" && op === "-") {
    const duration = deps.dateTimeEngine.subtractInstants(
      left.instant,
      right.instant,
    );
    return { kind: "duration", duration };
  }

  // === ZonedDateTime Operations ===

  // ZonedDateTime + Duration → ZonedDateTime (SPECS.md lines 871-873)
  if (left.kind === "zonedDateTime" && right.kind === "duration") {
    if (op === "+") {
      const result = deps.dateTimeEngine.addToZonedDateTime(
        left.zonedDateTime,
        right.duration,
      );
      return { kind: "zonedDateTime", zonedDateTime: result };
    }
    if (op === "-") {
      const result = deps.dateTimeEngine.subtractFromZonedDateTime(
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
    const duration = deps.dateTimeEngine.subtractZonedDateTimes(
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
    const duration = deps.dateTimeEngine.subtractPlainTimeFromZonedDateTime(
      left.zonedDateTime,
      right.time,
    );
    return { kind: "duration", duration };
  }

  // === Duration Operations ===

  // Duration + Duration → Duration
  if (left.kind === "duration" && right.kind === "duration") {
    if (op === "+") {
      const result = deps.dateTimeEngine.addDurations(
        left.duration,
        right.duration,
      );
      return { kind: "duration", duration: result };
    }
    if (op === "-") {
      const negated = deps.dateTimeEngine.negateDuration(right.duration);
      const result = deps.dateTimeEngine.addDurations(left.duration, negated);
      return { kind: "duration", duration: result };
    }
  }

  // Duration * N or Duration / N → Duration (scale duration by a dimensionless number)
  if (
    left.kind === "duration" &&
    right.kind === "value" &&
    isDimensionless(right)
  ) {
    if (op === "*") {
      return scaleDuration(deps, left.duration, right.value);
    }
    if (op === "/") {
      if (right.value === 0) {
        return createError("Division by zero");
      }
      return scaleDuration(deps, left.duration, 1 / right.value);
    }
  }

  // N * Duration → Duration (commutative multiplication)
  if (
    left.kind === "value" &&
    isDimensionless(left) &&
    right.kind === "duration"
  ) {
    if (op === "*") {
      return scaleDuration(deps, right.duration, left.value);
    }
  }

  // Duration / Duration → dimensionless number (ratio)
  if (left.kind === "duration" && right.kind === "duration") {
    if (op === "/") {
      const leftMs = durationToMilliseconds(left.duration);
      const rightMs = durationToMilliseconds(right.duration);
      if (rightMs === 0) {
        return createError("Division by zero");
      }
      return numVal(leftMs / rightMs);
    }
  }

  // === Cross-Type Subtraction Operations (SPECS.md lines 882-920) ===

  // Only support subtraction for cross-type operations
  if (op === "-") {
    // PlainDateTime - PlainDate → Duration (SPECS.md line 889)
    if (left.kind === "plainDateTime" && right.kind === "plainDate") {
      const rightAsDateTime = normalizeToPlainDateTime(deps, right);
      if (rightAsDateTime) {
        const duration = deps.dateTimeEngine.subtractPlainDateTimes(
          left.dateTime,
          rightAsDateTime,
        );
        return { kind: "duration", duration };
      }
    }

    // PlainDateTime - PlainTime → Duration (SPECS.md line 893)
    if (left.kind === "plainDateTime" && right.kind === "plainTime") {
      const rightAsDateTime = normalizeToPlainDateTime(deps, right);
      if (rightAsDateTime) {
        const duration = deps.dateTimeEngine.subtractPlainDateTimes(
          left.dateTime,
          rightAsDateTime,
        );
        return { kind: "duration", duration };
      }
    }

    // PlainTime - PlainDate → Duration (SPECS.md line 882)
    if (left.kind === "plainTime" && right.kind === "plainDate") {
      const leftAsDateTime = normalizeToPlainDateTime(deps, left);
      const rightAsDateTime = normalizeToPlainDateTime(deps, right);
      if (leftAsDateTime && rightAsDateTime) {
        const duration = deps.dateTimeEngine.subtractPlainDateTimes(
          leftAsDateTime,
          rightAsDateTime,
        );
        return { kind: "duration", duration };
      }
    }

    // PlainDate - PlainTime → Duration (SPECS.md line 886)
    if (left.kind === "plainDate" && right.kind === "plainTime") {
      const leftAsDateTime = normalizeToPlainDateTime(deps, left);
      const rightAsDateTime = normalizeToPlainDateTime(deps, right);
      if (leftAsDateTime && rightAsDateTime) {
        const duration = deps.dateTimeEngine.subtractPlainDateTimes(
          leftAsDateTime,
          rightAsDateTime,
        );
        return { kind: "duration", duration };
      }
    }

    // PlainDate - PlainDateTime → Duration (SPECS.md line 887)
    if (left.kind === "plainDate" && right.kind === "plainDateTime") {
      const leftAsDateTime = normalizeToPlainDateTime(deps, left);
      if (leftAsDateTime) {
        const duration = deps.dateTimeEngine.subtractPlainDateTimes(
          leftAsDateTime,
          right.dateTime,
        );
        return { kind: "duration", duration };
      }
    }

    // PlainTime - PlainDateTime → Duration (SPECS.md line 891)
    if (left.kind === "plainTime" && right.kind === "plainDateTime") {
      const leftAsDateTime = normalizeToPlainDateTime(deps, left);
      if (leftAsDateTime) {
        const duration = deps.dateTimeEngine.subtractPlainDateTimes(
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
      const rightAsInstant = normalizeToInstant(deps, right);
      if (rightAsInstant) {
        const duration = deps.dateTimeEngine.subtractInstants(
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
      const leftAsInstant = normalizeToInstant(deps, left);
      const rightAsInstant = normalizeToInstant(deps, right);
      if (leftAsInstant && rightAsInstant) {
        const duration = deps.dateTimeEngine.subtractInstants(
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
      const leftAsInstant = normalizeToInstant(deps, left);
      if (leftAsInstant) {
        const duration = deps.dateTimeEngine.subtractInstants(
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
      const leftAsInstant = normalizeToInstant(deps, left);
      const rightAsInstant = normalizeToInstant(deps, right);
      if (leftAsInstant && rightAsInstant) {
        const duration = deps.dateTimeEngine.subtractInstants(
          leftAsInstant,
          rightAsInstant,
        );
        return { kind: "duration", duration };
      }
    }
  }

  return createError(
    `Unsupported date/time arithmetic: ${left.kind} ${op} ${right.kind}`,
  );
}

// ── Duration conversion utilities ───────────────────────────────────

/**
 * Convert duration to milliseconds (approximate for calendar durations)
 */
export function durationToMilliseconds(duration: Duration): number {
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
 * Convert a time-dimensioned number to duration components
 */
export function convertTimeToDuration(
  deps: EvaluatorDeps,
  value: number,
  unit: Unit,
): Duration {
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
    return deps.dateTimeEngine.createDuration({ [durationKey]: value });
  }

  // For other time units (like fortnight, microsecond, etc.), convert to base unit first
  // Base unit for time is second
  const valueInSeconds = deps.unitConverter.toBaseUnit(value, unit);
  return deps.dateTimeEngine.createDuration({ seconds: valueInSeconds });
}

/**
 * Scale a Duration by a numeric factor, converting to milliseconds for fractional scaling.
 * For integer factors on clean durations, scales each field directly.
 */
export function scaleDuration(
  deps: EvaluatorDeps,
  duration: Duration,
  factor: number,
): DurationValue {
  // For integer factors, scale each field directly to preserve calendar semantics
  if (Number.isInteger(factor)) {
    return {
      kind: "duration",
      duration: deps.dateTimeEngine.createDuration({
        years: duration.years * factor,
        months: duration.months * factor,
        weeks: duration.weeks * factor,
        days: duration.days * factor,
        hours: duration.hours * factor,
        minutes: duration.minutes * factor,
        seconds: duration.seconds * factor,
        milliseconds: duration.milliseconds * factor,
      }),
    };
  }

  // For fractional factors, convert to milliseconds, scale, then reconstruct
  const totalMs = durationToMilliseconds(duration) * factor;
  return millisecondsToDuration(deps, totalMs);
}

/**
 * Convert milliseconds to a DurationValue with appropriate components.
 */
export function millisecondsToDuration(
  deps: EvaluatorDeps,
  totalMs: number,
): DurationValue {
  const rounded = Temporal.Duration.from({ milliseconds: totalMs }).round({
    largestUnit: "day",
    smallestUnit: "millisecond",
  });
  return {
    kind: "duration",
    duration: deps.dateTimeEngine.createDuration({
      days: rounded.days,
      hours: rounded.hours,
      minutes: rounded.minutes,
      seconds: rounded.seconds,
      milliseconds: rounded.milliseconds,
    }),
  };
}

/**
 * Convert a Duration to a NumericValue (single field) or CompositeUnitValue (multiple fields).
 * Inverse of convertTimeToDuration.
 */
export function durationToValue(
  deps: EvaluatorDeps,
  duration: Duration,
): NumericValue | CompositeUnitValue | ErrorValue {
  const durationToUnit: Array<{ field: keyof Duration; unitId: string }> = [
    { field: "years", unitId: "year" },
    { field: "months", unitId: "month" },
    { field: "weeks", unitId: "week" },
    { field: "days", unitId: "day" },
    { field: "hours", unitId: "hour" },
    { field: "minutes", unitId: "minute" },
    { field: "seconds", unitId: "second" },
    { field: "milliseconds", unitId: "millisecond" },
  ];

  const components: Array<{ value: number; unit: Unit }> = [];
  for (const { field, unitId } of durationToUnit) {
    const val = duration[field];
    if (val) {
      const unit = deps.dataLoader.getUnitById(unitId);
      if (!unit) continue;
      components.push({ value: val, unit });
    }
  }

  if (components.length === 0) {
    // Zero duration — return 0 seconds
    const secUnit = deps.dataLoader.getUnitById("second");
    if (!secUnit) return createError("Cannot resolve second unit");
    return numValUnit(0, secUnit);
  }

  if (components.length === 1) {
    return numValUnit(components[0].value, components[0].unit);
  }

  return { kind: "composite", components };
}

/**
 * Convert a composite unit to a single unit value for arithmetic
 * Example: (5 ft 6 in) → 5.5 ft
 */
export function convertCompositeToSingleUnit(
  deps: EvaluatorDeps,
  composite: CompositeUnitValue,
): NumericValue | ErrorValue {
  if (composite.components.length === 0) {
    return createError("Empty composite unit");
  }

  // Use the first component's unit as the target unit
  const targetUnit = composite.components[0].unit;
  let totalValue = 0;

  // Convert all components to the target unit and sum them
  for (const component of composite.components) {
    try {
      const convertedValue = deps.unitConverter.convert(
        component.value,
        component.unit,
        targetUnit,
      );
      totalValue += convertedValue;
    } catch (error) {
      console.error(
        `Error converting ${component.value} ${component.unit.id} to ${targetUnit.id}:`,
        error,
      );
      return createError(
        `Cannot convert ${component.unit.displayName.singular} to ${targetUnit.displayName.singular}`,
      );
    }
  }

  return numValUnit(totalValue, targetUnit);
}

/**
 * Convert a composite unit with all time-dimensioned components to a duration
 */
export function convertCompositeTimeToDuration(
  deps: EvaluatorDeps,
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
      const valueInSeconds = deps.unitConverter.toBaseUnit(
        comp.value,
        comp.unit,
      );
      durationComponents.seconds =
        (durationComponents.seconds || 0) + valueInSeconds;
    }
  }

  return deps.dateTimeEngine.createDuration(durationComponents as Duration);
}

import type {
  Duration,
  PlainDate,
  PlainTime,
  PlainDateTime,
  Instant,
  ZonedDateTime,
} from "../date-time";
import type { Unit } from "../types/types";

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
  | "percentage"
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
  | NumericValue
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
  innerValue: Value; // Can be NumericValue or CompositeUnitValue
}

/**
 * Unified numeric value — covers dimensionless numbers, simple units, and derived units.
 * terms: [] = dimensionless, [{unit, exponent:1}] = simple unit, multiple/non-1 = derived
 */
export interface NumericValue {
  kind: "value";
  value: number;
  terms: Array<{ unit: Unit; exponent: number }>; // [] = dimensionless
  precision?: { count: number; mode: "decimals" | "sigfigs" };
}

// ── NumericValue factory functions ──────────────────────────────────

/** Create a dimensionless numeric value */
export function numVal(
  value: number,
  precision?: { count: number; mode: "decimals" | "sigfigs" },
): NumericValue {
  return precision
    ? { kind: "value", value, terms: [], precision }
    : { kind: "value", value, terms: [] };
}

/** Create a numeric value with a single unit */
export function numValUnit(
  value: number,
  unit: Unit,
  precision?: { count: number; mode: "decimals" | "sigfigs" },
): NumericValue {
  return precision
    ? { kind: "value", value, terms: [{ unit, exponent: 1 }], precision }
    : { kind: "value", value, terms: [{ unit, exponent: 1 }] };
}

/** Create a numeric value with arbitrary unit terms */
export function numValTerms(
  value: number,
  terms: Array<{ unit: Unit; exponent: number }>,
  precision?: { count: number; mode: "decimals" | "sigfigs" },
): NumericValue {
  return precision
    ? { kind: "value", value, terms, precision }
    : { kind: "value", value, terms };
}

// ── NumericValue query functions ────────────────────────────────────

/** Get the simple unit if terms is exactly [{unit, exponent:1}], else undefined */
export function getUnit(v: NumericValue): Unit | undefined {
  return v.terms.length === 1 && v.terms[0].exponent === 1
    ? v.terms[0].unit
    : undefined;
}

/** True when terms is empty (dimensionless) */
export function isDimensionless(v: NumericValue): boolean {
  return v.terms.length === 0;
}

/** True when there is exactly one term with exponent 1 */
export function isSimpleUnit(v: NumericValue): boolean {
  return v.terms.length === 1 && v.terms[0].exponent === 1;
}

/** True when there are multiple terms or a non-1 exponent */
export function isDerived(v: NumericValue): boolean {
  return (
    v.terms.length > 1 || (v.terms.length === 1 && v.terms[0].exponent !== 1)
  );
}

/** True when v is a NumericValue */
export function isNumericValue(v: Value): v is NumericValue {
  return v.kind === "value";
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

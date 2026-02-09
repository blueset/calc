import type * as NearleyAST from "../nearley/types";
import type { DataLoader } from "../data-loader";
import type { UnitConverter } from "../unit-converter";
import type { DateTimeEngine } from "../date-time";
import type { CurrencyConverter } from "../currency";
import type { MathFunctions } from "../functions";
import type {
  Value,
  ErrorValue,
  BooleanValue,
  DateTimeValue,
  EvaluationContext,
  EvaluatorSettings,
} from "./values";

/**
 * Bundled dependencies that evaluation functions need from the Evaluator.
 */
export interface EvaluatorDeps {
  dataLoader: DataLoader;
  unitConverter: UnitConverter;
  dateTimeEngine: DateTimeEngine;
  currencyConverter: CurrencyConverter;
  mathFunctions: MathFunctions;
  settings: EvaluatorSettings;
}

/**
 * Callback type for recursive expression evaluation.
 * Avoids circular imports — the Evaluator binds its own method and passes it down.
 */
export type ExprEvaluator = (
  expr: NearleyAST.ExpressionNode,
  context: EvaluationContext,
) => Value;

/** Create an error value */
export function createError(message: string): ErrorValue {
  return {
    kind: "error",
    error: {
      type: "RuntimeError",
      message,
    },
  };
}

/** Convert value to boolean */
export function toBoolean(value: Value): BooleanValue | ErrorValue {
  if (value.kind === "boolean") {
    return value;
  }
  if (value.kind === "value") {
    return { kind: "boolean", value: value.value !== 0 };
  }
  return createError(`Cannot convert ${value.kind} to boolean`);
}

/** Check if value is a date/time type */
export function isDateTimeValue(value: Value): value is DateTimeValue {
  return (
    value.kind === "plainDate" ||
    value.kind === "plainTime" ||
    value.kind === "plainDateTime" ||
    value.kind === "instant" ||
    value.kind === "zonedDateTime" ||
    value.kind === "duration"
  );
}

/** Get the Math function for a duration-preserving operation */
export function getDurationMathFunc(
  funcName: string,
): ((n: number) => number) | null {
  switch (funcName) {
    case "abs":
      return Math.abs;
    case "round":
      return Math.round;
    case "floor":
      return Math.floor;
    case "ceil":
      return Math.ceil;
    case "trunc":
      return Math.trunc;
    case "frac":
      return (n: number) => n - Math.trunc(n);
    default:
      return null;
  }
}

/** Check if function name is a trig function for radian/degree conversion */
export function isTrigFunction(name: string): boolean {
  const trigFunctions = ["sin", "cos", "tan"];
  return trigFunctions.includes(name.toLowerCase());
}

/** Check if function name is an inverse trig function for radian/degree conversion */
export function isInverseTrigFunction(name: string): boolean {
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

/** Convert degrees to radians */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Convert radians to degrees */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

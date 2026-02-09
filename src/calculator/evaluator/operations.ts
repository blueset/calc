import * as NearleyAST from "../nearley/types";
import type { Unit } from "../types/types";
import type { EvaluatorDeps, ExprEvaluator } from "./eval-helpers";
import {
  createError,
  toBoolean,
  isDateTimeValue,
  getDurationMathFunc,
  isTrigFunction,
  isInverseTrigFunction,
  degreesToRadians,
  radiansToDegrees,
} from "./eval-helpers";
import type {
  Value,
  NumericValue,
  CompositeUnitValue,
  DurationValue,
  EvaluationContext,
} from "./values";
import {
  numVal,
  numValUnit,
  numValTerms,
  getUnit,
  isDimensionless,
  isSimpleUnit,
  isDerived,
  isNumericValue,
} from "./values";
import {
  computeDimension,
  areDimensionsCompatible,
  formatDimension,
  multiplyValues,
  divideValues,
} from "./unit-resolution";
import {
  evaluateDateTimeArithmetic,
  durationToValue,
  convertTimeToDuration,
  convertCompositeToSingleUnit,
  convertCompositeTimeToDuration,
} from "./datetime";
import { convertToCompositeUnitResolved } from "./conversion";

// ── Conditional ─────────────────────────────────────────────────────

/**
 * Evaluate a conditional expression (if-then-else)
 */
export function evaluateConditional(
  _deps: EvaluatorDeps,
  evalExpr: ExprEvaluator,
  expr: NearleyAST.ConditionalExprNode,
  context: EvaluationContext,
): Value {
  const condition = evalExpr(
    expr.condition as NearleyAST.ExpressionNode,
    context,
  );

  if (condition.kind === "error") {
    return condition;
  }

  // Convert condition to boolean
  const conditionBool = toBoolean(condition);
  if (conditionBool.kind === "error") {
    return conditionBool;
  }

  if (conditionBool.value) {
    return evalExpr(expr.then as NearleyAST.ExpressionNode, context);
  } else {
    return evalExpr(expr.else as NearleyAST.ExpressionNode, context);
  }
}

// ── Binary ──────────────────────────────────────────────────────────

/**
 * Evaluate a binary expression (Nearley AST)
 */
export function evaluateBinary(
  deps: EvaluatorDeps,
  evalExpr: ExprEvaluator,
  expr: NearleyAST.BinaryExpressionNode,
  context: EvaluationContext,
): Value {
  const left = evalExpr(expr.left as NearleyAST.ExpressionNode, context);
  if (left.kind === "error") return left;

  const right = evalExpr(expr.right as NearleyAST.ExpressionNode, context);
  if (right.kind === "error") return right;

  const op = expr.operator;

  // Map Nearley operators to internal operator strings
  switch (op) {
    // Logical
    case "and":
      return evaluateLogical("&&", left, right);
    case "or":
      return evaluateLogical("||", left, right);

    // Comparison
    case "equals":
      return evaluateComparison(deps, "==", left, right);
    case "notEquals":
      return evaluateComparison(deps, "!=", left, right);
    case "lessThan":
      return evaluateComparison(deps, "<", left, right);
    case "lessThanOrEqual":
      return evaluateComparison(deps, "<=", left, right);
    case "greaterThan":
      return evaluateComparison(deps, ">", left, right);
    case "greaterThanOrEqual":
      return evaluateComparison(deps, ">=", left, right);

    // Arithmetic
    case "plus":
      return evaluateArithmetic(deps, "+", left, right);
    case "minus":
      return evaluateArithmetic(deps, "-", left, right);
    case "times":
      return evaluateArithmetic(deps, "*", left, right);
    case "slash":
    case "divide":
      return evaluateArithmetic(deps, "/", left, right);
    case "percent":
    case "kw_mod":
      return evaluateArithmetic(deps, "%", left, right);
    case "kw_per":
      return evaluateArithmetic(deps, "per", left, right);
    case "caret":
    case "superscript":
      return evaluateArithmetic(deps, "^", left, right);

    // Bitwise
    case "ampersand":
      return evaluateBitwise("&", left, right);
    case "pipe":
      return evaluateBitwise("|", left, right);
    case "kw_xor":
      return evaluateBitwise("xor", left, right);
    case "lShift":
      return evaluateBitwise("<<", left, right);
    case "rShift":
      return evaluateBitwise(">>", left, right);

    default:
      return createError(`Unknown binary operator: ${op}`);
  }
}

/**
 * Evaluate logical operators (&& and ||)
 */
export function evaluateLogical(
  op: "&&" | "||",
  left: Value,
  right: Value,
): Value {
  const leftBool = toBoolean(left);
  if (leftBool.kind === "error") return leftBool;

  const rightBool = toBoolean(right);
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
export function evaluateComparison(
  deps: EvaluatorDeps,
  op: "==" | "!=" | "<" | "<=" | ">" | ">=",
  left: Value,
  right: Value,
): Value {
  // Convert Duration and composite units to numeric values for comparison
  let convertedLeft: Value = left;
  let convertedRight: Value = right;
  if (left.kind === "duration") {
    convertedLeft = durationToValue(deps, left.duration);
    if (convertedLeft.kind === "error") return convertedLeft;
  }
  if (right.kind === "duration") {
    convertedRight = durationToValue(deps, right.duration);
    if (convertedRight.kind === "error") return convertedRight;
  }
  if (convertedLeft.kind === "composite") {
    convertedLeft = convertCompositeToSingleUnit(deps, convertedLeft);
    if (convertedLeft.kind === "error") return convertedLeft;
  }
  if (convertedRight.kind === "composite") {
    convertedRight = convertCompositeToSingleUnit(deps, convertedRight);
    if (convertedRight.kind === "error") return convertedRight;
  }

  // For simple numbers (dimensionless or single unit), convert to same unit if needed
  if (
    convertedLeft.kind === "value" &&
    convertedRight.kind === "value" &&
    !isDerived(convertedLeft) &&
    !isDerived(convertedRight)
  ) {
    const leftNum = convertedLeft;
    const rightNum = convertedRight;
    const leftValue = leftNum.value;
    let rightValue = rightNum.value;

    // If both have units, convert right to left's unit
    const leftCmpU = getUnit(leftNum);
    const rightCmpU = getUnit(rightNum);
    if (leftCmpU && rightCmpU) {
      if (leftCmpU.dimension !== rightCmpU.dimension) {
        return createError(
          `Cannot compare values with dimensions ${leftCmpU.dimension} and ${rightCmpU.dimension}`,
        );
      }
      try {
        rightValue = deps.unitConverter.convert(
          rightNum.value,
          rightCmpU,
          leftCmpU,
        );
      } catch (e) {
        return createError(`Conversion error: ${e}`);
      }
    } else if (leftCmpU || rightCmpU) {
      // One has unit, other doesn't
      return createError(`Cannot compare dimensioned and dimensionless values`);
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

  // For derived units or mixed numeric comparisons
  if (isNumericValue(convertedLeft) && isNumericValue(convertedRight)) {
    const l = convertedLeft;
    const r = convertedRight;
    const leftTerms = l.terms;
    const rightTerms = r.terms;

    // Both must have units (dimensionless numbers handled above)
    if (leftTerms.length === 0 || rightTerms.length === 0) {
      return createError("Cannot compare dimensioned and dimensionless values");
    }

    const leftDim = computeDimension(deps, leftTerms);
    const rightDim = computeDimension(deps, rightTerms);
    if (!areDimensionsCompatible(leftDim, rightDim)) {
      return createError(
        `Cannot compare values with dimensions ${formatDimension(leftDim)} and ${formatDimension(rightDim)}`,
      );
    }

    // Convert both values to base units
    let leftInBase = l.value;
    for (const term of leftTerms) {
      const factorToBase = deps.unitConverter.toBaseUnit(1, term.unit);
      leftInBase *= Math.pow(factorToBase, term.exponent);
    }
    let rightInBase = r.value;
    for (const term of rightTerms) {
      const factorToBase = deps.unitConverter.toBaseUnit(1, term.unit);
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
    return createError(`Cannot use ${op} on boolean values`);
  }

  return createError(
    `Cannot compare values of types ${convertedLeft.kind} and ${convertedRight.kind}`,
  );
}

// ── Arithmetic ──────────────────────────────────────────────────────

/**
 * Evaluate arithmetic operators
 */
export function evaluateArithmetic(
  deps: EvaluatorDeps,
  op: "+" | "-" | "*" | "/" | "%" | "mod" | "per" | "^",
  left: Value,
  right: Value,
): Value {
  // Convert time-dimensioned numbers to durations for date arithmetic
  let convertedLeft = left;
  let convertedRight = right;

  // If left is a date/time type and right is a number with time dimension, convert right to duration
  if (isDateTimeValue(left) && right.kind === "value" && isSimpleUnit(right)) {
    const rightTimeUnit = getUnit(right)!;
    if (rightTimeUnit.dimension === "time") {
      const duration = convertTimeToDuration(deps, right.value, rightTimeUnit);
      convertedRight = { kind: "duration", duration };
    }
  }

  // If left is a date/time type and right is a composite unit, check if all components are time-dimensioned
  if (isDateTimeValue(left) && right.kind === "composite") {
    const allTimeComponents = right.components.every(
      (comp) => comp.unit.dimension === "time",
    );
    if (allTimeComponents) {
      const duration = convertCompositeTimeToDuration(deps, right);
      convertedRight = { kind: "duration", duration };
    }
  }

  // Handle date/time arithmetic
  if (isDateTimeValue(convertedLeft) || isDateTimeValue(convertedRight)) {
    return evaluateDateTimeArithmetic(deps, op, convertedLeft, convertedRight);
  }

  // Convert composite units to single units for arithmetic
  if (left.kind === "composite") {
    convertedLeft = convertCompositeToSingleUnit(deps, left);
    if (convertedLeft.kind === "error") {
      return convertedLeft;
    }
  }
  if (right.kind === "composite") {
    convertedRight = convertCompositeToSingleUnit(deps, right);
    if (convertedRight.kind === "error") {
      return convertedRight;
    }
  }

  // Handle numeric arithmetic
  if (isNumericValue(convertedLeft) && isNumericValue(convertedRight)) {
    return evaluateNumberArithmetic(deps, op, convertedLeft, convertedRight);
  }

  return createError(`Cannot perform ${op} on ${left.kind} and ${right.kind}`);
}

/**
 * Evaluate arithmetic on numbers (with units or derived units)
 */
export function evaluateNumberArithmetic(
  deps: EvaluatorDeps,
  op: "+" | "-" | "*" | "/" | "%" | "mod" | "per" | "^",
  left: NumericValue,
  right: NumericValue,
): Value {
  const leftValue = left.value;
  const rightValue = right.value;

  // Addition and subtraction require same dimension
  if (op === "+" || op === "-") {
    // Both dimensionless numbers
    if (isDimensionless(left) && isDimensionless(right)) {
      const result =
        op === "+" ? leftValue + rightValue : leftValue - rightValue;
      return numVal(result);
    }

    // Both simple units - must be same dimension
    const leftU = getUnit(left);
    const rightU = getUnit(right);
    if (leftU && rightU) {
      if (leftU.dimension !== rightU.dimension) {
        return createError(
          `Cannot ${op === "+" ? "add" : "subtract"} values between dimensions ${leftU.dimension} and ${rightU.dimension}`,
        );
      }

      try {
        const convertedRight = deps.unitConverter.convert(
          rightValue,
          rightU,
          leftU,
        );
        const result =
          op === "+" ? leftValue + convertedRight : leftValue - convertedRight;
        return numValUnit(result, leftU);
      } catch (e) {
        return createError(`Conversion error: ${e}`);
      }
    }

    // Derived units or mixed
    const leftTerms = left.terms;
    const rightTerms = right.terms;

    // Both must have units
    if (leftTerms.length === 0 || rightTerms.length === 0) {
      return createError(
        `Cannot ${op === "+" ? "add" : "subtract"} values between dimensionless and dimensioned values`,
      );
    }

    const leftDim = computeDimension(deps, leftTerms);
    const rightDim = computeDimension(deps, rightTerms);

    if (!areDimensionsCompatible(leftDim, rightDim)) {
      return createError(
        `Cannot ${op === "+" ? "add" : "subtract"} values between dimensions ${formatDimension(leftDim)} and ${formatDimension(rightDim)}`,
      );
    }

    // Convert both values to base units
    let leftInBase = leftValue;
    for (const term of leftTerms) {
      const factorToBase = deps.unitConverter.toBaseUnit(1, term.unit);
      leftInBase *= Math.pow(factorToBase, term.exponent);
    }

    let rightInBase = rightValue;
    for (const term of rightTerms) {
      const factorToBase = deps.unitConverter.toBaseUnit(1, term.unit);
      rightInBase *= Math.pow(factorToBase, term.exponent);
    }

    // Perform operation in base units
    const baseResult =
      op === "+" ? leftInBase + rightInBase : leftInBase - rightInBase;

    // Convert back to left operand's unit terms
    let finalResult = baseResult;
    for (const term of leftTerms) {
      const factorFromBase = deps.unitConverter.fromBaseUnit(1, term.unit);
      finalResult *= Math.pow(factorFromBase, term.exponent);
    }

    // Return in the left operand's form
    return numValTerms(finalResult, leftTerms);
  }

  // Multiplication - combine units
  if (op === "*") {
    const result = leftValue * rightValue;
    return multiplyValues(result, left, right, deps);
  }

  // Division
  if (op === "/" || op === "per") {
    if (rightValue === 0) {
      return createError("Division by zero");
    }

    const result = leftValue / rightValue;

    // Special case: same dimension with simple units - try to convert and simplify
    const divLeftU = getUnit(left);
    const divRightU = getUnit(right);
    if (divLeftU && divRightU && divLeftU.dimension === divRightU.dimension) {
      try {
        const convertedRight = deps.unitConverter.convert(
          rightValue,
          divRightU,
          divLeftU,
        );
        return numVal(leftValue / convertedRight);
      } catch (e) {
        console.error(`Conversion error during division: ${e}`);
        // Conversion failed, fall through to general case
      }
    }

    // General case: use term combination
    return divideValues(result, left, right, deps);
  }

  // Modulo
  if (op === "%" || op === "mod") {
    if (isDimensionless(left) && isDimensionless(right)) {
      if (rightValue === 0) {
        return createError("Modulo by zero");
      }
      return numVal(leftValue % rightValue);
    }
    return createError("Modulo requires dimensionless values");
  }

  // Power
  if (op === "^") {
    if (isDimensionless(right)) {
      const result = Math.pow(leftValue, rightValue);

      // Handle exponentiation of units
      const powLeftU = getUnit(left);
      if (powLeftU) {
        // Check if this unit's dimension is derived
        const dimension = deps.dataLoader.getDimensionById(powLeftU.dimension);
        if (
          dimension &&
          dimension.derivedFrom &&
          dimension.derivedFrom.length > 0
        ) {
          // Expand the derived dimension and apply the exponent
          const expandedTerms: Array<{ unit: Unit; exponent: number }> = [];
          for (const baseDim of dimension.derivedFrom) {
            const baseDimension = deps.dataLoader.getDimensionById(
              baseDim.dimension,
            );
            if (!baseDimension) {
              return createError(
                `Unknown base dimension: ${baseDim.dimension}`,
              );
            }
            const baseUnit = deps.dataLoader.getUnitById(
              baseDimension.baseUnit,
            );
            if (!baseUnit) {
              return createError(
                `No base unit for dimension: ${baseDim.dimension}`,
              );
            }
            expandedTerms.push({
              unit: baseUnit,
              exponent: baseDim.exponent * rightValue,
            });
          }
          return numValTerms(result, expandedTerms);
        } else {
          return numValTerms(result, [
            { unit: powLeftU, exponent: rightValue },
          ]);
        }
      }

      if (isDerived(left)) {
        const newTerms: Array<{ unit: Unit; exponent: number }> = [];

        for (const term of left.terms) {
          const dimension = deps.dataLoader.getDimensionById(
            term.unit.dimension,
          );
          if (
            dimension &&
            dimension.derivedFrom &&
            dimension.derivedFrom.length > 0
          ) {
            // Expand derived dimension
            for (const baseDim of dimension.derivedFrom) {
              const baseDimension = deps.dataLoader.getDimensionById(
                baseDim.dimension,
              );
              if (!baseDimension) {
                return createError(
                  `Unknown base dimension: ${baseDim.dimension}`,
                );
              }
              const baseUnit = deps.dataLoader.getUnitById(
                baseDimension.baseUnit,
              );
              if (!baseUnit) {
                return createError(
                  `No base unit for dimension: ${baseDim.dimension}`,
                );
              }
              newTerms.push({
                unit: baseUnit,
                exponent: baseDim.exponent * term.exponent * rightValue,
              });
            }
          } else {
            newTerms.push({
              unit: term.unit,
              exponent: term.exponent * rightValue,
            });
          }
        }

        return numValTerms(result, newTerms);
      }

      // Dimensionless number
      return numVal(result);
    }
    return createError(`Exponent must be dimensionless, got ${right.kind}`);
  }

  return createError(`Unknown arithmetic operator: ${op}`);
}

// ── Bitwise ─────────────────────────────────────────────────────────

/**
 * Evaluate bitwise operators
 */
export function evaluateBitwise(
  op: "&" | "|" | "xor" | "<<" | ">>",
  left: Value,
  right: Value,
): Value {
  if (left.kind !== "value" || right.kind !== "value") {
    return createError(
      `Bitwise operators require numbers, got ${left.kind} and ${right.kind}`,
    );
  }

  if (!isDimensionless(left) || !isDimensionless(right)) {
    return createError(`Bitwise operators require dimensionless values`);
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

  return numVal(result);
}

// ── Unary & Postfix ─────────────────────────────────────────────────

/**
 * Evaluate a unary expression (Nearley AST)
 */
export function evaluateUnary(
  deps: EvaluatorDeps,
  evalExpr: ExprEvaluator,
  expr: NearleyAST.UnaryExpressionNode,
  context: EvaluationContext,
): Value {
  const operand = evalExpr(expr.argument as NearleyAST.ExpressionNode, context);
  if (operand.kind === "error") return operand;

  const op = expr.operator;

  if (op === "minus") {
    if (operand.kind === "value") {
      return numValTerms(-operand.value, operand.terms, operand.precision);
    }
    if (operand.kind === "composite") {
      const negatedComponents = operand.components.map((comp) => ({
        value: -comp.value,
        unit: comp.unit,
      }));
      return { kind: "composite", components: negatedComponents };
    }
    if (operand.kind === "duration") {
      return {
        kind: "duration",
        duration: deps.dateTimeEngine.negateDuration(operand.duration),
      };
    }
    return createError(`Cannot negate ${operand.kind}`);
  }

  if (op === "bang") {
    const bool = toBoolean(operand);
    if (bool.kind === "error") return bool;
    return { kind: "boolean", value: !bool.value };
  }

  if (op === "tilde") {
    if (operand.kind !== "value") {
      return createError(`Bitwise NOT requires a number, got ${operand.kind}`);
    }
    if (!isDimensionless(operand)) {
      return createError(`Bitwise NOT requires dimensionless value`);
    }
    return numVal(~Math.trunc(operand.value));
  }

  return createError(`Unknown unary operator: ${op}`);
}

/**
 * Evaluate a postfix expression (factorial)
 */
export function evaluatePostfix(
  _deps: EvaluatorDeps,
  evalExpr: ExprEvaluator,
  expr: NearleyAST.PostfixExpressionNode,
  context: EvaluationContext,
): Value {
  const operand = evalExpr(expr.argument as NearleyAST.ExpressionNode, context);
  if (operand.kind === "error") return operand;

  if (expr.operator === "bang") {
    if (operand.kind !== "value") {
      return createError(`Factorial requires a number, got ${operand.kind}`);
    }
    if (!isDimensionless(operand)) {
      return createError(`Factorial requires dimensionless value`);
    }

    const n = operand.value;
    if (n < 0 || !Number.isInteger(n)) {
      return createError(`Factorial requires non-negative integer, got ${n}`);
    }

    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }

    return numVal(result);
  }

  return createError(`Unknown postfix operator: ${expr.operator}`);
}

// ── Function calls ──────────────────────────────────────────────────

/**
 * Evaluate a function call (Nearley AST)
 */
export function evaluateFunctionCall(
  deps: EvaluatorDeps,
  evalExpr: ExprEvaluator,
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
  // Special handling for composite unit arguments with preservesUnits functions
  let compositeArg: CompositeUnitValue | undefined;

  const funcArgs = expr.arguments as NearleyAST.ExpressionNode[];
  for (let i = 0; i < funcArgs.length; i++) {
    const argExpr = funcArgs[i];
    const argValue = evalExpr(argExpr, context);
    if (argValue.kind === "error") return argValue;

    // For round, floor, ceil, abs, trunc, frac on duration: handle directly
    if (preservesUnits && i === 0 && argValue.kind === "duration") {
      durationArg = argValue;
      break;
    }

    // For round, floor, ceil, abs, trunc, frac on composite: handle directly
    if (preservesUnits && i === 0 && argValue.kind === "composite") {
      compositeArg = argValue;
      break;
    }

    if (argValue.kind !== "value") {
      return createError(
        `Function argument must be a number, got ${argValue.kind}`,
      );
    }

    // Capture the first argument's unit if the function preserves units
    if (preservesUnits && i === 0) {
      firstArgUnit = getUnit(argValue);
    }

    // For functions with "nearest" parameter (round, floor, ceil, trunc),
    // convert subsequent arguments with units to match the first argument's unit
    const argUnit = getUnit(argValue);
    if (preservesUnits && i > 0 && firstArgUnit && argUnit) {
      // Capture the second argument's unit for result conversion
      if (i === 1) {
        secondArgUnit = argUnit;
      }
      try {
        const convertedValue = deps.unitConverter.convert(
          argValue.value,
          argUnit,
          firstArgUnit,
        );
        args.push(convertedValue);
      } catch (error) {
        console.error(`Unit conversion error in function ${expr.name}:`, error);
        return createError(
          `Cannot convert ${argUnit.displayName.singular} to ${firstArgUnit.displayName.singular} in function call`,
        );
      }
    }
    // For trig functions, convert angle to radians if needed
    else if (
      (getUnit(argValue)?.id || deps.settings.angleUnit) === "degree" &&
      isTrigFunction(expr.name)
    ) {
      args.push(degreesToRadians(argValue.value));
    } else {
      args.push(argValue.value);
    }
  }

  // Handle duration argument — apply function to each component
  if (durationArg) {
    const funcName = expr.name.toLowerCase();
    const mathFunc = getDurationMathFunc(funcName);
    if (!mathFunc) {
      return createError(
        `Function ${expr.name} does not support duration arguments`,
      );
    }
    return {
      kind: "duration",
      duration: deps.dateTimeEngine.createDuration({
        years: mathFunc(durationArg.duration.years),
        months: mathFunc(durationArg.duration.months),
        weeks: mathFunc(durationArg.duration.weeks),
        days: mathFunc(durationArg.duration.days),
        hours: mathFunc(durationArg.duration.hours),
        minutes: mathFunc(durationArg.duration.minutes),
        seconds: mathFunc(durationArg.duration.seconds),
        milliseconds: mathFunc(durationArg.duration.milliseconds),
      }),
    };
  }

  // Handle composite unit argument — flatten, apply function, re-composite
  if (compositeArg) {
    const converted = convertCompositeToSingleUnit(deps, compositeArg);
    if (converted.kind === "error") return converted;
    const funcResult = deps.mathFunctions.execute(expr.name, [converted.value]);
    if (funcResult.error) return createError(funcResult.error);
    // Re-composite into the original units
    const resultAsSimple = numValUnit(funcResult.value, getUnit(converted)!);
    const targetUnits = compositeArg.components.map((c) => c.unit);
    return convertToCompositeUnitResolved(deps, resultAsSimple, targetUnits);
  }

  // Execute function
  const result = deps.mathFunctions.execute(expr.name, args);
  if (result.error) {
    return createError(result.error);
  }

  // For inverse trig functions, convert result and attach angle unit
  if (isInverseTrigFunction(expr.name)) {
    const angleUnit =
      deps.settings.angleUnit === "degree"
        ? deps.dataLoader.getUnitByName("degree")
        : deps.dataLoader.getUnitByName("radian");

    const numericValue =
      deps.settings.angleUnit === "degree"
        ? radiansToDegrees(result.value)
        : result.value;

    if (angleUnit) {
      return numValUnit(numericValue, angleUnit);
    }

    return numVal(numericValue);
  }

  // Return result with preserved unit if applicable
  if (firstArgUnit) {
    if (secondArgUnit) {
      try {
        const convertedValue = deps.unitConverter.convert(
          result.value,
          firstArgUnit,
          secondArgUnit,
        );
        return numValUnit(convertedValue, secondArgUnit);
      } catch (error) {
        console.error(
          `Unit conversion error in function result conversion for ${expr.name}:`,
          error,
        );
        return numValUnit(result.value, firstArgUnit);
      }
    }
    return numValUnit(result.value, firstArgUnit);
  }

  return numVal(result.value);
}

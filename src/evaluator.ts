import * as AST from './ast';
import { DataLoader } from './data-loader';
import { UnitConverter, ConversionSettings } from './unit-converter';
import { DateTimeEngine, Duration, PlainDate, PlainTime, PlainDateTime, Instant, ZonedDateTime } from './date-time';
import { CurrencyConverter, CurrencyValue } from './currency';
import { MathFunctions } from './functions';
import { createErrorResult, ErrorResult } from './error-handling';
import type { Unit } from '../types/types';
import { getConstant } from './constants';

/**
 * Runtime value types
 * These represent actual evaluated values (not just types)
 */

export type Value =
  | NumberValue
  | CompositeUnitValue
  | DateTimeValue
  | BooleanValue
  | ErrorValue;

/**
 * Number value (with optional unit)
 */
export interface NumberValue {
  kind: 'number';
  value: number;
  unit?: Unit; // undefined = dimensionless
}

/**
 * Composite unit value (e.g., "5 ft 7 in")
 */
export interface CompositeUnitValue {
  kind: 'composite';
  components: Array<{
    value: number;
    unit: Unit;
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
  kind: 'plainDate';
  date: PlainDate;
}

export interface PlainTimeValue {
  kind: 'plainTime';
  time: PlainTime;
}

export interface PlainDateTimeValue {
  kind: 'plainDateTime';
  dateTime: PlainDateTime;
}

export interface InstantValue {
  kind: 'instant';
  instant: Instant;
}

export interface ZonedDateTimeValue {
  kind: 'zonedDateTime';
  zonedDateTime: ZonedDateTime;
}

export interface DurationValue {
  kind: 'duration';
  duration: Duration;
}

/**
 * Boolean value
 */
export interface BooleanValue {
  kind: 'boolean';
  value: boolean;
}

/**
 * Simple runtime error
 */
export interface SimpleRuntimeError {
  type: 'RuntimeError';
  message: string;
}

/**
 * Error value (propagated through evaluation)
 */
export interface ErrorValue {
  kind: 'error';
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
  variant: 'us' | 'uk';
  angleUnit: 'degree' | 'radian';
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
    settings: EvaluatorSettings = { variant: 'us', angleUnit: 'radian' }
  ) {
    this.dataLoader = dataLoader;
    this.settings = settings;
    this.unitConverter = new UnitConverter(dataLoader, { variant: settings.variant });
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
  evaluateDocument(document: AST.Document): Map<AST.Line, Value | null> {
    const context: EvaluationContext = { variables: new Map() };
    const lineValues = new Map<AST.Line, Value | null>();

    for (const line of document.lines) {
      const lineValue = this.evaluateLine(line, context);
      lineValues.set(line, lineValue);
    }

    return lineValues;
  }

  /**
   * Evaluate a single line
   */
  private evaluateLine(line: AST.Line, context: EvaluationContext): Value | null {
    switch (line.type) {
      case 'Heading':
      case 'PlainText':
      case 'EmptyLine':
        return null;

      case 'ExpressionLine':
        return this.evaluateExpression(line.expression, context);

      case 'VariableDefinition':
        const value = this.evaluateExpression(line.value, context);
        context.variables.set(line.name, value);
        return value;

      default:
        return this.createError(`Unknown line type: ${(line as any).type}`);
    }
  }

  /**
   * Evaluate an expression
   */
  private evaluateExpression(expr: AST.Expression, context: EvaluationContext): Value {
    switch (expr.type) {
      case 'ConditionalExpression':
        return this.evaluateConditional(expr, context);

      case 'ConversionExpression':
        return this.evaluateConversion(expr, context);

      case 'BinaryExpression':
        return this.evaluateBinary(expr, context);

      case 'UnaryExpression':
        return this.evaluateUnary(expr, context);

      case 'PostfixExpression':
        return this.evaluatePostfix(expr, context);

      case 'FunctionCall':
        return this.evaluateFunctionCall(expr, context);

      case 'GroupedExpression':
        return this.evaluateExpression(expr.expression, context);

      case 'Identifier':
        return this.evaluateIdentifier(expr, context);

      case 'NumberLiteral':
      case 'NumberWithUnit':
      case 'CompositeUnitLiteral':
      case 'PlainDateLiteral':
      case 'PlainTimeLiteral':
      case 'PlainDateTimeLiteral':
      case 'InstantLiteral':
      case 'ZonedDateTimeLiteral':
      case 'DurationLiteral':
      case 'BooleanLiteral':
      case 'ConstantLiteral':
        return this.evaluateLiteral(expr, context);

      default:
        return this.createError(`Unknown expression type: ${(expr as any).type}`);
    }
  }

  /**
   * Evaluate a literal expression
   */
  private evaluateLiteral(literal: AST.Literal, context: EvaluationContext): Value {
    switch (literal.type) {
      case 'NumberLiteral':
        return { kind: 'number', value: literal.value };

      case 'NumberWithUnit': {
        const unit = this.resolveUnit(literal.unit);
        if (!unit) {
          return this.createError(`Unknown unit in literal`);
        }
        return { kind: 'number', value: literal.value, unit };
      }

      case 'CompositeUnitLiteral': {
        const components = literal.components.map((comp) => {
          const unit = this.resolveUnit(comp.unit);
          if (!unit) {
            throw new Error(`Unknown unit in composite literal`);
          }
          return { value: comp.value, unit };
        });
        return { kind: 'composite', components };
      }

      case 'PlainDateLiteral':
        return {
          kind: 'plainDate',
          date: { year: literal.year, month: literal.month, day: literal.day }
        };

      case 'PlainTimeLiteral':
        return {
          kind: 'plainTime',
          time: {
            hour: literal.hour,
            minute: literal.minute,
            second: literal.second,
            millisecond: literal.millisecond || 0
          }
        };

      case 'PlainDateTimeLiteral':
        return {
          kind: 'plainDateTime',
          dateTime: {
            date: {
              year: literal.date.year,
              month: literal.date.month,
              day: literal.date.day
            },
            time: {
              hour: literal.time.hour,
              minute: literal.time.minute,
              second: literal.time.second,
              millisecond: literal.time.millisecond || 0
            }
          }
        };

      case 'InstantLiteral':
        return {
          kind: 'instant',
          instant: { timestamp: literal.timestamp }
        };

      case 'ZonedDateTimeLiteral':
        return {
          kind: 'zonedDateTime',
          zonedDateTime: {
            dateTime: {
              date: {
                year: literal.dateTime.date.year,
                month: literal.dateTime.date.month,
                day: literal.dateTime.date.day
              },
              time: {
                hour: literal.dateTime.time.hour,
                minute: literal.dateTime.time.minute,
                second: literal.dateTime.time.second,
                millisecond: literal.dateTime.time.millisecond || 0
              }
            },
            timezone: literal.timezone
          }
        };

      case 'DurationLiteral':
        return {
          kind: 'duration',
          duration: this.dateTimeEngine.createDuration(literal.components)
        };

      case 'BooleanLiteral':
        return { kind: 'boolean', value: literal.value };

      case 'ConstantLiteral': {
        const constantValue = getConstant(literal.name);
        if (constantValue === undefined) {
          return this.createError(`Unknown constant: ${literal.name}`);
        }
        return { kind: 'number', value: constantValue };
      }

      default:
        return this.createError(`Unknown literal type: ${(literal as any).type}`);
    }
  }

  /**
   * Evaluate a conditional expression (if-then-else)
   */
  private evaluateConditional(expr: AST.ConditionalExpression, context: EvaluationContext): Value {
    const condition = this.evaluateExpression(expr.condition, context);

    if (condition.kind === 'error') {
      return condition;
    }

    // Convert condition to boolean
    const conditionBool = this.toBoolean(condition);
    if (conditionBool.kind === 'error') {
      return conditionBool;
    }

    if (conditionBool.value) {
      return this.evaluateExpression(expr.thenBranch, context);
    } else {
      return this.evaluateExpression(expr.elseBranch, context);
    }
  }

  /**
   * Evaluate a conversion expression
   */
  private evaluateConversion(expr: AST.ConversionExpression, context: EvaluationContext): Value {
    const value = this.evaluateExpression(expr.expression, context);

    if (value.kind === 'error') {
      return value;
    }

    const target = expr.target;

    switch (target.type) {
      case 'UnitTarget':
        return this.convertToUnit(value, target.unit);

      case 'CompositeUnitTarget':
        return this.convertToCompositeUnit(value, target.units);

      case 'PresentationTarget':
        return this.convertToPresentation(value, target.format);

      case 'PropertyTarget':
        return this.extractProperty(value, target.property);

      case 'TimezoneTarget':
        return this.convertToTimezone(value, target.timezone);

      default:
        return this.createError(`Unknown conversion target: ${(target as any).type}`);
    }
  }

  /**
   * Evaluate a binary expression
   */
  private evaluateBinary(expr: AST.BinaryExpression, context: EvaluationContext): Value {
    const left = this.evaluateExpression(expr.left, context);
    if (left.kind === 'error') return left;

    const right = this.evaluateExpression(expr.right, context);
    if (right.kind === 'error') return right;

    const op = expr.operator;

    // Logical operators (short-circuit)
    if (op === '&&' || op === '||') {
      return this.evaluateLogical(op, left, right);
    }

    // Comparison operators
    if (op === '==' || op === '!=' || op === '<' || op === '<=' || op === '>' || op === '>=') {
      return this.evaluateComparison(op, left, right);
    }

    // Arithmetic operators
    if (op === '+' || op === '-' || op === '*' || op === '/' || op === '%' || op === 'mod' || op === 'per' || op === '^') {
      return this.evaluateArithmetic(op, left, right);
    }

    // Bitwise operators
    if (op === '&' || op === '|' || op === 'xor' || op === '<<' || op === '>>') {
      return this.evaluateBitwise(op, left, right);
    }

    return this.createError(`Unknown binary operator: ${op}`);
  }

  /**
   * Evaluate logical operators (&& and ||)
   */
  private evaluateLogical(op: '&&' | '||', left: Value, right: Value): Value {
    const leftBool = this.toBoolean(left);
    if (leftBool.kind === 'error') return leftBool;

    const rightBool = this.toBoolean(right);
    if (rightBool.kind === 'error') return rightBool;

    if (op === '&&') {
      return { kind: 'boolean', value: leftBool.value && rightBool.value };
    } else {
      return { kind: 'boolean', value: leftBool.value || rightBool.value };
    }
  }

  /**
   * Evaluate comparison operators
   */
  private evaluateComparison(
    op: '==' | '!=' | '<' | '<=' | '>' | '>=',
    left: Value,
    right: Value
  ): Value {
    // For numbers, convert to same unit if needed
    if (left.kind === 'number' && right.kind === 'number') {
      const leftValue = left.value;
      let rightValue = right.value;

      // If both have units, convert right to left's unit
      if (left.unit && right.unit) {
        if (left.unit.dimension !== right.unit.dimension) {
          return this.createError(`Cannot compare values with different dimensions`);
        }
        try {
          rightValue = this.unitConverter.convert(right.value, right.unit, left.unit);
        } catch (e) {
          return this.createError(`Conversion error: ${e}`);
        }
      } else if (left.unit || right.unit) {
        // One has unit, other doesn't
        return this.createError(`Cannot compare dimensioned and dimensionless values`);
      }

      switch (op) {
        case '==':
          return { kind: 'boolean', value: leftValue === rightValue };
        case '!=':
          return { kind: 'boolean', value: leftValue !== rightValue };
        case '<':
          return { kind: 'boolean', value: leftValue < rightValue };
        case '<=':
          return { kind: 'boolean', value: leftValue <= rightValue };
        case '>':
          return { kind: 'boolean', value: leftValue > rightValue };
        case '>=':
          return { kind: 'boolean', value: leftValue >= rightValue };
      }
    }

    // For booleans
    if (left.kind === 'boolean' && right.kind === 'boolean') {
      if (op === '==') return { kind: 'boolean', value: left.value === right.value };
      if (op === '!=') return { kind: 'boolean', value: left.value !== right.value };
      return this.createError(`Cannot use ${op} on boolean values`);
    }

    return this.createError(`Cannot compare values of types ${left.kind} and ${right.kind}`);
  }

  /**
   * Evaluate arithmetic operators
   */
  private evaluateArithmetic(
    op: '+' | '-' | '*' | '/' | '%' | 'mod' | 'per' | '^',
    left: Value,
    right: Value
  ): Value {
    // Handle date/time arithmetic
    if (this.isDateTime(left) || this.isDateTime(right)) {
      return this.evaluateDateTimeArithmetic(op, left, right);
    }

    // Handle number arithmetic
    if (left.kind === 'number' && right.kind === 'number') {
      return this.evaluateNumberArithmetic(op, left, right);
    }

    return this.createError(`Cannot perform ${op} on ${left.kind} and ${right.kind}`);
  }

  /**
   * Evaluate arithmetic on numbers (with units)
   */
  private evaluateNumberArithmetic(
    op: '+' | '-' | '*' | '/' | '%' | 'mod' | 'per' | '^',
    left: NumberValue,
    right: NumberValue
  ): Value {
    const leftValue = left.value;
    const rightValue = right.value;

    // Addition and subtraction require same dimension
    if (op === '+' || op === '-') {
      // Both dimensionless
      if (!left.unit && !right.unit) {
        const result = op === '+' ? leftValue + rightValue : leftValue - rightValue;
        return { kind: 'number', value: result };
      }

      // Both have units - must be same dimension
      if (left.unit && right.unit) {
        if (left.unit.dimension !== right.unit.dimension) {
          return this.createError(`Cannot ${op === '+' ? 'add' : 'subtract'} values with different dimensions`);
        }

        // Convert right to left's unit
        try {
          const convertedRight = this.unitConverter.convert(rightValue, right.unit, left.unit);
          const result = op === '+' ? leftValue + convertedRight : leftValue - convertedRight;
          return { kind: 'number', value: result, unit: left.unit };
        } catch (e) {
          return this.createError(`Conversion error: ${e}`);
        }
      }

      // One has unit, other doesn't
      return this.createError(`Cannot ${op === '+' ? 'add' : 'subtract'} dimensioned and dimensionless values`);
    }

    // Multiplication - combine units
    if (op === '*') {
      // Both dimensionless
      if (!left.unit && !right.unit) {
        return { kind: 'number', value: leftValue * rightValue };
      }

      // One or both have units - result is product
      // TODO: For now, keep left unit (simplified)
      // Full implementation would create derived unit
      const result = leftValue * rightValue;
      if (left.unit && right.unit) {
        // Both have units - would need to create derived unit
        // For now, simplified: keep left unit (this is incomplete)
        return { kind: 'number', value: result, unit: left.unit };
      } else {
        // One has unit
        return { kind: 'number', value: result, unit: left.unit || right.unit };
      }
    }

    // Division
    if (op === '/' || op === 'per') {
      // Both dimensionless
      if (!left.unit && !right.unit) {
        if (rightValue === 0) {
          return this.createError('Division by zero');
        }
        return { kind: 'number', value: leftValue / rightValue };
      }

      // Division with units
      // TODO: Full implementation would create derived units
      // For now, simplified version
      if (rightValue === 0) {
        return this.createError('Division by zero');
      }

      const result = leftValue / rightValue;

      // If both same dimension, result is dimensionless
      if (left.unit && right.unit && left.unit.dimension === right.unit.dimension) {
        const convertedRight = this.unitConverter.convert(rightValue, right.unit, left.unit);
        return { kind: 'number', value: leftValue / convertedRight };
      }

      // Otherwise keep left unit (simplified)
      return { kind: 'number', value: result, unit: left.unit };
    }

    // Modulo
    if (op === '%' || op === 'mod') {
      if (!left.unit && !right.unit) {
        if (rightValue === 0) {
          return this.createError('Modulo by zero');
        }
        return { kind: 'number', value: leftValue % rightValue };
      }
      return this.createError('Modulo requires dimensionless values');
    }

    // Power
    if (op === '^') {
      if (!right.unit) {
        const result = Math.pow(leftValue, rightValue);
        return { kind: 'number', value: result, unit: left.unit };
      }
      return this.createError('Exponent must be dimensionless');
    }

    return this.createError(`Unknown arithmetic operator: ${op}`);
  }

  /**
   * Evaluate date/time arithmetic
   */
  private evaluateDateTimeArithmetic(op: string, left: Value, right: Value): Value {
    // PlainDate + Duration → PlainDate
    if (left.kind === 'plainDate' && right.kind === 'duration') {
      if (op === '+') {
        const result = this.dateTimeEngine.addToPlainDate(left.date, right.duration);
        return { kind: 'plainDate', date: result };
      }
      if (op === '-') {
        // Negate duration
        const negated = this.dateTimeEngine.negateDuration(right.duration);
        const result = this.dateTimeEngine.addToPlainDate(left.date, negated);
        return { kind: 'plainDate', date: result };
      }
    }

    // PlainDate - PlainDate → Duration
    if (left.kind === 'plainDate' && right.kind === 'plainDate' && op === '-') {
      const duration = this.dateTimeEngine.subtractPlainDates(left.date, right.date);
      return { kind: 'duration', duration };
    }

    // PlainTime + Duration → PlainTime (or PlainDateTime if crosses day boundary)
    if (left.kind === 'plainTime' && right.kind === 'duration') {
      if (op === '+') {
        const result = this.dateTimeEngine.addToPlainTime(left.time, right.duration);
        if ('date' in result) {
          return { kind: 'plainDateTime', dateTime: result };
        }
        return { kind: 'plainTime', time: result };
      }
      if (op === '-') {
        const negated = this.dateTimeEngine.negateDuration(right.duration);
        const result = this.dateTimeEngine.addToPlainTime(left.time, negated);
        if ('date' in result) {
          return { kind: 'plainDateTime', dateTime: result };
        }
        return { kind: 'plainTime', time: result };
      }
    }

    // Duration + Duration → Duration
    if (left.kind === 'duration' && right.kind === 'duration') {
      if (op === '+') {
        const result = this.dateTimeEngine.addDurations(left.duration, right.duration);
        return { kind: 'duration', duration: result };
      }
      if (op === '-') {
        const negated = this.dateTimeEngine.negateDuration(right.duration);
        const result = this.dateTimeEngine.addDurations(left.duration, negated);
        return { kind: 'duration', duration: result };
      }
    }

    return this.createError(`Unsupported date/time arithmetic: ${left.kind} ${op} ${right.kind}`);
  }

  /**
   * Evaluate bitwise operators
   */
  private evaluateBitwise(op: '&' | '|' | 'xor' | '<<' | '>>', left: Value, right: Value): Value {
    if (left.kind !== 'number' || right.kind !== 'number') {
      return this.createError('Bitwise operators require numbers');
    }

    if (left.unit || right.unit) {
      return this.createError('Bitwise operators require dimensionless values');
    }

    const leftInt = Math.trunc(left.value);
    const rightInt = Math.trunc(right.value);

    let result: number;
    switch (op) {
      case '&':
        result = leftInt & rightInt;
        break;
      case '|':
        result = leftInt | rightInt;
        break;
      case 'xor':
        result = leftInt ^ rightInt;
        break;
      case '<<':
        result = leftInt << rightInt;
        break;
      case '>>':
        result = leftInt >> rightInt;
        break;
    }

    return { kind: 'number', value: result };
  }

  /**
   * Evaluate a unary expression
   */
  private evaluateUnary(expr: AST.UnaryExpression, context: EvaluationContext): Value {
    const operand = this.evaluateExpression(expr.operand, context);
    if (operand.kind === 'error') return operand;

    const op = expr.operator;

    if (op === '-') {
      if (operand.kind === 'number') {
        return { kind: 'number', value: -operand.value, unit: operand.unit };
      }
      if (operand.kind === 'duration') {
        return { kind: 'duration', duration: this.dateTimeEngine.negateDuration(operand.duration) };
      }
      return this.createError(`Cannot negate ${operand.kind}`);
    }

    if (op === '!') {
      const bool = this.toBoolean(operand);
      if (bool.kind === 'error') return bool;
      return { kind: 'boolean', value: !bool.value };
    }

    if (op === '~') {
      if (operand.kind !== 'number') {
        return this.createError('Bitwise NOT requires a number');
      }
      if (operand.unit) {
        return this.createError('Bitwise NOT requires dimensionless value');
      }
      return { kind: 'number', value: ~Math.trunc(operand.value) };
    }

    return this.createError(`Unknown unary operator: ${op}`);
  }

  /**
   * Evaluate a postfix expression (factorial)
   */
  private evaluatePostfix(expr: AST.PostfixExpression, context: EvaluationContext): Value {
    const operand = this.evaluateExpression(expr.operand, context);
    if (operand.kind === 'error') return operand;

    if (expr.operator === '!') {
      if (operand.kind !== 'number') {
        return this.createError('Factorial requires a number');
      }
      if (operand.unit) {
        return this.createError('Factorial requires dimensionless value');
      }

      const n = operand.value;
      if (n < 0 || !Number.isInteger(n)) {
        return this.createError('Factorial requires non-negative integer');
      }

      let result = 1;
      for (let i = 2; i <= n; i++) {
        result *= i;
      }

      return { kind: 'number', value: result };
    }

    return this.createError(`Unknown postfix operator: ${expr.operator}`);
  }

  /**
   * Evaluate a function call
   */
  private evaluateFunctionCall(expr: AST.FunctionCall, context: EvaluationContext): Value {
    // Evaluate all arguments
    const args: number[] = [];
    for (const argExpr of expr.arguments) {
      const argValue = this.evaluateExpression(argExpr, context);
      if (argValue.kind === 'error') return argValue;

      if (argValue.kind !== 'number') {
        return this.createError(`Function argument must be a number, got ${argValue.kind}`);
      }

      // For trig functions, convert angle to radians if needed
      if (this.settings.angleUnit === 'degree' && this.isTrigFunction(expr.name)) {
        args.push(this.degreesToRadians(argValue.value));
      } else {
        args.push(argValue.value);
      }
    }

    // Execute function
    const result = this.mathFunctions.execute(expr.name, args);
    if (result.error) {
      return this.createError(result.error);
    }

    // For inverse trig functions, convert result from radians to degrees if needed
    if (this.settings.angleUnit === 'degree' && this.isInverseTrigFunction(expr.name)) {
      return { kind: 'number', value: this.radiansToDegrees(result.value) };
    }

    return { kind: 'number', value: result.value };
  }

  /**
   * Evaluate an identifier (variable lookup)
   */
  private evaluateIdentifier(expr: AST.Identifier, context: EvaluationContext): Value {
    const value = context.variables.get(expr.name);
    if (value === undefined) {
      return this.createError(`Undefined variable: ${expr.name}`);
    }
    return value;
  }

  /**
   * Convert value to unit
   */
  private convertToUnit(value: Value, unitExpr: AST.UnitExpression): Value {
    if (value.kind !== 'number') {
      return this.createError(`Cannot convert ${value.kind} to unit`);
    }

    const targetUnit = this.resolveUnit(unitExpr);
    if (!targetUnit) {
      return this.createError('Unknown target unit');
    }

    if (!value.unit) {
      return this.createError('Cannot convert dimensionless value to unit');
    }

    if (value.unit.dimension !== targetUnit.dimension) {
      return this.createError('Cannot convert between different dimensions');
    }

    try {
      const converted = this.unitConverter.convert(value.value, value.unit, targetUnit);
      return { kind: 'number', value: converted, unit: targetUnit };
    } catch (e) {
      return this.createError(`Conversion error: ${e}`);
    }
  }

  /**
   * Convert value to composite unit
   */
  private convertToCompositeUnit(value: Value, targetUnits: AST.UnitExpression[]): Value {
    if (value.kind !== 'number') {
      return this.createError(`Cannot convert ${value.kind} to composite unit`);
    }

    if (!value.unit) {
      return this.createError('Cannot convert dimensionless value to composite unit');
    }

    const resolvedUnits = targetUnits.map(u => this.resolveUnit(u)).filter((u): u is Unit => u !== null);
    if (resolvedUnits.length !== targetUnits.length) {
      return this.createError('Unknown unit in composite target');
    }

    try {
      const result = this.unitConverter.convertComposite(
        [{ value: value.value, unitId: value.unit.id }],
        resolvedUnits.map(u => u.id)
      );

      const components = result.components.map(comp => {
        const unit = this.dataLoader.getUnitById(comp.unitId);
        if (!unit) throw new Error(`Unit not found: ${comp.unitId}`);
        return { value: comp.value, unit };
      });

      return { kind: 'composite', components };
    } catch (e) {
      return this.createError(`Composite conversion error: ${e}`);
    }
  }

  /**
   * Convert value to presentation format
   */
  private convertToPresentation(value: Value, format: AST.PresentationFormat): Value {
    // For now, presentation is handled in formatting phase
    // Return value as-is (formatter will handle display)
    return value;
  }

  /**
   * Extract property from date/time value
   */
  private extractProperty(value: Value, property: AST.DateTimeProperty): Value {
    if (value.kind === 'plainDate') {
      const date = value.date;
      switch (property) {
        case 'year':
          return { kind: 'number', value: date.year };
        case 'month':
          return { kind: 'number', value: date.month };
        case 'day':
          return { kind: 'number', value: date.day };
        default:
          return this.createError(`Cannot extract ${property} from PlainDate`);
      }
    }

    if (value.kind === 'plainTime') {
      const time = value.time;
      switch (property) {
        case 'hour':
          return { kind: 'number', value: time.hour };
        case 'minute':
          return { kind: 'number', value: time.minute };
        case 'second':
          return { kind: 'number', value: time.second };
        default:
          return this.createError(`Cannot extract ${property} from PlainTime`);
      }
    }

    return this.createError(`Cannot extract property from ${value.kind}`);
  }

  /**
   * Convert value to timezone
   */
  private convertToTimezone(value: Value, timezone: string): Value {
    // Timezone conversion requires Temporal polyfill (Phase 6.5)
    // For now, return as-is
    return value;
  }

  // Helper methods

  /**
   * Resolve a unit expression to a Unit object
   */
  private resolveUnit(unitExpr: AST.UnitExpression): Unit | null {
    if (unitExpr.type === 'SimpleUnit') {
      return this.dataLoader.getUnitById(unitExpr.unitId) || null;
    }
    // TODO: Handle DerivedUnit
    return null;
  }

  /**
   * Convert value to boolean
   */
  private toBoolean(value: Value): BooleanValue | ErrorValue {
    if (value.kind === 'boolean') {
      return value;
    }
    if (value.kind === 'number') {
      return { kind: 'boolean', value: value.value !== 0 };
    }
    return this.createError(`Cannot convert ${value.kind} to boolean`);
  }

  /**
   * Check if value is a date/time type
   */
  private isDateTime(value: Value): value is DateTimeValue {
    return (
      value.kind === 'plainDate' ||
      value.kind === 'plainTime' ||
      value.kind === 'plainDateTime' ||
      value.kind === 'instant' ||
      value.kind === 'zonedDateTime' ||
      value.kind === 'duration'
    );
  }

  /**
   * Check if function name is a trig function
   */
  private isTrigFunction(name: string): boolean {
    const trigFunctions = ['sin', 'cos', 'tan', 'sinh', 'cosh', 'tanh'];
    return trigFunctions.includes(name.toLowerCase());
  }

  /**
   * Check if function name is an inverse trig function
   */
  private isInverseTrigFunction(name: string): boolean {
    const inverseTrigFunctions = ['asin', 'acos', 'atan', 'arcsin', 'arccos', 'arctan', 'asinh', 'acosh', 'atanh', 'arsinh', 'arcosh', 'artanh'];
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
      kind: 'error',
      error: {
        type: 'RuntimeError',
        message
      }
    };
  }
}

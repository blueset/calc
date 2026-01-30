import * as AST from './ast';
import { DataLoader } from './data-loader';
import { UnitConverter, ConversionSettings } from './unit-converter';
import { DateTimeEngine, Duration, PlainDate, PlainTime, PlainDateTime, Instant, ZonedDateTime } from './date-time';
import { CurrencyConverter, CurrencyValue } from './currency';
import { MathFunctions } from './functions';
import { createErrorResult, ErrorResult } from './error-handling';
import type { Unit } from '../types/types';
import { getConstant } from './constants';
import { Temporal } from '@js-temporal/polyfill';

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
 * Derived unit value (e.g., "50 km/h", "9.8 m/s²")
 * Uses signed exponents: positive for numerator, negative for denominator
 */
export interface DerivedUnitValue {
  kind: 'derivedUnit';
  value: number;
  terms: Array<{ unit: Unit; exponent: number }>;
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
        // Handle DerivedUnit (e.g., from m^2 syntax)
        if (literal.unit.type === 'DerivedUnit') {
          const terms: Array<{ unit: Unit; exponent: number }> = [];
          for (const term of literal.unit.terms) {
            const resolvedUnit = this.resolveUnit(term.unit);
            if (!resolvedUnit) {
              return this.createError(`Unknown unit in derived unit literal`);
            }
            terms.push({ unit: resolvedUnit, exponent: term.exponent });
          }
          return { kind: 'derivedUnit', value: literal.value, terms };
        }

        // Handle SimpleUnit
        const unit = this.resolveUnit(literal.unit);
        if (!unit) {
          return this.createError(`Unknown unit in literal`);
        }

        // Auto-convert dimensionless units to pure numbers
        if (unit.dimension === 'dimensionless') {
          // Convert to base unit (which is 1.0 for dimensionless units)
          const convertedValue = this.unitConverter.toBaseUnit(literal.value, unit);
          return { kind: 'number', value: convertedValue };
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
    // Convert time-dimensioned numbers to durations for date arithmetic
    let convertedLeft = left;
    let convertedRight = right;

    // If left is a date/time type and right is a number with time dimension, convert right to duration
    if (this.isDateTime(left) && right.kind === 'number' && right.unit) {
      if (right.unit.dimension === 'time') {
        // Convert to duration
        const duration = this.convertTimeToDuration(right.value, right.unit);
        convertedRight = { kind: 'duration', duration };
      }
    }

    // If left is a date/time type and right is a composite unit, check if all components are time-dimensioned
    if (this.isDateTime(left) && right.kind === 'composite') {
      // Check if all components have time dimension
      const allTimeComponents = right.components.every(comp => comp.unit.dimension === 'time');
      if (allTimeComponents) {
        // Convert composite unit to duration
        const duration = this.convertCompositeTimeToDuration(right);
        convertedRight = { kind: 'duration', duration };
      }
    }

    // Handle date/time arithmetic
    if (this.isDateTime(convertedLeft) || this.isDateTime(convertedRight)) {
      return this.evaluateDateTimeArithmetic(op, convertedLeft, convertedRight);
    }

    // Handle number and derived unit arithmetic
    const isNumeric = (v: Value) => v.kind === 'number' || v.kind === 'derivedUnit';
    if (isNumeric(left) && isNumeric(right)) {
      return this.evaluateNumberArithmetic(op, left as NumberValue | DerivedUnitValue, right as NumberValue | DerivedUnitValue);
    }

    return this.createError(`Cannot perform ${op} on ${left.kind} and ${right.kind}`);
  }

  /**
   * Evaluate arithmetic on numbers (with units or derived units)
   */
  private evaluateNumberArithmetic(
    op: '+' | '-' | '*' | '/' | '%' | 'mod' | 'per' | '^',
    left: NumberValue | DerivedUnitValue,
    right: NumberValue | DerivedUnitValue
  ): Value {
    const leftValue = left.value;
    const rightValue = right.value;

    // Extract unit information
    const leftUnit = left.kind === 'number' ? left.unit : undefined;
    const rightUnit = right.kind === 'number' ? right.unit : undefined;
    const leftIsDerived = left.kind === 'derivedUnit';
    const rightIsDerived = right.kind === 'derivedUnit';

    // Addition and subtraction require same dimension
    if (op === '+' || op === '-') {
      // Both dimensionless numbers
      if (left.kind === 'number' && !left.unit && right.kind === 'number' && !right.unit) {
        const result = op === '+' ? leftValue + rightValue : leftValue - rightValue;
        return { kind: 'number', value: result };
      }

      // Both simple units - must be same dimension
      if (left.kind === 'number' && left.unit && right.kind === 'number' && right.unit) {
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

      // Derived units or mixed - not supported for addition/subtraction
      return this.createError(`Cannot ${op === '+' ? 'add' : 'subtract'} values with incompatible types`);
    }

    // Multiplication - combine units
    if (op === '*') {
      const result = leftValue * rightValue;
      return this.multiplyValues(result, left, right);
    }

    // Division
    if (op === '/' || op === 'per') {
      if (rightValue === 0) {
        return this.createError('Division by zero');
      }

      const result = leftValue / rightValue;

      // Special case: same dimension with simple units - try to convert and simplify
      if (left.kind === 'number' && right.kind === 'number' &&
          left.unit && right.unit &&
          left.unit.dimension === right.unit.dimension) {
        try {
          const convertedRight = this.unitConverter.convert(rightValue, right.unit, left.unit);
          return { kind: 'number', value: leftValue / convertedRight };
        } catch (e) {
          // Conversion failed, fall through to general case
        }
      }

      // General case: use term combination
      return this.divideValues(result, left, right);
    }

    // Modulo
    if (op === '%' || op === 'mod') {
      if (left.kind === 'number' && !left.unit && right.kind === 'number' && !right.unit) {
        if (rightValue === 0) {
          return this.createError('Modulo by zero');
        }
        return { kind: 'number', value: leftValue % rightValue };
      }
      return this.createError('Modulo requires dimensionless values');
    }

    // Power
    if (op === '^') {
      if (right.kind === 'number' && !right.unit) {
        const result = Math.pow(leftValue, rightValue);

        // Handle exponentiation of units
        if (left.kind === 'number' && left.unit) {
          // (5 m)^2 → 25 m²
          // (16 m²)^0.5 → 4 m (need to expand derived dimensions)

          // Check if this unit's dimension is derived
          const dimension = this.dataLoader.getDimensionById(left.unit.dimension);
          if (dimension && dimension.derivedFrom && dimension.derivedFrom.length > 0) {
            // Expand the derived dimension and apply the exponent
            const expandedTerms: Array<{ unit: Unit; exponent: number }> = [];
            for (const baseDim of dimension.derivedFrom) {
              const baseDimension = this.dataLoader.getDimensionById(baseDim.dimension);
              if (!baseDimension) {
                return this.createError(`Unknown base dimension: ${baseDim.dimension}`);
              }
              // Find the base unit for this dimension
              const baseUnit = this.dataLoader.getUnitById(baseDimension.baseUnit);
              if (!baseUnit) {
                return this.createError(`No base unit for dimension: ${baseDim.dimension}`);
              }
              // Apply the exponent: (dimension^baseDim.exponent)^rightValue
              expandedTerms.push({ unit: baseUnit, exponent: baseDim.exponent * rightValue });
            }
            return {
              kind: 'derivedUnit',
              value: result,
              terms: expandedTerms
            };
          } else {
            // Simple base dimension unit
            return {
              kind: 'derivedUnit',
              value: result,
              terms: [{ unit: left.unit, exponent: rightValue }]
            };
          }
        }

        if (left.kind === 'derivedUnit') {
          // (3 m/s)^2 → 9 m²/s²
          // Multiply all term exponents by the power
          // Also need to expand any derived dimensions in the terms
          const newTerms: Array<{ unit: Unit; exponent: number }> = [];

          for (const term of left.terms) {
            const dimension = this.dataLoader.getDimensionById(term.unit.dimension);
            if (dimension && dimension.derivedFrom && dimension.derivedFrom.length > 0) {
              // Expand derived dimension
              for (const baseDim of dimension.derivedFrom) {
                const baseDimension = this.dataLoader.getDimensionById(baseDim.dimension);
                if (!baseDimension) {
                  return this.createError(`Unknown base dimension: ${baseDim.dimension}`);
                }
                const baseUnit = this.dataLoader.getUnitById(baseDimension.baseUnit);
                if (!baseUnit) {
                  return this.createError(`No base unit for dimension: ${baseDim.dimension}`);
                }
                // (term^term.exponent)^rightValue, where term has baseDim.exponent
                newTerms.push({ unit: baseUnit, exponent: baseDim.exponent * term.exponent * rightValue });
              }
            } else {
              // Simple base dimension
              newTerms.push({ unit: term.unit, exponent: term.exponent * rightValue });
            }
          }

          return {
            kind: 'derivedUnit',
            value: result,
            terms: newTerms
          };
        }

        // Dimensionless number
        if (left.kind === 'number') {
          return { kind: 'number', value: result };
        }

        return this.createError('Cannot exponentiate this type');
      }
      return this.createError('Exponent must be dimensionless');
    }

    return this.createError(`Unknown arithmetic operator: ${op}`);
  }

  /**
   * Evaluate date/time arithmetic
   */
  private evaluateDateTimeArithmetic(op: string, left: Value, right: Value): Value {
    // PlainDate + Duration → PlainDate or PlainDateTime (if duration has time components)
    if (left.kind === 'plainDate' && right.kind === 'duration') {
      if (op === '+') {
        const result = this.dateTimeEngine.addToPlainDate(left.date, right.duration);
        // Result can be PlainDate or PlainDateTime depending on duration
        // PlainDate has 'year' property, PlainDateTime has 'date' and 'time' properties
        if ('year' in result) {
          return { kind: 'plainDate', date: result };
        } else {
          return { kind: 'plainDateTime', dateTime: result };
        }
      }
      if (op === '-') {
        // Negate duration
        const negated = this.dateTimeEngine.negateDuration(right.duration);
        const result = this.dateTimeEngine.addToPlainDate(left.date, negated);
        // Result can be PlainDate or PlainDateTime depending on duration
        // PlainDate has 'year' property, PlainDateTime has 'date' and 'time' properties
        if ('year' in result) {
          return { kind: 'plainDate', date: result };
        } else {
          return { kind: 'plainDateTime', dateTime: result };
        }
      }
    }

    // PlainDate - PlainDate → Duration
    if (left.kind === 'plainDate' && right.kind === 'plainDate' && op === '-') {
      const duration = this.dateTimeEngine.subtractPlainDates(left.date, right.date);
      return { kind: 'duration', duration };
    }

    // PlainDateTime + Duration → PlainDateTime
    if (left.kind === 'plainDateTime' && right.kind === 'duration') {
      if (op === '+') {
        const result = this.dateTimeEngine.addToPlainDateTime(left.dateTime, right.duration);
        return { kind: 'plainDateTime', dateTime: result };
      }
      if (op === '-') {
        const negated = this.dateTimeEngine.negateDuration(right.duration);
        const result = this.dateTimeEngine.addToPlainDateTime(left.dateTime, negated);
        return { kind: 'plainDateTime', dateTime: result };
      }
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
      if (operand.kind === 'composite') {
        // Negate each component of the composite unit
        const negatedComponents = operand.components.map(comp => ({
          value: -comp.value,
          unit: comp.unit
        }));
        return { kind: 'composite', components: negatedComponents };
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
    // Check if function preserves units (round, floor, ceil, abs, trunc, frac)
    const preservesUnits = ['round', 'floor', 'ceil', 'abs', 'trunc', 'frac'].includes(expr.name.toLowerCase());

    // Evaluate all arguments
    const args: number[] = [];
    let firstArgUnit: Unit | undefined;

    for (const argExpr of expr.arguments) {
      const argValue = this.evaluateExpression(argExpr, context);
      if (argValue.kind === 'error') return argValue;

      if (argValue.kind !== 'number') {
        return this.createError(`Function argument must be a number, got ${argValue.kind}`);
      }

      // Capture the first argument's unit if the function preserves units
      if (preservesUnits && args.length === 0 && 'unit' in argValue) {
        firstArgUnit = argValue.unit;
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

    // Return result with preserved unit if applicable
    if (firstArgUnit) {
      return { kind: 'number', value: result.value, unit: firstArgUnit };
    }

    return { kind: 'number', value: result.value };
  }

  /**
   * Evaluate an identifier (variable lookup or implicit unit)
   */
  private evaluateIdentifier(expr: AST.Identifier, context: EvaluationContext): Value {
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
    // This handles cases like "100 km / h" where "h" is parsed as an identifier
    const unit = this.dataLoader.getUnitByName(expr.name);
    if (unit) {
      // Treat as implicit "1 [unit]"
      return { kind: 'number', value: 1, unit };
    }

    // Not a variable or unit - error
    return this.createError(`Undefined variable: ${expr.name}`);
  }

  /**
   * Evaluate relative instant keywords (now, today, tomorrow, yesterday)
   * Returns null if not a relative instant keyword
   */
  private evaluateRelativeInstantKeyword(name: string): Value | null {
    const lowerName = name.toLowerCase();

    switch (lowerName) {
      case 'now': {
        // Return zoned date time (current date and time)
        const zonedDateTime = this.dateTimeEngine.getCurrentZonedDateTime();
        return { kind: 'zonedDateTime', zonedDateTime };
      }

      case 'today': {
        // Return zoned date time (current date and time)
        const zonedDateTime = this.dateTimeEngine.getCurrentZonedDateTime();
        return { kind: 'zonedDateTime', zonedDateTime };
      }

      case 'tomorrow': {
        // Return zoned date time (current date + 1 day, same time)
        const zonedDateTime = this.dateTimeEngine.getCurrentZonedDateTime();
        const tomorrowResult = this.dateTimeEngine.addToPlainDate(zonedDateTime.dateTime.date, { days: 1 } as any);
        // addToPlainDate returns PlainDate when only date components, so it's safe to cast
        const tomorrow = tomorrowResult as any;
        return {
          kind: 'zonedDateTime',
          zonedDateTime: {
            dateTime: {
              date: tomorrow,
              time: zonedDateTime.dateTime.time
            },
            timezone: zonedDateTime.timezone
          }
        };
      }

      case 'yesterday': {
        // Return zoned date time (current date - 1 day, same time)
        const zonedDateTime = this.dateTimeEngine.getCurrentZonedDateTime();
        const yesterdayResult = this.dateTimeEngine.addToPlainDate(zonedDateTime.dateTime.date, { days: -1 } as any);
        // addToPlainDate returns PlainDate when only date components, so it's safe to cast
        const yesterday = yesterdayResult as any;
        return {
          kind: 'zonedDateTime',
          zonedDateTime: {
            dateTime: {
              date: yesterday,
              time: zonedDateTime.dateTime.time
            },
            timezone: zonedDateTime.timezone
          }
        };
      }

      default:
        return null;
    }
  }

  /**
   * Convert value to unit
   */
  private convertToUnit(value: Value, unitExpr: AST.UnitExpression): Value {
    if (value.kind !== 'number' && value.kind !== 'derivedUnit' && value.kind !== 'composite') {
      return this.createError(`Cannot convert ${value.kind} to unit`);
    }

    // Handle derived unit target (e.g., "100 km/h to m/s")
    if (unitExpr.type === 'DerivedUnit') {
      return this.convertToDerivedUnit(value, unitExpr);
    }

    // Handle simple unit target
    const targetUnit = this.resolveUnit(unitExpr);
    if (!targetUnit) {
      return this.createError('Unknown target unit');
    }

    // Handle composite unit source (e.g., "6 ft 3 in to cm")
    if (value.kind === 'composite') {
      // Check dimension compatibility: all components must have same dimension as target
      for (const component of value.components) {
        if (component.unit.dimension !== targetUnit.dimension) {
          return this.createError('Cannot convert between different dimensions');
        }
      }

      // Convert all components to base unit and sum them
      let totalInBase = 0;
      for (const component of value.components) {
        const inBase = this.unitConverter.toBaseUnit(component.value, component.unit);
        totalInBase += inBase;
      }

      // Convert from base unit to target unit
      const result = this.unitConverter.fromBaseUnit(totalInBase, targetUnit);
      return { kind: 'number', value: result, unit: targetUnit };
    }

    if (value.kind !== 'number') {
      return this.createError('Cannot convert derived unit to simple unit (not yet implemented)');
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
   * Convert value to derived unit (e.g., "100 km/h to m/s")
   *
   * Algorithm:
   * 1. Extract source terms (convert NumberValue to single term if needed)
   * 2. Resolve target terms (SimpleUnit → Unit)
   * 3. Check dimensional compatibility
   * 4. Convert source value to base units using term-by-term conversion
   * 5. Convert from base units to target units
   * 6. Return new DerivedUnitValue with target units
   */
  private convertToDerivedUnit(value: Value, targetExpr: AST.DerivedUnit): Value {
    // Step 1: Extract source terms
    let sourceValue: number;
    let sourceTerms: Array<{ unit: Unit; exponent: number }>;

    if (value.kind === 'number') {
      if (!value.unit) {
        return this.createError('Cannot convert dimensionless value to derived unit');
      }
      sourceValue = value.value;
      sourceTerms = [{ unit: value.unit, exponent: 1 }];
    } else if (value.kind === 'derivedUnit') {
      sourceValue = value.value;
      sourceTerms = value.terms;
    } else {
      return this.createError(`Cannot convert ${value.kind} to derived unit`);
    }

    // Step 2: Resolve target terms
    const targetTerms: Array<{ unit: Unit; exponent: number }> = [];
    for (const targetTerm of targetExpr.terms) {
      const resolvedUnit = this.resolveUnit(targetTerm.unit);
      if (!resolvedUnit) {
        return this.createError('Unknown unit in target');
      }
      targetTerms.push({ unit: resolvedUnit, exponent: targetTerm.exponent });
    }

    // Step 3: Check dimensional compatibility
    const sourceDimension = this.computeDimension(sourceTerms);
    const targetDimension = this.computeDimension(targetTerms);

    if (!this.areDimensionsCompatible(sourceDimension, targetDimension)) {
      return this.createError('Cannot convert between different dimensions');
    }

    // Step 4: Convert source to base units
    let valueInBase = sourceValue;
    for (const term of sourceTerms) {
      const factorToBase = this.unitConverter.toBaseUnit(1, term.unit);
      valueInBase *= Math.pow(factorToBase, term.exponent);
    }

    // Step 5: Convert from base units to target units
    let result = valueInBase;
    for (const term of targetTerms) {
      const factorFromBase = this.unitConverter.fromBaseUnit(1, term.unit);
      result *= Math.pow(factorFromBase, term.exponent);
    }

    // Step 6: Return new DerivedUnitValue
    return {
      kind: 'derivedUnit',
      value: result,
      terms: targetTerms
    };
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
   * Convert value to timezone using Temporal polyfill
   * Plain values (PlainTime, PlainDateTime) are interpreted as being in the system's local timezone
   */
  private convertToTimezone(value: Value, timezone: string): Value {
    // Get system's local timezone using Temporal
    const systemTimezone = Temporal.Now.timeZoneId();

    // Convert PlainTime to ZonedDateTime
    // Use today's date in system local timezone
    if (value.kind === 'plainTime') {
      const now = Temporal.Now.plainDateTimeISO(systemTimezone);
      const plainDateTime: PlainDateTime = {
        date: { year: now.year, month: now.month, day: now.day },
        time: value.time
      };
      // Interpret as system local timezone, then convert to target
      const instant = this.dateTimeEngine.toInstant(plainDateTime, systemTimezone);
      const zonedDateTime = this.dateTimeEngine.toZonedDateTime(instant, timezone);
      return { kind: 'zonedDateTime', zonedDateTime };
    }

    // Convert PlainDateTime to ZonedDateTime
    // Interpret as system local timezone
    if (value.kind === 'plainDateTime') {
      const instant = this.dateTimeEngine.toInstant(value.dateTime, systemTimezone);
      const zonedDateTime = this.dateTimeEngine.toZonedDateTime(instant, timezone);
      return { kind: 'zonedDateTime', zonedDateTime };
    }

    // Convert Instant to ZonedDateTime in target timezone
    if (value.kind === 'instant') {
      const zonedDateTime = this.dateTimeEngine.toZonedDateTime(value.instant, timezone);
      return { kind: 'zonedDateTime', zonedDateTime };
    }

    // Convert ZonedDateTime from one timezone to another
    if (value.kind === 'zonedDateTime') {
      // Convert to Instant first, then to target timezone
      const instant = this.dateTimeEngine.toInstant(value.zonedDateTime.dateTime, value.zonedDateTime.timezone);
      const zonedDateTime = this.dateTimeEngine.toZonedDateTime(instant, timezone);
      return { kind: 'zonedDateTime', zonedDateTime };
    }

    return this.createError(`Cannot convert ${value.kind} to timezone`);
  }

  // Helper methods

  /**
   * Extract terms from a numeric value (number, NumberValue, or DerivedUnitValue)
   */
  private extractTerms(value: NumberValue | DerivedUnitValue): Array<{ unit: Unit; exponent: number }> {
    if (value.kind === 'number') {
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
    rightTerms: Array<{ unit: Unit; exponent: number }>
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
    return Array.from(termMap.values()).filter(t => t.exponent !== 0);
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
    const byDimension = new Map<string, Array<{ unit: Unit; exponent: number }>>();
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
            term.unit.conversion.type === 'linear'
              ? term.unit.conversion.factor
              : term.unit.conversion.type === 'affine'
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
  private createValueFromTerms(value: number, terms: Array<{ unit: Unit; exponent: number }>): NumberValue | DerivedUnitValue {
    // No terms - dimensionless
    if (terms.length === 0) {
      return { kind: 'number', value };
    }

    // Single term with exponent 1 - simple unit
    if (terms.length === 1 && terms[0].exponent === 1) {
      return { kind: 'number', value, unit: terms[0].unit };
    }

    // Multiple terms or non-unit exponent - derived unit
    return { kind: 'derivedUnit', value, terms };
  }

  /**
   * Multiply two numeric values (handles all combinations of number/unit/derived)
   */
  private multiplyValues(
    value: number,
    left: NumberValue | DerivedUnitValue,
    right: NumberValue | DerivedUnitValue
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
    right: NumberValue | DerivedUnitValue
  ): NumberValue | DerivedUnitValue {
    const leftTerms = this.extractTerms(left);
    const rightTerms = this.extractTerms(right).map(t => ({ unit: t.unit, exponent: -t.exponent }));
    const combinedTerms = this.combineTerms(leftTerms, rightTerms);
    const { simplified, factor } = this.simplifyTerms(combinedTerms);
    return this.createValueFromTerms(value * factor, simplified);
  }

  /**
   * Resolve a unit expression to a Unit object from the data loader
   *
   * Returns:
   * - For SimpleUnit: the resolved Unit object from data loader, or pseudo-unit for user-defined units
   * - For DerivedUnit: null (caller should check unitExpr.type and handle separately)
   *
   * Note: DerivedUnit AST nodes are now created by the parser in conversion targets.
   * Callers should check for DerivedUnit type and use convertToDerivedUnit() instead.
   */
  private resolveUnit(unitExpr: AST.UnitExpression): Unit | null {
    if (unitExpr.type === 'SimpleUnit') {
      const unit = this.dataLoader.getUnitById(unitExpr.unitId);
      if (unit) return unit;

      // User-defined unit - create pseudo-unit on-the-fly
      // Each user-defined unit gets its own unique dimension
      return {
        id: unitExpr.unitId,
        dimension: `user_defined_${unitExpr.unitId}`,
        names: [unitExpr.name],
        conversion: { type: 'linear', factor: 1.0 },
        displayName: {
          symbol: unitExpr.name,
          singular: unitExpr.name,
          plural: unitExpr.name + 's'
        }
      };
    }
    // DerivedUnit: return null to indicate this needs special handling
    // The caller should check unitExpr.type and call convertToDerivedUnit() instead
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

  /**
   * Compute dimension from derived unit terms
   *
   * Returns a map of base dimension ID → total exponent
   * Example: km/h → {length: 1, time: -1}
   */
  private computeDimension(terms: Array<{ unit: Unit; exponent: number }>): Map<string, number> {
    const dimensionMap = new Map<string, number>();

    for (const term of terms) {
      // Get the dimension of this unit
      const dimension = this.dataLoader.getDimensionById(term.unit.dimension);

      // Handle user-defined dimensions (not in dimension database)
      if (!dimension) {
        // User-defined units have dimensions like "user_defined_person"
        // Treat them as their own base dimensions
        if (term.unit.dimension.startsWith('user_defined_')) {
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
          dimensionMap.set(baseDim.dimension, currentExp + term.exponent * baseDim.exponent);
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
      'year': 'years',
      'month': 'months',
      'week': 'weeks',
      'day': 'days',
      'hour': 'hours',
      'minute': 'minutes',
      'second': 'seconds',
      'millisecond': 'milliseconds',
      'ms': 'milliseconds'
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
   * Convert a composite unit with all time-dimensioned components to a duration
   */
  private convertCompositeTimeToDuration(composite: CompositeUnitValue): Duration {
    // Initialize empty duration
    const durationComponents: Partial<Duration> = {
      years: 0,
      months: 0,
      weeks: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0
    };

    // Map common time units to duration components
    const unitToDuration: Record<string, keyof Duration> = {
      'year': 'years',
      'month': 'months',
      'week': 'weeks',
      'day': 'days',
      'hour': 'hours',
      'minute': 'minutes',
      'second': 'seconds',
      'millisecond': 'milliseconds',
      'ms': 'milliseconds'
    };

    // Convert each component
    for (const comp of composite.components) {
      const durationKey = unitToDuration[comp.unit.id];
      if (durationKey) {
        durationComponents[durationKey] = (durationComponents[durationKey] || 0) + comp.value;
      } else {
        // For other time units, convert to seconds
        const valueInSeconds = this.unitConverter.toBaseUnit(comp.value, comp.unit);
        durationComponents.seconds = (durationComponents.seconds || 0) + valueInSeconds;
      }
    }

    return this.dateTimeEngine.createDuration(durationComponents as Duration);
  }

  /**
   * Check if two dimension maps are compatible
   *
   * Two dimensions are compatible if they have the same base dimensions with the same exponents
   */
  private areDimensionsCompatible(dim1: Map<string, number>, dim2: Map<string, number>): boolean {
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
}

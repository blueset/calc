import * as AST from './ast';
import { DataLoader } from './data-loader';
import { TypeError, createErrorResult, ErrorResult } from './error-handling';
import { Dimension, Unit } from '../types/types';

/**
 * Value type system
 */

export type ValueType =
  | PhysicalType
  | CompositeUnitType
  | DateTimeType
  | BooleanType
  | ErrorType;

/**
 * Physical value types (numbers with or without units)
 */
export type PhysicalType = DimensionlessType | SimplePhysicalType | DerivedPhysicalType;

export interface DimensionlessType {
  kind: 'dimensionless';
}

export interface SimplePhysicalType {
  kind: 'physical';
  dimension: string; // Dimension ID (e.g., "length", "mass", "time")
}

export interface DerivedPhysicalType {
  kind: 'derived';
  // Uses signed exponents: positive for numerator, negative for denominator
  // Example: speed (length/time) = [{dimension: "length", exponent: 1}, {dimension: "time", exponent: -1}]
  terms: Array<{ dimension: string; exponent: number }>;
}

/**
 * Composite unit type (e.g., "5 ft 3 in")
 */
export interface CompositeUnitType {
  kind: 'composite';
  dimension: string; // All components must share this dimension
}

/**
 * Date/Time types
 */
export type DateTimeType =
  | PlainDateType
  | PlainTimeType
  | PlainDateTimeType
  | InstantType
  | ZonedDateTimeType
  | DurationType;

export interface PlainDateType {
  kind: 'plainDate';
}

export interface PlainTimeType {
  kind: 'plainTime';
}

export interface PlainDateTimeType {
  kind: 'plainDateTime';
}

export interface InstantType {
  kind: 'instant';
}

export interface ZonedDateTimeType {
  kind: 'zonedDateTime';
}

/**
 * Duration type
 * A duration can have date components, time components, or both
 */
export interface DurationType {
  kind: 'duration';
  hasDateComponents: boolean;
  hasTimeComponents: boolean;
}

/**
 * Boolean type
 */
export interface BooleanType {
  kind: 'boolean';
}

/**
 * Error type (propagated through type checking)
 */
export interface ErrorType {
  kind: 'error';
  error: TypeError;
}

/**
 * Type checking context - tracks variable types and scopes
 */
export interface TypeContext {
  variables: Map<string, ValueType>;
  parent?: TypeContext;
}

/**
 * TypeChecker class - performs semantic analysis on AST
 */
export class TypeChecker {
  private dataLoader: DataLoader;

  constructor(dataLoader: DataLoader) {
    this.dataLoader = dataLoader;
  }

  /**
   * Check the entire document
   */
  checkDocument(document: AST.Document): Map<AST.Line, ValueType | null> {
    const context: TypeContext = { variables: new Map() };
    const lineTypes = new Map<AST.Line, ValueType | null>();

    for (const line of document.lines) {
      const lineType = this.checkLine(line, context);
      lineTypes.set(line, lineType);
    }

    return lineTypes;
  }

  /**
   * Check a single line
   */
  private checkLine(line: AST.Line, context: TypeContext): ValueType | null {
    switch (line.type) {
      case 'Heading':
      case 'PlainText':
      case 'EmptyLine':
        return null;

      case 'ExpressionLine':
        return this.checkExpression(line.expression, context);

      case 'VariableDefinition':
        const valueType = this.checkExpression(line.value, context);
        context.variables.set(line.name, valueType);
        return valueType;

      default:
        const exhaustive: never = line;
        throw new Error(`Unknown line type: ${(exhaustive as any).type}`);
    }
  }

  /**
   * Check an expression and return its type
   */
  private checkExpression(expr: AST.Expression, context: TypeContext): ValueType {
    switch (expr.type) {
      case 'NumberLiteral':
        return this.checkNumberLiteral(expr);

      case 'NumberWithUnit':
        return this.checkNumberWithUnit(expr);

      case 'CompositeUnitLiteral':
        return this.checkCompositeUnitLiteral(expr);

      case 'BooleanLiteral':
        return { kind: 'boolean' };

      case 'ConstantLiteral':
        return { kind: 'dimensionless' };

      case 'PlainDateLiteral':
        return { kind: 'plainDate' };

      case 'PlainTimeLiteral':
        return { kind: 'plainTime' };

      case 'PlainDateTimeLiteral':
        return { kind: 'plainDateTime' };

      case 'InstantLiteral':
        return { kind: 'instant' };

      case 'ZonedDateTimeLiteral':
        return { kind: 'zonedDateTime' };

      case 'DurationLiteral':
        return this.checkDurationLiteral(expr);

      case 'Identifier':
        return this.checkIdentifier(expr, context);

      case 'BinaryExpression':
        return this.checkBinaryExpression(expr, context);

      case 'UnaryExpression':
        return this.checkUnaryExpression(expr, context);

      case 'PostfixExpression':
        return this.checkPostfixExpression(expr, context);

      case 'ConditionalExpression':
        return this.checkConditionalExpression(expr, context);

      case 'ConversionExpression':
        return this.checkConversionExpression(expr, context);

      case 'FunctionCall':
        return this.checkFunctionCall(expr, context);

      case 'GroupedExpression':
        return this.checkExpression(expr.expression, context);

      default:
        const exhaustive: never = expr;
        throw new Error(`Unknown expression type: ${(exhaustive as any).type}`);
    }
  }

  /**
   * Check number literal (dimensionless)
   */
  private checkNumberLiteral(expr: AST.NumberLiteral): DimensionlessType {
    return { kind: 'dimensionless' };
  }

  /**
   * Check number with unit
   */
  private checkNumberWithUnit(expr: AST.NumberWithUnit): PhysicalType {
    return this.getUnitType(expr.unit);
  }

  /**
   * Check composite unit literal
   */
  private checkCompositeUnitLiteral(expr: AST.CompositeUnitLiteral): CompositeUnitType | ErrorType {
    if (expr.components.length === 0) {
      return this.createError('Composite unit must have at least one component', expr);
    }

    // All components must have the same dimension
    const firstDimension = this.getDimensionFromUnit(expr.components[0].unit);
    if (!firstDimension) {
      return this.createError('Invalid unit in composite', expr);
    }

    for (let i = 1; i < expr.components.length; i++) {
      const dimension = this.getDimensionFromUnit(expr.components[i].unit);
      if (!dimension || dimension !== firstDimension) {
        return this.createError(
          `All components of composite unit must have the same dimension. Expected ${firstDimension}, got ${dimension}`,
          expr
        );
      }
    }

    return { kind: 'composite', dimension: firstDimension };
  }

  /**
   * Check duration literal
   */
  private checkDurationLiteral(expr: AST.DurationLiteral): DurationType {
    const hasDateComponents = !!(
      expr.components.years ||
      expr.components.months ||
      expr.components.weeks ||
      expr.components.days
    );

    const hasTimeComponents = !!(
      expr.components.hours ||
      expr.components.minutes ||
      expr.components.seconds ||
      expr.components.milliseconds
    );

    return { kind: 'duration', hasDateComponents, hasTimeComponents };
  }

  /**
   * Check identifier (variable reference)
   */
  private checkIdentifier(expr: AST.Identifier, context: TypeContext): ValueType {
    const varType = this.lookupVariable(expr.name, context);
    if (varType) {
      return varType;
    }

    // Unknown variable - treat as error
    return this.createError(`Undefined variable: ${expr.name}`, expr);
  }

  /**
   * Check binary expression
   */
  private checkBinaryExpression(expr: AST.BinaryExpression, context: TypeContext): ValueType {
    const leftType = this.checkExpression(expr.left, context);
    const rightType = this.checkExpression(expr.right, context);

    // Propagate errors
    if (leftType.kind === 'error') return leftType;
    if (rightType.kind === 'error') return rightType;

    switch (expr.operator) {
      case '+':
      case '-':
        return this.checkAdditionSubtraction(leftType, rightType, expr.left, expr.right, expr);

      case '*':
      case '/':
      case 'per':
        return this.checkMultiplicationDivision(expr.operator, leftType, rightType, expr);

      case '%':
      case 'mod':
        return this.checkModulo(leftType, rightType, expr);

      case '^':
        return this.checkExponentiation(leftType, rightType, expr);

      case '==':
      case '!=':
      case '<':
      case '<=':
      case '>':
      case '>=':
        return this.checkComparison(leftType, rightType, expr);

      case '&&':
      case '||':
        return this.checkLogical(leftType, rightType, expr);

      case '&':
      case '|':
      case 'xor':
      case '<<':
      case '>>':
        return this.checkBitwise(leftType, rightType, expr);

      default:
        const exhaustive: never = expr.operator;
        return this.createError(`Unknown operator: ${exhaustive}`, expr);
    }
  }

  /**
   * Check addition/subtraction - requires same dimension
   */
  private checkAdditionSubtraction(
    leftType: ValueType,
    rightType: ValueType,
    leftExpr: AST.Expression,
    rightExpr: AST.Expression,
    expr: AST.BinaryExpression
  ): ValueType {
    // Date/Time arithmetic
    if (this.isDateTimeType(leftType) || this.isDateTimeType(rightType)) {
      return this.checkDateTimeArithmetic(leftType, rightType, leftExpr, rightExpr, expr);
    }

    // Physical arithmetic - must have compatible dimensions
    if (!this.isPhysicalType(leftType) || !this.isPhysicalType(rightType)) {
      return this.createError('Addition/subtraction requires numeric values', expr);
    }

    if (!this.dimensionsCompatible(leftType, rightType)) {
      return this.createError(
        `Cannot ${expr.operator === '+' ? 'add' : 'subtract'} values with incompatible dimensions`,
        expr
      );
    }

    return leftType;
  }

  /**
   * Check multiplication/division - derives new dimensions
   */
  private checkMultiplicationDivision(
    operator: '*' | '/' | 'per',
    leftType: ValueType,
    rightType: ValueType,
    expr: AST.BinaryExpression
  ): ValueType {
    if (!this.isPhysicalType(leftType) || !this.isPhysicalType(rightType)) {
      return this.createError('Multiplication/division requires numeric values', expr);
    }

    // Derive new dimension by multiplying/dividing exponents
    return this.deriveDimension(leftType, rightType, operator === '*' ? 'multiply' : 'divide');
  }

  /**
   * Check modulo - requires dimensionless or same dimension
   */
  private checkModulo(leftType: ValueType, rightType: ValueType, expr: AST.BinaryExpression): ValueType {
    if (!this.isPhysicalType(leftType) || !this.isPhysicalType(rightType)) {
      return this.createError('Modulo requires numeric values', expr);
    }

    if (!this.dimensionsCompatible(leftType, rightType)) {
      return this.createError('Modulo requires compatible dimensions', expr);
    }

    return leftType;
  }

  /**
   * Check exponentiation - right operand must be dimensionless
   */
  private checkExponentiation(leftType: ValueType, rightType: ValueType, expr: AST.BinaryExpression): ValueType {
    if (!this.isPhysicalType(leftType) || !this.isPhysicalType(rightType)) {
      return this.createError('Exponentiation requires numeric values', expr);
    }

    if (rightType.kind !== 'dimensionless') {
      return this.createError('Exponent must be dimensionless', expr);
    }

    // Result has same dimension as base
    return leftType;
  }

  /**
   * Check comparison - requires same dimension, returns boolean
   */
  private checkComparison(leftType: ValueType, rightType: ValueType, expr: AST.BinaryExpression): ValueType {
    if (!this.isPhysicalType(leftType) || !this.isPhysicalType(rightType)) {
      if (leftType.kind === 'boolean' && rightType.kind === 'boolean') {
        return { kind: 'boolean' };
      }
      return this.createError('Comparison requires comparable values', expr);
    }

    if (!this.dimensionsCompatible(leftType, rightType)) {
      return this.createError('Comparison requires compatible dimensions', expr);
    }

    return { kind: 'boolean' };
  }

  /**
   * Check logical operations - requires boolean operands
   */
  private checkLogical(leftType: ValueType, rightType: ValueType, expr: AST.BinaryExpression): ValueType {
    if (leftType.kind !== 'boolean' || rightType.kind !== 'boolean') {
      return this.createError('Logical operations require boolean operands', expr);
    }
    return { kind: 'boolean' };
  }

  /**
   * Check bitwise operations - requires dimensionless integers
   */
  private checkBitwise(leftType: ValueType, rightType: ValueType, expr: AST.BinaryExpression): ValueType {
    if (!this.isPhysicalType(leftType) || !this.isPhysicalType(rightType)) {
      return this.createError('Bitwise operations require numeric values', expr);
    }

    if (leftType.kind !== 'dimensionless' || rightType.kind !== 'dimensionless') {
      return this.createError('Bitwise operations require dimensionless values', expr);
    }

    return { kind: 'dimensionless' };
  }

  /**
   * Check date/time arithmetic
   * Based on SPECS.md lines 834-943
   *
   * Note: Time-dimensioned values (NumberWithUnit, CompositeUnit) are implicitly
   * treated as durations in date/time arithmetic contexts.
   */
  private checkDateTimeArithmetic(
    leftType: ValueType,
    rightType: ValueType,
    leftExpr: AST.Expression,
    rightExpr: AST.Expression,
    expr: AST.BinaryExpression
  ): ValueType {
    // Convert time-dimensioned physical types to duration types
    const leftDurType = this.tryConvertToDuration(leftType, leftExpr);
    const rightDurType = this.tryConvertToDuration(rightType, rightExpr);

    if (expr.operator === '+') {
      return this.checkDateTimeAddition(leftDurType, rightDurType, expr);
    } else if (expr.operator === '-') {
      return this.checkDateTimeSubtraction(leftDurType, rightDurType, expr);
    }

    return this.createError('Invalid date/time arithmetic', expr);
  }

  /**
   * Try to convert a time-dimensioned physical type to a duration type.
   * Returns the original type if it's not time-dimensioned or already a duration.
   */
  private tryConvertToDuration(type: ValueType, expr: AST.Expression): ValueType {
    // Already a duration
    if (type.kind === 'duration') {
      return type;
    }

    // Check if it's a time-dimensioned physical type
    if (this.isPhysicalType(type)) {
      const physicalType = type as PhysicalType;

      // Simple physical with time dimension
      if (physicalType.kind === 'physical' && physicalType.dimension === 'time') {
        // Check the actual unit to determine if it's date or time component
        const isDateComponent = this.isDateComponentUnit(expr);
        return {
          kind: 'duration',
          hasDateComponents: isDateComponent,
          hasTimeComponents: !isDateComponent
        };
      }

      // Composite unit with time dimension
      if (physicalType.kind === 'composite' && physicalType.dimension === 'time') {
        // Check if any component is a date or time component
        const hasDate = this.hasDateComponentUnit(expr);
        const hasTime = this.hasTimeComponentUnit(expr);
        return {
          kind: 'duration',
          hasDateComponents: hasDate,
          hasTimeComponents: hasTime
        };
      }
    }

    // Not convertible, return as-is
    return type;
  }

  /**
   * Check if a unit expression represents a date component (year, month, week, day)
   */
  private isDateComponentUnit(expr: AST.Expression): boolean {
    if (expr.type === 'NumberWithUnit') {
      const unitId = this.getUnitId(expr.unit);
      const dateUnits = ['year', 'month', 'week', 'day', 'yr', 'mo', 'wk', 'd'];
      return dateUnits.some(u => unitId.includes(u));
    }
    return false;
  }

  /**
   * Check if a composite unit has any date component units
   */
  private hasDateComponentUnit(expr: AST.Expression): boolean {
    if (expr.type === 'CompositeUnitLiteral') {
      return expr.components.some(comp => {
        const unitId = this.getUnitId(comp.unit);
        const dateUnits = ['year', 'month', 'week', 'day', 'yr', 'mo', 'wk', 'd'];
        return dateUnits.some(u => unitId.includes(u));
      });
    }
    return false;
  }

  /**
   * Check if a composite unit has any time component units
   */
  private hasTimeComponentUnit(expr: AST.Expression): boolean {
    if (expr.type === 'CompositeUnitLiteral') {
      return expr.components.some(comp => {
        const unitId = this.getUnitId(comp.unit);
        const timeUnits = ['hour', 'minute', 'second', 'millisecond', 'hr', 'min', 'sec', 'ms', 'h', 'm', 's'];
        return timeUnits.some(u => unitId.includes(u));
      });
    }
    return false;
  }

  /**
   * Get the unit ID from a unit expression
   */
  private getUnitId(unit: AST.UnitExpression): string {
    if (unit.type === 'SimpleUnit') {
      return unit.unitId.toLowerCase();
    }
    return '';
  }

  /**
   * Check date/time addition (SPECS.md lines 841-877)
   */
  private checkDateTimeAddition(leftType: ValueType, rightType: ValueType, expr: AST.BinaryExpression): ValueType {
    // PlainDate + PlainTime → PlainDateTime (combine)
    if (leftType.kind === 'plainDate' && rightType.kind === 'plainTime') {
      return { kind: 'plainDateTime' };
    }

    // PlainDate + Duration
    if (leftType.kind === 'plainDate' && rightType.kind === 'duration') {
      const duration = rightType as DurationType;
      // PlainDate + DateDuration → PlainDate
      if (duration.hasDateComponents && !duration.hasTimeComponents) {
        return { kind: 'plainDate' };
      }
      // PlainDate + TimeDuration OR DateTimeDuration → PlainDateTime
      return { kind: 'plainDateTime' };
    }

    // PlainTime + Duration
    if (leftType.kind === 'plainTime' && rightType.kind === 'duration') {
      const duration = rightType as DurationType;
      // PlainTime + DateDuration → PlainDateTime (treat LHS as today)
      if (duration.hasDateComponents && !duration.hasTimeComponents) {
        return { kind: 'plainDateTime' };
      }
      // PlainTime + TimeDuration → PlainTime (if within 24h) or PlainDateTime (if exceeds)
      // Conservative: return PlainDateTime since we can't know at type-check time
      if (!duration.hasDateComponents && duration.hasTimeComponents) {
        return { kind: 'plainDateTime' };
      }
      // PlainTime + DateTimeDuration → PlainDateTime (per spec, even though line 856 says PlainTime)
      // Being conservative here since adding date components should produce a datetime
      return { kind: 'plainDateTime' };
    }

    // PlainDateTime + Duration → PlainDateTime
    if (leftType.kind === 'plainDateTime' && rightType.kind === 'duration') {
      return { kind: 'plainDateTime' };
    }

    // Instant + Duration → Instant
    if (leftType.kind === 'instant' && rightType.kind === 'duration') {
      return { kind: 'instant' };
    }

    // ZonedDateTime + Duration → ZonedDateTime
    if (leftType.kind === 'zonedDateTime' && rightType.kind === 'duration') {
      return { kind: 'zonedDateTime' };
    }

    // Duration + Duration → Duration
    if (leftType.kind === 'duration' && rightType.kind === 'duration') {
      const leftDur = leftType as DurationType;
      const rightDur = rightType as DurationType;
      return {
        kind: 'duration',
        hasDateComponents: leftDur.hasDateComponents || rightDur.hasDateComponents,
        hasTimeComponents: leftDur.hasTimeComponents || rightDur.hasTimeComponents,
      };
    }

    return this.createError('Invalid date/time addition', expr);
  }

  /**
   * Check date/time subtraction (SPECS.md lines 878-942)
   */
  private checkDateTimeSubtraction(leftType: ValueType, rightType: ValueType, expr: AST.BinaryExpression): ValueType {
    // PlainDate - PlainDate → DateDuration
    if (leftType.kind === 'plainDate' && rightType.kind === 'plainDate') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: false };
    }

    // PlainDate - PlainTime → DateTimeDuration (set LHS to 00:00:00)
    if (leftType.kind === 'plainDate' && rightType.kind === 'plainTime') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // PlainDate - PlainDateTime → DateDuration (set time to 00:00:00)
    if (leftType.kind === 'plainDate' && rightType.kind === 'plainDateTime') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: false };
    }

    // PlainDate - Instant → DateDuration (treat LHS as 00:00:00 in local time zone)
    if (leftType.kind === 'plainDate' && rightType.kind === 'instant') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: false };
    }

    // PlainDate - ZonedDateTime → DateDuration (treat LHS as 00:00:00 in local time zone)
    if (leftType.kind === 'plainDate' && rightType.kind === 'zonedDateTime') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: false };
    }

    // PlainDate - Duration
    if (leftType.kind === 'plainDate' && rightType.kind === 'duration') {
      const duration = rightType as DurationType;
      // PlainDate - DateDuration → PlainDate
      if (duration.hasDateComponents && !duration.hasTimeComponents) {
        return { kind: 'plainDate' };
      }
      // PlainDate - TimeDuration OR DateTimeDuration → PlainDateTime
      return { kind: 'plainDateTime' };
    }

    // PlainTime - PlainDate → TimeDuration (treat LHS as today)
    if (leftType.kind === 'plainTime' && rightType.kind === 'plainDate') {
      return { kind: 'duration', hasDateComponents: false, hasTimeComponents: true };
    }

    // PlainTime - PlainTime → TimeDuration
    if (leftType.kind === 'plainTime' && rightType.kind === 'plainTime') {
      return { kind: 'duration', hasDateComponents: false, hasTimeComponents: true };
    }

    // PlainTime - PlainDateTime → DateTimeDuration (treat LHS as today)
    if (leftType.kind === 'plainTime' && rightType.kind === 'plainDateTime') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // PlainTime - Instant → DateTimeDuration (treat LHS as today in local time zone)
    if (leftType.kind === 'plainTime' && rightType.kind === 'instant') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // PlainTime - ZonedDateTime → DateTimeDuration (treat LHS as today in local time zone)
    if (leftType.kind === 'plainTime' && rightType.kind === 'zonedDateTime') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // PlainTime - Duration
    if (leftType.kind === 'plainTime' && rightType.kind === 'duration') {
      const duration = rightType as DurationType;
      // PlainTime - DateDuration → PlainDateTime (treat LHS as today)
      if (duration.hasDateComponents && !duration.hasTimeComponents) {
        return { kind: 'plainDateTime' };
      }
      // PlainTime - TimeDuration → PlainTime (if >= 0) or PlainDateTime (if exceeds)
      // Conservative: return PlainDateTime since we can't know at type-check time
      if (!duration.hasDateComponents && duration.hasTimeComponents) {
        return { kind: 'plainDateTime' };
      }
      // PlainTime - DateTimeDuration → PlainDateTime (being conservative)
      return { kind: 'plainDateTime' };
    }

    // PlainDateTime - PlainDate → DateTimeDuration (set RHS to 00:00:00)
    if (leftType.kind === 'plainDateTime' && rightType.kind === 'plainDate') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // PlainDateTime - PlainTime → DateTimeDuration (treat RHS as today)
    if (leftType.kind === 'plainDateTime' && rightType.kind === 'plainTime') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // PlainDateTime - PlainDateTime → DateTimeDuration
    if (leftType.kind === 'plainDateTime' && rightType.kind === 'plainDateTime') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // PlainDateTime - Instant → DateTimeDuration (treat LHS as local time zone)
    if (leftType.kind === 'plainDateTime' && rightType.kind === 'instant') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // PlainDateTime - ZonedDateTime → DateTimeDuration (treat LHS as local time zone)
    if (leftType.kind === 'plainDateTime' && rightType.kind === 'zonedDateTime') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // PlainDateTime - Duration → PlainDateTime
    if (leftType.kind === 'plainDateTime' && rightType.kind === 'duration') {
      return { kind: 'plainDateTime' };
    }

    // Instant - PlainDate → DateTimeDuration (treat RHS as 00:00:00 in local time zone)
    if (leftType.kind === 'instant' && rightType.kind === 'plainDate') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // Instant - PlainTime → DateTimeDuration (treat RHS as today in local time zone)
    if (leftType.kind === 'instant' && rightType.kind === 'plainTime') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // Instant - PlainDateTime → DateTimeDuration (treat RHS as local time zone)
    if (leftType.kind === 'instant' && rightType.kind === 'plainDateTime') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // Instant - Instant → DateTimeDuration
    if (leftType.kind === 'instant' && rightType.kind === 'instant') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // Instant - ZonedDateTime → DateTimeDuration
    if (leftType.kind === 'instant' && rightType.kind === 'zonedDateTime') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // Instant - Duration → Instant
    if (leftType.kind === 'instant' && rightType.kind === 'duration') {
      return { kind: 'instant' };
    }

    // ZonedDateTime - PlainDate → DateTimeDuration (treat RHS as 00:00:00 in local time zone)
    if (leftType.kind === 'zonedDateTime' && rightType.kind === 'plainDate') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // ZonedDateTime - PlainTime → DateTimeDuration (treat RHS as today in local time zone)
    if (leftType.kind === 'zonedDateTime' && rightType.kind === 'plainTime') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // ZonedDateTime - PlainDateTime → DateTimeDuration (treat RHS as local time zone)
    if (leftType.kind === 'zonedDateTime' && rightType.kind === 'plainDateTime') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // ZonedDateTime - Instant → DateTimeDuration
    if (leftType.kind === 'zonedDateTime' && rightType.kind === 'instant') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // ZonedDateTime - ZonedDateTime → DateTimeDuration
    if (leftType.kind === 'zonedDateTime' && rightType.kind === 'zonedDateTime') {
      return { kind: 'duration', hasDateComponents: true, hasTimeComponents: true };
    }

    // ZonedDateTime - Duration → ZonedDateTime
    if (leftType.kind === 'zonedDateTime' && rightType.kind === 'duration') {
      return { kind: 'zonedDateTime' };
    }

    // Duration - Duration → Duration
    if (leftType.kind === 'duration' && rightType.kind === 'duration') {
      const leftDur = leftType as DurationType;
      const rightDur = rightType as DurationType;
      return {
        kind: 'duration',
        hasDateComponents: leftDur.hasDateComponents || rightDur.hasDateComponents,
        hasTimeComponents: leftDur.hasTimeComponents || rightDur.hasTimeComponents,
      };
    }

    return this.createError('Invalid date/time subtraction', expr);
  }

  /**
   * Check unary expression
   */
  private checkUnaryExpression(expr: AST.UnaryExpression, context: TypeContext): ValueType {
    const operandType = this.checkExpression(expr.operand, context);

    if (operandType.kind === 'error') return operandType;

    switch (expr.operator) {
      case '-':
        if (!this.isPhysicalType(operandType)) {
          return this.createError('Negation requires numeric value', expr);
        }
        return operandType;

      case '!':
        if (operandType.kind !== 'boolean') {
          return this.createError('Logical NOT requires boolean value', expr);
        }
        return { kind: 'boolean' };

      case '~':
        if (!this.isPhysicalType(operandType) || operandType.kind !== 'dimensionless') {
          return this.createError('Bitwise NOT requires dimensionless value', expr);
        }
        return { kind: 'dimensionless' };

      default:
        const exhaustive: never = expr.operator;
        return this.createError(`Unknown unary operator: ${exhaustive}`, expr);
    }
  }

  /**
   * Check postfix expression (factorial)
   */
  private checkPostfixExpression(expr: AST.PostfixExpression, context: TypeContext): ValueType {
    const operandType = this.checkExpression(expr.operand, context);

    if (operandType.kind === 'error') return operandType;

    if (!this.isPhysicalType(operandType) || operandType.kind !== 'dimensionless') {
      return this.createError('Factorial requires dimensionless value', expr);
    }

    return { kind: 'dimensionless' };
  }

  /**
   * Check conditional expression
   */
  private checkConditionalExpression(expr: AST.ConditionalExpression, context: TypeContext): ValueType {
    const conditionType = this.checkExpression(expr.condition, context);
    const thenType = this.checkExpression(expr.thenBranch, context);
    const elseType = this.checkExpression(expr.elseBranch, context);

    if (conditionType.kind === 'error') return conditionType;
    if (thenType.kind === 'error') return thenType;
    if (elseType.kind === 'error') return elseType;

    if (conditionType.kind !== 'boolean') {
      return this.createError('Condition must be boolean', expr);
    }

    // Then and else branches should have compatible types
    if (!this.typesCompatible(thenType, elseType)) {
      return this.createError('Conditional branches must have compatible types', expr);
    }

    return thenType;
  }

  /**
   * Check conversion expression
   */
  private checkConversionExpression(expr: AST.ConversionExpression, context: TypeContext): ValueType {
    const sourceType = this.checkExpression(expr.expression, context);

    if (sourceType.kind === 'error') return sourceType;

    switch (expr.target.type) {
      case 'UnitTarget':
        return this.checkUnitConversion(sourceType, expr.target, expr);

      case 'CompositeUnitTarget':
        return this.checkCompositeUnitConversion(sourceType, expr.target, expr);

      case 'PresentationTarget':
        // Presentation conversions are always valid for numeric types
        if (!this.isPhysicalType(sourceType)) {
          return this.createError('Presentation conversion requires numeric value', expr);
        }
        return sourceType;

      case 'PropertyTarget':
        return this.checkPropertyExtraction(sourceType, expr.target, expr);

      case 'TimezoneTarget':
        return this.checkTimezoneConversion(sourceType, expr.target, expr);

      default:
        const exhaustive: never = expr.target;
        return this.createError(`Unknown conversion target: ${(exhaustive as any).type}`, expr);
    }
  }

  /**
   * Check unit conversion
   */
  private checkUnitConversion(
    sourceType: ValueType,
    target: AST.UnitTarget,
    expr: AST.ConversionExpression
  ): ValueType {
    if (!this.isPhysicalType(sourceType)) {
      return this.createError('Unit conversion requires numeric value', expr);
    }

    const targetType = this.getUnitType(target.unit);

    if (!this.dimensionsCompatible(sourceType, targetType)) {
      return this.createError('Unit conversion requires compatible dimensions', expr);
    }

    return targetType;
  }

  /**
   * Check composite unit conversion
   */
  private checkCompositeUnitConversion(
    sourceType: ValueType,
    target: AST.CompositeUnitTarget,
    expr: AST.ConversionExpression
  ): ValueType {
    if (!this.isPhysicalType(sourceType) && sourceType.kind !== 'composite') {
      return this.createError('Composite unit conversion requires numeric value', expr);
    }

    // All target units must have the same dimension
    if (target.units.length === 0) {
      return this.createError('Composite unit target must have at least one unit', expr);
    }

    const firstDimension = this.getDimensionFromUnit(target.units[0]);
    for (let i = 1; i < target.units.length; i++) {
      const dimension = this.getDimensionFromUnit(target.units[i]);
      if (dimension !== firstDimension) {
        return this.createError('All target units must have the same dimension', expr);
      }
    }

    // Source dimension must match target dimension
    const sourceDimension = this.getDimensionFromType(sourceType);
    if (sourceDimension !== firstDimension) {
      return this.createError('Source and target dimensions must match', expr);
    }

    return { kind: 'composite', dimension: firstDimension! };
  }

  /**
   * Check property extraction
   */
  private checkPropertyExtraction(
    sourceType: ValueType,
    target: AST.PropertyTarget,
    expr: AST.ConversionExpression
  ): ValueType {
    if (!this.isDateTimeType(sourceType)) {
      return this.createError('Property extraction requires date/time value', expr);
    }

    // All property extractions return dimensionless numbers
    return { kind: 'dimensionless' };
  }

  /**
   * Check timezone conversion
   */
  private checkTimezoneConversion(
    sourceType: ValueType,
    target: AST.TimezoneTarget,
    expr: AST.ConversionExpression
  ): ValueType {
    if (sourceType.kind !== 'instant' && sourceType.kind !== 'zonedDateTime') {
      return this.createError('Timezone conversion requires instant or zoned date-time', expr);
    }

    return { kind: 'zonedDateTime' };
  }

  /**
   * Check function call
   */
  private checkFunctionCall(expr: AST.FunctionCall, context: TypeContext): ValueType {
    // Check argument types
    const argTypes = expr.arguments.map(arg => this.checkExpression(arg, context));

    // Propagate errors
    for (const argType of argTypes) {
      if (argType.kind === 'error') return argType;
    }

    // Most math functions return dimensionless values
    // TODO: More sophisticated function type checking
    return { kind: 'dimensionless' };
  }

  /**
   * Helper: Get type of a unit expression
   */
  private getUnitType(unit: AST.UnitExpression): PhysicalType {
    if (unit.type === 'SimpleUnit') {
      const unitData = this.dataLoader.getUnitByName(unit.name);
      if (!unitData) {
        return { kind: 'dimensionless' };
      }
      return { kind: 'physical', dimension: unitData.dimension };
    }

    // DerivedUnit
    const terms = unit.terms.map(term => {
      const unitData = this.dataLoader.getUnitByName(term.unit.name);
      return {
        dimension: unitData?.dimension || 'dimensionless',
        exponent: term.exponent,
      };
    });

    return { kind: 'derived', terms };
  }

  /**
   * Helper: Get dimension from unit expression
   */
  private getDimensionFromUnit(unit: AST.UnitExpression): string | null {
    if (unit.type === 'SimpleUnit') {
      const unitData = this.dataLoader.getUnitByName(unit.name);
      return unitData?.dimension || null;
    }

    // For derived units, we'd need to compute the resulting dimension
    // For now, return null (complex case)
    return null;
  }

  /**
   * Helper: Get dimension from value type
   */
  private getDimensionFromType(type: ValueType): string | null {
    if (type.kind === 'physical') {
      return type.dimension;
    }
    if (type.kind === 'composite') {
      return type.dimension;
    }
    if (type.kind === 'dimensionless') {
      return 'dimensionless';
    }
    return null;
  }

  /**
   * Helper: Check if dimensions are compatible
   */
  private dimensionsCompatible(type1: PhysicalType, type2: PhysicalType): boolean {
    // Dimensionless is compatible with dimensionless
    if (type1.kind === 'dimensionless' && type2.kind === 'dimensionless') {
      return true;
    }

    // Simple physical types must have same dimension
    if (type1.kind === 'physical' && type2.kind === 'physical') {
      return type1.dimension === type2.dimension;
    }

    // Derived types - would need to compare numerator/denominator
    // For now, simplified
    if (type1.kind === 'derived' && type2.kind === 'derived') {
      return JSON.stringify(type1) === JSON.stringify(type2);
    }

    return false;
  }

  /**
   * Helper: Derive dimension from multiplication/division
   */
  private deriveDimension(type1: PhysicalType, type2: PhysicalType, operation: 'multiply' | 'divide'): PhysicalType {
    // Convert types to term arrays
    const terms1 = this.toTerms(type1);
    let terms2 = this.toTerms(type2);

    // For division, negate all exponents in type2
    if (operation === 'divide') {
      terms2 = terms2.map(t => ({ dimension: t.dimension, exponent: -t.exponent }));
    }

    // Combine terms
    const combinedTerms = [...terms1, ...terms2];

    // Simplify by combining like dimensions
    const dimensionMap = new Map<string, number>();
    for (const term of combinedTerms) {
      const current = dimensionMap.get(term.dimension) || 0;
      dimensionMap.set(term.dimension, current + term.exponent);
    }

    // Remove zero exponents
    const simplifiedTerms = Array.from(dimensionMap.entries())
      .filter(([_, exp]) => exp !== 0)
      .map(([dim, exp]) => ({ dimension: dim, exponent: exp }));

    // Return appropriate type
    if (simplifiedTerms.length === 0) {
      return { kind: 'dimensionless' };
    }

    if (simplifiedTerms.length === 1 && simplifiedTerms[0].exponent === 1) {
      return { kind: 'physical', dimension: simplifiedTerms[0].dimension };
    }

    return { kind: 'derived', terms: simplifiedTerms };
  }

  /**
   * Helper: Convert physical type to terms array
   */
  private toTerms(type: PhysicalType): Array<{ dimension: string; exponent: number }> {
    if (type.kind === 'dimensionless') {
      return [];
    }

    if (type.kind === 'physical') {
      return [{ dimension: type.dimension, exponent: 1 }];
    }

    return type.terms;
  }

  /**
   * Helper: Check if two types are compatible
   */
  private typesCompatible(type1: ValueType, type2: ValueType): boolean {
    if (type1.kind === 'error' || type2.kind === 'error') return true;
    if (type1.kind === 'boolean' && type2.kind === 'boolean') return true;

    if (this.isPhysicalType(type1) && this.isPhysicalType(type2)) {
      return this.dimensionsCompatible(type1, type2);
    }

    if (this.isDateTimeType(type1) && this.isDateTimeType(type2)) {
      return type1.kind === type2.kind;
    }

    return false;
  }

  /**
   * Helper: Check if type is physical
   */
  private isPhysicalType(type: ValueType): type is PhysicalType {
    return type.kind === 'dimensionless' || type.kind === 'physical' || type.kind === 'derived';
  }

  /**
   * Helper: Check if type is date/time
   */
  private isDateTimeType(type: ValueType): type is DateTimeType {
    return (
      type.kind === 'plainDate' ||
      type.kind === 'plainTime' ||
      type.kind === 'plainDateTime' ||
      type.kind === 'instant' ||
      type.kind === 'zonedDateTime' ||
      type.kind === 'duration'
    );
  }

  /**
   * Helper: Look up variable in context
   */
  private lookupVariable(name: string, context: TypeContext): ValueType | null {
    if (context.variables.has(name)) {
      return context.variables.get(name)!;
    }

    if (context.parent) {
      return this.lookupVariable(name, context.parent);
    }

    return null;
  }

  /**
   * Helper: Create error type
   */
  private createError(message: string, node: AST.ASTNode): ErrorType {
    const error = new TypeError(message, node.start, node.end);
    return { kind: 'error', error };
  }
}

import { SourceLocation } from './tokens';

/**
 * AST Node base interface
 */
export interface ASTNode {
  type: string;
  start: SourceLocation;
  end: SourceLocation;
}

/**
 * Document node - top level
 */
export interface Document extends ASTNode {
  type: 'Document';
  lines: Line[];
}

/**
 * Line types
 */
export type Line =
  | Heading
  | ExpressionLine
  | VariableDefinition
  | PlainText
  | EmptyLine;

export interface Heading extends ASTNode {
  type: 'Heading';
  level: number;
  text: string;
}

export interface ExpressionLine extends ASTNode {
  type: 'ExpressionLine';
  expression: Expression;
}

export interface VariableDefinition extends ASTNode {
  type: 'VariableDefinition';
  name: string;
  value: Expression;
}

export interface PlainText extends ASTNode {
  type: 'PlainText';
  text: string;
}

export interface EmptyLine extends ASTNode {
  type: 'EmptyLine';
}

/**
 * Expression types
 */
export type Expression =
  | ConditionalExpression
  | ConversionExpression
  | BinaryExpression
  | UnaryExpression
  | PostfixExpression
  | RelativeInstantExpression
  | FunctionCall
  | Literal
  | Identifier
  | GroupedExpression;

export interface ConditionalExpression extends ASTNode {
  type: 'ConditionalExpression';
  condition: Expression;
  thenBranch: Expression;
  elseBranch: Expression;
}

export interface ConversionExpression extends ASTNode {
  type: 'ConversionExpression';
  expression: Expression;
  operator: 'to' | 'in' | 'as' | '→';
  target: ConversionTarget;
}

export interface BinaryExpression extends ASTNode {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | 'mod'
  | 'per'
  | '^'
  | '&'
  | '|'
  | 'xor'
  | '&&'
  | '||'
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | '<<'
  | '>>';

export interface UnaryExpression extends ASTNode {
  type: 'UnaryExpression';
  operator: UnaryOperator;
  operand: Expression;
}

export type UnaryOperator = '-' | '!' | '~';

export interface PostfixExpression extends ASTNode {
  type: 'PostfixExpression';
  operator: '!'; // factorial
  operand: Expression;
}

export interface RelativeInstantExpression extends ASTNode {
  type: 'RelativeInstantExpression';
  amount: NumberWithUnit;
  direction: 'ago' | 'from_now';
}

export interface FunctionCall extends ASTNode {
  type: 'FunctionCall';
  name: string;
  arguments: Expression[];
}

export interface GroupedExpression extends ASTNode {
  type: 'GroupedExpression';
  expression: Expression;
}

/**
 * Literal types
 */
export type Literal =
  | NumberLiteral
  | NumberWithUnit
  | CompositeUnitLiteral
  | DateTimeLiteral
  | BooleanLiteral
  | ConstantLiteral;

export interface NumberLiteral extends ASTNode {
  type: 'NumberLiteral';
  value: number;
  raw: string; // Original text representation
}

export interface NumberWithUnit extends ASTNode {
  type: 'NumberWithUnit';
  value: number;
  unit: UnitExpression;
  raw: string;
}

export interface CompositeUnitLiteral extends ASTNode {
  type: 'CompositeUnitLiteral';
  components: Array<{ value: number; unit: UnitExpression }>;
}

export interface BooleanLiteral extends ASTNode {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface ConstantLiteral extends ASTNode {
  type: 'ConstantLiteral';
  name: string;
}

/**
 * Date/Time literal types
 */
export type DateTimeLiteral =
  | PlainDateLiteral
  | PlainTimeLiteral
  | PlainDateTimeLiteral
  | InstantLiteral
  | ZonedDateTimeLiteral
  | DurationLiteral;

export interface PlainDateLiteral extends ASTNode {
  type: 'PlainDateLiteral';
  year: number;
  month: number;
  day: number;
}

export interface PlainTimeLiteral extends ASTNode {
  type: 'PlainTimeLiteral';
  hour: number;
  minute: number;
  second: number;
  millisecond?: number;
}

export interface PlainDateTimeLiteral extends ASTNode {
  type: 'PlainDateTimeLiteral';
  date: PlainDateLiteral;
  time: PlainTimeLiteral;
}

export interface InstantLiteral extends ASTNode {
  type: 'InstantLiteral';
  timestamp: number; // Unix timestamp in milliseconds
}

export interface ZonedDateTimeLiteral extends ASTNode {
  type: 'ZonedDateTimeLiteral';
  dateTime: PlainDateTimeLiteral;
  timezone: string; // IANA timezone
}

export interface DurationLiteral extends ASTNode {
  type: 'DurationLiteral';
  components: DurationComponents;
}

export interface DurationComponents {
  // Date components
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;

  // Time components
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

/**
 * Unit expression types
 */
export type UnitExpression = SimpleUnit | DerivedUnit;

export interface SimpleUnit extends ASTNode {
  type: 'SimpleUnit';
  unitId: string; // ID from units database
  name: string; // Original text
}

export interface DerivedUnit extends ASTNode {
  type: 'DerivedUnit';
  // Uses signed exponents: positive for numerator, negative for denominator
  // Example: m/s = [{unit: meter, exponent: 1}, {unit: second, exponent: -1}]
  terms: UnitTerm[];
}

export interface UnitTerm {
  unit: SimpleUnit;
  exponent: number; // positive or negative
}

/**
 * Conversion targets
 */
export type ConversionTarget =
  | UnitTarget
  | CompositeUnitTarget
  | PresentationTarget
  | PropertyTarget
  | TimezoneTarget;

export interface UnitTarget extends ASTNode {
  type: 'UnitTarget';
  unit: UnitExpression;
}

export interface CompositeUnitTarget extends ASTNode {
  type: 'CompositeUnitTarget';
  units: UnitExpression[];
}

export interface PresentationTarget extends ASTNode {
  type: 'PresentationTarget';
  format: PresentationFormat;
}

export type PresentationFormat =
  | 'binary'
  | 'octal'
  | 'hex'
  | 'fraction'
  | 'scientific'
  | 'ordinal';

export interface PropertyTarget extends ASTNode {
  type: 'PropertyTarget';
  property: DateTimeProperty;
}

export type DateTimeProperty =
  | 'year'
  | 'month'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'millisecond'
  | 'dayOfWeek'
  | 'dayOfYear'
  | 'weekOfYear';

export interface TimezoneTarget extends ASTNode {
  type: 'TimezoneTarget';
  timezone: string; // IANA timezone or timezone name
}

/**
 * Identifier node
 */
export interface Identifier extends ASTNode {
  type: 'Identifier';
  name: string;
}

/**
 * Helper functions to create AST nodes
 */

export function createDocument(lines: Line[], start: SourceLocation, end: SourceLocation): Document {
  return { type: 'Document', lines, start, end };
}

export function createHeading(level: number, text: string, start: SourceLocation, end: SourceLocation): Heading {
  return { type: 'Heading', level, text, start, end };
}

export function createExpressionLine(expression: Expression, start: SourceLocation, end: SourceLocation): ExpressionLine {
  return { type: 'ExpressionLine', expression, start, end };
}

export function createVariableDefinition(name: string, value: Expression, start: SourceLocation, end: SourceLocation): VariableDefinition {
  return { type: 'VariableDefinition', name, value, start, end };
}

export function createPlainText(text: string, start: SourceLocation, end: SourceLocation): PlainText {
  return { type: 'PlainText', text, start, end };
}

export function createEmptyLine(start: SourceLocation, end: SourceLocation): EmptyLine {
  return { type: 'EmptyLine', start, end };
}

export function createBinaryExpression(
  operator: BinaryOperator,
  left: Expression,
  right: Expression,
  start: SourceLocation,
  end: SourceLocation
): BinaryExpression {
  return { type: 'BinaryExpression', operator, left, right, start, end };
}

export function createUnaryExpression(
  operator: UnaryOperator,
  operand: Expression,
  start: SourceLocation,
  end: SourceLocation
): UnaryExpression {
  return { type: 'UnaryExpression', operator, operand, start, end };
}

export function createPostfixExpression(
  operator: '!',
  operand: Expression,
  start: SourceLocation,
  end: SourceLocation
): PostfixExpression {
  return { type: 'PostfixExpression', operator, operand, start, end };
}

export function createNumberLiteral(value: number, raw: string, start: SourceLocation, end: SourceLocation): NumberLiteral {
  return { type: 'NumberLiteral', value, raw, start, end };
}

export function createNumberWithUnit(
  value: number,
  unit: UnitExpression,
  raw: string,
  start: SourceLocation,
  end: SourceLocation
): NumberWithUnit {
  return { type: 'NumberWithUnit', value, unit, raw, start, end };
}

export function createIdentifier(name: string, start: SourceLocation, end: SourceLocation): Identifier {
  return { type: 'Identifier', name, start, end };
}

export function createBooleanLiteral(value: boolean, start: SourceLocation, end: SourceLocation): BooleanLiteral {
  return { type: 'BooleanLiteral', value, start, end };
}

export function createConstantLiteral(name: string, start: SourceLocation, end: SourceLocation): ConstantLiteral {
  return { type: 'ConstantLiteral', name, start, end };
}

export function createPlainDateLiteral(
  year: number,
  month: number,
  day: number,
  start: SourceLocation,
  end: SourceLocation
): PlainDateLiteral {
  return { type: 'PlainDateLiteral', year, month, day, start, end };
}

export function createPlainTimeLiteral(
  hour: number,
  minute: number,
  second: number,
  millisecond: number | undefined,
  start: SourceLocation,
  end: SourceLocation
): PlainTimeLiteral {
  return { type: 'PlainTimeLiteral', hour, minute, second, millisecond, start, end };
}

export function createPlainDateTimeLiteral(
  date: PlainDateLiteral,
  time: PlainTimeLiteral,
  start: SourceLocation,
  end: SourceLocation
): PlainDateTimeLiteral {
  return { type: 'PlainDateTimeLiteral', date, time, start, end };
}

export function createZonedDateTimeLiteral(
  dateTime: PlainDateTimeLiteral,
  timezone: string,
  start: SourceLocation,
  end: SourceLocation
): ZonedDateTimeLiteral {
  return { type: 'ZonedDateTimeLiteral', dateTime, timezone, start, end };
}

export function createInstantLiteral(
  timestamp: number,
  start: SourceLocation,
  end: SourceLocation
): InstantLiteral {
  return { type: 'InstantLiteral', timestamp, start, end };
}

export function createFunctionCall(
  name: string,
  args: Expression[],
  start: SourceLocation,
  end: SourceLocation
): FunctionCall {
  return { type: 'FunctionCall', name, arguments: args, start, end };
}

export function createGroupedExpression(expression: Expression, start: SourceLocation, end: SourceLocation): GroupedExpression {
  return { type: 'GroupedExpression', expression, start, end };
}

export function createConditionalExpression(
  condition: Expression,
  thenBranch: Expression,
  elseBranch: Expression,
  start: SourceLocation,
  end: SourceLocation
): ConditionalExpression {
  return { type: 'ConditionalExpression', condition, thenBranch, elseBranch, start, end };
}

export function createConversionExpression(
  expression: Expression,
  operator: 'to' | 'in' | 'as' | '→',
  target: ConversionTarget,
  start: SourceLocation,
  end: SourceLocation
): ConversionExpression {
  return { type: 'ConversionExpression', expression, operator, target, start, end };
}

export function createSimpleUnit(unitId: string, name: string, start: SourceLocation, end: SourceLocation): SimpleUnit {
  return { type: 'SimpleUnit', unitId, name, start, end };
}

export function createDerivedUnit(
  terms: UnitTerm[],
  start: SourceLocation,
  end: SourceLocation
): DerivedUnit {
  return { type: 'DerivedUnit', terms, start, end };
}

export function createUnitTarget(unit: UnitExpression, start: SourceLocation, end: SourceLocation): UnitTarget {
  return { type: 'UnitTarget', unit, start, end };
}

export function createCompositeUnitTarget(units: UnitExpression[], start: SourceLocation, end: SourceLocation): CompositeUnitTarget {
  return { type: 'CompositeUnitTarget', units, start, end };
}

export function createRelativeInstantExpression(
  amount: Expression,
  direction: 'ago' | 'from_now',
  start: SourceLocation,
  end: SourceLocation
): RelativeInstantExpression {
  if (amount.type !== 'NumberWithUnit') {
    throw new Error('RelativeInstantExpression requires NumberWithUnit');
  }
  return { type: 'RelativeInstantExpression', amount: amount as NumberWithUnit, direction, start, end };
}

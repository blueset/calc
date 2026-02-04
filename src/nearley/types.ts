// ============================================================================
// Type Transform Helpers
// ============================================================================

interface TransformTypeFn {
  readonly _A: unknown;
  readonly type: unknown;
}

type Apply<F extends TransformTypeFn, A> = (F & { readonly _A: A})['type'];

interface Id extends TransformTypeFn {
  readonly type: this['_A'];
}

interface Arr extends TransformTypeFn {
  readonly type: Array<this['_A']>;
}

// ============================================================================
// Base Node Interface
// ============================================================================

interface Node {
  readonly location: number;
}

// ============================================================================
// Operator Types
// ============================================================================

type BinaryOperator =
  | 'or' | 'and'                                                          // Logical
  | 'pipe' | 'kw_xor' | 'ampersand'                                       // Bitwise
  | 'lt' | 'lessThanOrEqual' | 'gt' | 'greaterThanOrEqual' | 'equals' | 'notEquals'  // Comparison
  | 'lShift' | 'rShift'                                                   // Bit shift
  | 'plus' | 'minus'                                                      // Additive
  | 'times' | 'slash' | 'divide' | 'kw_per' | 'percent' | 'kw_mod'        // Multiplicative
  | 'caret' | 'superscript';                                              // Power

type UnaryOperator = 'minus' | 'bang' | 'tilde';

type PostfixOperator = 'bang';

type ConversionOperator = 'kw_to' | 'kw_as' | 'kw_in' | 'arrow';

// ============================================================================
// Line (Top-Level)
// ============================================================================

type LineNode<F extends TransformTypeFn = Id> = 
  | Apply<F, VariableAssignmentNode<F>> 
  | Apply<F, ExpressionNode<F>> 
  | null;

// ============================================================================
// Variable Assignment
// ============================================================================

interface VariableAssignmentNode<F extends TransformTypeFn = Id> extends Node {
  readonly type: 'VariableAssignment';
  readonly name: string;
  readonly value: Apply<F, ExpressionNode<F>>;
}

// ============================================================================
// Expression Nodes
// ============================================================================

interface ConditionalExprNode<F extends TransformTypeFn = Id> extends Node {
  readonly type: 'ConditionalExpr';
  readonly condition: Apply<F, ExpressionNode<F>>;
  readonly then: Apply<F, ExpressionNode<F>>;
  readonly else: Apply<F, ExpressionNode<F>>;
}

interface ConversionNode<F extends TransformTypeFn = Id> extends Node {
  readonly type: 'Conversion';
  readonly expression: Apply<F, ExpressionNode<F>>;
  readonly operator: ConversionOperator;
  readonly target: Apply<F, ConversionTargetNode<F>>;
}

interface BinaryExpressionNode<F extends TransformTypeFn = Id> extends Node {
  readonly type: 'BinaryExpression';
  readonly subType?: string;
  readonly operator: BinaryOperator;
  readonly left: Apply<F, ExpressionNode<F>>;
  readonly right: Apply<F, ExpressionNode<F>>;
}

interface UnaryExpressionNode<F extends TransformTypeFn = Id> extends Node {
  readonly type: 'UnaryExpression';
  readonly operator: UnaryOperator;
  readonly argument: Apply<F, ExpressionNode<F>>;
}

interface PostfixExpressionNode<F extends TransformTypeFn = Id> extends Node {
  readonly type: 'PostfixExpression';
  readonly operator: PostfixOperator;
  readonly argument: Apply<F, ExpressionNode<F>>;
}

// ============================================================================
// Primary Expression Nodes
// ============================================================================

interface BooleanLiteralNode extends Node {
  readonly type: 'BooleanLiteral';
  readonly value: boolean;
}

interface VariableNode extends Node {
  readonly type: 'Variable';
  readonly name: string;
}

interface ConstantNode extends Node {
  readonly type: 'Constant';
  readonly name: string;
}

interface FunctionCallNode<F extends TransformTypeFn = Id> extends Node {
  readonly type: 'FunctionCall';
  readonly name: string;
  readonly arguments: Apply<F, ExpressionNode<F>[]>;
}

// ============================================================================
// Value Nodes
// ============================================================================

interface ValueNode<F extends TransformTypeFn = Id> extends Node {
  readonly type: 'Value';
  readonly value: Apply<F, NumericalValueNode>;
  readonly unit: Apply<F, UnitsNode<F> | CurrencyUnitNode> | null;
}

interface CompositeValueNode<F extends TransformTypeFn = Id> extends Node {
  readonly type: 'CompositeValue';
  readonly subType: string;
  readonly values: Apply<F, ValueNode<F>[]>;
}

// ============================================================================
// Numerical Value Nodes
// ============================================================================

interface NumberLiteralNode extends Node {
  readonly type: 'NumberLiteral';
  readonly subType: string;
  readonly base: number;
  readonly value: string;
}

interface PercentageLiteralNode extends Node {
  readonly type: 'PercentageLiteral';
  readonly value: string;
  readonly symbol: 'percent' | 'permille';
}

type NumericalValueNode = NumberLiteralNode | PercentageLiteralNode;

// ============================================================================
// Unit Nodes
// ============================================================================

interface UnitsNode<F extends TransformTypeFn = Id> extends Node {
  readonly type: 'Units';
  readonly subType: string;
  readonly numerators: Apply<F, UnitWithExponentNode[]>;
  readonly denominators: Apply<F, UnitWithExponentNode[]>;
}

interface UnitWithExponentNode extends Node {
  readonly type: 'UnitWithExponent';
  readonly unit: UnitNode;
  readonly exponent: number;
}

interface UnitNode extends Node {
  readonly type: 'Unit';
  readonly name: string;
  readonly matched: 'symbol' | 'unit' | 'currencyName' | 'currencyCode' | 'identifier';
}

interface CurrencyUnitNode extends Node {
  readonly type: 'CurrencyUnit';
  readonly subType: string;
  readonly name: string;
}

// ============================================================================
// Date-Time Nodes
// ============================================================================

interface InstantKeywordNode extends Node {
  readonly type: 'Instant';
  readonly keyword: 'now' | 'today' | 'yesterday' | 'tomorrow';
}

interface InstantRelativeNode<F extends TransformTypeFn = Id> extends Node {
  readonly type: 'Instant';
  readonly amount: Apply<F, NumericalValueNode>;
  readonly unit: string;
  readonly direction: 'ago' | 'fromNow' | 'sinceEpoch';
}

type InstantNode<F extends TransformTypeFn = Id> = InstantKeywordNode | InstantRelativeNode<F>;

interface PlainTimeNode extends Node {
  readonly type: 'PlainTime';
  readonly subType: string;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

interface PlainDateNode extends Node {
  readonly type: 'PlainDate';
  readonly subType: string;
  readonly day: number;
  readonly month: number;
  readonly year: number;
}

interface PlainDateTimeNode<F extends TransformTypeFn = Id> extends Node {
  readonly type: 'PlainDateTime';
  readonly subType: string;
  readonly date: Apply<F, PlainDateNode>;
  readonly time: Apply<F, PlainTimeNode>;
}

interface ZonedDateTimeNode<F extends TransformTypeFn = Id> extends Node {
  readonly type: 'ZonedDateTime';
  readonly dateTime: Apply<F, PlainDateTimeNode<F>>;
  readonly timezone: Apply<F, TimezoneNode>;
}

type DateTimeLiteralNode<F extends TransformTypeFn = Id> =
  | ZonedDateTimeNode<F>
  | InstantNode<F>
  | PlainDateTimeNode<F>
  | PlainDateNode
  | PlainTimeNode;

// ============================================================================
// Timezone Nodes
// ============================================================================

interface UTCOffsetNode extends Node {
  readonly type: 'UTCOffset';
  readonly subType: string;
  readonly offsetStr: string;
  readonly baseZone: string;
}

interface TimezoneNameNode extends Node {
  readonly type: 'TimezoneName';
  readonly zoneName: string;
}

type TimezoneNode = UTCOffsetNode | TimezoneNameNode;

// ============================================================================
// Conversion Target Nodes
// ============================================================================

interface ValueFormatNode extends Node {
  readonly type: 'PresentationFormat';
  readonly format: 'value';
}

interface BaseFormatNode extends Node {
  readonly type: 'PresentationFormat';
  readonly format: 'base';
  readonly base: number;
}

interface SigFigsFormatNode extends Node {
  readonly type: 'PresentationFormat';
  readonly format: 'sigFigs';
  readonly sigFigs: number;
}

interface DecimalsFormatNode extends Node {
  readonly type: 'PresentationFormat';
  readonly format: 'decimals';
  readonly decimals: number;
}

interface ScientificFormatNode extends Node {
  readonly type: 'PresentationFormat';
  readonly format: 'scientific';
}

interface FractionFormatNode extends Node {
  readonly type: 'PresentationFormat';
  readonly format: 'fraction';
}

interface UnixFormatNode extends Node {
  readonly type: 'PresentationFormat';
  readonly format: 'unix';
  readonly unit: string;
}

interface NamedFormatNode extends Node {
  readonly type: 'PresentationFormat';
  readonly format: 'namedFormat';
  readonly name: string;
}

type PresentationFormatNode =
  | ValueFormatNode
  | BaseFormatNode
  | SigFigsFormatNode
  | DecimalsFormatNode
  | ScientificFormatNode
  | FractionFormatNode
  | UnixFormatNode
  | NamedFormatNode;

interface PropertyTargetNode extends Node {
  readonly type: 'PropertyTarget';
  readonly property:
    | 'year' | 'month' | 'day' | 'weekday'
    | 'hour' | 'minute' | 'second' | 'millisecond'
    | 'offset' | 'dayOfYear' | 'weekOfYear';
}

type ConversionTargetNode<F extends TransformTypeFn = Id> =
  | UnitsNode<F>
  | PresentationFormatNode
  | PropertyTargetNode
  | TimezoneNode;

// ============================================================================
// Expression Union Type
// ============================================================================

type ExpressionNode<F extends TransformTypeFn = Id> =
  | ConditionalExprNode<F>
  | ConversionNode<F>
  | BinaryExpressionNode<F>
  | UnaryExpressionNode<F>
  | PostfixExpressionNode<F>
  | ValueNode<F>
  | CompositeValueNode<F>
  | FunctionCallNode<F>
  | BooleanLiteralNode
  | VariableNode
  | ConstantNode
  | DateTimeLiteralNode<F>;

// ============================================================================
// Exports
// ============================================================================

export type {
  // Helpers
  TransformTypeFn,
  Apply,
  Id,
  Arr,
  Node,

  // Operators
  BinaryOperator,
  UnaryOperator,
  PostfixOperator,
  ConversionOperator,

  // Top-level
  LineNode,
  VariableAssignmentNode,

  // Expressions
  ExpressionNode,
  ConditionalExprNode,
  ConversionNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  PostfixExpressionNode,

  // Primaries
  BooleanLiteralNode,
  VariableNode,
  ConstantNode,
  FunctionCallNode,

  // Values
  ValueNode,
  CompositeValueNode,
  NumericalValueNode,
  NumberLiteralNode,
  PercentageLiteralNode,

  // Units
  UnitsNode,
  UnitWithExponentNode,
  UnitNode,
  CurrencyUnitNode,

  // Date-Time
  DateTimeLiteralNode,
  InstantNode,
  InstantKeywordNode,
  InstantRelativeNode,
  PlainTimeNode,
  PlainDateNode,
  PlainDateTimeNode,
  ZonedDateTimeNode,

  // Timezone
  TimezoneNode,
  UTCOffsetNode,
  TimezoneNameNode,

  // Conversion Targets
  ConversionTargetNode,
  PresentationFormatNode,
  ValueFormatNode,
  BaseFormatNode,
  SigFigsFormatNode,
  DecimalsFormatNode,
  ScientificFormatNode,
  FractionFormatNode,
  UnixFormatNode,
  NamedFormatNode,
  PropertyTargetNode,
};

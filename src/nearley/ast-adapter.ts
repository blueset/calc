/**
 * AST Adapter - Converts Nearley AST to Old AST Format
 *
 * Maps Nearley parser output (src/nearley/types.ts) to the target AST format (src/ast.ts)
 * used by the evaluator.
 */

import * as NearleyAST from './types';
import * as OldAST from '../ast';
import { SourceLocation } from '../tokens';
import { DataLoader } from '../data-loader';

// Global DataLoader instance for unit resolution
// Set by the parser before adaptation
let globalDataLoader: DataLoader | null = null;

/**
 * Set the DataLoader instance for unit resolution
 * Must be called before adaptLine
 */
export function setDataLoader(dataLoader: DataLoader): void {
  globalDataLoader = dataLoader;
}

/**
 * Create SourceLocation from Nearley location (single number to start/end)
 */
function createLocation(location: number, length: number = 0): { start: SourceLocation; end: SourceLocation } {
  // Location is the start character offset
  // Line is always 0 since input is processed line-by-line
  return {
    start: { line: 0, column: location, offset: location },
    end: { line: 0, column: location + length, offset: location + length }
  };
}

/**
 * Adapt LineNode to old Line type
 */
export function adaptLine(node: NearleyAST.LineNode | null, lineNumber: number, lineText: string): OldAST.Line {
  if (node === null) {
    // Empty line or failed parse - return EmptyLine
    const loc = createLocation(0, lineText.length);
    return OldAST.createEmptyLine(loc.start, loc.end);
  }

  if (node.type === 'VariableAssignment') {
    return adaptVariableAssignment(node);
  }

  // Expression node - wrap in ExpressionLine
  const expression = adaptExpression(node);
  const loc = createLocation(node.location, 0);
  return OldAST.createExpressionLine(expression, loc.start, loc.end);
}

/**
 * Adapt VariableAssignmentNode to VariableDefinition
 */
function adaptVariableAssignment(node: NearleyAST.VariableAssignmentNode): OldAST.VariableDefinition {
  const value = adaptExpression(node.value);
  const loc = createLocation(node.location, 0);
  return OldAST.createVariableDefinition(node.name, value, loc.start, loc.end);
}

/**
 * Adapt ExpressionNode to Expression
 */
function adaptExpression(node: NearleyAST.ExpressionNode): OldAST.Expression {
  switch (node.type) {
    case 'ConditionalExpr':
      return adaptConditionalExpr(node);
    case 'Conversion':
      return adaptConversion(node);
    case 'BinaryExpression':
      return adaptBinaryExpression(node);
    case 'UnaryExpression':
      return adaptUnaryExpression(node);
    case 'PostfixExpression':
      return adaptPostfixExpression(node);
    case 'Value':
      return adaptValue(node);
    case 'CompositeValue':
      return adaptCompositeValue(node);
    case 'FunctionCall':
      return adaptFunctionCall(node);
    case 'BooleanLiteral':
      return adaptBooleanLiteral(node);
    case 'Variable':
      return adaptVariable(node);
    case 'Constant':
      return adaptConstant(node);
    case 'Instant':
      return adaptInstant(node);
    case 'PlainTime':
      return adaptPlainTime(node);
    case 'PlainDate':
      return adaptPlainDate(node);
    case 'PlainDateTime':
      return adaptPlainDateTime(node);
    case 'ZonedDateTime':
      return adaptZonedDateTime(node);
    default:
      throw new Error(`Unknown expression type: ${(node as any).type}`);
  }
}

/**
 * Adapt ConditionalExprNode to ConditionalExpression
 */
function adaptConditionalExpr(node: NearleyAST.ConditionalExprNode): OldAST.ConditionalExpression {
  const condition = adaptExpression(node.condition);
  const thenBranch = adaptExpression(node.then);
  const elseBranch = adaptExpression(node.else);
  const loc = createLocation(node.location, 0);
  return OldAST.createConditionalExpression(condition, thenBranch, elseBranch, loc.start, loc.end);
}

/**
 * Adapt ConversionNode to ConversionExpression
 */
function adaptConversion(node: NearleyAST.ConversionNode): OldAST.ConversionExpression {
  const expression = adaptExpression(node.expression);
  const operator = adaptConversionOperator(node.operator);
  const target = adaptConversionTarget(node.target);
  const loc = createLocation(node.location, 0);
  return OldAST.createConversionExpression(expression, operator, target, loc.start, loc.end);
}

/**
 * Map Nearley conversion operator to old format
 */
function adaptConversionOperator(op: NearleyAST.ConversionOperator): 'to' | 'in' | 'as' | '→' {
  switch (op) {
    case 'kw_to': return 'to';
    case 'kw_in': return 'in';
    case 'kw_as': return 'as';
    case 'arrow': return '→';
    default:
      throw new Error(`Unknown conversion operator: ${op}`);
  }
}

/**
 * Adapt BinaryExpressionNode to BinaryExpression
 */
function adaptBinaryExpression(node: NearleyAST.BinaryExpressionNode): OldAST.BinaryExpression {
  const left = adaptExpression(node.left);
  const right = adaptExpression(node.right);
  const operator = adaptBinaryOperator(node.operator);
  const loc = createLocation(node.location, 0);
  return OldAST.createBinaryExpression(operator, left, right, loc.start, loc.end);
}

/**
 * Map Nearley binary operator to old format
 */
function adaptBinaryOperator(op: NearleyAST.BinaryOperator): OldAST.BinaryOperator {
  const operatorMap: Record<NearleyAST.BinaryOperator, OldAST.BinaryOperator> = {
    'or': '||',
    'and': '&&',
    'pipe': '|',
    'kw_xor': 'xor',
    'ampersand': '&',
    'lt': '<',
    'lessThanOrEqual': '<=',
    'gt': '>',
    'greaterThanOrEqual': '>=',
    'equals': '==',
    'notEquals': '!=',
    'lShift': '<<',
    'rShift': '>>',
    'plus': '+',
    'minus': '-',
    'times': '*',
    'slash': '/',
    'divide': '/',
    'kw_per': 'per',
    'percent': '%',
    'kw_mod': 'mod',
    'caret': '^',
    'superscript': '^'
  };

  const result = operatorMap[op];
  if (!result) {
    throw new Error(`Unknown binary operator: ${op}`);
  }
  return result;
}

/**
 * Adapt UnaryExpressionNode to UnaryExpression
 */
function adaptUnaryExpression(node: NearleyAST.UnaryExpressionNode): OldAST.UnaryExpression {
  const operand = adaptExpression(node.argument);
  const operator = adaptUnaryOperator(node.operator);
  const loc = createLocation(node.location, 0);
  return OldAST.createUnaryExpression(operator, operand, loc.start, loc.end);
}

/**
 * Map Nearley unary operator to old format
 */
function adaptUnaryOperator(op: NearleyAST.UnaryOperator): OldAST.UnaryOperator {
  const operatorMap: Record<NearleyAST.UnaryOperator, OldAST.UnaryOperator> = {
    'minus': '-',
    'bang': '!',
    'tilde': '~'
  };

  const result = operatorMap[op];
  if (!result) {
    throw new Error(`Unknown unary operator: ${op}`);
  }
  return result;
}

/**
 * Adapt PostfixExpressionNode to PostfixExpression
 */
function adaptPostfixExpression(node: NearleyAST.PostfixExpressionNode): OldAST.PostfixExpression {
  const operand = adaptExpression(node.argument);
  const loc = createLocation(node.location, 0);
  return OldAST.createPostfixExpression('!', operand, loc.start, loc.end);
}

/**
 * Adapt ValueNode to NumberWithUnit or NumberLiteral
 */
function adaptValue(node: NearleyAST.ValueNode): OldAST.NumberWithUnit | OldAST.NumberLiteral {
  const numericalValue = adaptNumericalValue(node.value);
  const loc = createLocation(node.location, 0);

  if (node.unit === null) {
    // Plain number literal
    return OldAST.createNumberLiteral(numericalValue.value, numericalValue.raw, loc.start, loc.end);
  }

  // Number with unit
  const unit = node.unit.type === 'Units'
    ? adaptUnits(node.unit)
    : adaptCurrencyUnit(node.unit);

  return OldAST.createNumberWithUnit(numericalValue.value, unit, numericalValue.raw, loc.start, loc.end);
}

/**
 * Extract numerical value and raw string from NumericalValueNode
 */
function adaptNumericalValue(node: NearleyAST.NumericalValueNode): { value: number; raw: string } {
  if (node.type === 'NumberLiteral') {
    // Parse the value string according to base
    const value = parseNumber(node.value, node.base);
    return { value, raw: node.value };
  } else {
    // PercentageLiteral
    const value = parseFloat(node.value);
    const multiplier = node.symbol === 'percent' ? 0.01 : 0.001; // permille
    return { value: value * multiplier, raw: node.value + (node.symbol === 'percent' ? '%' : '‰') };
  }
}

/**
 * Parse number string according to base
 */
function parseNumber(str: string, base: number): number {
  // Remove underscores
  const cleaned = str.replace(/_/g, '');
  return parseInt(cleaned, base);
}

/**
 * Adapt UnitsNode to UnitExpression
 * Converts numerators/denominators structure to terms with signed exponents
 */
function adaptUnits(node: NearleyAST.UnitsNode): OldAST.UnitExpression {
  const loc = createLocation(node.location, 0);

  // Collect all terms with signed exponents
  const terms: OldAST.UnitTerm[] = [];

  // Add numerators (positive exponents)
  for (const unitWithExp of node.numerators) {
    const simpleUnit = adaptUnit(unitWithExp.unit);
    terms.push({
      unit: simpleUnit,
      exponent: unitWithExp.exponent
    });
  }

  // Add denominators (negative exponents)
  for (const unitWithExp of node.denominators) {
    const simpleUnit = adaptUnit(unitWithExp.unit);
    terms.push({
      unit: simpleUnit,
      exponent: -unitWithExp.exponent
    });
  }

  // If only one term with exponent 1, return SimpleUnit
  if (terms.length === 1 && terms[0].exponent === 1) {
    return terms[0].unit;
  }

  // Otherwise, return DerivedUnit
  return OldAST.createDerivedUnit(terms, loc.start, loc.end);
}

/**
 * Adapt UnitNode to SimpleUnit
 * Resolves unit names to unit IDs from the database
 */
function adaptUnit(node: NearleyAST.UnitNode): OldAST.SimpleUnit {
  const loc = createLocation(node.location, 0);

  let unitId = node.name; // Default to name
  let displayName = node.name; // Default to input name

  // Try to resolve unit name to unit ID using DataLoader
  // Uses similarity-based fallback for case-insensitive matching
  if (globalDataLoader) {
    const unit = globalDataLoader.getUnitByNameWithFallback(node.name);
    if (unit) {
      unitId = unit.id;
      // Use canonical symbol for display (e.g., "PG" → "Pg" for petagram)
      displayName = unit.displayName.symbol;
    }
  }

  return OldAST.createSimpleUnit(unitId, displayName, loc.start, loc.end);
}

/**
 * Adapt CurrencyUnitNode to SimpleUnit (treat currency as a special unit)
 */
function adaptCurrencyUnit(node: NearleyAST.CurrencyUnitNode): OldAST.SimpleUnit {
  const loc = createLocation(node.location, 0);
  // Currency units are handled as simple units with currency names
  return OldAST.createSimpleUnit(node.name, node.name, loc.start, loc.end);
}

/**
 * Adapt CompositeValueNode to CompositeUnitLiteral
 */
function adaptCompositeValue(node: NearleyAST.CompositeValueNode): OldAST.CompositeUnitLiteral {
  const loc = createLocation(node.location, 0);
  const components = node.values.map(valueNode => {
    const numericalValue = adaptNumericalValue(valueNode.value);
    const unit = valueNode.unit
      ? (valueNode.unit.type === 'Units' ? adaptUnits(valueNode.unit) : adaptCurrencyUnit(valueNode.unit))
      : null;

    if (!unit) {
      throw new Error('CompositeValue component must have a unit');
    }

    return { value: numericalValue.value, unit };
  });

  return {
    type: 'CompositeUnitLiteral',
    components,
    start: loc.start,
    end: loc.end
  };
}

/**
 * Adapt FunctionCallNode to FunctionCall
 */
function adaptFunctionCall(node: NearleyAST.FunctionCallNode): OldAST.FunctionCall {
  const args = node.arguments.map(adaptExpression);
  const loc = createLocation(node.location, 0);
  return OldAST.createFunctionCall(node.name, args, loc.start, loc.end);
}

/**
 * Adapt BooleanLiteralNode to BooleanLiteral
 */
function adaptBooleanLiteral(node: NearleyAST.BooleanLiteralNode): OldAST.BooleanLiteral {
  const loc = createLocation(node.location, 0);
  return OldAST.createBooleanLiteral(node.value, loc.start, loc.end);
}

/**
 * Adapt VariableNode to Identifier
 */
function adaptVariable(node: NearleyAST.VariableNode): OldAST.Identifier {
  const loc = createLocation(node.location, 0);
  return OldAST.createIdentifier(node.name, loc.start, loc.end);
}

/**
 * Adapt ConstantNode to ConstantLiteral
 */
function adaptConstant(node: NearleyAST.ConstantNode): OldAST.ConstantLiteral {
  const loc = createLocation(node.location, 0);
  return OldAST.createConstantLiteral(node.name, loc.start, loc.end);
}

/**
 * Adapt InstantNode to RelativeInstantExpression or ConstantLiteral
 */
function adaptInstant(node: NearleyAST.InstantNode): OldAST.Expression {
  const loc = createLocation(node.location, 0);

  if ('keyword' in node) {
    // InstantKeywordNode - map to constant literals
    return OldAST.createConstantLiteral(node.keyword, loc.start, loc.end);
  }

  // InstantRelativeNode - convert to RelativeInstantExpression
  const numericalValue = adaptNumericalValue(node.amount);
  const direction = node.direction === 'ago' ? 'ago' : 'from_now';

  // Create a NumberWithUnit for the amount
  const unitLoc = createLocation(node.location, 0);
  const timeUnit = OldAST.createSimpleUnit(node.unit, node.unit, unitLoc.start, unitLoc.end);
  const amountExpr = OldAST.createNumberWithUnit(
    numericalValue.value,
    timeUnit,
    numericalValue.raw,
    loc.start,
    loc.end
  );

  return OldAST.createRelativeInstantExpression(amountExpr, direction, loc.start, loc.end);
}

/**
 * Adapt PlainTimeNode to PlainTimeLiteral
 */
function adaptPlainTime(node: NearleyAST.PlainTimeNode): OldAST.PlainTimeLiteral {
  const loc = createLocation(node.location, 0);
  return OldAST.createPlainTimeLiteral(node.hour, node.minute, node.second, undefined, loc.start, loc.end);
}

/**
 * Adapt PlainDateNode to PlainDateLiteral
 */
function adaptPlainDate(node: NearleyAST.PlainDateNode): OldAST.PlainDateLiteral {
  const loc = createLocation(node.location, 0);
  return OldAST.createPlainDateLiteral(node.year, node.month, node.day, loc.start, loc.end);
}

/**
 * Adapt PlainDateTimeNode to PlainDateTimeLiteral
 */
function adaptPlainDateTime(node: NearleyAST.PlainDateTimeNode): OldAST.PlainDateTimeLiteral {
  const date = adaptPlainDate(node.date);
  const time = adaptPlainTime(node.time);
  const loc = createLocation(node.location, 0);
  return OldAST.createPlainDateTimeLiteral(date, time, loc.start, loc.end);
}

/**
 * Adapt ZonedDateTimeNode to ZonedDateTimeLiteral
 */
function adaptZonedDateTime(node: NearleyAST.ZonedDateTimeNode): OldAST.ZonedDateTimeLiteral {
  const dateTime = adaptPlainDateTime(node.dateTime);
  const timezone = adaptTimezone(node.timezone);
  const loc = createLocation(node.location, 0);
  return OldAST.createZonedDateTimeLiteral(dateTime, timezone, loc.start, loc.end);
}

/**
 * Extract timezone string from TimezoneNode
 */
function adaptTimezone(node: NearleyAST.TimezoneNode): string {
  if (node.type === 'TimezoneName') {
    return node.zoneName;
  } else {
    // UTCOffsetNode
    return node.offsetStr;
  }
}

/**
 * Adapt ConversionTargetNode to ConversionTarget
 */
function adaptConversionTarget(node: NearleyAST.ConversionTargetNode): OldAST.ConversionTarget {
  if ('type' in node && node.type === 'Units') {
    const unitsNode = node as NearleyAST.UnitsNode;
    const loc = createLocation(node.location, 0);

    // Detect if this should be a CompositeUnitTarget vs UnitTarget (derived unit)
    // CompositeUnitTarget: multiple simple units with exponent 1, no denominators
    // Example: "ft in" → CompositeUnitTarget([ft, in])
    // UnitTarget: single unit or derived unit
    // Example: "km/h" → UnitTarget(DerivedUnit)
    const isComposite = unitsNode.numerators.length > 1 &&
                        unitsNode.denominators.length === 0 &&
                        unitsNode.numerators.every(n => n.exponent === 1);

    if (isComposite) {
      // Create CompositeUnitTarget with array of SimpleUnits
      const units = unitsNode.numerators.map(n => {
        return adaptUnit(n.unit);
      });
      return OldAST.createCompositeUnitTarget(units, loc.start, loc.end);
    } else {
      // Create UnitTarget with single unit expression (simple or derived)
      const unit = adaptUnits(unitsNode);
      return OldAST.createUnitTarget(unit, loc.start, loc.end);
    }
  }

  if ('type' in node && node.type === 'PresentationFormat') {
    return adaptPresentationFormat(node as NearleyAST.PresentationFormatNode);
  }

  if ('type' in node && node.type === 'PropertyTarget') {
    return adaptPropertyTarget(node as NearleyAST.PropertyTargetNode);
  }

  if ('type' in node && (node.type === 'TimezoneName' || node.type === 'UTCOffset')) {
    return adaptTimezoneTarget(node as NearleyAST.TimezoneNode);
  }

  throw new Error(`Unknown conversion target type: ${(node as any).type}`);
}

/**
 * Adapt PresentationFormatNode to PresentationTarget or related types
 */
function adaptPresentationFormat(node: NearleyAST.PresentationFormatNode): OldAST.ConversionTarget {
  const loc = createLocation(node.location, 0);

  switch (node.format) {
    case 'base':
      return {
        type: 'BaseTarget',
        base: (node as NearleyAST.BaseFormatNode).base,
        start: loc.start,
        end: loc.end
      };

    case 'sigFigs':
      return {
        type: 'PrecisionTarget',
        precision: (node as NearleyAST.SigFigsFormatNode).sigFigs,
        mode: 'sigfigs',
        start: loc.start,
        end: loc.end
      };

    case 'decimals':
      return {
        type: 'PrecisionTarget',
        precision: (node as NearleyAST.DecimalsFormatNode).decimals,
        mode: 'decimals',
        start: loc.start,
        end: loc.end
      };

    case 'namedFormat':
      const format = (node as NearleyAST.NamedFormatNode).name;
      return {
        type: 'PresentationTarget',
        format: format as OldAST.PresentationFormat,
        start: loc.start,
        end: loc.end
      };

    default:
      // Other presentation formats map directly
      return {
        type: 'PresentationTarget',
        format: node.format as OldAST.PresentationFormat,
        start: loc.start,
        end: loc.end
      };
  }
}

/**
 * Adapt PropertyTargetNode to PropertyTarget
 */
function adaptPropertyTarget(node: NearleyAST.PropertyTargetNode): OldAST.PropertyTarget {
  const loc = createLocation(node.location, 0);
  const propertyMap: Record<string, OldAST.DateTimeProperty> = {
    'year': 'year',
    'month': 'month',
    'day': 'day',
    'weekday': 'dayOfWeek',
    'hour': 'hour',
    'minute': 'minute',
    'second': 'second',
    'millisecond': 'millisecond',
    'offset': 'offset',
    'dayOfYear': 'dayOfYear',
    'weekOfYear': 'weekOfYear'
  };

  const property = propertyMap[node.property];
  if (!property) {
    throw new Error(`Unknown property: ${node.property}`);
  }

  return {
    type: 'PropertyTarget',
    property,
    start: loc.start,
    end: loc.end
  };
}

/**
 * Adapt TimezoneNode to TimezoneTarget
 */
function adaptTimezoneTarget(node: NearleyAST.TimezoneNode): OldAST.TimezoneTarget {
  const timezone = adaptTimezone(node);
  const loc = createLocation(node.location, 0);
  return {
    type: 'TimezoneTarget',
    timezone,
    start: loc.start,
    end: loc.end
  };
}

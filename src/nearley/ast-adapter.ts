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
import { Temporal } from '@js-temporal/polyfill';

// Global DataLoader instance for unit resolution
// Set by the parser before adaptation
let globalDataLoader: DataLoader | null = null;

/**
 * Context for tracking degree units in composite values
 * Used for context-aware prime/doublePrime conversion
 */
type AdaptationContext = {
  hasDegreeUnit: boolean; // True if a degree unit appears earlier in the composite value
};

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
    'lessThan': '<',
    'lessThanOrEqual': '<=',
    'greaterThan': '>',
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
  return adaptValueWithContext(node, { hasDegreeUnit: false });
}

/**
 * Adapt ValueNode with context for prime/doublePrime conversion
 */
function adaptValueWithContext(node: NearleyAST.ValueNode, context: AdaptationContext): OldAST.NumberWithUnit | OldAST.NumberLiteral {
  const numericalValue = adaptNumericalValue(node.value);
  const loc = createLocation(node.location, 0);

  if (node.unit === null) {
    // Plain number literal
    return OldAST.createNumberLiteral(numericalValue.value, numericalValue.raw, loc.start, loc.end);
  }

  // Number with unit
  const unit = node.unit.type === 'Units'
    ? adaptUnitsWithContext(node.unit, context)
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
 * Parse number string according to base (supports decimals for all bases 2-36)
 */
function parseNumber(str: string, base: number): number {
  // Validate base range
  if (base < 2 || base > 36) {
    throw new Error(`Invalid base: ${base}. Base must be between 2 and 36.`);
  }

  // Remove underscores
  const cleaned = str.replace(/_/g, '');

  // For base 10, use parseFloat for efficiency
  if (base === 10) {
    const value = parseFloat(cleaned);
    if (isNaN(value)) {
      throw new Error(`Invalid decimal number: "${str}"`);
    }
    return value;
  }

  // Validate digits are valid for this base
  const validDigitsPattern = base <= 10
    ? new RegExp(`^[+-]?[0-${base - 1}.]+$`, 'i')
    : new RegExp(`^[+-]?[0-9a-${String.fromCharCode(96 + base - 10)}.]+$`, 'i');

  if (!validDigitsPattern.test(cleaned)) {
    throw new Error(`Invalid digits for base ${base}: "${str}"`);
  }

  // For other bases (2-36), manually parse integer and fractional parts
  const parts = cleaned.split('.');

  // Parse integer part
  let result = parseInt(parts[0] || '0', base);

  // Parse fractional part if present
  if (parts.length > 1) {
    const fractionalPart = parts[1];
    let fractionalValue = 0;

    for (let i = 0; i < fractionalPart.length; i++) {
      const digit = parseInt(fractionalPart[i], base);
      fractionalValue += digit / Math.pow(base, i + 1);
    }

    result += fractionalValue;
  }

  return result;
}

/**
 * Adapt UnitsNode to UnitExpression
 * Converts numerators/denominators structure to terms with signed exponents
 */
function adaptUnits(node: NearleyAST.UnitsNode): OldAST.UnitExpression {
  return adaptUnitsWithContext(node, { hasDegreeUnit: false });
}

function adaptUnitsWithContext(node: NearleyAST.UnitsNode, context: AdaptationContext): OldAST.UnitExpression {
  const loc = createLocation(node.location, 0);

  // Collect all terms (already have signed exponents from grammar)
  const terms: OldAST.UnitTerm[] = [];

  // Terms already have correct signed exponents (negative for denominators)
  for (const unitWithExp of node.terms) {
    const simpleUnit = adaptUnitWithContext(unitWithExp.unit, context);
    terms.push({
      unit: simpleUnit,
      exponent: unitWithExp.exponent,
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
  return adaptUnitWithContext(node, { hasDegreeUnit: false });
}

/**
 * Adapt UnitNode with context for prime/doublePrime conversion
 */
function adaptUnitWithContext(node: NearleyAST.UnitNode, context: AdaptationContext): OldAST.SimpleUnit {
  const loc = createLocation(node.location, 0);
  let name = node.name;

  // Context-aware prime/doublePrime conversion
  if (name === 'prime') {
    // If in degree context (composite value with degree unit), convert to arcminute
    // Otherwise, convert to foot (default)
    name = context.hasDegreeUnit ? 'arcminute' : 'ft';
  } else if (name === 'doublePrime') {
    // If in degree context, convert to arcsecond
    // Otherwise, convert to inch (default)
    name = context.hasDegreeUnit ? 'arcsecond' : 'in';
  }

  if (globalDataLoader) {
    // Step 1: Try exact case-sensitive matches (early return on match)

    // Check units by exact case-sensitive name
    const unitExact = globalDataLoader['unitByCaseSensitiveName']?.get(name);
    if (unitExact) {
      return OldAST.createSimpleUnit(
        unitExact.id,
        unitExact.displayName.symbol,
        loc.start,
        loc.end
      );
    }

    // Check currency by exact code match
    const currencyByCode = globalDataLoader.getCurrencyByCode(name);
    if (currencyByCode && currencyByCode.code === name) {
      return OldAST.createSimpleUnit(name, name, loc.start, loc.end);
    }

    // Check currency by exact name match
    const currenciesByName = globalDataLoader.getCurrenciesByName(name);
    for (const currency of currenciesByName) {
      if (currency.names.includes(name)) {
        return OldAST.createSimpleUnit(currency.code, currency.code, loc.start, loc.end);
      }
    }

    // Step 2: No exact match - collect case-insensitive candidates with similarity scoring
    type Candidate = {
      id: string;
      displayName: string;
      matchingChars: number;
    };

    const candidates: Candidate[] = [];

    // Case-insensitive unit candidates
    const unitCandidates = globalDataLoader['unitByCaseInsensitiveName']?.get(name.toLowerCase());
    if (unitCandidates) {
      for (const unit of unitCandidates) {
        candidates.push({
          id: unit.id,
          displayName: unit.displayName.symbol,
          matchingChars: countMatchingChars(name, unit.displayName.symbol)
        });
      }
    }

    // Case-insensitive currency by code
    if (currencyByCode) {
      candidates.push({
        id: currencyByCode.code,
        displayName: currencyByCode.code,
        matchingChars: countMatchingChars(name, currencyByCode.code)
      });
    }

    // Case-insensitive currency by name
    for (const currency of currenciesByName) {
      const bestMatchingChars = Math.max(
        ...currency.names.map(n => countMatchingChars(name, n)),
        countMatchingChars(name, currency.code)
      );
      candidates.push({
        id: currency.code,
        displayName: currency.code,
        matchingChars: bestMatchingChars
      });
    }

    // Select best candidate by similarity
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.matchingChars - a.matchingChars);
      const best = candidates[0];
      return OldAST.createSimpleUnit(best.id, best.displayName, loc.start, loc.end);
    }
  }

  // Fallback: use name as-is
  return OldAST.createSimpleUnit(name, name, loc.start, loc.end);
}

/**
 * Count matching characters between two strings (case-sensitive)
 */
function countMatchingChars(a: string, b: string): number {
  let count = 0;
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) count++;
  }
  return count;
}

/**
 * Adapt CurrencyUnitNode to SimpleUnit
 */
function adaptCurrencyUnit(node: NearleyAST.CurrencyUnitNode): OldAST.SimpleUnit {
  const loc = createLocation(node.location, 0);

  // Resolve currency based on subType
  let currencyId: string;
  let displayName: string;

  if (!globalDataLoader) {
    throw new Error('DataLoader not initialized. Call setDataLoader() before parsing.');
  }

  if (node.subType === 'symbolAdjacent') {
    // Check if it's an unambiguous currency (US$, CA$, €, etc.)
    const unambiguous = globalDataLoader.getCurrencyByAdjacentSymbol(node.name);
    if (unambiguous) {
      // Unambiguous currency: resolve to specific currency code
      currencyId = unambiguous.code;
      displayName = node.name; // Keep original symbol for display
    } else {
      // Ambiguous currency ($, ¥, etc.): use the dimension for the user-defined unit
      const ambiguous = globalDataLoader.getAmbiguousCurrencyByAdjacentSymbol(node.name);
      if (ambiguous && ambiguous.dimension) {
        currencyId = ambiguous.dimension;
        displayName = node.name; // Keep original symbol for display
      } else {
        // Fallback: use the raw symbol value
        currencyId = node.name;
        displayName = node.name;
      }
    }
  } else if (node.subType === 'symbolSpaced') {
    // Spaced symbol (like "USD 100")
    const currency = globalDataLoader.getCurrencyBySpacedSymbol(node.name);
    currencyId = currency ? currency.code : node.name;
    displayName = node.name; // Keep original symbol for display
  } else {
    // Fallback: use name as-is
    currencyId = node.name;
    displayName = node.name;
  }

  return OldAST.createSimpleUnit(currencyId, displayName, loc.start, loc.end);
}

/**
 * Adapt CompositeValueNode to CompositeUnitLiteral
 * Implements context-aware prime/doublePrime conversion for degree units
 */
function adaptCompositeValue(node: NearleyAST.CompositeValueNode): OldAST.CompositeUnitLiteral {
  const loc = createLocation(node.location, 0);

  // Track if we've seen a degree unit for context-aware prime conversion
  let hasDegreeUnit = false;

  const components = node.values.map(valueNode => {
    const numericalValue = adaptNumericalValue(valueNode.value);

    // Check if this component has a degree unit
    const componentHasDegree = valueNode.unit &&
      valueNode.unit.type === 'Units' &&
      valueNode.unit.terms.some((u) => {
        const name = u.unit.name;
        return name === 'deg' || name === 'degree' || name === 'degrees';
      });

    // Adapt unit with context (if degree seen, subsequent primes are arcmin/arcsec)
    const context: AdaptationContext = { hasDegreeUnit };
    const unit = valueNode.unit
      ? (valueNode.unit.type === 'Units' ? adaptUnitsWithContext(valueNode.unit, context) : adaptCurrencyUnit(valueNode.unit))
      : null;

    if (!unit) {
      throw new Error('CompositeValue component must have a unit');
    }

    // Update context for next component
    if (componentHasDegree) {
      hasDegreeUnit = true;
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
    // InstantKeywordNode - map to RelativeInstantExpression
    // 'now' and 'today' → instant value now (0 seconds)
    // 'yesterday' → 24 hours ago (1 day ago)
    // 'tomorrow' → 24 hours from now (1 day from now)
    const unitMap: Record<string, string> = {
      'now': 'second',
      'today': 'second',
      'yesterday': 'day',
      'tomorrow': 'day'
    };
    const directionMap: Record<string, 'ago' | 'from_now'> = {
      'now': 'from_now',
      'today': 'from_now',
      'yesterday': 'ago',
      'tomorrow': 'from_now'
    };
    const amountMap: Record<string, number> = {
      'now': 0,
      'today': 0,
      'yesterday': 1,
      'tomorrow': 1
    };

    const keyword = node.keyword;
    const unit = unitMap[keyword];
    const direction = directionMap[keyword];
    const amount = amountMap[keyword];

    const unitLoc = createLocation(node.location, 0);
    const timeUnit = OldAST.createSimpleUnit(unit, unit, unitLoc.start, unitLoc.end);
    const amountExpr = OldAST.createNumberWithUnit(
      amount,
      timeUnit,
      String(amount),
      loc.start,
      loc.end
    );

    return OldAST.createRelativeInstantExpression(amountExpr, direction, loc.start, loc.end);
  }

  // InstantRelativeNode - convert to RelativeInstantExpression or InstantLiteral
  const numericalValue = adaptNumericalValue(node.amount);

  // Resolve unit name to unit ID (e.g., "days" → "day")
  const unitLoc = createLocation(node.location, 0);
  let unitId = node.unit;
  let unitName = node.unit;

  if (globalDataLoader) {
    // Try exact match first
    let unitExact = globalDataLoader['unitByCaseSensitiveName']?.get(node.unit);

    // If not found and unit ends with 's', try singular form (handle plurals)
    if (!unitExact && node.unit.endsWith('s') && node.unit.length > 1) {
      const singular = node.unit.slice(0, -1);
      unitExact = globalDataLoader['unitByCaseSensitiveName']?.get(singular);
    }

    if (unitExact) {
      unitId = unitExact.id;
      unitName = unitExact.displayName.symbol;
    }
  }

  // For sinceEpoch, create an InstantLiteral with timestamp in milliseconds
  if (node.direction === 'sinceEpoch') {
    // Convert the amount to milliseconds based on the unit
    let timestampMs = numericalValue.value;

    // Convert to milliseconds based on unit (check more specific units first)
    if (unitId.match(/^(milliseconds?|ms)$/i)) {
      timestampMs = numericalValue.value;
    } else if (unitId.match(/^(seconds?|s)$/i)) {
      timestampMs = numericalValue.value * 1000;
    } else if (unitId.match(/^(microseconds?|us|μs)$/i)) {
      timestampMs = numericalValue.value / 1000;
    } else if (unitId.match(/^(nanoseconds?|ns)$/i)) {
      timestampMs = numericalValue.value / 1000000;
    }

    return OldAST.createInstantLiteral(timestampMs, loc.start, loc.end);
  }

  // For ago and from_now, create RelativeInstantExpression
  const direction = node.direction === 'ago' ? 'ago' : 'from_now';

  const timeUnit = OldAST.createSimpleUnit(unitId, unitName, unitLoc.start, unitLoc.end);
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
  const loc = createLocation(node.location, 0);
  const timezone = adaptTimezone(node.timezone);

  // Handle special case: PlainTime + Timezone (subType: 'plainTime')
  if (node.subType === 'plainTime') {
    // Create a PlainDateTime by combining the time with today's date
    // We use the current date at evaluation time
    const time = adaptPlainTime(node.dateTime.time);

    // Create a PlainDate representing today in the specified timezone.
    let year = 0, month = 0, day = 0;
    if (globalDataLoader) {
      const now = Temporal.Now.zonedDateTimeISO(timezone);
      year = now.year;
      month = now.month;
      day = now.day;
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1; // JS months are 0-indexed
      day = now.getDate();
    }

    const date = OldAST.createPlainDateLiteral(
      year,
      month,
      day,
      loc.start,
      loc.end
    );

    const dateTime = OldAST.createPlainDateTimeLiteral(date, time, loc.start, loc.end);
    return OldAST.createZonedDateTimeLiteral(dateTime, timezone, loc.start, loc.end);
  }

  // Standard case: PlainDateTime + Timezone
  const dateTime = adaptPlainDateTime(node.dateTime);
  return OldAST.createZonedDateTimeLiteral(dateTime, timezone, loc.start, loc.end);
}

/**
 * Extract timezone string from TimezoneNode
 */
function adaptTimezone(node: NearleyAST.TimezoneNode): string {
  if (node.type === 'TimezoneName') {
    return globalDataLoader?.resolveTimezone(node.zoneName) ?? node.zoneName;
  } else {
    // UTCOffsetNode
    return globalDataLoader?.resolveTimezone(node.offsetStr) ?? node.offsetStr;
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
    // CompositeUnitTarget: multiple simple units with exponent 1, no negative exponents
    // Example: "ft in" → CompositeUnitTarget([ft, in])
    // UnitTarget: single unit or derived unit
    // Example: "km/h" → UnitTarget(DerivedUnit)
    const isComposite = unitsNode.terms.length > 1 &&
                        unitsNode.terms.every((n) => n.exponent === 1);

    if (isComposite) {
      // Create CompositeUnitTarget with array of SimpleUnits
      // Apply context-aware prime/doublePrime conversion for angle units
      let hasDegreeUnit = false;
      const units = unitsNode.terms.map((n) => {
        // Check if this unit is a degree unit
        const unitName = n.unit.name;
        const isDegreeUnit = unitName === 'deg' || unitName === 'degree' || unitName === 'degrees' || unitName === '°';

        // Adapt unit with context
        const context: AdaptationContext = { hasDegreeUnit };
        const adaptedUnit = adaptUnitWithContext(n.unit, context);

        // Update context for next unit
        if (isDegreeUnit) {
          hasDegreeUnit = true;
        }

        return adaptedUnit;
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

    case 'unix':
      // Handle UnixFormatNode with unit field
      const unixNode = node as NearleyAST.UnixFormatNode;
      const isMilliseconds = /^(ms|milliseconds?)$/i.test(unixNode.unit);
      return {
        type: 'PresentationTarget',
        format: isMilliseconds ? 'unixMilliseconds' : 'unix',
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
      // ISO 8601, RFC 9557, RFC 2822 fall through here
      // Pass through as-is (no normalization)
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

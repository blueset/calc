import { describe, it, expect, beforeAll } from 'vitest';
import { Parser } from '../src/parser';
import { Lexer } from '../src/lexer';
import { DataLoader } from '../src/data-loader';
import { TokenType } from '../src/tokens';
import * as path from 'path';
import {
  Document,
  Expression,
  BinaryExpression,
  UnaryExpression,
  NumberLiteral,
  NumberWithUnit,
  Identifier,
  BooleanLiteral,
  FunctionCall,
  GroupedExpression,
  ConditionalExpression,
  ConversionExpression,
  PostfixExpression,
  ExpressionLine,
  VariableDefinition,
  Heading,
  PlainText,
  CompositeUnitLiteral,
  DerivedUnit,
  PlainDateTimeLiteral
} from '../src/ast';

describe('Parser', () => {
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '..', 'data'));
  });

  function parseWithErrors(input: string) {
    const lexer = new Lexer(input, dataLoader);
    const { tokens } = lexer.tokenize();
    const parser = new Parser(tokens, dataLoader, input);
    return parser.parseDocument();
  }

  function parse(input: string): Document {
    return parseWithErrors(input).ast;
  }

  function parseExpression(input: string): Expression {
    const doc = parse(input);
    expect(doc.lines.length).toBeGreaterThan(0);
    const line = doc.lines[0];
    expect(line.type).toBe('ExpressionLine');
    return (line as any).expression;
  }

  describe('Basic Literals', () => {
    it('should parse plain numbers', () => {
      const expr = parseExpression('42');
      expect(expr.type).toBe('NumberLiteral');
      expect((expr as NumberLiteral).value).toBe(42);
    });

    it('should parse decimal numbers', () => {
      const expr = parseExpression('3.14');
      expect(expr.type).toBe('NumberLiteral');
      expect((expr as NumberLiteral).value).toBeCloseTo(3.14);
    });

    it('should parse scientific notation', () => {
      const expr = parseExpression('2e3');
      expect(expr.type).toBe('NumberLiteral');
      expect((expr as NumberLiteral).value).toBe(2000);
    });

    it('should parse boolean literals', () => {
      const exprTrue = parseExpression('true');
      expect(exprTrue.type).toBe('BooleanLiteral');
      expect((exprTrue as BooleanLiteral).value).toBe(true);

      const exprFalse = parseExpression('false');
      expect(exprFalse.type).toBe('BooleanLiteral');
      expect((exprFalse as BooleanLiteral).value).toBe(false);
    });

    it('should parse identifiers', () => {
      const expr = parseExpression('myVariable');
      expect(expr.type).toBe('Identifier');
      expect((expr as Identifier).name).toBe('myVariable');
    });

    it('should parse constants', () => {
      const expr = parseExpression('pi');
      expect(expr.type).toBe('ConstantLiteral');
    });

    it('should parse binary numbers with 0b prefix', () => {
      const expr = parseExpression('0b1010');
      expect(expr.type).toBe('NumberLiteral');
      expect((expr as NumberLiteral).value).toBe(10);
    });

    it('should parse octal numbers with 0o prefix', () => {
      const expr = parseExpression('0o12');
      expect(expr.type).toBe('NumberLiteral');
      expect((expr as NumberLiteral).value).toBe(10);
    });

    it('should parse hexadecimal numbers with 0x prefix', () => {
      const expr = parseExpression('0xA');
      expect(expr.type).toBe('NumberLiteral');
      expect((expr as NumberLiteral).value).toBe(10);
    });

    it('should parse numbers with base keyword', () => {
      const expr = parseExpression('1010 base 2');
      expect(expr.type).toBe('NumberLiteral');
      expect((expr as NumberLiteral).value).toBe(10);
    });

    it('should parse base 36 numbers', () => {
      const expr = parseExpression('ABC base 36');
      expect(expr.type).toBe('NumberLiteral');
      expect((expr as NumberLiteral).value).toBe(13368);
    });

    it('should parse numbers with underscore separators', () => {
      const expr = parseExpression('1_000');
      expect(expr.type).toBe('NumberLiteral');
      expect((expr as NumberLiteral).value).toBe(1000);
    });

    it('should parse mixed alphanumeric with base keyword', () => {
      const expr = parseExpression('1A2b base 36');
      expect(expr.type).toBe('NumberLiteral');
      expect((expr as NumberLiteral).value).toBe(59699);
    });
  });

  describe('Numbers with Units', () => {
    it('should parse number with simple unit', () => {
      const expr = parseExpression('5 km');
      expect(expr.type).toBe('NumberWithUnit');
      const numWithUnit = expr as NumberWithUnit;
      expect(numWithUnit.value).toBe(5);
      expect(numWithUnit.unit.type).toBe('SimpleUnit');
    });

    it('should parse number with adjacent unit (no space)', () => {
      const expr = parseExpression('5km');
      expect(expr.type).toBe('NumberWithUnit');
      const numWithUnit = expr as NumberWithUnit;
      expect(numWithUnit.value).toBe(5);
    });

    it('should parse composite units', () => {
      const expr = parseExpression('5 ft 3 in');
      expect(expr.type).toBe('CompositeUnitLiteral');
      const composite = expr as CompositeUnitLiteral;
      expect(composite.components.length).toBe(2);
      expect(composite.components[0].value).toBe(5);
      expect(composite.components[1].value).toBe(3);
    });

    it('should parse multi-component composite units', () => {
      const expr = parseExpression('2 hr 30 min 15 s');
      expect(expr.type).toBe('CompositeUnitLiteral');
      const composite = expr as CompositeUnitLiteral;
      expect(composite.components.length).toBe(3);
      expect(composite.components[0].value).toBe(2);
      expect(composite.components[1].value).toBe(30);
      expect(composite.components[2].value).toBe(15);
    });
  });

  describe('ASCII Exponent Notation in Unit Literals', () => {
    it('should parse number with ASCII exponent unit (m^2)', () => {
      const expr = parseExpression('16 m^2');
      expect(expr.type).toBe('NumberWithUnit');
      const numWithUnit = expr as NumberWithUnit;
      expect(numWithUnit.value).toBe(16);
      expect(numWithUnit.unit.type).toBe('DerivedUnit');
      const derivedUnit = numWithUnit.unit as DerivedUnit;
      expect(derivedUnit.terms.length).toBe(1);
      expect(derivedUnit.terms[0].unit.unitId).toBe('meter');
      expect(derivedUnit.terms[0].exponent).toBe(2);
    });

    it('should parse number with ASCII exponent unit (m^3)', () => {
      const expr = parseExpression('10 m^3');
      expect(expr.type).toBe('NumberWithUnit');
      const numWithUnit = expr as NumberWithUnit;
      expect(numWithUnit.value).toBe(10);
      expect(numWithUnit.unit.type).toBe('DerivedUnit');
      const derivedUnit = numWithUnit.unit as DerivedUnit;
      expect(derivedUnit.terms.length).toBe(1);
      expect(derivedUnit.terms[0].unit.unitId).toBe('meter');
      expect(derivedUnit.terms[0].exponent).toBe(3);
    });

    it('should parse number with ASCII fractional exponent (m^0.5)', () => {
      const expr = parseExpression('25 m^0.5');
      expect(expr.type).toBe('NumberWithUnit');
      const numWithUnit = expr as NumberWithUnit;
      expect(numWithUnit.value).toBe(25);
      expect(numWithUnit.unit.type).toBe('DerivedUnit');
      const derivedUnit = numWithUnit.unit as DerivedUnit;
      expect(derivedUnit.terms.length).toBe(1);
      expect(derivedUnit.terms[0].unit.unitId).toBe('meter');
      expect(derivedUnit.terms[0].exponent).toBe(0.5);
    });

    it('should parse number with ASCII negative exponent (s^-1)', () => {
      const expr = parseExpression('5 s^-1');
      expect(expr.type).toBe('NumberWithUnit');
      const numWithUnit = expr as NumberWithUnit;
      expect(numWithUnit.value).toBe(5);
      expect(numWithUnit.unit.type).toBe('DerivedUnit');
      const derivedUnit = numWithUnit.unit as DerivedUnit;
      expect(derivedUnit.terms.length).toBe(1);
      expect(derivedUnit.terms[0].unit.unitId).toBe('second');
      expect(derivedUnit.terms[0].exponent).toBe(-1);
    });

    it('should parse both ASCII and Unicode notations equivalently', () => {
      // Parse ASCII notation
      const asciiExpr = parseExpression('16 m^2');
      expect(asciiExpr.type).toBe('NumberWithUnit');
      const asciiNumWithUnit = asciiExpr as NumberWithUnit;

      // Parse Unicode notation
      const unicodeExpr = parseExpression('16 m²');
      expect(unicodeExpr.type).toBe('NumberWithUnit');
      const unicodeNumWithUnit = unicodeExpr as NumberWithUnit;

      // Both should be NumberWithUnit with same value
      expect(asciiNumWithUnit.value).toBe(unicodeNumWithUnit.value);

      // Both should have a unit (either SimpleUnit or DerivedUnit, depending on implementation)
      // The important part is that they parse as literals, not operations
      expect(asciiNumWithUnit.unit).toBeDefined();
      expect(unicodeNumWithUnit.unit).toBeDefined();
    });

    it('should distinguish ASCII exponent from power operation', () => {
      // 16 m^2 should be a literal (NumberWithUnit with DerivedUnit)
      const literal = parseExpression('16 m^2');
      expect(literal.type).toBe('NumberWithUnit');

      // (16 m)^2 should be a power operation (BinaryExpression)
      const operation = parseExpression('(16 m)^2');
      expect(operation.type).toBe('BinaryExpression');
      const binExpr = operation as BinaryExpression;
      expect(binExpr.operator).toBe('^');
    });
  });

  describe('Binary Operations', () => {
    it('should parse addition', () => {
      const expr = parseExpression('2 + 3');
      expect(expr.type).toBe('BinaryExpression');
      const binExpr = expr as BinaryExpression;
      expect(binExpr.operator).toBe('+');
      expect((binExpr.left as NumberLiteral).value).toBe(2);
      expect((binExpr.right as NumberLiteral).value).toBe(3);
    });

    it('should parse subtraction', () => {
      const expr = parseExpression('10 - 5');
      expect(expr.type).toBe('BinaryExpression');
      const binExpr = expr as BinaryExpression;
      expect(binExpr.operator).toBe('-');
    });

    it('should parse multiplication', () => {
      const expr = parseExpression('4 * 5');
      expect(expr.type).toBe('BinaryExpression');
      const binExpr = expr as BinaryExpression;
      expect(binExpr.operator).toBe('*');
    });

    it('should parse division', () => {
      const expr = parseExpression('20 / 4');
      expect(expr.type).toBe('BinaryExpression');
      const binExpr = expr as BinaryExpression;
      expect(binExpr.operator).toBe('/');
    });

    it('should parse modulo', () => {
      const expr = parseExpression('10 % 3');
      expect(expr.type).toBe('BinaryExpression');
      const binExpr = expr as BinaryExpression;
      expect(binExpr.operator).toBe('%');
    });

    it('should parse mod keyword', () => {
      const expr = parseExpression('10 mod 3');
      expect(expr.type).toBe('BinaryExpression');
      const binExpr = expr as BinaryExpression;
      expect(binExpr.operator).toBe('mod');
    });

    it('should parse exponentiation', () => {
      const expr = parseExpression('2 ^ 3');
      expect(expr.type).toBe('BinaryExpression');
      const binExpr = expr as BinaryExpression;
      expect(binExpr.operator).toBe('^');
    });
  });

  describe('Operator Precedence', () => {
    it('should respect multiplication over addition', () => {
      const expr = parseExpression('2 + 3 * 4');
      expect(expr.type).toBe('BinaryExpression');
      const binExpr = expr as BinaryExpression;
      expect(binExpr.operator).toBe('+');
      expect((binExpr.left as NumberLiteral).value).toBe(2);
      expect((binExpr.right as BinaryExpression).operator).toBe('*');
    });

    it('should respect exponentiation over multiplication', () => {
      const expr = parseExpression('2 * 3 ^ 2');
      expect(expr.type).toBe('BinaryExpression');
      const binExpr = expr as BinaryExpression;
      expect(binExpr.operator).toBe('*');
      expect((binExpr.right as BinaryExpression).operator).toBe('^');
    });

    it('should handle right-associative exponentiation', () => {
      const expr = parseExpression('2 ^ 3 ^ 2');
      expect(expr.type).toBe('BinaryExpression');
      const binExpr = expr as BinaryExpression;
      expect(binExpr.operator).toBe('^');
      expect((binExpr.left as NumberLiteral).value).toBe(2);
      expect((binExpr.right as BinaryExpression).operator).toBe('^');
      expect(((binExpr.right as BinaryExpression).left as NumberLiteral).value).toBe(3);
      expect(((binExpr.right as BinaryExpression).right as NumberLiteral).value).toBe(2);
    });

    it('should handle left-associative subtraction', () => {
      const expr = parseExpression('10 - 5 - 2');
      expect(expr.type).toBe('BinaryExpression');
      const binExpr = expr as BinaryExpression;
      expect(binExpr.operator).toBe('-');
      expect((binExpr.left as BinaryExpression).operator).toBe('-');
      expect((binExpr.right as NumberLiteral).value).toBe(2);
    });
  });

  describe('Unary Operations', () => {
    it('should parse unary minus', () => {
      const expr = parseExpression('-5');
      expect(expr.type).toBe('UnaryExpression');
      const unaryExpr = expr as UnaryExpression;
      expect(unaryExpr.operator).toBe('-');
      expect((unaryExpr.operand as NumberLiteral).value).toBe(5);
    });

    it('should parse unary logical NOT', () => {
      const expr = parseExpression('!true');
      expect(expr.type).toBe('UnaryExpression');
      const unaryExpr = expr as UnaryExpression;
      expect(unaryExpr.operator).toBe('!');
    });

    it('should parse unary bitwise NOT', () => {
      const expr = parseExpression('~42');
      expect(expr.type).toBe('UnaryExpression');
      const unaryExpr = expr as UnaryExpression;
      expect(unaryExpr.operator).toBe('~');
    });

    it('should handle multiple unary operators', () => {
      const expr = parseExpression('--5');
      expect(expr.type).toBe('UnaryExpression');
      const outer = expr as UnaryExpression;
      expect(outer.operator).toBe('-');
      expect((outer.operand as UnaryExpression).operator).toBe('-');
    });
  });

  describe('Postfix Operations', () => {
    it('should parse factorial', () => {
      const expr = parseExpression('5!');
      expect(expr.type).toBe('PostfixExpression');
      const postfixExpr = expr as PostfixExpression;
      expect(postfixExpr.operator).toBe('!');
      expect((postfixExpr.operand as NumberLiteral).value).toBe(5);
    });

    it('should parse factorial with higher precedence', () => {
      const expr = parseExpression('2 * 3!');
      expect(expr.type).toBe('BinaryExpression');
      const binExpr = expr as BinaryExpression;
      expect(binExpr.operator).toBe('*');
      expect((binExpr.right as PostfixExpression).operator).toBe('!');
    });
  });

  describe('Grouped Expressions', () => {
    it('should parse parenthesized expressions', () => {
      const expr = parseExpression('(2 + 3)');
      expect(expr.type).toBe('GroupedExpression');
      const grouped = expr as GroupedExpression;
      expect((grouped.expression as BinaryExpression).operator).toBe('+');
    });

    it('should respect parentheses for precedence override', () => {
      const expr = parseExpression('(2 + 3) * 4');
      expect(expr.type).toBe('BinaryExpression');
      const binExpr = expr as BinaryExpression;
      expect(binExpr.operator).toBe('*');
      expect((binExpr.left as GroupedExpression).type).toBe('GroupedExpression');
    });

    it('should handle nested parentheses', () => {
      const expr = parseExpression('((2 + 3) * 4)');
      expect(expr.type).toBe('GroupedExpression');
    });
  });

  describe('Function Calls', () => {
    it('should parse function with no arguments', () => {
      const expr = parseExpression('random()');
      expect(expr.type).toBe('FunctionCall');
      const funcCall = expr as FunctionCall;
      expect(funcCall.name).toBe('random');
      expect(funcCall.arguments.length).toBe(0);
    });

    it('should parse function with one argument', () => {
      const expr = parseExpression('sin(pi)');
      expect(expr.type).toBe('FunctionCall');
      const funcCall = expr as FunctionCall;
      expect(funcCall.name).toBe('sin');
      expect(funcCall.arguments.length).toBe(1);
    });

    it('should parse function with multiple arguments', () => {
      const expr = parseExpression('perm(10, 3)');
      expect(expr.type).toBe('FunctionCall');
      const funcCall = expr as FunctionCall;
      expect(funcCall.name).toBe('perm');
      expect(funcCall.arguments.length).toBe(2);
    });

    it('should parse nested function calls', () => {
      const expr = parseExpression('sqrt(abs(-16))');
      expect(expr.type).toBe('FunctionCall');
      const funcCall = expr as FunctionCall;
      expect(funcCall.name).toBe('sqrt');
      expect((funcCall.arguments[0] as FunctionCall).name).toBe('abs');
    });
  });

  describe('Comparison Operations', () => {
    it('should parse less than', () => {
      const expr = parseExpression('5 < 10');
      expect(expr.type).toBe('BinaryExpression');
      expect((expr as BinaryExpression).operator).toBe('<');
    });

    it('should parse less than or equal', () => {
      const expr = parseExpression('5 <= 10');
      expect(expr.type).toBe('BinaryExpression');
      expect((expr as BinaryExpression).operator).toBe('<=');
    });

    it('should parse greater than', () => {
      const expr = parseExpression('10 > 5');
      expect(expr.type).toBe('BinaryExpression');
      expect((expr as BinaryExpression).operator).toBe('>');
    });

    it('should parse greater than or equal', () => {
      const expr = parseExpression('10 >= 5');
      expect(expr.type).toBe('BinaryExpression');
      expect((expr as BinaryExpression).operator).toBe('>=');
    });

    it('should parse equality', () => {
      const expr = parseExpression('5 == 5');
      expect(expr.type).toBe('BinaryExpression');
      expect((expr as BinaryExpression).operator).toBe('==');
    });

    it('should parse inequality', () => {
      const expr = parseExpression('5 != 10');
      expect(expr.type).toBe('BinaryExpression');
      expect((expr as BinaryExpression).operator).toBe('!=');
    });
  });

  describe('Logical Operations', () => {
    it('should parse logical AND', () => {
      const expr = parseExpression('true && false');
      expect(expr.type).toBe('BinaryExpression');
      expect((expr as BinaryExpression).operator).toBe('&&');
    });

    it('should parse logical OR', () => {
      const expr = parseExpression('true || false');
      expect(expr.type).toBe('BinaryExpression');
      expect((expr as BinaryExpression).operator).toBe('||');
    });

    it('should respect logical operator precedence (OR < AND)', () => {
      const expr = parseExpression('true || false && true');
      expect(expr.type).toBe('BinaryExpression');
      const binExpr = expr as BinaryExpression;
      expect(binExpr.operator).toBe('||');
      expect((binExpr.right as BinaryExpression).operator).toBe('&&');
    });
  });

  describe('Bitwise Operations', () => {
    it('should parse bitwise AND', () => {
      const expr = parseExpression('15 & 7');
      expect(expr.type).toBe('BinaryExpression');
      expect((expr as BinaryExpression).operator).toBe('&');
    });

    it('should parse bitwise OR', () => {
      const expr = parseExpression('8 | 4');
      expect(expr.type).toBe('BinaryExpression');
      expect((expr as BinaryExpression).operator).toBe('|');
    });

    it('should parse bitwise XOR', () => {
      const expr = parseExpression('15 xor 7');
      expect(expr.type).toBe('BinaryExpression');
      expect((expr as BinaryExpression).operator).toBe('xor');
    });

    it('should parse left shift', () => {
      const expr = parseExpression('4 << 2');
      expect(expr.type).toBe('BinaryExpression');
      expect((expr as BinaryExpression).operator).toBe('<<');
    });

    it('should parse right shift', () => {
      const expr = parseExpression('16 >> 2');
      expect(expr.type).toBe('BinaryExpression');
      expect((expr as BinaryExpression).operator).toBe('>>');
    });
  });

  describe('Conversion Operations', () => {
    it('should parse "to" conversion', () => {
      const expr = parseExpression('5 km to m');
      expect(expr.type).toBe('ConversionExpression');
      const convExpr = expr as ConversionExpression;
      expect(convExpr.operator).toBe('to');
      expect(convExpr.target.type).toBe('UnitTarget');
    });

    it('should parse "in" conversion', () => {
      const expr = parseExpression('100 cm in inches');
      expect(expr.type).toBe('ConversionExpression');
      const convExpr = expr as ConversionExpression;
      expect(convExpr.operator).toBe('in');
    });

    it('should parse "as" conversion', () => {
      const expr = parseExpression('42 as hex');
      expect(expr.type).toBe('ConversionExpression');
      const convExpr = expr as ConversionExpression;
      expect(convExpr.operator).toBe('as');
      expect(convExpr.target.type).toBe('PresentationTarget');
    });

    it('should parse conversion chaining (left-associative)', () => {
      const expr = parseExpression('5 km to m to cm');
      expect(expr.type).toBe('ConversionExpression');
      const outerConv = expr as ConversionExpression;
      expect(outerConv.operator).toBe('to');
      expect((outerConv.expression as ConversionExpression).operator).toBe('to');
    });

    it('should parse composite unit conversion target', () => {
      const expr = parseExpression('171 cm to ft in');
      expect(expr.type).toBe('ConversionExpression');
      const convExpr = expr as ConversionExpression;
      expect(convExpr.operator).toBe('to');
      expect(convExpr.target.type).toBe('CompositeUnitTarget');
      const compositeTarget = convExpr.target as any;
      expect(compositeTarget.units).toHaveLength(2);
      expect(compositeTarget.units[0].type).toBe('SimpleUnit');
      expect(compositeTarget.units[1].type).toBe('SimpleUnit');
    });

    it('should parse derived unit conversion target (m/s)', () => {
      const expr = parseExpression('100 km/h to m/s');
      expect(expr.type).toBe('ConversionExpression');
      const convExpr = expr as ConversionExpression;
      expect(convExpr.operator).toBe('to');
      expect(convExpr.target.type).toBe('UnitTarget');
      const unitTarget = convExpr.target as any;
      expect(unitTarget.unit.type).toBe('DerivedUnit');
      const derivedUnit = unitTarget.unit;
      expect(derivedUnit.terms).toHaveLength(2);
      expect(derivedUnit.terms[0].unit.type).toBe('SimpleUnit');
      expect(derivedUnit.terms[0].exponent).toBe(1);
      expect(derivedUnit.terms[1].unit.type).toBe('SimpleUnit');
      expect(derivedUnit.terms[1].exponent).toBe(-1);
    });

    it('should parse derived unit conversion target with exponent (m^2)', () => {
      const expr = parseExpression('5 cm to m^2');
      expect(expr.type).toBe('ConversionExpression');
      const convExpr = expr as ConversionExpression;
      expect(convExpr.target.type).toBe('UnitTarget');
      const unitTarget = convExpr.target as any;
      expect(unitTarget.unit.type).toBe('DerivedUnit');
      const derivedUnit = unitTarget.unit;
      expect(derivedUnit.terms).toHaveLength(1);
      expect(derivedUnit.terms[0].exponent).toBe(2);
    });

    it('should parse derived unit with implicit multiplication (kg m/s^2)', () => {
      const expr = parseExpression('100 N to kg m/s^2');
      expect(expr.type).toBe('ConversionExpression');
      const convExpr = expr as ConversionExpression;
      expect(convExpr.target.type).toBe('UnitTarget');
      const unitTarget = convExpr.target as any;
      expect(unitTarget.unit.type).toBe('DerivedUnit');
      const derivedUnit = unitTarget.unit;
      expect(derivedUnit.terms).toHaveLength(3);
      // kg (exponent 1)
      expect(derivedUnit.terms[0].exponent).toBe(1);
      // m (exponent 1)
      expect(derivedUnit.terms[1].exponent).toBe(1);
      // s (exponent -2, because of / and ^2)
      expect(derivedUnit.terms[2].exponent).toBe(-2);
    });

    it('should parse derived unit with exponent before division (m^2/s)', () => {
      const expr = parseExpression('10 J to m^2/s');
      expect(expr.type).toBe('ConversionExpression');
      const convExpr = expr as ConversionExpression;
      expect(convExpr.target.type).toBe('UnitTarget');
      const unitTarget = convExpr.target as any;
      expect(unitTarget.unit.type).toBe('DerivedUnit');
      const derivedUnit = unitTarget.unit;
      expect(derivedUnit.terms).toHaveLength(2);
      // m^2 (exponent 2)
      expect(derivedUnit.terms[0].exponent).toBe(2);
      // s (exponent -1)
      expect(derivedUnit.terms[1].exponent).toBe(-1);
    });

    it('should parse derived unit with explicit multiplication (kg*m/s^2)', () => {
      const expr = parseExpression('100 N to kg*m/s^2');
      expect(expr.type).toBe('ConversionExpression');
      const convExpr = expr as ConversionExpression;
      expect(convExpr.target.type).toBe('UnitTarget');
      const unitTarget = convExpr.target as any;
      expect(unitTarget.unit.type).toBe('DerivedUnit');
      const derivedUnit = unitTarget.unit;
      expect(derivedUnit.terms).toHaveLength(3);
      // kg (exponent 1)
      expect(derivedUnit.terms[0].exponent).toBe(1);
      // m (exponent 1)
      expect(derivedUnit.terms[1].exponent).toBe(1);
      // s (exponent -2)
      expect(derivedUnit.terms[2].exponent).toBe(-2);
    });

    it('should parse derived unit with Unicode superscript (m²)', () => {
      const expr = parseExpression('5 cm to m²');
      expect(expr.type).toBe('ConversionExpression');
      const convExpr = expr as ConversionExpression;
      expect(convExpr.target.type).toBe('UnitTarget');
      const unitTarget = convExpr.target as any;
      expect(unitTarget.unit.type).toBe('DerivedUnit');
      const derivedUnit = unitTarget.unit;
      expect(derivedUnit.terms).toHaveLength(1);
      expect(derivedUnit.terms[0].exponent).toBe(2);
    });

    it('should parse derived unit with Unicode superscripts (kg m/s²)', () => {
      const expr = parseExpression('100 N to kg m/s²');
      expect(expr.type).toBe('ConversionExpression');
      const convExpr = expr as ConversionExpression;
      expect(convExpr.target.type).toBe('UnitTarget');
      const unitTarget = convExpr.target as any;
      expect(unitTarget.unit.type).toBe('DerivedUnit');
      const derivedUnit = unitTarget.unit;
      expect(derivedUnit.terms).toHaveLength(3);
      expect(derivedUnit.terms[0].exponent).toBe(1);  // kg
      expect(derivedUnit.terms[1].exponent).toBe(1);  // m
      expect(derivedUnit.terms[2].exponent).toBe(-2); // s²
    });

    it('should parse derived unit with negative Unicode superscript (m⁻¹)', () => {
      const expr = parseExpression('5 to m⁻¹');
      expect(expr.type).toBe('ConversionExpression');
      const convExpr = expr as ConversionExpression;
      expect(convExpr.target.type).toBe('UnitTarget');
      const unitTarget = convExpr.target as any;
      expect(unitTarget.unit.type).toBe('DerivedUnit');
      const derivedUnit = unitTarget.unit;
      expect(derivedUnit.terms).toHaveLength(1);
      expect(derivedUnit.terms[0].exponent).toBe(-1);
    });

    it('should parse mixed ASCII and Unicode in same expression (m^2/s³)', () => {
      const expr = parseExpression('10 to m^2/s³');
      expect(expr.type).toBe('ConversionExpression');
      const convExpr = expr as ConversionExpression;
      expect(convExpr.target.type).toBe('UnitTarget');
      const unitTarget = convExpr.target as any;
      expect(unitTarget.unit.type).toBe('DerivedUnit');
      const derivedUnit = unitTarget.unit;
      expect(derivedUnit.terms).toHaveLength(2);
      expect(derivedUnit.terms[0].exponent).toBe(2);  // m^2
      expect(derivedUnit.terms[1].exponent).toBe(-3); // s³ with division
    });
  });

  describe('Conditional Expressions', () => {
    it('should parse if-then-else', () => {
      const expr = parseExpression('if 5 > 3 then 10 else 20');
      expect(expr.type).toBe('ConditionalExpression');
      const condExpr = expr as ConditionalExpression;
      expect(condExpr.condition.type).toBe('BinaryExpression');
      expect((condExpr.thenBranch as NumberLiteral).value).toBe(10);
      expect((condExpr.elseBranch as NumberLiteral).value).toBe(20);
    });
  });

  describe('"per" Operator Disambiguation', () => {
    it('should handle "per" with single unit as derived unit', () => {
      const expr = parseExpression('5 km per h');
      expect(expr.type).toBe('BinaryExpression');
      expect((expr as BinaryExpression).operator).toBe('per');
    });

    it('should handle "per" with expression as division', () => {
      const expr = parseExpression('60 km per 2 h');
      expect(expr.type).toBe('BinaryExpression');
      expect((expr as BinaryExpression).operator).toBe('per');
    });
  });

  describe('Document and Line Parsing', () => {
    it('should parse empty lines', () => {
      const doc = parse('\n\n');
      expect(doc.type).toBe('Document');
      expect(doc.lines.length).toBeGreaterThanOrEqual(0);
    });

    it('should parse multiple expression lines', () => {
      const doc = parse('2 + 2\n5 * 3');
      expect(doc.type).toBe('Document');
      expect(doc.lines.length).toBe(2);
      expect(doc.lines[0].type).toBe('ExpressionLine');
      expect(doc.lines[1].type).toBe('ExpressionLine');
    });

    it('should parse variable definitions', () => {
      const doc = parse('x = 42');
      expect(doc.type).toBe('Document');
      expect(doc.lines[0].type).toBe('VariableDefinition');
      const varDef = doc.lines[0] as VariableDefinition;
      expect(varDef.name).toBe('x');
      expect((varDef.value as NumberLiteral).value).toBe(42);
    });

    it('should parse headings', () => {
      const doc = parse('# Test Heading');
      expect(doc.type).toBe('Document');
      expect(doc.lines[0].type).toBe('Heading');
      const heading = doc.lines[0] as Heading;
      expect(heading.level).toBe(1);
      expect(heading.text).toBe('Test Heading');
    });

    it('should parse multiple heading levels', () => {
      const doc = parse('## Level 2 Heading');
      const heading = doc.lines[0] as Heading;
      expect(heading.level).toBe(2);
    });
  });

  describe('Error Recovery', () => {
    it('should record LexerError on unknown characters', () => {
      // Unknown characters should be recorded in errors array
      const result = parseWithErrors('this is just @#$ invalid &^% text');
      expect(result.errors).toHaveLength(0); // Parser errors, not lexer errors for this input
      // The lexer will catch the @ character
      // Let's check lexer errors directly
      const lexer = new Lexer('this is just @#$ invalid &^% text', dataLoader);
      const { errors } = lexer.tokenize();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Unexpected character \'@\'');
    });

    it('should fall back to PlainText on parser errors without lexer errors', () => {
      // Valid tokens but invalid syntax should result in PlainText
      const doc = parse('this is just text without operators');
      expect(doc.type).toBe('Document');
      // Should have at least one line (PlainText or ExpressionLine)
      expect(doc.lines.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Expressions', () => {
    it('should parse unit arithmetic', () => {
      const expr = parseExpression('5 m + 20 cm');
      expect(expr.type).toBe('BinaryExpression');
      const binExpr = expr as BinaryExpression;
      expect(binExpr.operator).toBe('+');
      expect((binExpr.left as NumberWithUnit).value).toBe(5);
      expect((binExpr.right as NumberWithUnit).value).toBe(20);
    });

    it('should parse complex nested expressions', () => {
      const expr = parseExpression('(5 + 3) * 2 ^ 3 - 10 / 2');
      expect(expr.type).toBe('BinaryExpression');
      // Should respect precedence: (5 + 3) * (2 ^ 3) - (10 / 2)
    });

    it('should parse function calls with unit arithmetic', () => {
      // With ASCII exponent notation, "16 m^2" is parsed as a literal (16 square meters)
      // not as an operation (16 m)^2
      const expr = parseExpression('sqrt(16 m^2)');
      expect(expr.type).toBe('FunctionCall');
      const funcCall = expr as FunctionCall;
      expect(funcCall.name).toBe('sqrt');
      // The argument is now a NumberWithUnit with a DerivedUnit
      expect(funcCall.arguments[0].type).toBe('NumberWithUnit');
      const arg = funcCall.arguments[0] as NumberWithUnit;
      expect(arg.value).toBe(16);
      expect(arg.unit.type).toBe('DerivedUnit');
    });
  });

  describe('Date/Time Literals', () => {
    it('should parse date with month name (MONTH D YYYY)', () => {
      const expr = parseExpression('Jan 15 2024');
      expect(expr.type).toBe('PlainDateLiteral');
      const date = expr as any;
      expect(date.year).toBe(2024);
      expect(date.month).toBe(1);
      expect(date.day).toBe(15);
    });

    it('should parse date with long month name', () => {
      const expr = parseExpression('February 28 2024');
      expect(expr.type).toBe('PlainDateLiteral');
      const date = expr as any;
      expect(date.year).toBe(2024);
      expect(date.month).toBe(2);
      expect(date.day).toBe(28);
    });

    describe('Time Literals (Phase 2.5)', () => {
      it('should parse H:MM as PlainTimeLiteral', () => {
        const expr = parseExpression('10:30');
        expect(expr.type).toBe('PlainTimeLiteral');
        const time = expr as any;
        expect(time.hour).toBe(10);
        expect(time.minute).toBe(30);
        expect(time.second).toBe(0);
      });

      it('should parse H:MM:SS as PlainTimeLiteral', () => {
        const expr = parseExpression('10:30:45');
        expect(expr.type).toBe('PlainTimeLiteral');
        const time = expr as any;
        expect(time.hour).toBe(10);
        expect(time.minute).toBe(30);
        expect(time.second).toBe(45);
      });

      it('should parse single-digit hours', () => {
        const expr = parseExpression('3:45');
        expect(expr.type).toBe('PlainTimeLiteral');
        const time = expr as any;
        expect(time.hour).toBe(3);
        expect(time.minute).toBe(45);
        expect(time.second).toBe(0);
      });

      it('should parse midnight and noon', () => {
        const midnight = parseExpression('0:00');
        expect(midnight.type).toBe('PlainTimeLiteral');
        expect((midnight as any).hour).toBe(0);

        const noon = parseExpression('12:00');
        expect(noon.type).toBe('PlainTimeLiteral');
        expect((noon as any).hour).toBe(12);
      });

      it('should parse 24-hour format times', () => {
        const time14 = parseExpression('14:30');
        expect(time14.type).toBe('PlainTimeLiteral');
        expect((time14 as any).hour).toBe(14);

        const time23 = parseExpression('23:59');
        expect(time23.type).toBe('PlainTimeLiteral');
        expect((time23 as any).hour).toBe(23);
        expect((time23 as any).minute).toBe(59);
      });

      it('should parse H:MM AM/PM (12-hour format)', () => {
        const am = parseExpression('10:30 am');
        expect(am.type).toBe('PlainTimeLiteral');
        expect((am as any).hour).toBe(10);
        expect((am as any).minute).toBe(30);

        const pm = parseExpression('2:30 pm');
        expect(pm.type).toBe('PlainTimeLiteral');
        expect((pm as any).hour).toBe(14); // Converted to 24-hour
        expect((pm as any).minute).toBe(30);
      });

      it('should parse H:MM:SS with AM/PM', () => {
        const am = parseExpression('10:30:45 am');
        expect(am.type).toBe('PlainTimeLiteral');
        expect((am as any).hour).toBe(10);
        expect((am as any).minute).toBe(30);
        expect((am as any).second).toBe(45);

        const pm = parseExpression('3:15:20 pm');
        expect(pm.type).toBe('PlainTimeLiteral');
        expect((pm as any).hour).toBe(15); // Converted to 24-hour
        expect((pm as any).minute).toBe(15);
        expect((pm as any).second).toBe(20);
      });

      it('should handle 12 AM (midnight)', () => {
        const expr = parseExpression('12:00 am');
        expect(expr.type).toBe('PlainTimeLiteral');
        const time = expr as any;
        expect(time.hour).toBe(0); // 12 AM = 00:00
        expect(time.minute).toBe(0);
      });

      it('should handle 12 PM (noon)', () => {
        const expr = parseExpression('12:00 pm');
        expect(expr.type).toBe('PlainTimeLiteral');
        const time = expr as any;
        expect(time.hour).toBe(12); // 12 PM = 12:00
        expect(time.minute).toBe(0);
      });

      it('should handle uppercase AM/PM', () => {
        const am = parseExpression('10:30 AM');
        expect(am.type).toBe('PlainTimeLiteral');
        expect((am as any).hour).toBe(10);

        const pm = parseExpression('2:45 PM');
        expect(pm.type).toBe('PlainTimeLiteral');
        expect((pm as any).hour).toBe(14);
      });

      it('should reject invalid hour ranges', () => {
        // These should return null from tryParseTime
        const expr24 = parseExpression('24:00');
        expect(expr24.type).not.toBe('PlainTimeLiteral');

        const expr25 = parseExpression('25:30');
        expect(expr25.type).not.toBe('PlainTimeLiteral');
      });

      it('should reject invalid minute ranges', () => {
        const expr = parseExpression('10:60');
        expect(expr.type).not.toBe('PlainTimeLiteral');

        const expr99 = parseExpression('10:99');
        expect(expr99.type).not.toBe('PlainTimeLiteral');
      });

      it('should reject invalid second ranges', () => {
        const expr = parseExpression('10:30:60');
        expect(expr.type).not.toBe('PlainTimeLiteral');

        const expr99 = parseExpression('10:30:99');
        expect(expr99.type).not.toBe('PlainTimeLiteral');
      });

      describe('Unconventional 12-hour times (strict validation)', () => {
        it('should reject 13:00 am (hour out of 1-12 range)', () => {
          const expr = parseExpression('13:00 am');
          expect(expr.type).not.toBe('PlainTimeLiteral');
          // Should not be parsed as time literal
        });

        it('should reject 14:20:05 pm (hour out of 1-12 range)', () => {
          const expr = parseExpression('14:20:05 pm');
          expect(expr.type).not.toBe('PlainTimeLiteral');
        });

        it('should reject 0:00 am (hour 0 invalid in 12-hour format)', () => {
          const expr = parseExpression('0:00 am');
          expect(expr.type).not.toBe('PlainTimeLiteral');
          // Midnight must be written as "12:00 am"
        });

        it('should reject 00:15 am (hour 0 invalid in 12-hour format)', () => {
          const expr = parseExpression('00:15 am');
          expect(expr.type).not.toBe('PlainTimeLiteral');
        });

        it('should reject 0:30 pm (hour 0 invalid in 12-hour format)', () => {
          const expr = parseExpression('0:30 pm');
          expect(expr.type).not.toBe('PlainTimeLiteral');
        });

        it('should reject 23:59 pm (hour out of 1-12 range)', () => {
          const expr = parseExpression('23:59 pm');
          expect(expr.type).not.toBe('PlainTimeLiteral');
        });

        it('should reject 15:00 am (hour out of 1-12 range)', () => {
          const expr = parseExpression('15:00 am');
          expect(expr.type).not.toBe('PlainTimeLiteral');
        });

        it('should accept valid 12-hour times (1-12 with AM/PM)', () => {
          // All valid 12-hour hours should work
          for (let hour = 1; hour <= 12; hour++) {
            const amExpr = parseExpression(`${hour}:00 am`);
            expect(amExpr.type).toBe('PlainTimeLiteral');

            const pmExpr = parseExpression(`${hour}:00 pm`);
            expect(pmExpr.type).toBe('PlainTimeLiteral');
          }
        });

        it('should accept 24-hour times without AM/PM (including 0:00 and 13-23)', () => {
          // Without AM/PM, all 0-23 hours are valid
          const midnight = parseExpression('0:00');
          expect(midnight.type).toBe('PlainTimeLiteral');
          expect((midnight as any).hour).toBe(0);

          const afternoon = parseExpression('13:00');
          expect(afternoon.type).toBe('PlainTimeLiteral');
          expect((afternoon as any).hour).toBe(13);

          const evening = parseExpression('23:59');
          expect(evening.type).toBe('PlainTimeLiteral');
          expect((evening as any).hour).toBe(23);
        });
      });
    });

    describe('Plain Date Time Literals (Phase 3)', () => {
      it('should parse date followed by time', () => {
        const expr = parseExpression('1970 Jan 01 14:30');
        expect(expr.type).toBe('PlainDateTimeLiteral');
        const dateTime = expr as PlainDateTimeLiteral;

        // Check date part
        expect(dateTime.date.year).toBe(1970);
        expect(dateTime.date.month).toBe(1);
        expect(dateTime.date.day).toBe(1);

        // Check time part
        expect(dateTime.time.hour).toBe(14);
        expect(dateTime.time.minute).toBe(30);
        expect(dateTime.time.second).toBe(0);
      });

      it('should parse time followed by date', () => {
        const expr = parseExpression('14:30 1970 Jan 01');
        expect(expr.type).toBe('PlainDateTimeLiteral');
        const dateTime = expr as PlainDateTimeLiteral;

        // Check date part
        expect(dateTime.date.year).toBe(1970);
        expect(dateTime.date.month).toBe(1);
        expect(dateTime.date.day).toBe(1);

        // Check time part
        expect(dateTime.time.hour).toBe(14);
        expect(dateTime.time.minute).toBe(30);
        expect(dateTime.time.second).toBe(0);
      });

      it('should parse date time with seconds', () => {
        const expr = parseExpression('2024 Feb 15 10:30:45');
        expect(expr.type).toBe('PlainDateTimeLiteral');
        const dateTime = expr as PlainDateTimeLiteral;

        expect(dateTime.date.year).toBe(2024);
        expect(dateTime.date.month).toBe(2);
        expect(dateTime.date.day).toBe(15);

        expect(dateTime.time.hour).toBe(10);
        expect(dateTime.time.minute).toBe(30);
        expect(dateTime.time.second).toBe(45);
      });

      it('should parse date time with AM/PM', () => {
        const expr = parseExpression('2024 Dec 25 2:30 pm');
        expect(expr.type).toBe('PlainDateTimeLiteral');
        const dateTime = expr as PlainDateTimeLiteral;

        expect(dateTime.date.year).toBe(2024);
        expect(dateTime.date.month).toBe(12);
        expect(dateTime.date.day).toBe(25);

        // 2:30 PM should be converted to 14:30 (24-hour)
        expect(dateTime.time.hour).toBe(14);
        expect(dateTime.time.minute).toBe(30);
      });

      it('should parse time with AM/PM followed by date', () => {
        const expr = parseExpression('10:15 am 2024 Jan 1');
        expect(expr.type).toBe('PlainDateTimeLiteral');
        const dateTime = expr as PlainDateTimeLiteral;

        expect(dateTime.date.year).toBe(2024);
        expect(dateTime.date.month).toBe(1);
        expect(dateTime.date.day).toBe(1);

        expect(dateTime.time.hour).toBe(10);
        expect(dateTime.time.minute).toBe(15);
      });
    });

    describe('Zoned date times', () => {
      it('should parse plain time with UTC', () => {
        const expr = parseExpression('12:30 UTC');
        expect(expr.type).toBe('ZonedDateTimeLiteral');
      });

      it('should parse plain time with timezone offset', () => {
        const expr = parseExpression('08:25 UTC+9');
        expect(expr.type).toBe('ZonedDateTimeLiteral');
      });

      it('should parse date time with IANA timezone', () => {
        const expr = parseExpression('2023 Jan 01 14:00 America/New_York');
        expect(expr.type).toBe('ZonedDateTimeLiteral');
      });

      it('should parse YYYY MONTH D time pattern without timezone', () => {
        const expr = parseExpression('2023 Jan 01 14:00');
        expect(expr.type).toBe('PlainDateTimeLiteral');
      });

      it('should parse YYYY MONTH D time without leading zero', () => {
        const expr = parseExpression('2023 Jan 1 14:00');
        expect(expr.type).toBe('PlainDateTimeLiteral');
      });

      it('should parse date time with city name', () => {
        const expr = parseExpression('2023 Jan 01 14:00 New York');
        expect(expr.type).toBe('ZonedDateTimeLiteral');
      });

      it('should parse date time with long timezone name', () => {
        const expr = parseExpression('2023 Jan 01 14:00 america/argentina/buenos_aires');
        expect(expr.type).toBe('ZonedDateTimeLiteral');
      });

      it('should parse date time with long timezone name', () => {
        const expr = parseExpression('2023 Jan 01 14:00 australian central western standard time');
        expect(expr.type).toBe('ZonedDateTimeLiteral');
      });

      it('should parse date time with timezone offset', () => {
        const expr = parseExpression('1970 Jan 01 23:59 UTC+8');
        expect(expr.type).toBe('ZonedDateTimeLiteral');
      });
    });
  });

  describe('Phase 3: Caret Notation and Named Units', () => {
    describe('Caret notation for exponents', () => {
      it('should parse caret notation for square units', () => {
        const expr = parseExpression('5 m^2');
        expect(expr.type).toBe('NumberWithUnit');
        const nwu = expr as NumberWithUnit;
        expect(nwu.value).toBe(5);
        expect(nwu.unit.type).toBe('DerivedUnit');
        const derived = nwu.unit as DerivedUnit;
        expect(derived.terms).toHaveLength(1);
        expect(derived.terms[0].exponent).toBe(2);
      });

      it('should parse caret notation for cubic units', () => {
        const expr = parseExpression('10 m^3');
        expect(expr.type).toBe('NumberWithUnit');
        const nwu = expr as NumberWithUnit;
        expect(nwu.value).toBe(10);
        expect(nwu.unit.type).toBe('DerivedUnit');
        const derived = nwu.unit as DerivedUnit;
        expect(derived.terms).toHaveLength(1);
        expect(derived.terms[0].exponent).toBe(3);
      });

      it('should parse caret notation with negative exponents', () => {
        const expr = parseExpression('100 s^-1');
        expect(expr.type).toBe('NumberWithUnit');
        const nwu = expr as NumberWithUnit;
        expect(nwu.value).toBe(100);
        expect(nwu.unit.type).toBe('DerivedUnit');
        const derived = nwu.unit as DerivedUnit;
        expect(derived.terms).toHaveLength(1);
        expect(derived.terms[0].exponent).toBe(-1);
      });

      it('should parse caret notation with fractional exponents', () => {
        const expr = parseExpression('25 m^0.5');
        expect(expr.type).toBe('NumberWithUnit');
        const nwu = expr as NumberWithUnit;
        expect(nwu.value).toBe(25);
        expect(nwu.unit.type).toBe('DerivedUnit');
        const derived = nwu.unit as DerivedUnit;
        expect(derived.terms).toHaveLength(1);
        expect(derived.terms[0].exponent).toBe(0.5);
      });
    });

    describe('Named square/cubic units - prefix pattern', () => {
      it('should parse "square meter"', () => {
        const expr = parseExpression('1 square meter');
        expect(expr.type).toBe('NumberWithUnit');
        const nwu = expr as NumberWithUnit;
        expect(nwu.value).toBe(1);
        expect(nwu.unit.type).toBe('DerivedUnit');
        const derived = nwu.unit as DerivedUnit;
        expect(derived.terms).toHaveLength(1);
        expect(derived.terms[0].exponent).toBe(2);
      });

      it('should parse "cubic meter"', () => {
        const expr = parseExpression('5 cubic meter');
        expect(expr.type).toBe('NumberWithUnit');
        const nwu = expr as NumberWithUnit;
        expect(nwu.value).toBe(5);
        expect(nwu.unit.type).toBe('DerivedUnit');
        const derived = nwu.unit as DerivedUnit;
        expect(derived.terms).toHaveLength(1);
        expect(derived.terms[0].exponent).toBe(3);
      });

      it('should parse "square foot"', () => {
        const expr = parseExpression('10 square foot');
        expect(expr.type).toBe('NumberWithUnit');
        const nwu = expr as NumberWithUnit;
        expect(nwu.value).toBe(10);
        expect(nwu.unit.type).toBe('DerivedUnit');
        const derived = nwu.unit as DerivedUnit;
        expect(derived.terms).toHaveLength(1);
        expect(derived.terms[0].exponent).toBe(2);
      });
    });

    describe('Named square/cubic units - postfix pattern', () => {
      it('should parse "meter squared"', () => {
        const expr = parseExpression('2 meter squared');
        expect(expr.type).toBe('NumberWithUnit');
        const nwu = expr as NumberWithUnit;
        expect(nwu.value).toBe(2);
        expect(nwu.unit.type).toBe('DerivedUnit');
        const derived = nwu.unit as DerivedUnit;
        expect(derived.terms).toHaveLength(1);
        expect(derived.terms[0].exponent).toBe(2);
      });

      it('should parse "meter cubed"', () => {
        const expr = parseExpression('3 meter cubed');
        expect(expr.type).toBe('NumberWithUnit');
        const nwu = expr as NumberWithUnit;
        expect(nwu.value).toBe(3);
        expect(nwu.unit.type).toBe('DerivedUnit');
        const derived = nwu.unit as DerivedUnit;
        expect(derived.terms).toHaveLength(1);
        expect(derived.terms[0].exponent).toBe(3);
      });

      it('should parse "foot squared"', () => {
        const expr = parseExpression('7 foot squared');
        expect(expr.type).toBe('NumberWithUnit');
        const nwu = expr as NumberWithUnit;
        expect(nwu.value).toBe(7);
        expect(nwu.unit.type).toBe('DerivedUnit');
        const derived = nwu.unit as DerivedUnit;
        expect(derived.terms).toHaveLength(1);
        expect(derived.terms[0].exponent).toBe(2);
      });
    });

    describe('Edge cases and combinations', () => {
      it('should not confuse caret with power operator in parentheses', () => {
        // (5 m)^2 should be a power expression, not a derived unit
        const expr = parseExpression('(5 m)^2');
        expect(expr.type).toBe('BinaryExpression');
        const binary = expr as BinaryExpression;
        expect(binary.operator).toBe('^');
      });

      it('should handle Unicode superscripts and caret notation', () => {
        const caretExpr = parseExpression('5 m^2');
        const unicodeExpr = parseExpression('5 m²');

        expect(caretExpr.type).toBe('NumberWithUnit');
        expect(unicodeExpr.type).toBe('NumberWithUnit');

        const caretNwu = caretExpr as NumberWithUnit;
        const unicodeNwu = unicodeExpr as NumberWithUnit;

        expect(caretNwu.value).toBe(unicodeNwu.value);
        expect(caretNwu.unit.type).toBe('DerivedUnit');
        expect(unicodeNwu.unit.type).toBe('DerivedUnit');

        // Both have same structure
        const caretDerived = caretNwu.unit as DerivedUnit;
        const unicodeDerived = unicodeNwu.unit as DerivedUnit;
        expect(caretDerived.terms[0].exponent).toBe(2);
        expect(unicodeDerived.terms[0].exponent).toBe(2);
      });
    });

    describe('Multi-Word Units and Currency-Before-Number', () => {
      it('should parse multi-word currency names (US dollars)', () => {
        const expr = parseExpression('100 US dollars');
        expect(expr.type).toBe('NumberWithUnit');
        const numWithUnit = expr as any;
        expect(numWithUnit.value).toBe(100);
        expect(numWithUnit.unit.type).toBe('SimpleUnit');
        // Should recognize "US dollars" and resolve to USD currency code
        expect(numWithUnit.unit.unitId).toBe('USD');
      });

      it('should parse multi-word currency names (hong kong dollars)', () => {
        const expr = parseExpression('100 hong kong dollars');
        expect(expr.type).toBe('NumberWithUnit');
        const numWithUnit = expr as any;
        expect(numWithUnit.value).toBe(100);
        expect(numWithUnit.unit.type).toBe('SimpleUnit');
        expect(numWithUnit.unit.unitId).toBe('HKD');
      });

      it('should parse currency-before-number pattern (USD 100)', () => {
        const expr = parseExpression('USD 100');
        expect(expr.type).toBe('NumberWithUnit');
        const numWithUnit = expr as any;
        expect(numWithUnit.value).toBe(100);
        expect(numWithUnit.unit.type).toBe('SimpleUnit');
        expect(numWithUnit.unit.unitId).toBe('USD');
      });

      it('should parse currency-before-number pattern (EUR 50)', () => {
        const expr = parseExpression('EUR 50');
        expect(expr.type).toBe('NumberWithUnit');
        const numWithUnit = expr as any;
        expect(numWithUnit.value).toBe(50);
        expect(numWithUnit.unit.type).toBe('SimpleUnit');
        expect(numWithUnit.unit.unitId).toBe('EUR');
      });

      it('should not interfere with derived unit implicit multiplication', () => {
        const expr = parseExpression('100 N to kg m/s^2');
        expect(expr.type).toBe('ConversionExpression');
        const convExpr = expr as any;
        expect(convExpr.target.type).toBe('UnitTarget');
        expect(convExpr.target.unit.type).toBe('DerivedUnit');
        // Should have 3 terms: kg (^1), m (^1), s (^-2)
        expect(convExpr.target.unit.terms).toHaveLength(3);
      });
    });

    describe('Multi-Word Units in Derived Units (Conversion Targets)', () => {
      it('should parse multi-word unit in denominator (to fl oz/kg)', () => {
        const expr = parseExpression('100 L to fl oz/kg');
        expect(expr.type).toBe('ConversionExpression');
        const convExpr = expr as any;
        expect(convExpr.target.type).toBe('UnitTarget');
        expect(convExpr.target.unit.type).toBe('DerivedUnit');

        const terms = convExpr.target.unit.terms;
        expect(terms).toHaveLength(2);

        // First term: fl oz with exponent 1
        expect(terms[0].unit.unitId).toBe('fluid_ounce');
        expect(terms[0].exponent).toBe(1);

        // Second term: kg with exponent -1
        expect(terms[1].unit.unitId).toBe('kilogram');
        expect(terms[1].exponent).toBe(-1);
      });

      it('should parse complex derived unit with multiple multi-word units (to fl oz kg/us dollars/day)', () => {
        const expr = parseExpression('50 L to fl oz kg/us dollars/day');
        expect(expr.type).toBe('ConversionExpression');
        const convExpr = expr as any;
        expect(convExpr.target.type).toBe('UnitTarget');
        expect(convExpr.target.unit.type).toBe('DerivedUnit');

        const terms = convExpr.target.unit.terms;
        expect(terms).toHaveLength(4);

        // Numerator: fl oz (^1), kg (^1)
        expect(terms[0].unit.unitId).toBe('fluid_ounce');
        expect(terms[0].exponent).toBe(1);
        expect(terms[1].unit.unitId).toBe('kilogram');
        expect(terms[1].exponent).toBe(1);

        // Denominator: us dollars (^-1), day (^-1)
        expect(terms[2].unit.unitId).toBe('USD');
        expect(terms[2].exponent).toBe(-1);
        expect(terms[3].unit.unitId).toBe('day');
        expect(terms[3].exponent).toBe(-1);
      });

      it('should parse multi-word unit in numerator (to sq m kg/s)', () => {
        const expr = parseExpression('10 J to sq m kg/s');
        expect(expr.type).toBe('ConversionExpression');
        const convExpr = expr as any;
        expect(convExpr.target.type).toBe('UnitTarget');
        expect(convExpr.target.unit.type).toBe('DerivedUnit');

        const terms = convExpr.target.unit.terms;
        expect(terms).toHaveLength(3);

        // sq m is "square meter" - stored as square_meter unit with exponent 1
        expect(terms[0].unit.unitId).toBe('square_meter');
        expect(terms[0].exponent).toBe(1);
        expect(terms[1].unit.unitId).toBe('kilogram');
        expect(terms[1].exponent).toBe(1);
        expect(terms[2].unit.unitId).toBe('second');
        expect(terms[2].exponent).toBe(-1);
      });

      it('should parse multi-word currency in derived unit (to hong kong dollars/hour)', () => {
        const expr = parseExpression('25 USD to hong kong dollars/hour');
        expect(expr.type).toBe('ConversionExpression');
        const convExpr = expr as any;
        expect(convExpr.target.type).toBe('UnitTarget');
        expect(convExpr.target.unit.type).toBe('DerivedUnit');

        const terms = convExpr.target.unit.terms;
        expect(terms).toHaveLength(2);

        expect(terms[0].unit.unitId).toBe('HKD');
        expect(terms[0].exponent).toBe(1);
        expect(terms[1].unit.unitId).toBe('hour');
        expect(terms[1].exponent).toBe(-1);
      });

      it('should still parse regular derived units correctly (to kg m/s^2)', () => {
        const expr = parseExpression('100 N to kg m/s^2');
        expect(expr.type).toBe('ConversionExpression');
        const convExpr = expr as any;
        expect(convExpr.target.type).toBe('UnitTarget');
        expect(convExpr.target.unit.type).toBe('DerivedUnit');

        const terms = convExpr.target.unit.terms;
        expect(terms).toHaveLength(3);

        expect(terms[0].unit.unitId).toBe('kilogram');
        expect(terms[0].exponent).toBe(1);
        expect(terms[1].unit.unitId).toBe('meter');
        expect(terms[1].exponent).toBe(1);
        expect(terms[2].unit.unitId).toBe('second');
        expect(terms[2].exponent).toBe(-2);
      });
    });

    describe('Derived Units in Number-With-Unit Context', () => {
      it('should parse single-word derived unit (1 kg m/s)', () => {
        const expr = parseExpression('1 kg m/s');
        expect(expr.type).toBe('NumberWithUnit');
        const numWithUnit = expr as any;
        expect(numWithUnit.value).toBe(1);
        expect(numWithUnit.unit.type).toBe('DerivedUnit');

        const terms = numWithUnit.unit.terms;
        expect(terms).toHaveLength(3);
        expect(terms[0].unit.unitId).toBe('kilogram');
        expect(terms[0].exponent).toBe(1);
        expect(terms[1].unit.unitId).toBe('meter');
        expect(terms[1].exponent).toBe(1);
        expect(terms[2].unit.unitId).toBe('second');
        expect(terms[2].exponent).toBe(-1);
      });

      it('should parse multi-word derived unit (1 kg fl oz/day)', () => {
        const expr = parseExpression('1 kg fl oz/day');
        expect(expr.type).toBe('NumberWithUnit');
        const numWithUnit = expr as any;
        expect(numWithUnit.value).toBe(1);
        expect(numWithUnit.unit.type).toBe('DerivedUnit');

        const terms = numWithUnit.unit.terms;
        expect(terms).toHaveLength(3);
        expect(terms[0].unit.unitId).toBe('kilogram');
        expect(terms[0].exponent).toBe(1);
        expect(terms[1].unit.unitId).toBe('fluid_ounce');
        expect(terms[1].exponent).toBe(1);
        expect(terms[2].unit.unitId).toBe('day');
        expect(terms[2].exponent).toBe(-1);
      });

      it('should parse user-defined unit in derived unit (1 sq ft/person)', () => {
        const expr = parseExpression('1 sq ft/person');
        expect(expr.type).toBe('NumberWithUnit');
        const numWithUnit = expr as any;
        expect(numWithUnit.value).toBe(1);
        expect(numWithUnit.unit.type).toBe('DerivedUnit');

        const terms = numWithUnit.unit.terms;
        expect(terms).toHaveLength(2);
        expect(terms[0].unit.unitId).toBe('square_foot');
        expect(terms[0].exponent).toBe(1);
        expect(terms[1].unit.unitId).toBe('person'); // user-defined
        expect(terms[1].exponent).toBe(-1);
      });

      it('should NOT parse variable as unit - treat as binary division', () => {
        // Parse document with variable definition
        const doc = parse('compensation = 100 USD\n50000 HKD/compensation');
        expect(doc.lines).toHaveLength(2);

        // First line: variable definition
        const line1 = doc.lines[0] as any;
        expect(line1.type).toBe('VariableDefinition');
        expect(line1.name).toBe('compensation');

        // Second line: should be binary division expression, NOT derived unit
        const line2 = doc.lines[1] as any;
        expect(line2.type).toBe('ExpressionLine');
        const expr = line2.expression;
        expect(expr.type).toBe('BinaryExpression');
        expect(expr.operator).toBe('/');

        // Left side: 50000 HKD
        expect(expr.left.type).toBe('NumberWithUnit');
        expect(expr.left.value).toBe(50000);
        expect(expr.left.unit.unitId).toBe('HKD');

        // Right side: compensation (variable reference)
        expect(expr.right.type).toBe('Identifier');
        expect(expr.right.name).toBe('compensation');
      });

      it('should parse undefined identifier as user-defined unit', () => {
        // No variable definition - "foo" is unknown, treat as user-defined unit
        const expr = parseExpression('100 m/foo');
        expect(expr.type).toBe('NumberWithUnit');
        const numWithUnit = expr as any;
        expect(numWithUnit.unit.type).toBe('DerivedUnit');

        const terms = numWithUnit.unit.terms;
        expect(terms).toHaveLength(2);
        expect(terms[0].unit.unitId).toBe('meter');
        expect(terms[0].exponent).toBe(1);
        expect(terms[1].unit.unitId).toBe('foo'); // user-defined
        expect(terms[1].exponent).toBe(-1);
      });

      it('should parse number with unit exponent (100 m^2)', () => {
        // "100 m^2" should be NumberWithUnit with derived unit, NOT binary exponentiation
        const expr = parseExpression('100 m^2');
        expect(expr.type).toBe('NumberWithUnit');
        const numWithUnit = expr as any;
        expect(numWithUnit.value).toBe(100);
        expect(numWithUnit.unit.type).toBe('DerivedUnit');

        const terms = numWithUnit.unit.terms;
        expect(terms).toHaveLength(1);
        expect(terms[0].unit.unitId).toBe('meter');
        expect(terms[0].exponent).toBe(2);
      });

      it('should parse pure implicit multiplication (1 N m)', () => {
        // "1 N m" should be NumberWithUnit with derived unit (newton-meter)
        // No explicit operator needed - consecutive units imply multiplication
        const expr = parseExpression('1 N m');
        expect(expr.type).toBe('NumberWithUnit');
        const numWithUnit = expr as any;
        expect(numWithUnit.value).toBe(1);
        expect(numWithUnit.unit.type).toBe('DerivedUnit');

        const terms = numWithUnit.unit.terms;
        expect(terms).toHaveLength(2);
        expect(terms[0].unit.unitId).toBe('newton');
        expect(terms[0].exponent).toBe(1);
        expect(terms[1].unit.unitId).toBe('meter');
        expect(terms[1].exponent).toBe(1);
      });

      it('should parse implicit multiplication with exponent (1 N^2 m)', () => {
        // "1 N^2 m" should be NumberWithUnit with derived unit [newton:2, meter:1]
        const expr = parseExpression('1 N^2 m');
        expect(expr.type).toBe('NumberWithUnit');
        const numWithUnit = expr as any;
        expect(numWithUnit.value).toBe(1);
        expect(numWithUnit.unit.type).toBe('DerivedUnit');

        const terms = numWithUnit.unit.terms;
        expect(terms).toHaveLength(2);
        expect(terms[0].unit.unitId).toBe('newton');
        expect(terms[0].exponent).toBe(2);
        expect(terms[1].unit.unitId).toBe('meter');
        expect(terms[1].exponent).toBe(1);
      });

      it('should parse implicit multiplication with Unicode superscripts (1 N² m³)', () => {
        // "1 N² m³" should be NumberWithUnit with derived unit [newton:2, meter:3]
        const expr = parseExpression('1 N² m³');
        expect(expr.type).toBe('NumberWithUnit');
        const numWithUnit = expr as any;
        expect(numWithUnit.value).toBe(1);
        expect(numWithUnit.unit.type).toBe('DerivedUnit');

        const terms = numWithUnit.unit.terms;
        expect(terms).toHaveLength(2);
        expect(terms[0].unit.unitId).toBe('newton');
        expect(terms[0].exponent).toBe(2);
        expect(terms[1].unit.unitId).toBe('meter');
        expect(terms[1].exponent).toBe(3);
      });
    });
  });
});

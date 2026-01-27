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
  CompositeUnitLiteral
} from '../src/ast';

describe('Parser', () => {
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '..', 'data'));
  });

  function parse(input: string): Document {
    const lexer = new Lexer(input, dataLoader);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, dataLoader);
    return parser.parseDocument();
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
    it('should fall back to PlainText on parse errors', () => {
      // Invalid syntax should result in PlainText
      const doc = parse('this is just @#$ invalid &^% text');
      expect(doc.type).toBe('Document');
      // Should have at least one line (even if it's PlainText or error)
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
      const expr = parseExpression('sqrt(16 m^2)');
      expect(expr.type).toBe('FunctionCall');
      const funcCall = expr as FunctionCall;
      expect(funcCall.name).toBe('sqrt');
      expect((funcCall.arguments[0] as BinaryExpression).operator).toBe('^');
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
  });
});

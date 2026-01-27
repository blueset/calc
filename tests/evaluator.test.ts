import { describe, it, expect, beforeAll } from 'vitest';
import { Evaluator, NumberValue, BooleanValue, Value } from '../src/evaluator';
import { DataLoader } from '../src/data-loader';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import * as AST from '../src/ast';

// Helper to create evaluator with loaded data
let dataLoader: DataLoader;
let evaluator: Evaluator;

beforeAll(async () => {
  dataLoader = new DataLoader();
  await dataLoader.load('data');
  evaluator = new Evaluator(dataLoader, { variant: 'us', angleUnit: 'radian' });

  // Load exchange rates (mock data)
  evaluator.loadExchangeRates({
    date: '2024-01-01',
    usd: {
      eur: 0.85,
      gbp: 0.73,
      jpy: 110.0
    }
  });
});

// Helper to parse and evaluate an expression string
function evaluate(input: string): Value {
  const lexer = new Lexer(input, dataLoader);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens, dataLoader);
  const document = parser.parseDocument();

  const results = evaluator.evaluateDocument(document);

  // Get the first line's result
  const firstLine = document.lines[0];
  return results.get(firstLine) || { kind: 'error', error: { type: 'RuntimeError', message: 'No result' } };
}

describe('Evaluator', () => {
  describe('Literal Evaluation', () => {
    it('should evaluate number literals', () => {
      const result = evaluate('42') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(42);
      expect(result.unit).toBeUndefined();
    });

    it('should evaluate decimal numbers', () => {
      const result = evaluate('3.14159') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBeCloseTo(3.14159);
    });

    it('should evaluate scientific notation', () => {
      const result = evaluate('2e3') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(2000);
    });

    it('should evaluate boolean literals', () => {
      const trueVal = evaluate('true') as BooleanValue;
      expect(trueVal.kind).toBe('boolean');
      expect(trueVal.value).toBe(true);

      const falseVal = evaluate('false') as BooleanValue;
      expect(falseVal.kind).toBe('boolean');
      expect(falseVal.value).toBe(false);
    });

    it('should evaluate mathematical constants', () => {
      const piVal = evaluate('pi') as NumberValue;
      expect(piVal.kind).toBe('number');
      expect(piVal.value).toBeCloseTo(Math.PI);

      const eVal = evaluate('e') as NumberValue;
      expect(eVal.kind).toBe('number');
      expect(eVal.value).toBeCloseTo(Math.E);
    });

    it('should evaluate numbers with units', () => {
      const result = evaluate('5 m') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(5);
      expect(result.unit).toBeDefined();
      expect(result.unit?.dimension).toBe('length');
    });
  });

  describe('Binary Arithmetic Operations', () => {
    it('should add two dimensionless numbers', () => {
      const result = evaluate('2 + 3') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(5);
    });

    it('should subtract dimensionless numbers', () => {
      const result = evaluate('10 - 3') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(7);
    });

    it('should multiply dimensionless numbers', () => {
      const result = evaluate('4 * 5') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(20);
    });

    it('should divide dimensionless numbers', () => {
      const result = evaluate('10 / 2') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(5);
    });

    it('should calculate modulo', () => {
      const result = evaluate('10 % 3') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(1);
    });

    it('should calculate power', () => {
      const result = evaluate('2 ^ 3') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(8);
    });

    it('should add numbers with same unit', () => {
      const result = evaluate('5 m + 3 m') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(8);
      expect(result.unit?.id).toBe('meter');
    });

    it('should add numbers with compatible units (different scale)', () => {
      const result = evaluate('5 m + 200 cm') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBeCloseTo(7); // 5m + 2m = 7m
      expect(result.unit?.id).toBe('meter');
    });

    it('should handle division by zero', () => {
      const result = evaluate('10 / 0');
      expect(result.kind).toBe('error');
    });

    it('should reject addition of different dimensions', () => {
      const result = evaluate('5 m + 3 kg');
      expect(result.kind).toBe('error');
    });
  });

  describe('Comparison Operations', () => {
    it('should compare equal numbers', () => {
      const result = evaluate('5 == 5') as BooleanValue;
      expect(result.kind).toBe('boolean');
      expect(result.value).toBe(true);
    });

    it('should compare unequal numbers', () => {
      const result = evaluate('5 != 3') as BooleanValue;
      expect(result.kind).toBe('boolean');
      expect(result.value).toBe(true);
    });

    it('should compare less than', () => {
      const result = evaluate('3 < 5') as BooleanValue;
      expect(result.kind).toBe('boolean');
      expect(result.value).toBe(true);
    });

    it('should compare greater than', () => {
      const result = evaluate('7 > 5') as BooleanValue;
      expect(result.kind).toBe('boolean');
      expect(result.value).toBe(true);
    });

    it('should compare numbers with units', () => {
      const result = evaluate('5 m < 600 cm') as BooleanValue;
      expect(result.kind).toBe('boolean');
      expect(result.value).toBe(true); // 5m < 6m
    });
  });

  describe('Logical Operations', () => {
    it('should evaluate AND with true values', () => {
      const result = evaluate('true && true') as BooleanValue;
      expect(result.kind).toBe('boolean');
      expect(result.value).toBe(true);
    });

    it('should evaluate AND with false values', () => {
      const result = evaluate('true && false') as BooleanValue;
      expect(result.kind).toBe('boolean');
      expect(result.value).toBe(false);
    });

    it('should evaluate OR with mixed values', () => {
      const result = evaluate('false || true') as BooleanValue;
      expect(result.kind).toBe('boolean');
      expect(result.value).toBe(true);
    });

    it('should evaluate OR with false values', () => {
      const result = evaluate('false || false') as BooleanValue;
      expect(result.kind).toBe('boolean');
      expect(result.value).toBe(false);
    });
  });

  describe('Bitwise Operations', () => {
    it('should perform bitwise AND', () => {
      const result = evaluate('12 & 10') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(8); // 1100 & 1010 = 1000
    });

    it('should perform bitwise OR', () => {
      const result = evaluate('12 | 10') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(14); // 1100 | 1010 = 1110
    });

    it('should perform bitwise XOR', () => {
      const result = evaluate('12 xor 10') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(6); // 1100 xor 1010 = 0110
    });

    it('should perform left shift', () => {
      const result = evaluate('5 << 2') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(20); // 101 << 2 = 10100
    });

    it('should perform right shift', () => {
      const result = evaluate('20 >> 2') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(5); // 10100 >> 2 = 101
    });
  });

  describe('Unary Operations', () => {
    it('should negate numbers', () => {
      const result = evaluate('-5') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(-5);
    });

    it('should negate numbers with units', () => {
      const result = evaluate('-(3 m)') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(-3);
      expect(result.unit?.id).toBe('meter');
    });

    it('should perform logical NOT', () => {
      const result = evaluate('!true') as BooleanValue;
      expect(result.kind).toBe('boolean');
      expect(result.value).toBe(false);
    });

    it('should perform bitwise NOT', () => {
      const result = evaluate('~5') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(-6);
    });
  });

  describe('Postfix Operations', () => {
    it('should calculate factorial of small numbers', () => {
      const result = evaluate('5!') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(120);
    });

    it('should calculate factorial of 0', () => {
      const result = evaluate('0!') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(1);
    });

    it('should reject factorial of negative numbers', () => {
      const result = evaluate('(-3)!');
      expect(result.kind).toBe('error');
    });

    it('should reject factorial of non-integers', () => {
      const result = evaluate('3.5!');
      expect(result.kind).toBe('error');
    });
  });

  describe('Function Calls', () => {
    it('should evaluate sqrt', () => {
      const result = evaluate('sqrt(16)') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(4);
    });

    it('should evaluate sin (radian mode)', () => {
      const result = evaluate('sin(0)') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBeCloseTo(0);
    });

    it('should evaluate abs', () => {
      const result = evaluate('abs(-5)') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(5);
    });

    it('should evaluate floor', () => {
      const result = evaluate('floor(3.7)') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(3);
    });

    it('should evaluate ceil', () => {
      const result = evaluate('ceil(3.2)') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(4);
    });

    it('should evaluate round', () => {
      const result = evaluate('round(3.7)') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(4);
    });

    it('should evaluate log', () => {
      const result = evaluate('log10(100)') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBeCloseTo(2); // log10(100) = 2
    });

    it('should evaluate ln', () => {
      const result = evaluate('ln(e)') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBeCloseTo(1);
    });
  });

  describe('Unit Conversions', () => {
    it('should convert between units of same dimension', () => {
      const result = evaluate('5 km to m') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(5000);
      expect(result.unit?.id).toBe('meter');
    });

    it('should convert meters to centimeters', () => {
      const result = evaluate('2.5 m to cm') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(250);
      expect(result.unit?.id).toBe('centimeter');
    });

    it('should convert feet to inches', () => {
      const result = evaluate('2 ft to in') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBeCloseTo(24);
    });

    it('should reject conversion between different dimensions', () => {
      const result = evaluate('5 m to kg');
      expect(result.kind).toBe('error');
    });

    it('should handle chained conversions', () => {
      const result = evaluate('5 km to m to cm') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(500000);
      expect(result.unit?.id).toBe('centimeter');
    });
  });

  describe('Conditional Expressions', () => {
    it('should evaluate true branch', () => {
      const result = evaluate('if true then 10 else 20') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(10);
    });

    it('should evaluate false branch', () => {
      const result = evaluate('if false then 10 else 20') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(20);
    });

    it('should evaluate conditional with comparison', () => {
      const result = evaluate('if 5 > 3 then 100 else 200') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(100);
    });

    it('should convert numbers to boolean in condition', () => {
      const result = evaluate('if 0 then 10 else 20') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(20); // 0 is falsy
    });

    it('should treat non-zero as true', () => {
      const result = evaluate('if 5 then 10 else 20') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(10); // 5 is truthy
    });
  });

  describe('Variable Assignments', () => {
    it('should assign and retrieve variables', () => {
      const lexer = new Lexer('x = 5\nx + 10', dataLoader);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens, dataLoader);
      const document = parser.parseDocument();
      const results = evaluator.evaluateDocument(document);

      const secondLine = document.lines[1];
      const result = results.get(secondLine) as NumberValue;

      expect(result.kind).toBe('number');
      expect(result.value).toBe(15);
    });

    it('should handle multiple variable assignments', () => {
      const lexer = new Lexer('a = 10\nb = 20\na + b', dataLoader);
      const tokens = lexer.tokenize();

      // Debug: Check tokens
      console.log('Tokens:', tokens.map(t => `${t.type}:${t.value}`).join(', '));

      const parser = new Parser(tokens, dataLoader);
      const document = parser.parseDocument();

      // Debug: Check what line types were parsed
      console.log('Line types:', document.lines.map(l => l.type));
      for (let i = 0; i < document.lines.length; i++) {
        const line = document.lines[i];
        if (line.type === 'PlainText') {
          console.log(`Line ${i}: PlainText, text="${line.text}"`);
        }
        if (line.type === 'ExpressionLine' && line.expression.type === 'BinaryExpression') {
          console.log(`Line ${i}: ExpressionLine with BinaryExpression, operator=${(line.expression as any).operator}`);
        }
        if (line.type === 'VariableDefinition') {
          console.log(`Line ${i}: VariableDefinition, name=${line.name}`);
        }
      }

      const results = evaluator.evaluateDocument(document);

      const thirdLine = document.lines[2];
      const result = results.get(thirdLine);

      if (result?.kind === 'error') {
        console.log('Error:', result.error);
      }

      expect(result?.kind).toBe('number');
      if (result?.kind === 'number') {
        expect(result.value).toBe(30);
      }
    });

    it('should handle variables with units', () => {
      const lexer = new Lexer('distance = 5 km\ndistance to m', dataLoader);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens, dataLoader);
      const document = parser.parseDocument();
      const results = evaluator.evaluateDocument(document);

      const secondLine = document.lines[1];
      const result = results.get(secondLine) as NumberValue;

      expect(result.kind).toBe('number');
      expect(result.value).toBe(5000);
    });

    it('should error on undefined variable', () => {
      const result = evaluate('undefined_var + 1');
      expect(result.kind).toBe('error');
    });
  });

  describe('Grouped Expressions', () => {
    it('should respect parentheses for precedence', () => {
      const result = evaluate('(2 + 3) * 4') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(20);
    });

    it('should evaluate nested parentheses', () => {
      const result = evaluate('((2 + 3) * 4) + 1') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(21);
    });
  });

  describe('Operator Precedence', () => {
    it('should multiply before adding', () => {
      const result = evaluate('2 + 3 * 4') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(14); // 2 + (3 * 4)
    });

    it('should handle power before multiplication', () => {
      const result = evaluate('2 * 3 ^ 2') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(18); // 2 * (3 ^ 2)
    });

    it('should handle unary minus with precedence', () => {
      const result = evaluate('-2 ^ 2') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(4); // (-2) ^ 2, unary minus has higher precedence
    });
  });

  describe('Error Propagation', () => {
    it('should propagate errors through binary operations', () => {
      const result = evaluate('undefined_var + 5');
      expect(result.kind).toBe('error');
    });

    it('should propagate errors through function calls', () => {
      const result = evaluate('sqrt(undefined_var)');
      expect(result.kind).toBe('error');
    });

    it('should propagate errors through conversions', () => {
      const result = evaluate('undefined_var to m');
      expect(result.kind).toBe('error');
    });
  });

  describe('Complex Expressions', () => {
    it('should evaluate complex arithmetic expression', () => {
      const result = evaluate('(5 + 3) * 2 - 10 / 2') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(11); // (8 * 2) - 5 = 16 - 5 = 11
    });

    it('should evaluate expression with multiple conversions', () => {
      const result = evaluate('(2 km + 500 m) to cm') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(250000); // 2.5 km = 2500 m = 250000 cm
    });

    it('should evaluate expression with units and arithmetic', () => {
      const result = evaluate('(10 m + 5 m) * 2') as NumberValue;
      expect(result.kind).toBe('number');
      expect(result.value).toBe(30);
      expect(result.unit?.id).toBe('meter');
    });
  });
});

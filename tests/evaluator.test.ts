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
  const { tokens } = lexer.tokenize();
  const parser = new Parser(tokens, dataLoader, input);
  const { ast: document } = parser.parseDocument();

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

  describe('Derived Unit Conversions', () => {
    it('should convert km/h to m/s', () => {
      const result = evaluate('100 km/h to m/s');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        expect(result.value).toBeCloseTo(27.778, 2);
        expect(result.terms).toHaveLength(2);
        // Should have meter with exponent 1 and second with exponent -1
        const meterTerm = result.terms.find(t => t.unit.id === 'meter');
        const secondTerm = result.terms.find(t => t.unit.id === 'second');
        expect(meterTerm).toBeDefined();
        expect(secondTerm).toBeDefined();
        expect(meterTerm?.exponent).toBe(1);
        expect(secondTerm?.exponent).toBe(-1);
      }
    });

    it('should convert m/s to km/h', () => {
      const result = evaluate('10 m/s to km/h');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        expect(result.value).toBeCloseTo(36, 2);
        const kmTerm = result.terms.find(t => t.unit.id === 'kilometer');
        const hourTerm = result.terms.find(t => t.unit.id === 'hour');
        expect(kmTerm).toBeDefined();
        expect(hourTerm).toBeDefined();
        expect(kmTerm?.exponent).toBe(1);
        expect(hourTerm?.exponent).toBe(-1);
      }
    });

    it('should convert between named speed units (mph to km/h)', () => {
      const result = evaluate('60 mph to km/h');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        // 60 mph ≈ 96.56 km/h (60 * 1.60934 = 96.56)
        expect(result.value).toBeCloseTo(96.56, 1);
        const kmTerm = result.terms.find(t => t.unit.id === 'kilometer');
        const hourTerm = result.terms.find(t => t.unit.id === 'hour');
        expect(kmTerm).toBeDefined();
        expect(hourTerm).toBeDefined();
        expect(kmTerm?.exponent).toBe(1);
        expect(hourTerm?.exponent).toBe(-1);
      }
    });

    it('should convert mph to m/s', () => {
      const result = evaluate('60 mph to m/s');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        // 60 mph ≈ 26.82 m/s
        expect(result.value).toBeCloseTo(26.82, 1);
        const meterTerm = result.terms.find(t => t.unit.id === 'meter');
        const secondTerm = result.terms.find(t => t.unit.id === 'second');
        expect(meterTerm).toBeDefined();
        expect(secondTerm).toBeDefined();
        expect(meterTerm?.exponent).toBe(1);
        expect(secondTerm?.exponent).toBe(-1);
      }
    });

    it('should handle simple unit to derived unit conversion error', () => {
      const result = evaluate('1000 m to km/h');
      expect(result.kind).toBe('error');
      // This should error because 1000 m is length dimension, but km/h is speed (length/time)
    });

    it('should reject conversion between incompatible derived dimensions', () => {
      const result = evaluate('100 km/h to kg/s');
      expect(result.kind).toBe('error');
      // km/h is speed (length/time), kg/s is mass/time - different dimensions
    });

    it('should convert power density units', () => {
      const result = evaluate('100 W/m to kW/km');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        // 100 W/m = 100000 W/km = 100 kW/km
        expect(result.value).toBeCloseTo(100, 1);
        const kWTerm = result.terms.find(t => t.unit.id === 'kilowatt');
        const kmTerm = result.terms.find(t => t.unit.id === 'kilometer');
        expect(kWTerm).toBeDefined();
        expect(kmTerm).toBeDefined();
        expect(kWTerm?.exponent).toBe(1);
        expect(kmTerm?.exponent).toBe(-1);
      }
    });

    it('should convert fuel efficiency units', () => {
      const result = evaluate('10 km/L to m/L');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        // 10 km/L = 10000 m/L
        expect(result.value).toBeCloseTo(10000, 0);
        const mTerm = result.terms.find(t => t.unit.id === 'meter');
        const LTerm = result.terms.find(t => t.unit.id === 'liter');
        expect(mTerm).toBeDefined();
        expect(LTerm).toBeDefined();
        expect(mTerm?.exponent).toBe(1);
        expect(LTerm?.exponent).toBe(-1);
      }
    });
  });

  describe('Unit Exponentiation', () => {
    it('should exponentiate simple units with integer power', () => {
      const result = evaluate('(5 m)^2');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        // (5 m)^2 = 25 m²
        expect(result.value).toBeCloseTo(25, 5);
        expect(result.terms).toHaveLength(1);
        expect(result.terms[0].unit.id).toBe('meter');
        expect(result.terms[0].exponent).toBe(2);
      }
    });

    it('should exponentiate derived units with integer power', () => {
      const result = evaluate('(3 m/s)^2');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        // (3 m/s)^2 = 9 m²/s²
        expect(result.value).toBeCloseTo(9, 5);
        expect(result.terms).toHaveLength(2);
        const mTerm = result.terms.find(t => t.unit.id === 'meter');
        const sTerm = result.terms.find(t => t.unit.id === 'second');
        expect(mTerm).toBeDefined();
        expect(sTerm).toBeDefined();
        expect(mTerm?.exponent).toBe(2);
        expect(sTerm?.exponent).toBe(-2);
      }
    });

    it('should handle fractional powers (square root) with Unicode notation', () => {
      // Test that (16 m²)^0.5 = 4 m
      // where m² is parsed as a unit literal (square meter), not an operation
      const result = evaluate('(16 m²)^0.5');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        // (16 m²)^0.5 = 4 m
        expect(result.value).toBeCloseTo(4, 5);
        expect(result.terms).toHaveLength(1);
        expect(result.terms[0].unit.id).toBe('meter');
        expect(result.terms[0].exponent).toBeCloseTo(1, 5);
      }
    });

    it('should handle zero exponent', () => {
      const result = evaluate('(5 m)^0');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        // (5 m)^0 = 1 (dimensionless)
        expect(result.value).toBeCloseTo(1, 5);
        expect(result.terms).toHaveLength(1);
        expect(result.terms[0].unit.id).toBe('meter');
        expect(result.terms[0].exponent).toBe(0);
      }
    });

    it('should handle negative exponent', () => {
      const result = evaluate('(2 m)^-1');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        // (2 m)^-1 = 0.5 m⁻¹
        expect(result.value).toBeCloseTo(0.5, 5);
        expect(result.terms).toHaveLength(1);
        expect(result.terms[0].unit.id).toBe('meter');
        expect(result.terms[0].exponent).toBe(-1);
      }
    });

    it('should exponentiate complex derived units', () => {
      const result = evaluate('(2 kg * m / s^2)^3');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        // (2 kg⋅m/s²)^3 = 8 kg³⋅m³/s⁶
        expect(result.value).toBeCloseTo(8, 5);
        expect(result.terms).toHaveLength(3);
        const kgTerm = result.terms.find(t => t.unit.id === 'kilogram');
        const mTerm = result.terms.find(t => t.unit.id === 'meter');
        const sTerm = result.terms.find(t => t.unit.id === 'second');
        expect(kgTerm).toBeDefined();
        expect(mTerm).toBeDefined();
        expect(sTerm).toBeDefined();
        expect(kgTerm?.exponent).toBe(3);
        expect(mTerm?.exponent).toBe(3);
        expect(sTerm?.exponent).toBe(-6);
      }
    });

    it('should allow conversion of exponentiated units', () => {
      const result = evaluate('(10 m/s)^2 to ft^2/s^2');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        // (10 m/s)^2 = 100 m²/s² ≈ 1076.39 ft²/s²
        expect(result.value).toBeCloseTo(1076.39, 1);
        const ftTerm = result.terms.find(t => t.unit.id === 'foot');
        const sTerm = result.terms.find(t => t.unit.id === 'second');
        expect(ftTerm).toBeDefined();
        expect(sTerm).toBeDefined();
        expect(ftTerm?.exponent).toBe(2);
        expect(sTerm?.exponent).toBe(-2);
      }
    });

    it('should reject non-dimensionless exponent', () => {
      const result = evaluate('(5 m)^(2 s)');
      expect(result.kind).toBe('error');
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
      const input = 'x = 5\nx + 10';
      const lexer = new Lexer(input, dataLoader);
      const { tokens } = lexer.tokenize();
      const parser = new Parser(tokens, dataLoader, input);
      const { ast: document } = parser.parseDocument();
      const results = evaluator.evaluateDocument(document);

      const secondLine = document.lines[1];
      const result = results.get(secondLine) as NumberValue;

      expect(result.kind).toBe('number');
      expect(result.value).toBe(15);
    });

    it('should handle multiple variable assignments', () => {
      const input = 'a = 10\nb = 20\na + b';
      const lexer = new Lexer(input, dataLoader);
      const { tokens } = lexer.tokenize();

      const parser = new Parser(tokens, dataLoader, input);
      const { ast: document } = parser.parseDocument();

      const results = evaluator.evaluateDocument(document);

      const thirdLine = document.lines[2];
      const result = results.get(thirdLine);

      expect(result?.kind).toBe('number');
      if (result?.kind === 'number') {
        expect(result.value).toBe(30);
      }
    });

    it('should handle variables with units', () => {
      const input = 'distance = 5 km\ndistance to m';
      const lexer = new Lexer(input, dataLoader);
      const { tokens } = lexer.tokenize();
      const parser = new Parser(tokens, dataLoader, input);
      const { ast: document } = parser.parseDocument();
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

  describe('Derived Units', () => {
    it('should create derived unit when multiplying different units', () => {
      const result = evaluate('5 m * 3 s');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        expect(result.value).toBe(15);
        expect(result.terms).toHaveLength(2);
        expect(result.terms[0].unit.id).toBe('meter');
        expect(result.terms[0].exponent).toBe(1);
        expect(result.terms[1].unit.id).toBe('second');
        expect(result.terms[1].exponent).toBe(1);
      }
    });

    it('should create m² when multiplying meters by meters', () => {
      const result = evaluate('3 m * 4 m');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        expect(result.value).toBe(12);
        expect(result.terms).toHaveLength(1);
        expect(result.terms[0].unit.id).toBe('meter');
        expect(result.terms[0].exponent).toBe(2);
      }
    });

    it('should create derived unit when dividing different units', () => {
      const result = evaluate('100 km / 2 h');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        expect(result.value).toBe(50);
        expect(result.terms).toHaveLength(2);
        expect(result.terms[0].unit.id).toBe('kilometer');
        expect(result.terms[0].exponent).toBe(1);
        expect(result.terms[1].unit.id).toBe('hour');
        expect(result.terms[1].exponent).toBe(-1);
      }
    });

    it('should simplify to dimensionless when dividing same units', () => {
      const result = evaluate('10 m / 5 m');
      expect(result.kind).toBe('number');
      if (result.kind === 'number') {
        expect(result.value).toBe(2);
        expect(result.unit).toBeUndefined();
      }
    });

    it('should create reciprocal unit when dividing dimensionless by unit', () => {
      const result = evaluate('10 / 2 s');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        expect(result.value).toBe(5);
        expect(result.terms).toHaveLength(1);
        expect(result.terms[0].unit.id).toBe('second');
        expect(result.terms[0].exponent).toBe(-1);
      }
    });

    it('should handle mixed operations creating complex derived units', () => {
      const result = evaluate('10 kg * 5 m / 2 s');
      expect(result.kind).toBe('derivedUnit');
      if (result.kind === 'derivedUnit') {
        expect(result.value).toBe(25);
        // Result should have kg, m, and s with appropriate exponents
        expect(result.terms.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should preserve dimensionless multiplier', () => {
      const result = evaluate('5 m * 3');
      expect(result.kind).toBe('number');
      if (result.kind === 'number') {
        expect(result.value).toBe(15);
        expect(result.unit?.id).toBe('meter');
      }
    });

    it('should preserve unit when dividing by dimensionless', () => {
      const result = evaluate('10 m / 2');
      expect(result.kind).toBe('number');
      if (result.kind === 'number') {
        expect(result.value).toBe(5);
        expect(result.unit?.id).toBe('meter');
      }
    });
  });
});

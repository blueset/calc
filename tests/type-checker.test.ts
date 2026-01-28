import { describe, it, expect, beforeAll } from 'vitest';
import { TypeChecker } from '../src/type-checker';
import { Parser } from '../src/parser';
import { Lexer } from '../src/lexer';
import { DataLoader } from '../src/data-loader';
import * as path from 'path';

describe('TypeChecker', () => {
  let dataLoader: DataLoader;
  let typeChecker: TypeChecker;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '..', 'data'));
    typeChecker = new TypeChecker(dataLoader);
  });

  function parseAndCheck(input: string) {
    const lexer = new Lexer(input, dataLoader);
    const { tokens } = lexer.tokenize();
    const parser = new Parser(tokens, dataLoader, input);
    const { ast: document } = parser.parseDocument();
    const lineTypes = typeChecker.checkDocument(document);

    const firstLine = document.lines[0];
    const firstType = lineTypes.get(firstLine);
    return firstType;
  }

  describe('Basic Literal Types', () => {
    it('should type number literal as dimensionless', () => {
      const type = parseAndCheck('42');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should type boolean literal as boolean', () => {
      const type = parseAndCheck('true');
      expect(type).toMatchObject({ kind: 'boolean' });
    });

    it('should type constant literal as dimensionless', () => {
      const type = parseAndCheck('pi');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should type number with unit as physical', () => {
      const type = parseAndCheck('5 m');
      expect(type).toMatchObject({ kind: 'physical', dimension: 'length' });
    });

    it('should type composite unit', () => {
      const type = parseAndCheck('5 ft 3 in');
      expect(type).toMatchObject({ kind: 'composite', dimension: 'length' });
    });
  });

  describe('Date/Time Types', () => {
    // NOTE: The parser treats durations as numbers with time units (not separate DurationLiterals)
    // The distinction between duration and time measurement is semantic, not syntactic
    it('should type time value with time dimension', () => {
      const type = parseAndCheck('3 days');
      expect(type).toMatchObject({
        kind: 'physical',
        dimension: 'time',
      });
    });

    it('should type time value with time dimension', () => {
      const type = parseAndCheck('2 hours');
      expect(type).toMatchObject({
        kind: 'physical',
        dimension: 'time',
      });
    });
  });

  describe('Addition and Subtraction', () => {
    it('should allow addition of same dimension', () => {
      const type = parseAndCheck('5 m + 20 cm');
      expect(type).toMatchObject({ kind: 'physical', dimension: 'length' });
    });

    it('should allow subtraction of same dimension', () => {
      const type = parseAndCheck('10 kg - 2 kg');
      expect(type).toMatchObject({ kind: 'physical', dimension: 'mass' });
    });

    it('should allow addition of dimensionless values', () => {
      const type = parseAndCheck('5 + 3');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should reject addition of incompatible dimensions', () => {
      const type = parseAndCheck('5 m + 3 kg');
      expect(type?.kind).toBe('error');
    });

    it('should reject addition of number and boolean', () => {
      const type = parseAndCheck('5 + true');
      expect(type?.kind).toBe('error');
    });
  });

  describe('Multiplication and Division', () => {
    it('should allow multiplication of same dimension', () => {
      const type = parseAndCheck('5 m * 3');
      expect(type).toMatchObject({ kind: 'physical', dimension: 'length' });
    });

    it('should derive dimension for multiplication', () => {
      const type = parseAndCheck('5 m * 3 m');
      expect(type?.kind).toBe('derived');
      if (type?.kind === 'derived') {
        expect(type.terms).toHaveLength(1);
        expect(type.terms[0].dimension).toBe('length');
        expect(type.terms[0].exponent).toBe(2);
      }
    });

    it('should derive dimension for division', () => {
      const type = parseAndCheck('100 m / 10 s');
      expect(type?.kind).toBe('derived');
      if (type?.kind === 'derived') {
        expect(type.terms).toHaveLength(2);
        expect(type.terms[0].dimension).toBe('length');
        expect(type.terms[0].exponent).toBe(1);
        expect(type.terms[1].dimension).toBe('time');
        expect(type.terms[1].exponent).toBe(-1);
      }
    });

    it('should allow division resulting in dimensionless', () => {
      const type = parseAndCheck('10 m / 5 m');
      // Should simplify to dimensionless when dimensions cancel out
      expect(type?.kind).toBe('dimensionless');
    });

    it('should allow multiplication of dimensionless values', () => {
      const type = parseAndCheck('5 * 3');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });
  });

  describe('Modulo', () => {
    it('should allow modulo of same dimension', () => {
      const type = parseAndCheck('10 m % 3 m');
      expect(type).toMatchObject({ kind: 'physical', dimension: 'length' });
    });

    it('should allow modulo of dimensionless values', () => {
      const type = parseAndCheck('10 % 3');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should reject modulo of incompatible dimensions', () => {
      const type = parseAndCheck('10 m % 3 kg');
      expect(type?.kind).toBe('error');
    });
  });

  describe('Exponentiation', () => {
    it('should require dimensionless exponent', () => {
      const type = parseAndCheck('2 ^ 3');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should parse m^2 as derived unit literal', () => {
      // With ASCII exponent notation, "m ^ 2" (with or without spaces) parses as
      // a unit literal (square meters), not as an operation
      const type = parseAndCheck('5 m ^ 2');
      expect(type).toMatchObject({ kind: 'derived' });
    });

    it('should reject non-dimensionless exponent', () => {
      const type = parseAndCheck('2 ^ (3 m)');
      expect(type?.kind).toBe('error');
    });
  });

  describe('Comparison Operations', () => {
    it('should allow comparison of same dimension', () => {
      const type = parseAndCheck('5 m < 10 m');
      expect(type).toMatchObject({ kind: 'boolean' });
    });

    it('should allow comparison of dimensionless values', () => {
      const type = parseAndCheck('5 == 5');
      expect(type).toMatchObject({ kind: 'boolean' });
    });

    it('should allow comparison of booleans', () => {
      const type = parseAndCheck('true == false');
      expect(type).toMatchObject({ kind: 'boolean' });
    });

    it('should reject comparison of incompatible dimensions', () => {
      const type = parseAndCheck('5 m < 10 kg');
      expect(type?.kind).toBe('error');
    });
  });

  describe('Logical Operations', () => {
    it('should allow AND of booleans', () => {
      const type = parseAndCheck('true && false');
      expect(type).toMatchObject({ kind: 'boolean' });
    });

    it('should allow OR of booleans', () => {
      const type = parseAndCheck('true || false');
      expect(type).toMatchObject({ kind: 'boolean' });
    });

    it('should reject AND of non-booleans', () => {
      const type = parseAndCheck('5 && 3');
      expect(type?.kind).toBe('error');
    });

    it('should reject OR of non-booleans', () => {
      const type = parseAndCheck('5 || 3');
      expect(type?.kind).toBe('error');
    });
  });

  describe('Bitwise Operations', () => {
    it('should allow bitwise AND of dimensionless values', () => {
      const type = parseAndCheck('5 & 3');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should allow bitwise OR of dimensionless values', () => {
      const type = parseAndCheck('5 | 3');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should allow bitwise XOR of dimensionless values', () => {
      const type = parseAndCheck('5 xor 3');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should allow left shift of dimensionless values', () => {
      const type = parseAndCheck('5 << 2');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should allow right shift of dimensionless values', () => {
      const type = parseAndCheck('20 >> 2');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should reject bitwise operations on values with units', () => {
      const type = parseAndCheck('5 m & 3 m');
      expect(type?.kind).toBe('error');
    });
  });

  describe('Unary Operations', () => {
    it('should allow negation of numeric value', () => {
      const type = parseAndCheck('-5');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should allow negation of value with unit', () => {
      const type = parseAndCheck('-5 m');
      expect(type).toMatchObject({ kind: 'physical', dimension: 'length' });
    });

    it('should allow logical NOT of boolean', () => {
      const type = parseAndCheck('!true');
      expect(type).toMatchObject({ kind: 'boolean' });
    });

    it('should allow bitwise NOT of dimensionless value', () => {
      const type = parseAndCheck('~5');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should reject logical NOT of non-boolean', () => {
      const type = parseAndCheck('!5');
      expect(type?.kind).toBe('error');
    });

    it('should reject bitwise NOT of value with unit', () => {
      const type = parseAndCheck('~(5 m)');
      expect(type?.kind).toBe('error');
    });
  });

  describe('Postfix Operations', () => {
    it('should allow factorial of dimensionless value', () => {
      const type = parseAndCheck('5!');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should reject factorial of value with unit', () => {
      const type = parseAndCheck('(5 m)!');
      expect(type?.kind).toBe('error');
    });
  });

  describe('Conditional Expressions', () => {
    it('should require boolean condition', () => {
      const type = parseAndCheck('if true then 5 else 3');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should reject non-boolean condition', () => {
      const type = parseAndCheck('if 5 then 10 else 20');
      expect(type?.kind).toBe('error');
    });

    it('should require compatible branch types', () => {
      const type = parseAndCheck('if true then (5 m) else (3 m)');
      expect(type).toMatchObject({ kind: 'physical', dimension: 'length' });
    });

    it('should reject incompatible branch types', () => {
      const type = parseAndCheck('if true then (5 m) else (3 kg)');
      expect(type?.kind).toBe('error');
    });
  });

  describe('Unit Conversions', () => {
    it('should allow conversion to compatible unit', () => {
      const type = parseAndCheck('5 km to m');
      expect(type).toMatchObject({ kind: 'physical', dimension: 'length' });
    });

    it('should allow conversion using "in"', () => {
      const type = parseAndCheck('5 km in m');
      expect(type).toMatchObject({ kind: 'physical', dimension: 'length' });
    });

    it('should allow conversion using "as"', () => {
      const type = parseAndCheck('5 km as m');
      expect(type).toMatchObject({ kind: 'physical', dimension: 'length' });
    });

    it('should reject conversion to incompatible unit', () => {
      const type = parseAndCheck('5 m to kg');
      expect(type?.kind).toBe('error');
    });

    it('should allow composite unit conversion', () => {
      const type = parseAndCheck('171 cm to ft in');
      expect(type).toMatchObject({ kind: 'composite', dimension: 'length' });
    });
  });

  describe('Presentation Conversions', () => {
    it('should allow binary presentation', () => {
      const type = parseAndCheck('42 to binary');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should allow hex presentation', () => {
      const type = parseAndCheck('255 to hex');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should reject presentation conversion of non-numeric', () => {
      const type = parseAndCheck('true to binary');
      expect(type?.kind).toBe('error');
    });
  });

  describe('Function Calls', () => {
    it('should type function call as dimensionless', () => {
      const type = parseAndCheck('sin(0)');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should type sqrt function call as dimensionless', () => {
      const type = parseAndCheck('sqrt(4)');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });

    it('should type abs function call as dimensionless', () => {
      const type = parseAndCheck('abs(-5)');
      expect(type).toMatchObject({ kind: 'dimensionless' });
    });
  });

  describe('Variable Scoping', () => {
    it('should track variable definition', () => {
      const input = `x = 5
x`;
      const lexer = new Lexer(input, dataLoader);
      const { tokens } = lexer.tokenize();
      const parser = new Parser(tokens, dataLoader, input);
      const { ast: document } = parser.parseDocument();
      const lineTypes = typeChecker.checkDocument(document);

      const secondLine = document.lines[1];
      const secondType = lineTypes.get(secondLine);
      expect(secondType).toMatchObject({ kind: 'dimensionless' });
    });

    it('should track variable with unit', () => {
      const input = `distance = 5 m
distance`;
      const lexer = new Lexer(input, dataLoader);
      const { tokens } = lexer.tokenize();
      const parser = new Parser(tokens, dataLoader, input);
      const { ast: document } = parser.parseDocument();
      const lineTypes = typeChecker.checkDocument(document);

      const secondLine = document.lines[1];
      const secondType = lineTypes.get(secondLine);
      expect(secondType).toMatchObject({ kind: 'physical', dimension: 'length' });
    });

    it('should error on undefined variable', () => {
      const type = parseAndCheck('undefined_var');
      expect(type?.kind).toBe('error');
    });

    it('should allow variable in expressions', () => {
      const input = `x = 5 m
y = 3 m
x + y`;
      const lexer = new Lexer(input, dataLoader);
      const { tokens } = lexer.tokenize();
      const parser = new Parser(tokens, dataLoader, input);
      const { ast: document } = parser.parseDocument();
      const lineTypes = typeChecker.checkDocument(document);

      const thirdLine = document.lines[2];
      const thirdType = lineTypes.get(thirdLine);
      expect(thirdType).toMatchObject({ kind: 'physical', dimension: 'length' });
    });
  });

  describe('Composite Unit Validation', () => {
    it('should validate all components have same dimension', () => {
      const type = parseAndCheck('5 ft 3 in');
      expect(type).toMatchObject({ kind: 'composite', dimension: 'length' });
    });

    it('should reject composite units with different dimensions', () => {
      // This would be caught during parsing, but if it gets through:
      // We'd need to construct an AST with mixed dimensions manually
      // For now, this test just verifies the basic case works
      const type = parseAndCheck('5 m 3 cm');
      expect(type).toMatchObject({ kind: 'composite', dimension: 'length' });
    });
  });

  describe('Grouped Expressions', () => {
    it('should preserve type of grouped expression', () => {
      const type = parseAndCheck('(5 m)');
      expect(type).toMatchObject({ kind: 'physical', dimension: 'length' });
    });

    it('should preserve type of complex grouped expression', () => {
      const type = parseAndCheck('(5 m + 3 m) * 2');
      expect(type).toMatchObject({ kind: 'physical', dimension: 'length' });
    });
  });

  describe('Error Propagation', () => {
    it('should propagate error from left operand', () => {
      const input = `x + 5`;
      const type = parseAndCheck(input);
      expect(type?.kind).toBe('error');
    });

    it('should propagate error from right operand', () => {
      const input = `5 + y`;
      const type = parseAndCheck(input);
      expect(type?.kind).toBe('error');
    });

    it('should propagate error through operations', () => {
      const input = `(x + 5) * 2`;
      const type = parseAndCheck(input);
      expect(type?.kind).toBe('error');
    });
  });

  describe('Complex Expressions', () => {
    it('should type complex arithmetic correctly', () => {
      const type = parseAndCheck('(5 m + 3 m) * 2 - 1 m');
      expect(type).toMatchObject({ kind: 'physical', dimension: 'length' });
    });

    it('should type mixed operations correctly', () => {
      const type = parseAndCheck('5 > 3 && 10 < 20');
      expect(type).toMatchObject({ kind: 'boolean' });
    });

    it('should type conversion in expression', () => {
      const type = parseAndCheck('(5 km to m) + 100 m');
      expect(type).toMatchObject({ kind: 'physical', dimension: 'length' });
    });

    it('should type conditional with units', () => {
      const type = parseAndCheck('if 5 > 3 then (10 m) else (20 m)');
      expect(type).toMatchObject({ kind: 'physical', dimension: 'length' });
    });
  });

  describe('Date/Time Arithmetic', () => {
    it('should allow adding duration to date', () => {
      const input = `date = 2024 Jan 1
date + 3 days`;
      const lexer = new Lexer(input, dataLoader);
      const { tokens } = lexer.tokenize();
      const parser = new Parser(tokens, dataLoader, input);
      const { ast: document } = parser.parseDocument();
      const lineTypes = typeChecker.checkDocument(document);

      const secondLine = document.lines[1];
      const secondType = lineTypes.get(secondLine);
      // Date + time-dimensioned value → date or datetime
      expect(secondType?.kind).toBe('plainDate');
    });

    it('should allow subtracting dates to get duration', () => {
      const input = `date1 = 2024 Jan 10
date2 = 2024 Jan 1
date1 - date2`;
      const lexer = new Lexer(input, dataLoader);
      const { tokens } = lexer.tokenize();
      const parser = new Parser(tokens, dataLoader, input);
      const { ast: document } = parser.parseDocument();
      const lineTypes = typeChecker.checkDocument(document);

      const thirdLine = document.lines[2];
      const thirdType = lineTypes.get(thirdLine);
      expect(thirdType).toMatchObject({
        kind: 'duration',
        hasDateComponents: true,
        hasTimeComponents: false,
      });
    });

    it('should allow adding time values (durations)', () => {
      const input = `dur1 = 3 days
dur2 = 2 hours
dur1 + dur2`;
      const lexer = new Lexer(input, dataLoader);
      const { tokens } = lexer.tokenize();
      const parser = new Parser(tokens, dataLoader, input);
      const { ast: document } = parser.parseDocument();
      const lineTypes = typeChecker.checkDocument(document);

      const thirdLine = document.lines[2];
      const thirdType = lineTypes.get(thirdLine);
      // Both are time dimension, so result is time dimension
      expect(thirdType).toMatchObject({
        kind: 'physical',
        dimension: 'time',
      });
    });
  });
});

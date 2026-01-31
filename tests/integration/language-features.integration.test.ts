import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../src/calculator';
import { DataLoader } from '../../src/data-loader';
import * as path from 'path';

/**
 * Integration tests for language features
 * Tests variables, conditionals, multi-line calculations, edge cases, and comments
 */
describe('Integration Tests - Language Features', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '../..', 'data'));

    calculator = new Calculator(dataLoader);
  });

  describe('Variables', () => {
    it('should assign and use variables', () => {
      const input = `x = 10
y = 20
x + y`;
      const result = calculator.calculate(input);
      expect(result.results[0].result).toBe('10');
      expect(result.results[1].result).toBe('20');
      expect(result.results[2].result).toBe('30');
    });

    it('should assign variables with units', () => {
      const input = `distance = 100 km
time = 2 h
distance / time`;
      const result = calculator.calculate(input);
      expect(result.results[0].result).toContain('100');
      expect(result.results[0].result).toContain('km');
      expect(result.results[1].result).toContain('2');
      expect(result.results[1].result).toContain('h');
      expect(result.results[2].result).toContain('50');
      expect(result.results[2].result).toContain('km');
      expect(result.results[2].result).toContain('h');
    });
  });

  describe('Conditional Expressions', () => {
    it('should handle simple conditional', () => {
      const result = calculator.calculate('if 5 > 3 then 10 m else 20 m');
      expect(result.results[0].result).toBe('10 m');
    });

    it('should handle conditional with false condition', () => {
      const result = calculator.calculate('if 2 > 5 then 100 else 200');
      expect(result.results[0].result).toBe('200');
    });

    it('should handle nested conditionals', () => {
      const result = calculator.calculate('100 * (if 5 > 3 then (if 2 < 1 then 10 else 20) else 30) + 1');
      expect(result.results[0].result).toBe('2 001');
    });

    it('should handle conditional with variables', () => {
      const input = `x = 10
result = if x > 5 then 100 else 50`;
      const result = calculator.calculate(input);
      expect(result.results[1].result).toBe('100');
    });
  });

  describe('Complex Multi-Line Calculations', () => {
    it('should handle mixed calculations', () => {
      // TODO: result.results.length should be 7, currently 6.
      const input = `# Distance calculation
speed = 60 km/h
time = 2.5 h
distance = speed * time

# Conversion
distance to m`;
      const result = calculator.calculate(input);

      // Line 1: heading
      expect(result.results[0].type).toBe('Heading');

      // Line 2: speed = 60 km/h
      expect(result.results[1].result).toContain('60');
      expect(result.results[1].result).toContain('km');
      expect(result.results[1].result).toContain('h');

      // Line 7: distance to m
      expect(result.results[6].result).toContain('150');
      expect(result.results[6].result).toContain('m');
    });

    it('should handle errors without stopping', () => {
      const input = `5 + 3
5 m + 10 s
10 * 2`;
      const result = calculator.calculate(input);

      expect(result.results[0].result).toBe('8');
      expect(result.results[0].hasError).toBe(false);

      expect(result.results[1].hasError).toBe(true);
      expect(result.results[1].result).toContain('Error');

      expect(result.results[2].result).toBe('20');
      expect(result.results[2].hasError).toBe(false);

      expect(result.errors.runtime.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const result = calculator.calculate('');
      expect(result.results.length).toBe(0);
      expect(result.errors.lexer.length).toBe(0);
      expect(result.errors.runtime.length).toBe(0);
    });

    it('should handle whitespace-only input', () => {
      const result = calculator.calculate('   \n  \n   ');
      expect(result.errors.lexer.length).toBe(0);
      expect(result.errors.runtime.length).toBe(0);
    });

    it('should handle division by zero as error', () => {
      const result = calculator.calculate('10 / 0');
      expect(result.results[0].hasError).toBe(true);
    });

    it('should handle very large numbers', () => {
      const result = calculator.calculate('1e100');
      expect(result.results[0].result).toContain('1e');
    });

    it('should handle very small numbers', () => {
      const result = calculator.calculate('1e-100');
      expect(result.results[0].result).toContain('1e');
    });
  });

  describe('Comments and Plain Text', () => {
    it('should handle inline comments', () => {
      const result = calculator.calculate('5 + 5 # this is a comment');
      expect(result.results[0].result).toBe('10');
    });

    it('should handle headings', () => {
      const result = calculator.calculate('# Heading');
      expect(result.results[0].type).toBe('Heading');
      expect(result.results[0].result).toBe(null);
    });

    it('should fail on invalid expressions gracefully', () => {
      // TODO: result.results.length should be 3, currently 5.
      const input = `This is just text
5 + 5
More text here`;
      const result = calculator.calculate(input);

      // Second line should calculate
      expect(result.results[1].result).toBe('10');
      expect(result.results[1].hasError).toBe(false);
    });

    it('should generate results for multiple consecutive empty lines', () => {
      const input = `5 + 5


10 * 2`;
      const result = calculator.calculate(input);

      // Should have 4 results: expression, empty, empty, expression
      expect(result.results.length).toBe(4);
      expect(result.results[0].result).toBe('10');
      expect(result.results[1].type).toBe('EmptyLine');
      expect(result.results[1].result).toBe(null);
      expect(result.results[2].type).toBe('EmptyLine');
      expect(result.results[2].result).toBe(null);
      expect(result.results[3].result).toBe('20');
    });

    it('should handle empty lines at document boundaries', () => {
      const input = "\n\n5 + 5\n\n";
      const result = calculator.calculate(input);

      // Should have 4 results: empty, empty, expression, empty
      // (The template string creates 2 leading newlines)
      expect(result.results.length).toBe(4);
      expect(result.results[0].type).toBe('EmptyLine');
      expect(result.results[1].type).toBe('EmptyLine');
      expect(result.results[2].result).toBe('10');
      expect(result.results[3].type).toBe('EmptyLine');
    });

    it('should parse single word as valid identifier expression', () => {
      const input = `x = 5
x
y`;
      const result = calculator.calculate(input);

      // Should have 3 results
      expect(result.results.length).toBe(3);
      expect(result.results[0].result).toBe('5'); // x = 5
      expect(result.results[1].result).toBe('5'); // x (variable reference)
      expect(result.results[2].hasError).toBe(true); // y (undefined variable)
      expect(result.results[2].result).toContain('Undefined variable');
    });

    it('should treat multi-word plain text as single line', () => {
      const input = `Hello world this is text
5 + 5
Another plain text line`;
      const result = calculator.calculate(input);

      // Should have exactly 3 results (not split into multiple)
      expect(result.results.length).toBe(3);
      expect(result.results[0].type).toBe('PlainText');
      expect(result.results[0].hasError).toBe(true); // Parser error recorded
      expect(result.results[1].result).toBe('10'); // Second line: 5 + 5
      expect(result.results[2].type).toBe('PlainText');
      expect(result.results[2].hasError).toBe(true);
    });

    it('should still correctly parse multi-token expressions', () => {
      const input = `(5 + 3) * 2
100 km / 2 h
x = 10 + 20`;
      const result = calculator.calculate(input);

      expect(result.results.length).toBe(3);
      expect(result.results[0].result).toBe('16');
      expect(result.results[1].result).toContain('50');
      expect(result.results[2].result).toBe('30');
      expect(result.results[0].hasError).toBe(false);
      expect(result.results[1].hasError).toBe(false);
      expect(result.results[2].hasError).toBe(false);
    });
  });
});

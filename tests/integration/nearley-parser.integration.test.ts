/**
 * Integration test comparing Nearley parser with old parser
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Calculator } from '../../src/calculator';
import { DataLoader } from '../../src/data-loader';

describe('Nearley Parser Integration', () => {
  let dataLoader: DataLoader;
  let oldCalculator: Calculator;
  let nearleyCalculator: Calculator;

  beforeAll(() => {
    dataLoader = new DataLoader();
    dataLoader.load();
  });

  beforeEach(() => {
    oldCalculator = new Calculator(dataLoader, {}, false);
    nearleyCalculator = new Calculator(dataLoader, {}, true);
  });

  describe('basic arithmetic', () => {
    it('should parse simple addition', () => {
      const input = '5 + 5';
      const oldResult = oldCalculator.calculate(input);
      const nearleyResult = nearleyCalculator.calculate(input);

      expect(nearleyResult.results[0].result).toBe('10');
      expect(nearleyResult.results[0].hasError).toBe(false);
      expect(nearleyResult.results[0].result).toBe(oldResult.results[0].result);
    });

    it('should parse multiplication', () => {
      const input = '10 * 20';
      const oldResult = oldCalculator.calculate(input);
      const nearleyResult = nearleyCalculator.calculate(input);

      expect(nearleyResult.results[0].result).toBe('200');
      expect(nearleyResult.results[0].hasError).toBe(false);
      expect(nearleyResult.results[0].result).toBe(oldResult.results[0].result);
    });

    it('should parse division', () => {
      const input = '100 / 4';
      const oldResult = oldCalculator.calculate(input);
      const nearleyResult = nearleyCalculator.calculate(input);

      expect(nearleyResult.results[0].result).toBe('25');
      expect(nearleyResult.results[0].hasError).toBe(false);
      expect(nearleyResult.results[0].result).toBe(oldResult.results[0].result);
    });
  });

  describe('variables', () => {
    it('should handle variable assignment', () => {
      const input = 'x = 10';
      const oldResult = oldCalculator.calculate(input);
      const nearleyResult = nearleyCalculator.calculate(input);

      expect(nearleyResult.results[0].type).toBe('VariableDefinition');
      expect(nearleyResult.results[0].result).toBe('10');
      expect(nearleyResult.results[0].hasError).toBe(false);
      expect(nearleyResult.results[0].result).toBe(oldResult.results[0].result);
    });

    it('should handle variable reference', () => {
      const input = `x = 10
y = x + 5`;
      const oldResult = oldCalculator.calculate(input);
      const nearleyResult = nearleyCalculator.calculate(input);

      expect(nearleyResult.results[0].result).toBe('10');
      expect(nearleyResult.results[1].result).toBe('15');
      expect(nearleyResult.results[0].hasError).toBe(false);
      expect(nearleyResult.results[1].hasError).toBe(false);
    });
  });

  describe('comments and headings', () => {
    it('should handle headings', () => {
      const input = '# Title';
      const oldResult = oldCalculator.calculate(input);
      const nearleyResult = nearleyCalculator.calculate(input);

      expect(nearleyResult.results[0].type).toBe('Heading');
      expect(nearleyResult.results[0].result).toBe(null);
      expect(nearleyResult.results[0].result).toBe(oldResult.results[0].result);
    });

    it('should strip inline comments', () => {
      const input = '5 + 5 # this is a comment';
      const oldResult = oldCalculator.calculate(input);
      const nearleyResult = nearleyCalculator.calculate(input);

      expect(nearleyResult.results[0].result).toBe('10');
      expect(nearleyResult.results[0].hasError).toBe(false);
      expect(nearleyResult.results[0].result).toBe(oldResult.results[0].result);
    });
  });

  describe('units', () => {
    it('should parse number with unit', () => {
      const input = '5 km';
      const oldResult = oldCalculator.calculate(input);
      const nearleyResult = nearleyCalculator.calculate(input);

      expect(nearleyResult.results[0].result).toBe('5 km');
      expect(nearleyResult.results[0].hasError).toBe(false);
      expect(nearleyResult.results[0].result).toBe(oldResult.results[0].result);
    });

    it('should handle unit conversion', () => {
      const input = '5 km to m';
      const oldResult = oldCalculator.calculate(input);
      const nearleyResult = nearleyCalculator.calculate(input);

      // Both parsers should produce the same result
      expect(nearleyResult.results[0].hasError).toBe(false);
      expect(nearleyResult.results[0].result).toBe(oldResult.results[0].result);
      // Value should be 5000 m (formatting may vary based on settings)
      expect(nearleyResult.results[0].result).toMatch(/5\s?000 m/);
    });

    it('should handle cross-unit arithmetic', () => {
      const input = '5 m + 20 cm';
      const oldResult = oldCalculator.calculate(input);
      const nearleyResult = nearleyCalculator.calculate(input);

      expect(nearleyResult.results[0].result).toBe('5.2 m');
      expect(nearleyResult.results[0].hasError).toBe(false);
      expect(nearleyResult.results[0].result).toBe(oldResult.results[0].result);
    });
  });

  describe('error handling', () => {
    it('should handle invalid syntax as plain text', () => {
      const input = 'this is not valid @ $ %%';
      const nearleyResult = nearleyCalculator.calculate(input);

      expect(nearleyResult.results[0].type).toBe('PlainText');
      expect(nearleyResult.results[0].result).toBeTruthy();
      expect(nearleyResult.results[0].hasError).toBe(true);
    });

    it('should continue after error', () => {
      const input = `5 + 5
invalid @ syntax
10 * 20`;
      const oldResult = oldCalculator.calculate(input);
      const nearleyResult = nearleyCalculator.calculate(input);

      expect(nearleyResult.results[0].result).toBe('10');
      expect(nearleyResult.results[1].type).toBe('PlainText');
      expect(nearleyResult.results[2].result).toBe('200');
    });
  });

  describe('multi-line documents', () => {
    it('should handle complete document', () => {
      const input = `# Calculations
x = 10
y = 20

x + y`;

      const oldResult = oldCalculator.calculate(input);
      const nearleyResult = nearleyCalculator.calculate(input);

      expect(nearleyResult.results).toHaveLength(5);
      expect(nearleyResult.results[0].type).toBe('Heading');
      expect(nearleyResult.results[1].result).toBe('10');
      expect(nearleyResult.results[2].result).toBe('20');
      expect(nearleyResult.results[3].type).toBe('EmptyLine');
      expect(nearleyResult.results[4].result).toBe('30');

      // Compare with old parser
      for (let i = 0; i < nearleyResult.results.length; i++) {
        expect(nearleyResult.results[i].type).toBe(oldResult.results[i].type);
        expect(nearleyResult.results[i].result).toBe(oldResult.results[i].result);
      }
    });
  });
});

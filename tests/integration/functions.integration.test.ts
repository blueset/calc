import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../src/calculator';
import { DataLoader } from '../../src/data-loader';
import * as path from 'path';

/**
 * Integration tests for mathematical functions
 * Tests the full pipeline: Lexer → Parser → Evaluator → Formatter
 */
describe('Integration Tests - Functions', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '../..', 'data'));

    calculator = new Calculator(dataLoader);
  });

  describe('Trigonometric Functions', () => {
    it('should handle sin function', () => {
      const result = calculator.calculate('sin(30 deg)');
      expect(result.results[0].result).toContain('0.5');
    });

    it('should handle cos function', () => {
      const result = calculator.calculate('cos(60 deg)');
      expect(result.results[0].result).toContain('0.5');
    });

    it('should handle tan function', () => {
      const result = calculator.calculate('tan(45 deg)');
      expect(result.results[0].result).toContain('1');
    });

    it('should handle inverse trig functions', () => {
      const result = calculator.calculate('asin(0.5)');
      expect(result.results[0].result).toContain('30 °');
    });
  });

  describe('Logarithmic and Exponential Functions', () => {
    it('should handle sqrt', () => {
      const result = calculator.calculate('sqrt(16)');
      expect(result.results[0].result).toBe('4');
    });

    it('should handle cbrt', () => {
      const result = calculator.calculate('cbrt(27)');
      expect(result.results[0].result).toBe('3');
    });

    it('should handle log as ln', () => {
      const result = calculator.calculate('log(100)');
      expect(result.results[0].result).toBe('4.605170186');
    });

    it('should handle ln', () => {
      const result = calculator.calculate('ln(e^3)');
      expect(result.results[0].result).toBe('3');
    });

    it('should handle exp', () => {
      const result = calculator.calculate('exp(2)');
      expect(result.results[0].result).toContain('7.389');
    });

    it('should handle log10', () => {
      const result = calculator.calculate('log10(1000)');
      expect(result.results[0].result).toBe('3');
    });

    it('should handle log with base', () => {
      const result = calculator.calculate('log(2, 32)');
      expect(result.results[0].result).toBe('5');
    });
  });

  describe('Number Manipulation Functions', () => {
    it('should handle abs', () => {
      const result = calculator.calculate('abs(-5)');
      expect(result.results[0].result).toBe('5');
    });

    it('should handle round', () => {
      const result = calculator.calculate('round(3.6)');
      expect(result.results[0].result).toBe('4');
    });

    it('should handle round with units', () => {
      const result = calculator.calculate('round(18.9 kg)');
      expect(result.results[0].result).toContain('19');
      expect(result.results[0].result).toContain('kg');
    });

    it('should handle floor', () => {
      const result = calculator.calculate('floor(3.6)');
      expect(result.results[0].result).toBe('3');
    });

    it('should handle ceil', () => {
      const result = calculator.calculate('ceil(3.2)');
      expect(result.results[0].result).toBe('4');
    });

    it('should handle trunc', () => {
      const result = calculator.calculate('trunc(-4.7)');
      expect(result.results[0].result).toBe('-4');
    });

    it('should handle frac', () => {
      const result = calculator.calculate('frac(5.75)');
      expect(result.results[0].result).toBe('0.75');
    });
  });

  describe('Permutation and Combination', () => {
    it('should handle perm', () => {
      const result = calculator.calculate('perm(5, 2)');
      expect(result.results[0].result).toBe('20');
    });

    it('should handle comb', () => {
      const result = calculator.calculate('comb(5, 2)');
      expect(result.results[0].result).toBe('10');
    });
  });
});

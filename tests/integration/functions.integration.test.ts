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
    dataLoader.load();

    calculator = new Calculator(dataLoader);
  });

  describe('Trigonometric Functions', () => {
    it('should handle sin function', () => {
      const result = calculator.calculate('sin(30 deg)');
      expect(result.results[0].result).toBe('0.5');
    });

    it('should handle cos function', () => {
      const result = calculator.calculate('cos(60 deg)');
      expect(result.results[0].result).toBe('0.5');
    });

    it('should handle tan function', () => {
      const result = calculator.calculate('tan(45 deg)');
      expect(result.results[0].result).toBe('1');
    });

    it('should handle inverse trig functions', () => {
      const result = calculator.calculate('asin(0.5)');
      expect(result.results[0].result).toBe('30°');
    });

    it('should handle sin at boundary values', () => {
      const result = calculator.calculate(`sin(0 deg)
sin(90 deg)
sin(180 deg)`);
      expect(result.results[0].result).toBe('0');
      expect(result.results[1].result).toBe('1');
      expect(result.results[2].result).toMatch(/0|\d\.\d*e-1\d/); // ~0 or scientific notation near 0
    });

    it('should handle cos at boundary values', () => {
      const result = calculator.calculate(`cos(0 deg)
cos(90 deg)
cos(180 deg)`);
      expect(result.results[0].result).toBe('1');
      expect(result.results[1].result).toMatch(/0|\d\.\d*e-1\d/); // ~0 or scientific notation near 0
      expect(result.results[2].result).toBe('-1');
    });

    it('should handle tan at boundary values', () => {
      const result = calculator.calculate(`tan(0 deg)
tan(45 deg)`);
      expect(result.results[0].result).toMatch(/^0(\.0+)?$/);
      expect(result.results[1].result).toMatch(/^1(\.0+)?$/);
    });

    it('should handle tan(90 deg) as error or infinity', () => {
      const result = calculator.calculate('tan(90 deg)');
      expect(result.results[0].result).toMatch(/\d\.\d*e\+1\d+|Infinity/); // very large number or Infinity
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

    it('should handle log of 1 equals 0', () => {
      const result = calculator.calculate(`log(1)
log10(1)
ln(1)`);
      expect(result.results[0].result).toBe('0');
      expect(result.results[1].result).toBe('0');
      expect(result.results[2].result).toBe('0');
    });

    it('should handle log of 0 as error', () => {
      const result = calculator.calculate('log(0)');
      expect(result.results[0].hasError).toBe(true);
    });

    it('should handle log of negative as error', () => {
      const result = calculator.calculate('log(-5)');
      expect(result.results[0].hasError).toBe(true);
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
      expect(result.results[0].result).toBe('19 kg');
    });

    it('should handle round with nearest parameter', () => {
      const result = calculator.calculate(`round(12, 5)
round(17, 5)
round(13, 5)
round(3.6, 2)`);
      expect(result.results[0].result).toBe('10');
      expect(result.results[1].result).toBe('15');
      expect(result.results[2].result).toBe('15');
      expect(result.results[3].result).toBe('4');
    });

    it('should handle round with nearest parameter and units', () => {
      const result = calculator.calculate(`round(6200 m, 5 km)
round(7800 m, 5 km)
round(18.7 kg, 5 kg)`);
      expect(result.results[0].result).toBe('5 km');
      expect(result.results[1].result).toBe('10 km');
      expect(result.results[2].result).toBe('20 kg');
    });

    it('should handle floor', () => {
      const result = calculator.calculate('floor(3.6)');
      expect(result.results[0].result).toBe('3');
    });

    it('should handle floor with nearest parameter', () => {
      const result = calculator.calculate(`floor(3.6, 2)
floor(7.8, 2)
floor(3.2, 0.5)`);
      expect(result.results[0].result).toBe('2');
      expect(result.results[1].result).toBe('6');
      expect(result.results[2].result).toBe('3');
    });

    it('should handle ceil', () => {
      const result = calculator.calculate('ceil(3.2)');
      expect(result.results[0].result).toBe('4');
    });

    it('should handle ceil with nearest parameter', () => {
      const result = calculator.calculate(`ceil(3.2, 0.5)
ceil(3.6, 2)
ceil(7.1, 2)`);
      expect(result.results[0].result).toBe('3.5');
      expect(result.results[1].result).toBe('4');
      expect(result.results[2].result).toBe('8');
    });

    it('should handle trunc', () => {
      const result = calculator.calculate('trunc(-4.7)');
      expect(result.results[0].result).toBe('-4');
    });

    it('should handle trunc with nearest parameter', () => {
      const result = calculator.calculate(`trunc(-4.7, 0.1)
trunc(3.678, 0.01)
trunc(17.3, 5)`);
      expect(result.results[0].result).toBe('-4.7');
      expect(result.results[1].result).toBe('3.67');
      expect(result.results[2].result).toBe('15');
    });

    it('should handle floor with units and nearest parameter', () => {
      const result = calculator.calculate(`floor(6200 m, 5 km)
floor(7800 m, 5 km)`);
      expect(result.results[0].result).toBe('5 km');
      expect(result.results[1].result).toBe('5 km');
    });

    it('should handle ceil with units and nearest parameter', () => {
      const result = calculator.calculate(`ceil(4100 m, 5 km)
ceil(6200 m, 5 km)`);
      expect(result.results[0].result).toBe('5 km');
      expect(result.results[1].result).toBe('10 km');
    });

    it('should handle trunc with units and nearest parameter', () => {
      const result = calculator.calculate('trunc(6200 m, 5 km)');
      expect(result.results[0].result).toBe('5 km');
    });

    it('should handle frac', () => {
      const result = calculator.calculate('frac(5.75)');
      expect(result.results[0].result).toBe('0.75');
    });

    it('should handle sign', () => {
      const result = calculator.calculate(`sign(5)
sign(-5)
sign(0)`);
      expect(result.results[0].result).toBe('1');
      expect(result.results[1].result).toBe('-1');
      expect(result.results[2].result).toBe('0');
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

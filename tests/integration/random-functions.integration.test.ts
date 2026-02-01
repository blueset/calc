import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../src/calculator';
import { DataLoader } from '../../src/data-loader';
import * as path from 'path';

/**
 * Integration tests for random number generation functions
 * Tests random(), random(max), random(min, max), random(min, max, step)
 * Spec lines: 977-982
 */
describe('Integration Tests - Random Number Generation', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '../..', 'data'));

    calculator = new Calculator(dataLoader);
  });

  describe('Basic Random Function', () => {
    it('should generate random float in [0, 1) with random()', () => {
      // Test multiple times to ensure randomness
      for (let i = 0; i < 10; i++) {
        const result = calculator.calculate('random()');
        expect(result.results[0].hasError).toBe(false);
        const value = parseFloat(result.results[0].result ?? "NaN");
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should generate different values on each call', () => {
      const results: number[] = [];
      for (let i = 0; i < 5; i++) {
        const result = calculator.calculate('random()');
        results.push(parseFloat(result.results[0].result ?? "123456"));
      }
      // Check that not all values are the same (extremely unlikely with proper random)
      const allSame = results.every(v => v === results[0]);
      expect(allSame).toBe(false);
    });
  });

  describe('Random with Maximum', () => {
    it('should generate random integer in [0, max) with random(max)', () => {
      for (let i = 0; i < 10; i++) {
        const result = calculator.calculate('random(10)');
        expect(result.results[0].hasError).toBe(false);
        const value = parseFloat(result.results[0].result ?? "123456");
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(10);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('should handle different maximum values', () => {
      const testCases = [
        { max: 5, expectedMin: 0, expectedMax: 5 },
        { max: 100, expectedMin: 0, expectedMax: 100 },
        { max: 2, expectedMin: 0, expectedMax: 2 },
      ];

      for (const testCase of testCases) {
        const result = calculator.calculate(`random(${testCase.max})`);
        expect(result.results[0].hasError).toBe(false);
        const value = parseFloat(result.results[0].result ?? "123456");
        expect(value).toBeGreaterThanOrEqual(testCase.expectedMin);
        expect(value).toBeLessThan(testCase.expectedMax);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('should handle random(1) returning only 0', () => {
      const result = calculator.calculate('random(1)');
      expect(result.results[0].hasError).toBe(false);
      expect(result.results[0].result).toBe('0');
    });
  });

  describe('Random with Minimum and Maximum', () => {
    it('should generate random integer in [min, max) with random(min, max)', () => {
      for (let i = 0; i < 10; i++) {
        const result = calculator.calculate('random(5, 10)');
        expect(result.results[0].hasError).toBe(false);
        const value = parseFloat(result.results[0].result ?? "123456");
        expect(value).toBeGreaterThanOrEqual(5);
        expect(value).toBeLessThan(10);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('should handle different ranges', () => {
      const testCases = [
        { min: 0, max: 10 },
        { min: -5, max: 5 },
        { min: 100, max: 200 },
        { min: -100, max: -50 },
      ];

      for (const testCase of testCases) {
        const result = calculator.calculate(`random(${testCase.min}, ${testCase.max})`);
        expect(result.results[0].hasError).toBe(false);
        const value = parseFloat(result.results[0].result ?? "123456");
        expect(value).toBeGreaterThanOrEqual(testCase.min);
        expect(value).toBeLessThan(testCase.max);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('should handle single-value range', () => {
      const result = calculator.calculate('random(5, 6)');
      expect(result.results[0].hasError).toBe(false);
      expect(result.results[0].result).toBe('5');
    });
  });

  describe('Random with Step', () => {
    it('should generate random with step in [min, max) with random(min, max, step)', () => {
      // random(5, 10, 2) should return 5, 7, or 9
      const possibleValues = [5, 7, 9];
      const results = new Set<number>();

      for (let i = 0; i < 20; i++) {
        const result = calculator.calculate('random(5, 10, 2)');
        expect(result.results[0].hasError).toBe(false);
        const value = parseFloat(result.results[0].result ?? "123456");
        expect(possibleValues).toContain(value);
        results.add(value);
      }

      // After 20 iterations, we should have seen at least 2 different values
      expect(results.size).toBeGreaterThanOrEqual(2);
    });

    it('should handle different step values', () => {
      const testCases = [
        { min: 0, max: 10, step: 1, possible: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
        { min: 0, max: 10, step: 5, possible: [0, 5] },
        { min: 0, max: 20, step: 3, possible: [0, 3, 6, 9, 12, 15, 18] },
      ];

      for (const testCase of testCases) {
        const result = calculator.calculate(`random(${testCase.min}, ${testCase.max}, ${testCase.step})`);
        expect(result.results[0].hasError).toBe(false);
        const value = parseFloat(result.results[0].result ?? "123456");
        expect(testCase.possible).toContain(value);
      }
    });

    it('should handle decimal steps', () => {
      for (let i = 0; i < 10; i++) {
        const result = calculator.calculate('random(0, 1, 0.1)');
        expect(result.results[0].hasError).toBe(false);
        const value = parseFloat(result.results[0].result ?? "123456");
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
        // Check that value is a multiple of 0.1
        const remainder = Math.abs((value * 10) % 1);
        expect(remainder).toBeLessThan(0.0001);
      }
    });

    it('should handle negative step values', () => {
      const result = calculator.calculate('random(10, 5, -2)');
      // This should work like random(5, 10, 2) but in reverse
      // At minimum it shouldn't crash
      expect(result.results[0].hasError).toBe(false);
      expect(parseFloat(result.results[0].result ?? "123456")).toBeGreaterThanOrEqual(5);
      expect(parseFloat(result.results[0].result ?? "123456")).toBeLessThan(10);
    });
  });

  describe('Random in Expressions', () => {
    it('should work in arithmetic expressions', () => {
      const result = calculator.calculate('random(10) + 5');
      expect(result.results[0].hasError).toBe(false);
      const value = parseFloat(result.results[0].result ?? "123456");
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThan(15);
    });

    it('should work with variables', () => {
      const result = calculator.calculate(`min = 5
max = 10
random(min, max)`);
      expect(result.results[2].hasError).toBe(false);
      const value = parseFloat(result.results[2].result ?? "123456");
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThan(10);
    });

    it('should generate new values on each evaluation', () => {
      const result = calculator.calculate(`random(100)
random(100)
random(100)`);
      const values = result.results.map(r => parseFloat(r.result ?? "123456"));
      // Very unlikely all three are the same
      const allSame = values.every(v => v === values[0]);
      expect(allSame).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle random(0)', () => {
      const result = calculator.calculate('random(0)');
      // Should return 0 or error - depends on implementation
      expect(result.results[0]).toBeDefined();
    });

    it('should handle negative maximum', () => {
      const result = calculator.calculate('random(-10)');
      // Behavior depends on implementation
      expect(result.results[0]).toBeDefined();
    });

    it('should handle inverted range (max < min)', () => {
      const result = calculator.calculate('random(10, 5)');
      // Should error or handle gracefully
      expect(result.results[0]).toBeDefined();
    });

    it('should handle very large ranges', () => {
      const result = calculator.calculate('random(1000000)');
      expect(result.results[0].hasError).toBe(false);
      const value = parseFloat(result.results[0].result ?? "123456");
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1000000);
    });

    it('should handle step larger than range', () => {
      const result = calculator.calculate('random(0, 5, 10)');
      // Should return 0 (only value in range with that step)
      expect(result.results[0].hasError).toBe(false);
      expect(result.results[0].result).toBe('0');
    });
  });
});

/**
 * Phase 3: Evaluator Enhancements Tests
 *
 * Tests for:
 * 1. Case-sensitive unit resolution
 * 2. Conversion target distinction (composite vs derived units)
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Calculator } from '../../../src/calculator/calculator';
import { DataLoader } from '../../../src/calculator/data-loader';

describe('Phase 3: Evaluator Enhancements', () => {
  let dataLoader: DataLoader;
  let nearleyCalculator: Calculator;

  beforeAll(() => {
    dataLoader = new DataLoader();
    dataLoader.load();
  });

  beforeEach(() => {
    nearleyCalculator = new Calculator(dataLoader, {}); // Nearley parser
  });

  describe('Task 6: Case-Sensitive Unit Resolution', () => {
    it('should distinguish between pg (picogram) and Pg (petagram)', () => {
      // Test with Nearley parser (the migration target)
      expect(nearleyCalculator.calculate('1 pg').results[0].result).toBe('1 pg');
      expect(nearleyCalculator.calculate('1 Pg').results[0].result).toBe('1 Pg');
      expect(nearleyCalculator.calculate('1 PG').results[0].result).toBe('1 Pg');
      expect(nearleyCalculator.calculate('1 pG').results[0].result).toBe('1 pg');
      expect(nearleyCalculator.calculate('1 pg to g').results[0].result).toBe('1e-12 g');
      expect(nearleyCalculator.calculate('1 Pg to g').results[0].result).toBe('1e+15 g');
      expect(nearleyCalculator.calculate('1 PG to g').results[0].result).toBe('1e+15 g');
      expect(nearleyCalculator.calculate('1 pG to g').results[0].result).toBe('1e-12 g');
    });

    it('should handle case-sensitive unit names correctly', () => {
      // Test various case-sensitive units
      const testCases = [
        { input: '1 m', expected: "1 m" },
        { input: '1 M', expected: "1 m" },
        { input: '1 kg', expected: "1 kg" },
        { input: '1 Kg', expected: "1 kg" },
      ];

      for (const { input, expected } of testCases) {
        const result = nearleyCalculator.calculate(input);
        expect(result.results[0].result).toBe(expected);
      }
    });

    it('should test with Nearley parser', () => {
      // Verify Nearley parser also handles case-sensitive units
      const pgResult = nearleyCalculator.calculate('1 pg');
      const PgResult = nearleyCalculator.calculate('1 Pg');

      // Both parsers should handle case sensitivity
      expect(pgResult.results[0].result).not.toBe(PgResult.results[0].result);
    });
  });

  describe('Task 7: Conversion Target Distinction', () => {
    describe('Composite Value Conversion (same dimension)', () => {
      it('should convert length to composite length units', () => {
        // 10 m to ft in → should be composite: X ft Y in
        const result = nearleyCalculator.calculate('10 m to ft in');

        // Should result in composite value like "32 ft 9.7 in"
        expect(result.results[0].hasError).toBe(false);
        // Check if it contains both ft and in
        expect(result.results[0].result).toMatch(/32 ft 9.70\d* in/);
      });

      it('should split value from largest to smallest unit', () => {
        // 171 cm to ft in → 5 ft 7.32 in
        const result = nearleyCalculator.calculate('171 cm to ft in');;

        expect(result.results[0].hasError).toBe(false);
        expect(result.results[0].result).toMatch(/5 ft 7.32\d* in/);
      });

      it('should handle small values in composite', () => {
        // 1 cm to ft in → 0 ft 0.39 in
        const result = nearleyCalculator.calculate('1 cm to ft in');

        expect(result.results[0].hasError).toBe(false);
        expect(result.results[0].result).toMatch(/0 ft 0.3937\d* in/);
      });
    });

    describe('Derived Unit Conversion (different dimension)', () => {
      it('should convert area to derived length×length unit', () => {
        // 10 acre to ft in
        // acre = area dimension (length²)
        // ft in = derived unit (length × length = area)
        // result in area expressed as ft×in
        const result = nearleyCalculator.calculate('10 acre to ft in');

        expect(result.results[0].result).toBe('5 227 200 ft in');
      });

      it('should handle velocity to derived time×distance', () => {
        // 60 km/h to m s
        // km/h = length/time
        // m s = length×time (different dimension!)
        // Should probably error or convert appropriately
        const result = nearleyCalculator.calculate('60 km/h to m s');
        expect(result.results[0].hasError).toBe(true);
      });
    });

    describe('Dimension Checking', () => {
      it('should detect when source and target have same base dimension', () => {
        // Both are length → composite value
        const result1 = nearleyCalculator.calculate('5 m to ft in');
        expect(result1.results[0].result).toMatch(/16 ft 4.85\d* in/);
      });

      it('should detect when target is product of source dimension', () => {
        // Source: area (length²)
        // Target: ft × in (length × length = area)
        const result2 = nearleyCalculator.calculate('1 m² to ft in');
        // Need to determine if this should work or error
        expect(result2.results[0].result).toMatch(/129.16\d* ft in/);
      });

      it('should error when dimensions are incompatible', () => {
        // Source: length
        // Target: kg (mass) - incompatible
        const result = nearleyCalculator.calculate('5 m to kg');

        expect(result.results[0].hasError).toBe(true);
      });
    });

    describe('Real-world examples from specs', () => {
      it('should handle spec example: 10 m to ft in', () => {
        const result = nearleyCalculator.calculate('10 m to ft in');
        expect(result.results[0].result).toMatch(/32 ft 9.70\d+ in/);
      });

      it('should handle spec example: 10 acre to ft in', () => {
        const result = nearleyCalculator.calculate('10 acre to ft in');
        expect(result.results[0].result).toBe('5 227 200 ft in');
      });

      it('should handle spec example: 5 ft 7 in to cm', () => {
        const result = nearleyCalculator.calculate('5 ft 7 in to cm');
        expect(result.results[0].result).toBe('170.18 cm');
      });
    });
  });
});

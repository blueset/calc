import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../src/calculator';
import { DataLoader } from '../../src/data-loader';
import * as path from 'path';

/**
 * Integration tests for date and time arithmetic
 * Tests the full pipeline: Lexer → Parser → Evaluator → Formatter
 */
describe('Integration Tests - Date and Time Arithmetic', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '../..', 'data'));

    calculator = new Calculator(dataLoader);
  });

  describe('Date and Time Arithmetic', () => {
    it('should add time durations', () => {
      const result = calculator.calculate('2 days + 3 hours');
      expect(result.results[0].result).toContain('2.125');
      expect(result.results[0].result).toContain('day');
    });

    it('should subtract dates', () => {
      const result = calculator.calculate('2023 Jan 10 - 2023 Jan 1');
      expect(result.results[0].result).toContain('9');
      expect(result.results[0].result).toContain('day');
    });

    it('should add duration to date', () => {
      const result = calculator.calculate('2023 Jan 1 + 10 days');
      expect(result.results[0].result).toBe('2023-01-11 Wed');
    });

    it('should handle month addition with clamping', () => {
      const result = calculator.calculate('1970 Jan 31 + 1 month');
      expect(result.results[0].result).toBe('1970-02-28 Sat');
    });

    it('should handle adding decimal duration to date', () => {
      // 0.3 month = 0.3 * (365.25 / 12) days = 9.13125 days = 13149 minutes
      const result = calculator.calculate('1970 Jan 31 + 13149 minutes\n1970 Jan 31 + 0.3 month');
      expect(result.results[0].result).toBe('1970-02-09 Mon 03:09');
      expect(result.results[1].result).toBe('1970-02-09 Mon 03:09');
    });

    it('should handle add duration to plain time', () => {
      const result = calculator.calculate('10:25 + 2 hours');
      expect(result.results[0].result).toBe('12:25');
    });

    it('should handle add decimal duration to plain time', () => {
      const result = calculator.calculate('10:25 + 30 minutes\n10:25 + 0.5 hour');
      expect(result.results[0].result).toBe('10:55');
      expect(result.results[1].result).toBe('10:55');
    });

    it('should expand plain time to plain date time when exceeding 24 hours', () => {
      const result = calculator.calculate('10:25 + 24 hours\n10:25 + 1 day');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      expect(result.results[0].result).toContain(`${year}-${month}-${day}`);
      expect(result.results[0].result).toContain('10:25');
      expect(result.results[1].result).toContain(`${year}-${month}-${day}`);
      expect(result.results[1].result).toContain('10:25');
    });

    it('should handle add duration to date time', () => {
      const result = calculator.calculate('1970 Jan 1 12:00 + 2 hours');
      expect(result.results[0].result).toContain('1970-01-01');
      expect(result.results[0].result).toContain('14:00');
    });

    it('should handle add composite duration to plain time', () => {
      const result = calculator.calculate('10:25 + 2 hours 40 min');
      expect(result.results[0].result).toBe('13:05');
    });

    it('should handle add composite duration to date', () => {
      const result = calculator.calculate('1970 Jan 1 + 1 month 2 days');
      expect(result.results[0].result).toContain('1970-02-03');
    });

    it('should expand plain date to plain date time when time component added', () => {
      const result = calculator.calculate('1970 Jan 1 + 1 hour');
      expect(result.results[0].result).toBe('1970-01-01 Thu 01:00');
    });

    it('should handle add composite duration to date time', () => {
      const result = calculator.calculate('1970 Jan 1 12:00 + 1 month 2 hours');
      expect(result.results[0].result).toContain('1970-02-01');
      expect(result.results[0].result).toContain('14:00');
    });
  });
});

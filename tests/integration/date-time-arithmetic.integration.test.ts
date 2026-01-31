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
      expect(result.results[0].result).toBe('2.125 day');
    });

    it('should subtract dates', () => {
      const result = calculator.calculate('2023 Jan 10 - 2023 Jan 1');
      expect(result.results[0].result).toBe('9 day');
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

  describe('Date/Time Type Conversion Matrix', () => {
    it('should combine plain date + plain time → plain date time', () => {
      // Combining date and time
      const result = calculator.calculate('1970 Jan 1 + 12:00');
      expect(result.results[0].result).toContain('1970-01-01');
      expect(result.results[0].result).toContain('12:00');
    });

    it('should handle fractional month addition', () => {
      // Fractional durations: 1.5 months
      // SPECS.md line 849: 1970 Feb 1 + 1.5 months → 1970-03-18 Wed 15:00:00
      const result = calculator.calculate('1970 Feb 1 + 1.5 months');
      expect(result.results[0].result).toContain('1970-03-18 Wed 15:45');
    });

    it('should handle fractional year addition', () => {
      // Fractional year: 0.5 year = 6 months
      const result = calculator.calculate('1970 Jan 1 + 0.5 year');
      expect(result.results[0].result).toContain('1970-07-02');
    });

    it('should handle plain time + time duration exceeding 24 hours', () => {
      // Plain time with duration > 24h should expand to plain date time
      const result = calculator.calculate('10:00 + 30 hours');
      // 10:00 + 30 hours = tomorrow at 16:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      expect(result.results[0].result).toContain(`${year}-${month}-${day}`);
      expect(result.results[0].result).toContain('16:00');
    });

    it('should handle plain date + time duration → plain date time', () => {
      // Adding time duration to plain date expands to date time
      const result = calculator.calculate('1970 Jan 1 + 3 hours');
      expect(result.results[0].result).toContain('1970-01-01');
      expect(result.results[0].result).toContain('03:00');
    });

    it('should subtract dates to get duration', () => {
      // Plain date - plain date → duration
      const result = calculator.calculate('1970 Jan 10 - 1970 Jan 5');
      expect(result.results[0].result).toBe('5 day');
    });

    it('should subtract date times to get duration', () => {
      // Plain date time - plain date time → duration
      const result = calculator.calculate('1970 Jan 2 14:30 - 1970 Jan 1 10:00');
      // 1 day 4 hours 30 minutes = 28.5 hours = 1 day 4 h 30 min
      expect(result.results[0].result).toBe('1 day 4 h 30 min');
    });

    it('should handle date time - date (implicit time 00:00)', () => {
      // Plain date time - plain date (treated as midnight)
      const result = calculator.calculate('1970 Jan 2 14:30 - 1970 Jan 1');
      // 1 day 14 hours 30 minutes
      expect(result.results[0].result).toBe('1 day 14 h 30 min');
    });

    it('should handle duration + duration arithmetic', () => {
      // time number + time number → time number
      const result = calculator.calculate('2 days + 3 hours + 30 minutes');
      expect(result.results[0].result).toMatch(/2\.1458\d* day/);
    });

    it('should handle duration subtraction', () => {
      // Duration - duration → duration
      const result = calculator.calculate('5 days - 2 days');
      expect(result.results[0].result).toBe('3 day');
    });

    it('should handle duration multiplication', () => {
      // Duration * scalar → duration
      const result = calculator.calculate('2 hours * 3');
      expect(result.results[0].result).toBe('6 h');
    });

    it('should handle duration division', () => {
      // Duration / scalar → duration
      const result = calculator.calculate('10 days / 2');
      expect(result.results[0].result).toBe('5 day');
    });

    it('should reduce non-calendar durations to integer nanoseconds', () => {
      // Durations without calendar units (days, weeks, months, years)
      // should be reduced to integer nanoseconds
      const result = calculator.calculate('1.5 hours + 30 minutes');
      // 1.5 hours + 0.5 hours = 2 hours = 7200 seconds
      expect(result.results[0].result).toBe('2 h');
    });
  });
});

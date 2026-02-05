import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../src/calculator';
import { DataLoader } from '../../src/data-loader';
import * as path from 'path';

/**
 * Integration tests for complex date/time edge cases
 * Tests duration arithmetic, leap years, month/day clamping, and Temporal.Duration spec compliance
 * Spec lines: 813-926
 */
describe('Integration Tests - Date/Time Edge Cases', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();

    calculator = new Calculator(dataLoader, {}); // Use Nearley parser
  });

  describe('Month/Day Clamping', () => {
    it('should clamp invalid month to valid range', () => {
      const result = calculator.calculate(`2023.13.15
2023.14.01
2023.00.15
2023.25.20`);
      expect(result.results[0].result).toContain('2023-12-15'); // month 13 → 12
      expect(result.results[1].result).toContain('2023-12-01'); // month 14 → 12
      expect(result.results[2].hasError).toBe(true); // month 0 is invalid
      expect(result.results[3].result).toContain('2023-12-20'); // month 25 → 12
    });

    it('should clamp invalid day to month maximum', () => {
      const result = calculator.calculate(`2023.01.32
2023.02.30
2023.04.31
2023.06.32`);
      expect(result.results[0].result).toContain('2023-01-31'); // Jan has 31 days
      expect(result.results[1].result).toContain('2023-02-28'); // Feb has 28 in non-leap
      expect(result.results[2].result).toContain('2023-04-30'); // Apr has 30 days
      expect(result.results[3].result).toContain('2023-06-30'); // Jun has 30 days
    });

    it('should handle day 0 as invalid', () => {
      const result = calculator.calculate('2023.06.00');
      expect(result.results[0].hasError).toBe(true);
    });

    it('should handle leap year February clamping', () => {
      const result = calculator.calculate(`2024.02.30
2024.02.29
2023.02.29`);
      expect(result.results[0].result).toContain('2024-02-29'); // 2024 is leap year
      expect(result.results[1].result).toContain('2024-02-29'); // Valid leap day
      expect(result.results[2].result).toContain('2023-02-28'); // 2023 is not leap year
    });
  });

  describe('Leap Year Handling', () => {
    it('should recognize leap years correctly', () => {
      const result = calculator.calculate(`2024 Feb 29
2000 Feb 29
1900 Feb 29
2100 Feb 29`);
      expect(result.results[0].result).toContain('2024-02-29'); // Divisible by 4
      expect(result.results[1].result).toContain('2000-02-29'); // Divisible by 400
      expect(result.results[2].result).toContain('1900-02-28'); // Divisible by 100 but not 400
      expect(result.results[3].result).toContain('2100-02-28'); // Divisible by 100 but not 400
    });

    it('should handle arithmetic across leap day', () => {
      const result = calculator.calculate(`2024 Feb 28 + 1 day
2024 Feb 29 + 1 day
2023 Feb 28 + 1 day`);
      expect(result.results[0].result).toContain('2024-02-29');
      expect(result.results[1].result).toContain('2024-03-01');
      expect(result.results[2].result).toContain('2023-03-01');
    });

    it('should handle year arithmetic with leap years', () => {
      const result = calculator.calculate(`2024 Feb 29 + 1 year
2024 Feb 29 + 4 years`);
      expect(result.results[0].result).toContain('2025-02-28'); // No Feb 29 in 2025
      expect(result.results[1].result).toContain('2028-02-29'); // 2028 is leap year
    });
  });

  describe('Complex Duration Arithmetic', () => {
    it('should add months with day overflow', () => {
      const result = calculator.calculate(`2023 Jan 31 + 1 month
2023 Jan 31 + 2 months
2024 Jan 31 + 1 month`);
      expect(result.results[0].result).toContain('2023-02-28'); // Jan 31 + 1 month = Feb 28
      expect(result.results[1].result).toContain('2023-03-31'); // Jan 31 + 2 months = Mar 31
      expect(result.results[2].result).toContain('2024-02-29'); // Jan 31 + 1 month (leap) = Feb 29
    });

    it('should add months and days (Temporal.Duration spec)', () => {
      const result = calculator.calculate(`1970 Feb 1 + 1 month 2 days
1970 Jan 31 + 1 month 1 day`);
      expect(result.results[0].result).toContain('1970-03-03'); // Feb 1 + 1 month = Mar 1 + 2 days = Mar 3
      expect(result.results[1].result).toContain('1970-03-01'); // Jan 31 + 1 month = Feb 28 + 1 day = Mar 1
    });

    it('should handle fractional months', () => {
      const result = calculator.calculate(`1970 Feb 1 + 1.5 months
1970 Jan 1 + 0.5 months`);
      // 1.5 months = 1 month + 15 days (approximately)
      expect(result.results[0].result).toContain('1970-03-18 Wed 15:45');
      expect(result.results[1].result).toContain('1970-01-16 Fri 05:15');
    });

    it('should add years with month/day preservation', () => {
      const result = calculator.calculate(`2020 Feb 29 + 1 year
2020 Feb 29 + 4 years
2020 Dec 31 + 1 year`);
      expect(result.results[0].result).toContain('2021-02-28'); // No Feb 29 in 2021
      expect(result.results[1].result).toContain('2024-02-29'); // 2024 is leap year
      expect(result.results[2].result).toContain('2021-12-31'); // Preserved
    });

    it('should handle mixed time unit arithmetic', () => {
      const result = calculator.calculate(`2023 Jan 1 12:00 + 1 day 2 hours 30 minutes
2023 Jan 1 + 1 year 2 months 3 days`);
      expect(result.results[0].result).toContain('2023-01-02 Mon 14:30');
      expect(result.results[1].result).toContain('2024-03-04');
    });

    it('should subtract durations from dates', () => {
      const result = calculator.calculate(`2023 Mar 31 - 1 month
2023 Mar 1 - 1 day
2024 Mar 1 - 1 year`);
      expect(result.results[0].result).toContain('2023-02-28'); // Mar 31 - 1 month
      expect(result.results[1].result).toContain('2023-02-28'); // Mar 1 - 1 day
      expect(result.results[2].result).toContain('2023-03-01'); // Leap year handling
    });
  });

  describe('Date/Time Arithmetic Conversion Table', () => {
    describe('Duration + Duration', () => {
      it('should add durations', () => {
        const result = calculator.calculate(`1 hour + 30 minutes
2 days + 12 hours
1 year + 6 months`);
        expect(result.results[0].result).toContain('1.5 h');
        expect(result.results[1].result).toContain('2.5 day');
        expect(result.results[2].result).toContain('1.5 yr');
      });

      it('should add mixed unit durations', () => {
        const result = calculator.calculate(`1 h 30 min + 45 min
2 days 6 hours + 18 hours`);
        expect(result.results[0].result).toBe('2.25 h');
        expect(result.results[1].result).toBe('3 day');
      });
    });

    describe('PlainDate + Duration', () => {
      it('should add duration to plain date', () => {
        const result = calculator.calculate(`2023 Jan 15 + 10 days
2023 Jan 15 + 2 weeks
2023 Jan 15 + 3 months`);
        expect(result.results[0].result).toContain('2023-01-25');
        expect(result.results[1].result).toContain('2023-01-29');
        expect(result.results[2].result).toContain('2023-04-15');
      });

      it('should add time duration to date creating datetime', () => {
        const result = calculator.calculate('2023 Jan 15 + 14 hours');
        expect(result.results[0].result).toBe('2023-01-15 Sun 14:00');
      });
    });

    describe('PlainTime + Duration', () => {
      it('should add duration to time', () => {
        const result = calculator.calculate(`14:30 + 1 hour
14:30 + 90 minutes
14:30 + 30 seconds`);
        expect(result.results[0].result).toBe('15:30');
        expect(result.results[1].result).toBe('16:00');
        expect(result.results[2].result).toBe('14:30:30');
      });

      it('should wrap time around midnight', () => {
        const result = calculator.calculate(`23:30 + 1 hour
01:00 - 2 hours`);
        expect(result.results[0].result).toMatch(/\d{4}-\d{2}-\d{2} \w{3} 00:30/);
        expect(result.results[1].result).toMatch(/\d{4}-\d{2}-\d{2} \w{3} 23:00/);
      });
    });

    describe('PlainDateTime + Duration', () => {
      it('should add duration to datetime', () => {
        const result = calculator.calculate(`2023 Jan 15 14:30 + 2 hours
2023 Jan 15 14:30 + 1 day
2023 Jan 15 14:30 + 1 month`);
        expect(result.results[0].result).toBe('2023-01-15 Sun 16:30');
        expect(result.results[1].result).toBe('2023-01-16 Mon 14:30');
        expect(result.results[2].result).toBe('2023-02-15 Wed 14:30');
      });
    });

    describe('ZonedDateTime + Duration', () => {
      it('should add duration to zoned datetime', () => {
        const result = calculator.calculate(`2023 Jan 15 14:30 UTC + 2 hours
2023 Jan 15 14:30 UTC + 1 day`);
        expect(result.results[0].result).toBe('2023-01-15 Sun 16:30 UTC');
        expect(result.results[1].result).toBe('2023-01-16 Mon 14:30 UTC');
      });

      it('should handle DST transitions', () => {
        // Spring forward: 2:00 AM becomes 3:00 AM
        const result = calculator.calculate('2023 Mar 12 01:00 America/New_York + 2 hours');
        // This crosses DST boundary
        expect(result.results[0].result).toBe('2023-03-12 Sun 04:00 UTC-4');
      });
    });

    describe('Date/Time - Date/Time', () => {
      it('should subtract dates to get duration', () => {
        const result = calculator.calculate(`2023 Jan 20 - 2023 Jan 15
2023 Feb 1 - 2023 Jan 1
2024 Jan 1 - 2023 Jan 1`);
        expect(result.results[0].result).toBe('5 day');
        expect(result.results[1].result).toBe('1 mo');
        expect(result.results[2].result).toBe('1 yr');
      });

      it('should subtract times to get duration', () => {
        const result = calculator.calculate(`15:30 - 14:00
14:00 - 15:30
23:59 - 00:01`);
        expect(result.results[0].result).toBe('1 h 30 min');
        expect(result.results[1].result).toBe('-1 h -30 min');
        expect(result.results[2].result).toBe('23 h 58 min');
      });

      it('should subtract datetimes to get duration', () => {
        const result = calculator.calculate(`2023 Jan 15 14:30 - 2023 Jan 15 12:00
2023 Jan 20 14:30 - 2023 Jan 15 12:00`);
        expect(result.results[0].result).toContain('2 h 30 min');
        expect(result.results[1].result).toBe('5 day 2 h 30 min');
      });
    });

    describe('Duration * Number', () => {
      it('should multiply duration by scalar', () => {
        const result = calculator.calculate(`2 hours * 3
1 day * 7
30 minutes * 2.5`);
        expect(result.results[0].result).toContain('6 h');
        expect(result.results[1].result).toContain('7 day');
        expect(result.results[2].result).toContain('75 min');
      });
    });

    describe('Duration / Number', () => {
      it('should divide duration by scalar', () => {
        const result = calculator.calculate(`6 hours / 2
1 week / 7
90 minutes / 3`);
        expect(result.results[0].result).toBe('3 h');
        expect(result.results[1].result).toMatch(/0.142857\d+ wk/);
        expect(result.results[2].result).toBe('30 min');
      });
    });

    describe('Duration / Duration', () => {
      it('should divide durations to get ratio', () => {
        const result = calculator.calculate(`6 hours / 2 hours
1 day / 1 hour
90 minutes / 30 minutes`);
        expect(result.results[0].result).toBe('3');
        expect(result.results[1].result).toBe('24');
        expect(result.results[2].result).toBe('3');
      });
    });
  });

  describe('Edge Cases with End of Month', () => {
    it('should handle end-of-month arithmetic', () => {
      const result = calculator.calculate(`2023 Jan 31 + 1 month
2023 Mar 31 - 1 month
2023 Aug 31 + 1 month`);
      expect(result.results[0].result).toContain('2023-02-28');
      expect(result.results[1].result).toContain('2023-02-28');
      expect(result.results[2].result).toContain('2023-09-30');
    });

    it('should handle sequential month additions', () => {
      const result = calculator.calculate(`date = 2023 Jan 31
date + 1 month
date + 2 months
date + 3 months`);
      expect(result.results[1].result).toContain('2023-02-28');
      expect(result.results[2].result).toContain('2023-03-31');
      expect(result.results[3].result).toContain('2023-04-30');
    });
  });

  describe('Week-based Arithmetic', () => {
    it('should add weeks to dates', () => {
      const result = calculator.calculate(`2023 Jan 1 + 1 week
2023 Jan 1 + 4 weeks
2023 Jan 1 + 52 weeks`);
      expect(result.results[0].result).toContain('2023-01-08');
      expect(result.results[1].result).toContain('2023-01-29');
      expect(result.results[2].result).toContain('2023-12-31');
    });

    it('should convert between weeks and days', () => {
      const result = calculator.calculate(`1 week to days
14 days to weeks`);
      expect(result.results[0].result).toContain('7 day');
      expect(result.results[1].result).toContain('2 wk');
    });
  });

  describe('Year Boundary Crossing', () => {
    it('should handle arithmetic across year boundaries', () => {
      const result = calculator.calculate(`2023 Dec 31 + 1 day
2024 Jan 1 - 1 day
2023 Dec 31 23:59 + 2 minutes`);
      expect(result.results[0].result).toContain('2024-01-01');
      expect(result.results[1].result).toContain('2023-12-31');
      expect(result.results[2].result).toBe('2024-01-01 Mon 00:01');
    });

    it('should handle large year jumps', () => {
      const result = calculator.calculate(`2023 Jan 1 + 100 years
2023 Jan 1 - 100 years`);
      expect(result.results[0].result).toContain('2123-01-01');
      expect(result.results[1].result).toContain('1923-01-01');
    });
  });

  describe('Negative Durations', () => {
    it('should handle negative duration arithmetic', () => {
      const result = calculator.calculate(`2023 Jan 15 + (-5 days)
2023 Jan 15 - (-5 days)
14:30 + (-1 hour)`);
      expect(result.results[0].result).toContain('2023-01-10');
      expect(result.results[1].result).toContain('2023-01-20');
      expect(result.results[2].result).toContain('13:30');
    });

    it('should create negative durations from subtraction', () => {
      const result = calculator.calculate(`2023 Jan 1 - 2023 Jan 15
abs(2023 Jan 1 - 2023 Jan 15)`);
      expect(result.results[0].result).toContain('-14 day');
      expect(result.results[1].result).toContain('14 day'); // Duration should be implicitly converted to NumberWithUnit or CompositeValue
    });
  });

  describe('Mixed Precision Durations', () => {
    it('should handle millisecond-level duration arithmetic', () => {
      const result = calculator.calculate(`14:30:45 + 500 ms
14:30:45 + 1.5 s`);
      expect(result.results[0].result).toContain('14:30:45.500');
      expect(result.results[1].result).toContain('14:30:46.500');
    });

    it('should preserve precision in duration operations', () => {
      const result = calculator.calculate(`1.5 hours + 2.7 hours
1 day 12 hours 30 minutes`);
      expect(result.results[0].result).toContain('4.2 h');
      expect(result.results[1].result).toBe('1 day 12 h 30 min');
    });
  });
});

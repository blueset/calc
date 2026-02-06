import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../../src/calculator/calculator';
import { DataLoader } from '../../../src/calculator/data-loader';
import * as path from 'path';

/**
 * Integration tests for date and time property extraction
 * Tests extraction of components from date/time values (year, month, day, weekday, hour, etc.)
 * Spec lines: 702-722
 */
describe('Integration Tests - Date/Time Property Extraction', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();

    calculator = new Calculator(dataLoader, {}); // Use Nearley parser
  });

  describe('Date Component Extraction', () => {
    it('should extract year from date/time values', () => {
      const result = calculator.calculate(`1970 Jan 01 to year
1970 Jan 01 14:00 UTC to year
2023 Dec 25 to year`);
      expect(result.results[0].result).toBe('1 970');
      expect(result.results[1].result).toBe('1 970');
      expect(result.results[2].result).toBe('2 023');
    });

    it('should extract month from date/time values', () => {
      const result = calculator.calculate(`1970 Jan 01 to month
1970 Feb 15 to month
2023 Dec 25 to month
1970 Jan 01 14:00 UTC to month`);
      expect(result.results[0].result).toBe('1');
      expect(result.results[1].result).toBe('2');
      expect(result.results[2].result).toBe('12');
      expect(result.results[3].result).toBe('1');
    });

    it('should extract day from date/time values', () => {
      const result = calculator.calculate(`1970 Jan 01 to day
1970 Jan 15 to day
2023 Dec 25 to day
1970 Jan 01 14:00 UTC to day`);
      expect(result.results[0].result).toBe('1');
      expect(result.results[1].result).toBe('15');
      expect(result.results[2].result).toBe('25');
      expect(result.results[3].result).toBe('1');
    });

    it('should extract weekday from date/time values', () => {
      const result = calculator.calculate(`1970 Jan 01 to weekday
1970 Jan 01 14:00 UTC to weekday
2023 Jan 01 to weekday
2023 Jan 02 to weekday`);
      expect(result.results[0].result).toBe('4'); // Thursday
      expect(result.results[1].result).toBe('4'); // Thursday
      expect(result.results[2].result).toBe('7'); // Sunday
      expect(result.results[3].result).toBe('1'); // Monday
    });

    it('should extract day of year from date/time values', () => {
      const result = calculator.calculate(`1970 Jan 01 to day of year
1970 Feb 01 to day of year
1970 Dec 31 to day of year
2023 Jan 01 14:00 UTC to day of year`);
      expect(result.results[0].result).toBe('1');
      expect(result.results[1].result).toBe('32');
      expect(result.results[2].result).toBe('365');
      expect(result.results[3].result).toBe('1');
    });

    it('should extract week of year from date/time values', () => {
      const result = calculator.calculate(`1970 Jan 01 to week of year
1970 Jan 05 to week of year
2023 Jan 01 to week of year
2023 Jan 02 to week of year`);
      expect(result.results[0].result).toBe('1');
      expect(result.results[1].result).toBe('2');
      expect(result.results[2].result).toBe('52'); // Sunday belongs to previous week
      expect(result.results[3].result).toBe('1');  // Monday starts week 1
    });
  });

  describe('Time Component Extraction', () => {
    it('should extract hour from time values', () => {
      const result = calculator.calculate(`14:30 to hour
1970 Jan 01 14:30 to hour
1970 Jan 01 14:30 UTC to hour
00:00 to hour
23:59 to hour`);
      expect(result.results[0].result).toBe('14');
      expect(result.results[1].result).toBe('14');
      expect(result.results[2].result).toBe('14');
      expect(result.results[3].result).toBe('0');
      expect(result.results[4].result).toBe('23');
    });

    it('should extract minute from time values', () => {
      const result = calculator.calculate(`14:30 to minute
14:00 to minute
14:59 to minute
1970 Jan 01 14:30 UTC to minute`);
      expect(result.results[0].result).toBe('30');
      expect(result.results[1].result).toBe('0');
      expect(result.results[2].result).toBe('59');
      expect(result.results[3].result).toBe('30');
    });

    it('should extract second from time values', () => {
      const result = calculator.calculate(`14:30:45 to second
14:30:00 to second
14:30:59 to second
1970 Jan 01 14:30:45 UTC to second`);
      expect(result.results[0].result).toBe('45');
      expect(result.results[1].result).toBe('0');
      expect(result.results[2].result).toBe('59');
      expect(result.results[3].result).toBe('45');
    });
  });

  describe('Timezone Offset Extraction', () => {
    it('should extract offset from zoned date times', () => {
      const result = calculator.calculate(`1970 Jan 01 14:00 UTC to offset
1970 Jan 01 14:00 UTC+5 to offset
1970 Jan 01 14:00 UTC-330 to offset
1970 Jan 01 14:00 UTC+0 to offset`);
      expect(result.results[0].result).toBe('0 min');
      expect(result.results[1].result).toBe('5 h');
      expect(result.results[2].result).toBe('-3 h -30 min');
      expect(result.results[3].result).toBe('0 min');
    });

    it('should extract offset from named timezone zoned date times', () => {
      const result = calculator.calculate(`1970 Jan 01 14:00 America/New_York to offset
1970 Jun 01 14:00 America/New_York to offset
1970 Jan 01 14:00 Tokyo to offset`);
      expect(result.results[0].result).toBe('-5 h'); // EST
      expect(result.results[1].result).toBe('-4 h'); // EDT
      expect(result.results[2].result).toBe('9 h');  // JST
    });
  });

  describe('Combined Property Extraction', () => {
    it('should handle multiple extractions on same value', () => {
      const result = calculator.calculate(`date = 1970 Jan 15 14:30:45 UTC
date to year
date to month
date to day
date to hour
date to minute
date to second`);
      expect(result.results[1].result).toBe('1 970');
      expect(result.results[2].result).toBe('1');
      expect(result.results[3].result).toBe('15');
      expect(result.results[4].result).toBe('14');
      expect(result.results[5].result).toBe('30');
      expect(result.results[6].result).toBe('45');
    });

    it('should handle extraction in expressions', () => {
      const result = calculator.calculate(`(1970 Jan 01 to year) + 50
(2023 Dec 25 to month) * 2
(14:30 to hour) + (14:30 to minute)`);
      expect(result.results[0].result).toBe('2 020');
      expect(result.results[1].result).toBe('24');
      expect(result.results[2].result).toBe('44');
    });
  });
});

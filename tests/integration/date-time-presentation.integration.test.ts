import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../src/calculator';
import { DataLoader } from '../../src/data-loader';
import * as path from 'path';

/**
 * Integration tests for date and time presentation conversions
 * Tests conversion to standard formats: ISO 8601, RFC 9557, RFC 2822, Unix timestamps
 * Spec lines: 695-701
 */
describe('Integration Tests - Date/Time Presentation Conversions', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();

    calculator = new Calculator(dataLoader, {}); // Use Nearley parser
  });

  describe('ISO 8601 Format', () => {
    it('should convert zoned date times to ISO 8601', () => {
      const result = calculator.calculate(`1970 Jan 01 01:00 UTC to ISO 8601
1970 Jan 01 01:00 UTC+5 to ISO 8601
1970 Jan 01 01:00 UTC-330 to ISO 8601`);
      expect(result.results[0].result).toBe('1970-01-01T01:00:00Z');
      expect(result.results[1].result).toBe('1970-01-01T01:00:00+05:00');
      expect(result.results[2].result).toBe('1970-01-01T01:00:00-03:30');
    });

    it('should convert plain date times to ISO 8601', () => {
      const result = calculator.calculate(`1970 Jan 01 14:30:45 to ISO 8601
2023 Dec 25 00:00:00 to ISO 8601`);
      expect(result.results[0].result).toBe('1970-01-01T14:30:45');
      expect(result.results[1].result).toBe('2023-12-25T00:00:00');
    });

    it('should convert plain dates to ISO 8601', () => {
      const result = calculator.calculate(`1970 Jan 01 to ISO 8601
2023 Dec 25 to ISO 8601`);
      expect(result.results[0].result).toBe('1970-01-01');
      expect(result.results[1].result).toBe('2023-12-25');
    });

    it('should convert plain times to ISO 8601', () => {
      const result = calculator.calculate(`14:30:45 to ISO 8601
00:00:00 to ISO 8601
23:59:59 to ISO 8601`);
      expect(result.results[0].result).toBe('14:30:45');
      expect(result.results[1].result).toBe('00:00:00');
      expect(result.results[2].result).toBe('23:59:59');
    });
  });

  describe('RFC 9557 Format', () => {
    it('should convert zoned date times to RFC 9557', () => {
      const result = calculator.calculate(`1970 Jan 01 01:00 UTC to RFC 9557
1970 Jan 01 01:00 UTC+5 to RFC 9557
1970 Jan 01 01:00 UTC-330 to RFC 9557`);
      expect(result.results[0].result).toBe('1970-01-01T01:00:00+00:00[Etc/UTC]');
      expect(result.results[1].result).toBe('1970-01-01T01:00:00+05:00[+05:00]');
      expect(result.results[2].result).toBe('1970-01-01T01:00:00-03:30[-03:30]');
    });

    it('should convert plain date times to RFC 9557', () => {
      const result = calculator.calculate(`1970 Jan 01 14:30:45 to RFC 9557
2023 Dec 25 00:00:00 to RFC 9557`);
      expect(result.results[0].result).toBe('1970-01-01T14:30:45');
      expect(result.results[1].result).toBe('2023-12-25T00:00:00');
    });

    it('should convert plain dates to RFC 9557', () => {
      const result = calculator.calculate(`1970 Jan 01 to RFC 9557
2023 Dec 25 to RFC 9557`);
      expect(result.results[0].result).toBe('1970-01-01');
      expect(result.results[1].result).toBe('2023-12-25');
    });

    it('should convert plain times to RFC 9557', () => {
      const result = calculator.calculate(`14:30:45 to RFC 9557
00:00:00 to RFC 9557
23:59:59 to RFC 9557`);
      expect(result.results[0].result).toBe('14:30:45');
      expect(result.results[1].result).toBe('00:00:00');
      expect(result.results[2].result).toBe('23:59:59');
    });
  });

  describe('RFC 2822 Format', () => {
    it('should convert zoned date times to RFC 2822', () => {
      const result = calculator.calculate(`1970 Jan 01 01:00 UTC to RFC 2822
1970 Jan 01 01:00 UTC+5 to RFC 2822
1970 Jan 01 01:00 UTC-330 to RFC 2822`);
      expect(result.results[0].result).toBe('Thu, 01 Jan 1970 01:00:00 +0000');
      expect(result.results[1].result).toBe('Thu, 01 Jan 1970 01:00:00 +0500');
      expect(result.results[2].result).toBe('Thu, 01 Jan 1970 01:00:00 -0330');
    });

    it('should handle different weekdays in RFC 2822', () => {
      const result = calculator.calculate(`2023 Jan 01 12:00 UTC to RFC 2822
2023 Jan 02 12:00 UTC to RFC 2822
2023 Jan 03 12:00 UTC to RFC 2822`);
      expect(result.results[0].result).toContain('Sun, 01 Jan 2023');
      expect(result.results[1].result).toContain('Mon, 02 Jan 2023');
      expect(result.results[2].result).toContain('Tue, 03 Jan 2023');
    });
  });

  describe('Unix Timestamp Conversions', () => {
    it('should convert to Unix seconds', () => {
      const result = calculator.calculate(`1970 Jan 01 00:00 UTC to Unix
1970 Jan 01 01:00 UTC to Unix
1970 Jan 01 00:00 UTC to Unix seconds`);
      expect(result.results[0].result).toBe('0');
      expect(result.results[1].result).toBe('3 600');
      expect(result.results[2].result).toBe('0');
    });

    it('should plain date time convert to Unix seconds', () => {
      // Assume local timezone
      const result = calculator.calculate(`1970 Jan 01 00:00 to Unix
1970 Jan 01 01:00 to Unix
1970 Jan 01 00:00 to Unix seconds`);
      expect(result.results[0].result).toBe('28 800');
      expect(result.results[1].result).toBe('32 400');
      expect(result.results[2].result).toBe('28 800');
    });

    it('should convert to Unix milliseconds', () => {
      const result = calculator.calculate(`1970 Jan 01 00:00 UTC to Unix milliseconds
1970 Jan 01 01:00 UTC to Unix milliseconds
1970 Jan 01 00:00:01 UTC to Unix milliseconds`);
      expect(result.results[0].result).toBe('0');
      expect(result.results[1].result).toBe('3 600 000');
      expect(result.results[2].result).toBe('1 000');
    });

    it('should plain date time convert to Unix milliseconds', () => {
      // Assume local timezone
      const result = calculator.calculate(`1970 Jan 01 00:00 to Unix milliseconds
1970 Jan 01 01:00 to Unix milliseconds
1970 Jan 01 00:00:01 to Unix milliseconds`);
      expect(result.results[0].result).toBe('28 800 000');
      expect(result.results[1].result).toBe('32 400 000');
      expect(result.results[2].result).toBe('28 801 000');
    });

    it('should handle dates after epoch', () => {
      const result = calculator.calculate(`2000 Jan 01 00:00 UTC to Unix
2023 Jan 01 00:00 UTC to Unix`);
      expect(result.results[0].result).toBe('946 684 800');
      expect(result.results[1].result).toBe('1 672 531 200');
    });

    it('should handle dates before epoch', () => {
      const result = calculator.calculate(`1969 Dec 31 23:00 UTC to Unix
1960 Jan 01 00:00 UTC to Unix`);
      expect(result.results[0].result).toBe('-3 600');
      expect(result.results[1].result).toBe('-315 619 200');
    });

    it('should handle timezone offsets in Unix conversion', () => {
      const result = calculator.calculate(`1970 Jan 01 01:00 UTC+1 to Unix
1970 Jan 01 01:00 UTC-1 to Unix`);
      expect(result.results[0].result).toBe('0');     // 01:00 UTC+1 = 00:00 UTC
      expect(result.results[1].result).toBe('7 200');  // 01:00 UTC-1 = 02:00 UTC
    });
  });

  describe('Combined Conversions', () => {
    it('should handle multiple format conversions on same value', () => {
      const result = calculator.calculate(`dt = 1970 Jan 01 01:00 UTC
dt to ISO 8601
dt to RFC 9557
dt to RFC 2822
dt to Unix
dt to Unix milliseconds`);
      expect(result.results[1].result).toBe('1970-01-01T01:00:00Z');
      expect(result.results[2].result).toBe('1970-01-01T01:00:00+00:00[Etc/UTC]');
      expect(result.results[3].result).toBe('Thu, 01 Jan 1970 01:00:00 +0000');
      expect(result.results[4].result).toBe('3 600');
      expect(result.results[5].result).toBe('3 600 000');
    });

    it('should apply conversions in sequence', () => {
      const result = calculator.calculate(`1970 Jan 01 01:00 UTC to Unix to ISO 8601`);
      // First converts to Unix (3600), then ISO 8601 format should not apply to number
      expect(result.results[0].hasError).toBe(true);
    });
  });
});

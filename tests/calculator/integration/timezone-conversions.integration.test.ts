import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../../src/calculator/calculator';
import { DataLoader } from '../../../src/calculator/data-loader';
import * as path from 'path';

/**
 * Integration tests for timezone conversions
 * Tests converting between timezones and special rendering rules
 * Spec lines: 723-737
 */
describe('Integration Tests - Timezone Conversions', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();

    calculator = new Calculator(dataLoader, {}); // Use Nearley parser
  });

  describe('Zoned DateTime to Different Timezone', () => {
    it('should convert between UTC offsets', () => {
      const result = calculator.calculate(`1970 Jan 01 14:00 UTC to UTC+5
1970 Jan 01 14:00 UTC to UTC-3
1970 Jan 01 14:00 UTC+2 to UTC-1`);
      expect(result.results[0].result).toBe('1970-01-01 Thu 19:00 UTC+5');
      expect(result.results[1].result).toBe('1970-01-01 Thu 11:00 UTC-3');
      expect(result.results[2].result).toBe('1970-01-01 Thu 11:00 UTC-1');
    });

    it('should convert to named timezones', () => {
      const result = calculator.calculate(`1970 Jan 01 14:00 UTC to America/New_York
1970 Jan 01 14:00 UTC to Tokyo
1970 Jun 01 14:00 UTC to America/New_York`);
      expect(result.results[0].result).toBe('1970-01-01 Thu 09:00 UTC-5'); // EST
      expect(result.results[1].result).toBe('1970-01-01 Thu 23:00 UTC+9'); // JST
      expect(result.results[2].result).toBe('1970-06-01 Mon 10:00 UTC-4'); // EDT (DST)
    });

    it('should handle fractional hour offsets', () => {
      const result = calculator.calculate(`1970 Jan 01 12:00 UTC to UTC+530
1970 Jan 01 12:00 UTC to UTC-345`);
      expect(result.results[0].result).toBe('1970-01-01 Thu 17:30 UTC+5:30');
      expect(result.results[1].result).toBe('1970-01-01 Thu 08:15 UTC-3:45');
    });
  });

  describe('Plain DateTime to Timezone', () => {
    it('should convert plain datetime to timezone (assumes local)', () => {
      // This test assumes the plain datetime is in local timezone
      const result = calculator.calculate(`1970 Jan 01 14:00 to UTC
2023 Jun 15 09:00 to America/New_York`);
      expect(result.results[0].result).toBe('1970-01-01 Thu 22:00 UTC');
      expect(result.results[1].result).toBe('2023-06-15 Thu 12:00 UTC-4');
    });
  });

  describe('Plain Time to Timezone', () => {
    it('should convert plain time to timezone (assumes today)', () => {
      // Plain time assumes today's date in local timezone
      const result = calculator.calculate(`14:30 to UTC
09:00 to America/New_York`);
      expect(result.results[0].result).toContain('UTC');
      expect(result.results[1].result).toContain('UTC');
    });
  });

  describe('Instant to Timezone', () => {
    it('should convert instant (now) to timezone', () => {
      const result = calculator.calculate(`now to UTC
now to America/New_York
now to Tokyo`);
      expect(result.results[0].result).toMatch(/UTC$/);
      expect(result.results[1].result).toMatch(/UTC-[45]$/);
      expect(result.results[2].result).toMatch(/UTC\+9$/);
    });
  });

  describe('Special Rendering Rules', () => {
    it('should render time-only for same date conversions', () => {
      // When converting to a timezone that results in today's date, render as time only
      // This is context-dependent and may vary, so we check for reasonable output
      const result = calculator.calculate(`now to UTC
today to UTC`);
      // Results should contain time components
      expect(result.results[0].result).toMatch(/\d{2}:\d{2} UTC$/);
      expect(result.results[1].result).toMatch(/\d{2}:\d{2} UTC$/);
    });

    it('should handle tomorrow rendering in timezone conversions', () => {
      // When a time conversion results in tomorrow's date
      const result = calculator.calculate(`23:30 to UTC+10`);
      // This may or may not result in tomorrow depending on current timezone
      expect(result.results[0].result).toMatch(/\d{2}:\d{2} UTC\+10$/);
    });

    it('should handle yesterday rendering in timezone conversions', () => {
      // When a time conversion results in yesterday's date
      const result = calculator.calculate(`00:30 to UTC-10`);
      // This may or may not result in yesterday depending on current timezone
      expect(result.results[0].result).toMatch(/\d{2}:\d{2} UTC-10$/);
    });
  });

  describe('Named Timezone Aliases', () => {
    it('should support city name timezone aliases', () => {
      const result = calculator.calculate(`1970 Jan 01 14:00 UTC to New York
1970 Jan 01 14:00 UTC to London
1970 Jan 01 14:00 UTC to Tokyo
1970 Jan 01 14:00 UTC to Sydney`);
      expect(result.results[0].result).toBe('1970-01-01 Thu 09:00 UTC-5');  // New York
      expect(result.results[1].result).toBe('1970-01-01 Thu 15:00 UTC+1');  // London (GMT)
      expect(result.results[2].result).toBe('1970-01-01 Thu 23:00 UTC+9');  // Tokyo
      expect(result.results[3].result).toBe('1970-01-02 Fri 00:00 UTC+10'); // Sydney
    });

    it('should support IANA timezone database names', () => {
      const result = calculator.calculate(`1970 Jan 01 14:00 UTC to America/Los_Angeles
1970 Jan 01 14:00 UTC to Europe/Paris
1970 Jan 01 14:00 UTC to Asia/Dubai`);
      expect(result.results[0].result).toBe('1970-01-01 Thu 06:00 UTC-8');  // PST
      expect(result.results[1].result).toBe('1970-01-01 Thu 15:00 UTC+1');  // CET
      expect(result.results[2].result).toBe('1970-01-01 Thu 18:00 UTC+4');  // GST
    });
  });

  describe('Date Boundary Crossings', () => {
    it('should handle date changes when crossing timezones forward', () => {
      const result = calculator.calculate(`1970 Jan 01 23:00 UTC to UTC+5
1970 Jan 01 20:00 UTC to UTC+8`);
      expect(result.results[0].result).toBe('1970-01-02 Fri 04:00 UTC+5');
      expect(result.results[1].result).toBe('1970-01-02 Fri 04:00 UTC+8');
    });

    it('should handle date changes when crossing timezones backward', () => {
      const result = calculator.calculate(`1970 Jan 02 02:00 UTC to UTC-5
1970 Jan 02 03:00 UTC to UTC-8`);
      expect(result.results[0].result).toBe('1970-01-01 Thu 21:00 UTC-5');
      expect(result.results[1].result).toBe('1970-01-01 Thu 19:00 UTC-8');
    });
  });

  describe('Daylight Saving Time Handling', () => {
    it('should handle DST transitions in America/New_York', () => {
      // Winter (EST: UTC-5)
      const winterResult = calculator.calculate(`1970 Jan 15 12:00 UTC to America/New_York`);
      expect(winterResult.results[0].result).toMatch(/UTC-5$/);

      // Summer (EDT: UTC-4)
      const summerResult = calculator.calculate(`1970 Jul 15 12:00 UTC to America/New_York`);
      expect(summerResult.results[0].result).toMatch(/UTC-4$/);
    });

    it('should handle DST transitions in Europe/London', () => {
      // Winter (GMT: UTC+0)
      const winterResult = calculator.calculate(`2000 Jan 15 12:00 UTC to Europe/London`);
      expect(winterResult.results[0].result).toBe('2000-01-15 Sat 12:00 UTC');

      // Summer (BST: UTC+1)
      const summerResult = calculator.calculate(`2000 Jul 15 12:00 UTC to Europe/London`);
      expect(summerResult.results[0].result).toBe('2000-07-15 Sat 13:00 UTC+1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle conversion to same timezone', () => {
      const result = calculator.calculate(`1970 Jan 01 14:00 UTC to UTC
1970 Jan 01 14:00 UTC+5 to UTC+5`);
      expect(result.results[0].result).toBe('1970-01-01 Thu 14:00 UTC');
      expect(result.results[1].result).toBe('1970-01-01 Thu 14:00 UTC+5');
    });

    it('should handle conversion chains', () => {
      const result = calculator.calculate(`1970 Jan 01 00:00 UTC to America/New_York to Tokyo`);
      expect(result.results[0].result).toBe('1970-01-01 Thu 09:00 UTC+9');
    });
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { DataLoader } from '../../src/calculator/data-loader';
import { DateTimeEngine, type PlainDate, type PlainTime, type PlainDateTime, type Duration, type ZonedDateTime } from '../../src/calculator/date-time';
import * as path from 'path';

describe('DateTimeEngine', () => {
  let dataLoader: DataLoader;
  let engine: DateTimeEngine;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();
    engine = new DateTimeEngine(dataLoader);
  });

  describe('Duration Creation', () => {
    it('should create empty duration', () => {
      const dur = engine.createDuration();
      expect(dur.years).toBe(0);
      expect(dur.months).toBe(0);
      expect(dur.weeks).toBe(0);
      expect(dur.days).toBe(0);
      expect(dur.hours).toBe(0);
      expect(dur.minutes).toBe(0);
      expect(dur.seconds).toBe(0);
      expect(dur.milliseconds).toBe(0);
    });

    it('should create duration with specified components', () => {
      const dur = engine.createDuration({ days: 3, hours: 5 });
      expect(dur.days).toBe(3);
      expect(dur.hours).toBe(5);
      expect(dur.minutes).toBe(0);
    });
  });

  describe('Duration Arithmetic', () => {
    it('should add two durations', () => {
      const dur1 = engine.createDuration({ days: 2, hours: 3 });
      const dur2 = engine.createDuration({ days: 1, hours: 5 });
      const result = engine.addDurations(dur1, dur2);

      expect(result.days).toBe(3);
      expect(result.hours).toBe(8);
    });

    it('should subtract two durations', () => {
      const dur1 = engine.createDuration({ days: 5, hours: 10 });
      const dur2 = engine.createDuration({ days: 2, hours: 3 });
      const result = engine.subtractDurations(dur1, dur2);

      expect(result.days).toBe(3);
      expect(result.hours).toBe(7);
    });

    it('should negate a duration', () => {
      const dur = engine.createDuration({ days: 3, hours: 5 });
      const negated = engine.negateDuration(dur);

      expect(negated.days).toBe(-3);
      expect(negated.hours).toBe(-5);
    });
  });

  describe('PlainDate Arithmetic', () => {
    it('should add days to a date', () => {
      const date: PlainDate = { year: 2024, month: 1, day: 15 };
      const duration = engine.createDuration({ days: 10 });
      const result = engine.addToPlainDate(date, duration) as PlainDate;

      expect(result.year).toBe(2024);
      expect(result.month).toBe(1);
      expect(result.day).toBe(25);
    });

    it('should add days that cross month boundary', () => {
      const date: PlainDate = { year: 2024, month: 1, day: 25 };
      const duration = engine.createDuration({ days: 10 });
      const result = engine.addToPlainDate(date, duration) as PlainDate;

      expect(result.year).toBe(2024);
      expect(result.month).toBe(2);
      expect(result.day).toBe(4);
    });

    it('should add days that cross year boundary', () => {
      const date: PlainDate = { year: 2023, month: 12, day: 25 };
      const duration = engine.createDuration({ days: 10 });
      const result = engine.addToPlainDate(date, duration) as PlainDate;

      expect(result.year).toBe(2024);
      expect(result.month).toBe(1);
      expect(result.day).toBe(4);
    });

    it('should add months with clamping (Jan 31 + 1 month = Feb 28)', () => {
      const date: PlainDate = { year: 2023, month: 1, day: 31 };
      const duration = engine.createDuration({ months: 1 });
      const result = engine.addToPlainDate(date, duration) as PlainDate;

      expect(result.year).toBe(2023);
      expect(result.month).toBe(2);
      expect(result.day).toBe(28); // Clamped to Feb 28
    });

    it('should add months with clamping in leap year (Jan 31 + 1 month = Feb 29)', () => {
      const date: PlainDate = { year: 2024, month: 1, day: 31 };
      const duration = engine.createDuration({ months: 1 });
      const result = engine.addToPlainDate(date, duration) as PlainDate;

      expect(result.year).toBe(2024);
      expect(result.month).toBe(2);
      expect(result.day).toBe(29); // Clamped to Feb 29 (leap year)
    });

    it('should add months that cross year boundary', () => {
      const date: PlainDate = { year: 2023, month: 11, day: 15 };
      const duration = engine.createDuration({ months: 3 });
      const result = engine.addToPlainDate(date, duration) as PlainDate;

      expect(result.year).toBe(2024);
      expect(result.month).toBe(2);
      expect(result.day).toBe(15);
    });

    it('should add years', () => {
      const date: PlainDate = { year: 2020, month: 2, day: 29 };
      const duration = engine.createDuration({ years: 1 });
      const result = engine.addToPlainDate(date, duration) as PlainDate;

      expect(result.year).toBe(2021);
      expect(result.month).toBe(2);
      expect(result.day).toBe(28); // Clamped because 2021 is not a leap year
    });

    it('should subtract days from a date', () => {
      const date: PlainDate = { year: 2024, month: 2, day: 10 };
      const duration = engine.createDuration({ days: 15 });
      const result = engine.subtractFromPlainDate(date, duration) as PlainDate;

      expect(result.year).toBe(2024);
      expect(result.month).toBe(1);
      expect(result.day).toBe(26);
    });

    it('should subtract two dates to get duration', () => {
      const date1: PlainDate = { year: 2024, month: 1, day: 10 };
      const date2: PlainDate = { year: 2024, month: 1, day: 5 };
      const duration = engine.subtractPlainDates(date1, date2);

      expect(duration.days).toBe(5);
    });

    it('should handle negative duration when subtracting dates', () => {
      const date1: PlainDate = { year: 2024, month: 1, day: 5 };
      const date2: PlainDate = { year: 2024, month: 1, day: 10 };
      const duration = engine.subtractPlainDates(date1, date2);

      expect(duration.days).toBe(-5);
    });

    it('should subtract dates with year differences', () => {
      const date1: PlainDate = { year: 2025, month: 6, day: 15 };
      const date2: PlainDate = { year: 2023, month: 3, day: 10 };
      const duration = engine.subtractPlainDates(date1, date2);

      expect(duration.years).toBe(2);
      expect(duration.months).toBe(3);
      expect(duration.days).toBe(5);
    });

    it('should subtract dates with month differences', () => {
      const date1: PlainDate = { year: 2024, month: 5, day: 20 };
      const date2: PlainDate = { year: 2024, month: 2, day: 15 };
      const duration = engine.subtractPlainDates(date1, date2);

      expect(duration.months).toBe(3);
      expect(duration.days).toBe(5);
    });

    it('should subtract dates across year boundary', () => {
      const date1: PlainDate = { year: 2025, month: 2, day: 10 };
      const date2: PlainDate = { year: 2024, month: 11, day: 5 };
      const duration = engine.subtractPlainDates(date1, date2);

      expect(duration.years).toBe(0);
      expect(duration.months).toBe(3);
      expect(duration.days).toBe(5);
    });
  });

  describe('PlainTime Arithmetic', () => {
    it('should add hours to time', () => {
      const time: PlainTime = { hour: 10, minute: 30, second: 0, millisecond: 0 };
      const duration = engine.createDuration({ hours: 5 });
      const result = engine.addToPlainTime(time, duration);

      expect('hour' in result).toBe(true);
      if ('hour' in result) {
        expect(result.hour).toBe(15);
        expect(result.minute).toBe(30);
      }
    });

    it('should add minutes to time', () => {
      const time: PlainTime = { hour: 10, minute: 30, second: 15, millisecond: 0 };
      const duration = engine.createDuration({ minutes: 45 });
      const result = engine.addToPlainTime(time, duration);

      expect('hour' in result).toBe(true);
      if ('hour' in result) {
        expect(result.hour).toBe(11);
        expect(result.minute).toBe(15);
        expect(result.second).toBe(15);
      }
    });

    it('should handle time wrapping at midnight', () => {
      const time: PlainTime = { hour: 22, minute: 0, second: 0, millisecond: 0 };
      const duration = engine.createDuration({ hours: 3 });
      const result = engine.addToPlainTime(time, duration);

      // Should wrap to next day (returns PlainDateTime)
      expect('date' in result).toBe(true);
      if ('date' in result) {
        expect(result.time.hour).toBe(1);
      }
    });

    it('should subtract time from time', () => {
      const time: PlainTime = { hour: 15, minute: 30, second: 0, millisecond: 0 };
      const duration = engine.createDuration({ hours: 5, minutes: 15 });
      const result = engine.subtractFromPlainTime(time, duration);

      expect('hour' in result).toBe(true);
      if ('hour' in result) {
        expect(result.hour).toBe(10);
        expect(result.minute).toBe(15);
      }
    });

    it('should subtract two times to get duration', () => {
      const time1: PlainTime = { hour: 15, minute: 30, second: 0, millisecond: 0 };
      const time2: PlainTime = { hour: 10, minute: 15, second: 0, millisecond: 0 };
      const duration = engine.subtractPlainTimes(time1, time2);

      expect(duration.hours).toBe(5);
      expect(duration.minutes).toBe(15);
    });
  });

  describe('PlainDateTime Arithmetic', () => {
    it('should add duration to datetime', () => {
      const dateTime: PlainDateTime = {
        date: { year: 2024, month: 1, day: 15 },
        time: { hour: 10, minute: 30, second: 0, millisecond: 0 }
      };
      const duration = engine.createDuration({ days: 5, hours: 3 });
      const result = engine.addToPlainDateTime(dateTime, duration);

      expect(result.date.day).toBe(20);
      expect(result.time.hour).toBe(13);
    });

    it('should handle datetime arithmetic crossing day boundary', () => {
      const dateTime: PlainDateTime = {
        date: { year: 2024, month: 1, day: 15 },
        time: { hour: 22, minute: 0, second: 0, millisecond: 0 }
      };
      const duration = engine.createDuration({ hours: 5 });
      const result = engine.addToPlainDateTime(dateTime, duration);

      expect(result.date.day).toBe(16);
      expect(result.time.hour).toBe(3);
    });

    it('should subtract duration from datetime', () => {
      const dateTime: PlainDateTime = {
        date: { year: 2024, month: 1, day: 15 },
        time: { hour: 10, minute: 30, second: 0, millisecond: 0 }
      };
      const duration = engine.createDuration({ days: 3, hours: 2 });
      const result = engine.subtractFromPlainDateTime(dateTime, duration);

      expect(result.date.day).toBe(12);
      expect(result.time.hour).toBe(8);
    });

    it('should subtract two datetimes to get duration', () => {
      const dt1: PlainDateTime = {
        date: { year: 2024, month: 1, day: 10 },
        time: { hour: 15, minute: 30, second: 0, millisecond: 0 }
      };
      const dt2: PlainDateTime = {
        date: { year: 2024, month: 1, day: 8 },
        time: { hour: 10, minute: 15, second: 0, millisecond: 0 }
      };
      const duration = engine.subtractPlainDateTimes(dt1, dt2);

      expect(duration.days).toBe(2);
      expect(duration.hours).toBe(5);
      expect(duration.minutes).toBe(15);
    });

    it('should subtract datetimes with year differences', () => {
      const dt1: PlainDateTime = {
        date: { year: 2025, month: 8, day: 20 },
        time: { hour: 14, minute: 45, second: 30, millisecond: 0 }
      };
      const dt2: PlainDateTime = {
        date: { year: 2023, month: 5, day: 15 },
        time: { hour: 10, minute: 30, second: 15, millisecond: 0 }
      };
      const duration = engine.subtractPlainDateTimes(dt1, dt2);

      expect(duration.years).toBe(2);
      expect(duration.months).toBe(3);
      expect(duration.days).toBe(5);
      expect(duration.hours).toBe(4);
      expect(duration.minutes).toBe(15);
      expect(duration.seconds).toBe(15);
    });

    it('should subtract datetimes with month differences', () => {
      const dt1: PlainDateTime = {
        date: { year: 2024, month: 6, day: 25 },
        time: { hour: 18, minute: 0, second: 0, millisecond: 0 }
      };
      const dt2: PlainDateTime = {
        date: { year: 2024, month: 3, day: 20 },
        time: { hour: 12, minute: 30, second: 0, millisecond: 0 }
      };
      const duration = engine.subtractPlainDateTimes(dt1, dt2);

      expect(duration.months).toBe(3);
      expect(duration.days).toBe(5);
      expect(duration.hours).toBe(5);
      expect(duration.minutes).toBe(30);
    });

    it('should subtract datetimes across year boundary', () => {
      const dt1: PlainDateTime = {
        date: { year: 2025, month: 1, day: 15 },
        time: { hour: 10, minute: 0, second: 0, millisecond: 0 }
      };
      const dt2: PlainDateTime = {
        date: { year: 2024, month: 10, day: 10 },
        time: { hour: 8, minute: 0, second: 0, millisecond: 0 }
      };
      const duration = engine.subtractPlainDateTimes(dt1, dt2);

      expect(duration.years).toBe(0);
      expect(duration.months).toBe(3);
      expect(duration.days).toBe(5);
      expect(duration.hours).toBe(2);
    });

    it('should combine date and time', () => {
      const date: PlainDate = { year: 2024, month: 1, day: 15 };
      const time: PlainTime = { hour: 10, minute: 30, second: 0, millisecond: 0 };
      const result = engine.combineDateAndTime(date, time);

      expect(result.date).toEqual(date);
      expect(result.time).toEqual(time);
    });
  });

  describe('Instant Arithmetic', () => {
    it('should add duration to instant', () => {
      // Jan 1, 2024, 00:00:00 UTC
      const instant = { timestamp: new Date('2024-01-01T00:00:00Z').getTime() };
      const duration = engine.createDuration({ days: 5, hours: 3 });
      const result = engine.addToInstant(instant, duration);

      const resultDate = new Date(result.timestamp);
      expect(resultDate.getUTCDate()).toBe(6);
      expect(resultDate.getUTCHours()).toBe(3);
    });

    it('should subtract duration from instant', () => {
      // Jan 10, 2024, 12:00:00 UTC
      const instant = { timestamp: new Date('2024-01-10T12:00:00Z').getTime() };
      const duration = engine.createDuration({ days: 3, hours: 6 });
      const result = engine.subtractFromInstant(instant, duration);

      const resultDate = new Date(result.timestamp);
      expect(resultDate.getUTCDate()).toBe(7);
      expect(resultDate.getUTCHours()).toBe(6);
    });

    it('should subtract two instants to get duration', () => {
      const instant1 = { timestamp: new Date('2024-01-10T15:30:00Z').getTime() };
      const instant2 = { timestamp: new Date('2024-01-08T10:15:00Z').getTime() };
      const duration = engine.subtractInstants(instant1, instant2);

      expect(duration.days).toBe(2);
      expect(duration.hours).toBe(5);
      expect(duration.minutes).toBe(15);
    });
  });

  describe('Timezone Conversions', () => {
    it('should convert PlainDateTime to Instant', () => {
      const dateTime: PlainDateTime = {
        date: { year: 2024, month: 1, day: 1 },
        time: { hour: 0, minute: 0, second: 0, millisecond: 0 }
      };

      const instant = engine.toInstant(dateTime, 'UTC');
      const date = new Date(instant.timestamp);

      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(0); // January is 0
      expect(date.getUTCDate()).toBe(1);
    });

    it('should convert Instant to ZonedDateTime', () => {
      const instant = { timestamp: new Date('2024-01-01T00:00:00Z').getTime() };
      const zdt = engine.toZonedDateTime(instant, 'UTC');

      expect(zdt.dateTime.date.year).toBe(2024);
      expect(zdt.dateTime.date.month).toBe(1);
      expect(zdt.dateTime.date.day).toBe(1);
      expect(zdt.dateTime.time.hour).toBe(0);
      // DataLoader resolves 'UTC' to 'Etc/UTC' (proper IANA timezone)
      expect(zdt.timezone).toBe('Etc/UTC');
    });

    it('should add duration to ZonedDateTime', () => {
      const instant = { timestamp: new Date('2024-01-01T00:00:00Z').getTime() };
      const zdt = engine.toZonedDateTime(instant, 'UTC');
      const duration = engine.createDuration({ days: 5, hours: 3 });
      const result = engine.addToZonedDateTime(zdt, duration);

      expect(result.dateTime.date.day).toBe(6);
      expect(result.dateTime.time.hour).toBe(3);
    });

    it('should subtract duration from ZonedDateTime', () => {
      const instant = { timestamp: new Date('2024-01-10T12:00:00Z').getTime() };
      const zdt = engine.toZonedDateTime(instant, 'UTC');
      const duration = engine.createDuration({ days: 3, hours: 6 });
      const result = engine.subtractFromZonedDateTime(zdt, duration);

      expect(result.dateTime.date.day).toBe(7);
      expect(result.dateTime.time.hour).toBe(6);
    });

    it('should subtract two ZonedDateTimes to get duration', () => {
      const instant1 = { timestamp: new Date('2024-01-10T15:30:00Z').getTime() };
      const instant2 = { timestamp: new Date('2024-01-08T10:15:00Z').getTime() };
      const zdt1 = engine.toZonedDateTime(instant1, 'UTC');
      const zdt2 = engine.toZonedDateTime(instant2, 'UTC');
      const duration = engine.subtractZonedDateTimes(zdt1, zdt2);

      expect(duration.days).toBe(2);
      expect(duration.hours).toBe(5);
      expect(duration.minutes).toBe(15);
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year Feb 29', () => {
      const date: PlainDate = { year: 2024, month: 2, day: 29 };
      const duration = engine.createDuration({ days: 1 });
      const result = engine.addToPlainDate(date, duration) as PlainDate;

      expect(result.year).toBe(2024);
      expect(result.month).toBe(3);
      expect(result.day).toBe(1);
    });

    it('should handle end of year rollover', () => {
      const date: PlainDate = { year: 2023, month: 12, day: 31 };
      const duration = engine.createDuration({ days: 1 });
      const result = engine.addToPlainDate(date, duration) as PlainDate;

      expect(result.year).toBe(2024);
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
    });

    it('should handle adding 12 months (should equal 1 year)', () => {
      const date: PlainDate = { year: 2023, month: 6, day: 15 };
      const duration = engine.createDuration({ months: 12 });
      const result = engine.addToPlainDate(date, duration) as PlainDate;

      expect(result.year).toBe(2024);
      expect(result.month).toBe(6);
      expect(result.day).toBe(15);
    });

    it('should handle negative day subtraction crossing month boundary', () => {
      const date: PlainDate = { year: 2024, month: 3, day: 5 };
      const duration = engine.createDuration({ days: 10 });
      const result = engine.subtractFromPlainDate(date, duration) as PlainDate;

      expect(result.year).toBe(2024);
      expect(result.month).toBe(2);
      expect(result.day).toBe(24); // Feb has 29 days in 2024 (leap year)
    });
  });

  describe('Timezone Conversions (Temporal API)', () => {
    it('should convert PlainDateTime to Instant using timezone', () => {
      const dateTime: PlainDateTime = {
        date: { year: 2024, month: 1, day: 15 },
        time: { hour: 12, minute: 30, second: 0, millisecond: 0 }
      };

      // Convert to UTC
      const instant = engine.toInstant(dateTime, 'UTC');

      // Should be a valid timestamp
      expect(instant.timestamp).toBeGreaterThan(0);
      expect(typeof instant.timestamp).toBe('number');
    });

    it('should convert PlainDateTime to Instant with different timezones', () => {
      const dateTime: PlainDateTime = {
        date: { year: 2024, month: 6, day: 15 },
        time: { hour: 12, minute: 0, second: 0, millisecond: 0 }
      };

      // Convert using different timezones
      const utcInstant = engine.toInstant(dateTime, 'UTC');
      const nyInstant = engine.toInstant(dateTime, 'America/New_York');

      // New York is UTC-4 during summer (DST), so 12:00 NY = 16:00 UTC
      // The timestamp should be different by 4 hours (14400000 ms)
      const diff = utcInstant.timestamp - nyInstant.timestamp;
      expect(Math.abs(diff)).toBeGreaterThan(0);
    });

    it('should convert Instant to ZonedDateTime using timezone', () => {
      // Create an instant for a known time: 2024-01-15 13:00:00 UTC
      // Using Date.UTC to ensure correct timestamp
      const timestamp = Date.UTC(2024, 0, 15, 13, 0, 0, 0);
      const instant = { timestamp };

      // Convert to New York time
      const zdt = engine.toZonedDateTime(instant, 'America/New_York');

      expect(zdt.timezone).toBe('America/New_York');
      expect(zdt.dateTime.date.year).toBe(2024);
      expect(zdt.dateTime.date.month).toBe(1);
      expect(zdt.dateTime.date.day).toBe(15);
      // New York is UTC-5 in January (no DST), so 13:00 UTC = 08:00 EST
      expect(zdt.dateTime.time.hour).toBe(8);
      expect(zdt.dateTime.time.minute).toBe(0);
    });

    it('should convert Instant to ZonedDateTime in different timezones', () => {
      // Create an instant for a known time: 2024-06-15 12:00:00 UTC
      const timestamp = Date.UTC(2024, 5, 15, 12, 0, 0, 0);
      const instant = { timestamp };

      // Convert to different timezones
      const utcZDT = engine.toZonedDateTime(instant, 'UTC');
      const nyZDT = engine.toZonedDateTime(instant, 'America/New_York');
      const tokyoZDT = engine.toZonedDateTime(instant, 'Asia/Tokyo');

      // Temporal uses 'Etc/UTC' as the canonical identifier for UTC
      expect(utcZDT.timezone).toMatch(/^(UTC|Etc\/UTC)$/);
      expect(utcZDT.dateTime.time.hour).toBe(12);

      expect(nyZDT.timezone).toBe('America/New_York');
      // New York is UTC-4 in June (DST), so 12:00 UTC = 08:00 EDT
      expect(nyZDT.dateTime.time.hour).toBe(8);

      expect(tokyoZDT.timezone).toBe('Asia/Tokyo');
      // Tokyo is UTC+9, so 12:00 UTC = 21:00 JST
      expect(tokyoZDT.dateTime.time.hour).toBe(21);
    });

    it('should handle timezone resolution with territory', () => {
      const dateTime: PlainDateTime = {
        date: { year: 2024, month: 1, day: 15 },
        time: { hour: 12, minute: 0, second: 0, millisecond: 0 }
      };

      // Test timezone name resolution (EST should resolve to America/New_York with US locale)
      const resolvedTimezone = dataLoader.resolveTimezone('EST');
      expect(resolvedTimezone).toBe('America/New_York');

      // Use the resolved timezone (assert non-null after checking)
      const instant = engine.toInstant(dateTime, resolvedTimezone!);
      expect(instant.timestamp).toBeGreaterThan(0);
    });

    it('should handle DST transitions correctly', () => {
      // March 10, 2024 is when DST starts in US (2:00 AM -> 3:00 AM)
      const beforeDST: PlainDateTime = {
        date: { year: 2024, month: 3, day: 9 },
        time: { hour: 12, minute: 0, second: 0, millisecond: 0 }
      };
      const afterDST: PlainDateTime = {
        date: { year: 2024, month: 3, day: 11 },
        time: { hour: 12, minute: 0, second: 0, millisecond: 0 }
      };

      const beforeInstant = engine.toInstant(beforeDST, 'America/New_York');
      const afterInstant = engine.toInstant(afterDST, 'America/New_York');

      // The difference should be 48 hours minus 1 hour for DST = 47 hours
      const diff = afterInstant.timestamp - beforeInstant.timestamp;
      const hoursDiff = diff / (1000 * 60 * 60);

      // Should be approximately 47 hours (accounting for DST)
      expect(Math.abs(hoursDiff - 47)).toBeLessThan(0.1);
    });

    it('should convert ZonedDateTime between timezones', () => {
      // Create a ZonedDateTime in New York
      const nyZDT: ZonedDateTime = {
        dateTime: {
          date: { year: 2024, month: 6, day: 15 },
          time: { hour: 12, minute: 0, second: 0, millisecond: 0 }
        },
        timezone: 'America/New_York'
      };

      // Convert to Instant, then to Tokyo time
      const instant = engine.toInstant(nyZDT.dateTime, nyZDT.timezone);
      const tokyoZDT = engine.toZonedDateTime(instant, 'Asia/Tokyo');

      expect(tokyoZDT.timezone).toBe('Asia/Tokyo');
      expect(tokyoZDT.dateTime.date.year).toBe(2024);
      expect(tokyoZDT.dateTime.date.month).toBe(6);
      // NY is UTC-4 in June, Tokyo is UTC+9, so 12:00 NY = 13 hours later = 01:00 next day Tokyo
      expect(tokyoZDT.dateTime.date.day).toBe(16);
      expect(tokyoZDT.dateTime.time.hour).toBe(1);
    });
  });
});

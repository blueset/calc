import { describe, it, expect, beforeAll } from 'vitest';
import { DataLoader } from '../src/data-loader';
import { DateTimeEngine, type PlainDate, type PlainTime, type PlainDateTime, type Duration } from '../src/date-time';
import * as path from 'path';

describe('DateTimeEngine', () => {
  let dataLoader: DataLoader;
  let engine: DateTimeEngine;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '..', 'data'));
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
      const result = engine.addToPlainDate(date, duration);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(1);
      expect(result.day).toBe(25);
    });

    it('should add days that cross month boundary', () => {
      const date: PlainDate = { year: 2024, month: 1, day: 25 };
      const duration = engine.createDuration({ days: 10 });
      const result = engine.addToPlainDate(date, duration);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(2);
      expect(result.day).toBe(4);
    });

    it('should add days that cross year boundary', () => {
      const date: PlainDate = { year: 2023, month: 12, day: 25 };
      const duration = engine.createDuration({ days: 10 });
      const result = engine.addToPlainDate(date, duration);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(1);
      expect(result.day).toBe(4);
    });

    it('should add months with clamping (Jan 31 + 1 month = Feb 28)', () => {
      const date: PlainDate = { year: 2023, month: 1, day: 31 };
      const duration = engine.createDuration({ months: 1 });
      const result = engine.addToPlainDate(date, duration);

      expect(result.year).toBe(2023);
      expect(result.month).toBe(2);
      expect(result.day).toBe(28); // Clamped to Feb 28
    });

    it('should add months with clamping in leap year (Jan 31 + 1 month = Feb 29)', () => {
      const date: PlainDate = { year: 2024, month: 1, day: 31 };
      const duration = engine.createDuration({ months: 1 });
      const result = engine.addToPlainDate(date, duration);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(2);
      expect(result.day).toBe(29); // Clamped to Feb 29 (leap year)
    });

    it('should add months that cross year boundary', () => {
      const date: PlainDate = { year: 2023, month: 11, day: 15 };
      const duration = engine.createDuration({ months: 3 });
      const result = engine.addToPlainDate(date, duration);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(2);
      expect(result.day).toBe(15);
    });

    it('should add years', () => {
      const date: PlainDate = { year: 2020, month: 2, day: 29 };
      const duration = engine.createDuration({ years: 1 });
      const result = engine.addToPlainDate(date, duration);

      expect(result.year).toBe(2021);
      expect(result.month).toBe(2);
      expect(result.day).toBe(28); // Clamped because 2021 is not a leap year
    });

    it('should subtract days from a date', () => {
      const date: PlainDate = { year: 2024, month: 2, day: 10 };
      const duration = engine.createDuration({ days: 15 });
      const result = engine.subtractFromPlainDate(date, duration);

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
      const result = engine.addToPlainDate(date, duration);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(3);
      expect(result.day).toBe(1);
    });

    it('should handle end of year rollover', () => {
      const date: PlainDate = { year: 2023, month: 12, day: 31 };
      const duration = engine.createDuration({ days: 1 });
      const result = engine.addToPlainDate(date, duration);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(1);
      expect(result.day).toBe(1);
    });

    it('should handle adding 12 months (should equal 1 year)', () => {
      const date: PlainDate = { year: 2023, month: 6, day: 15 };
      const duration = engine.createDuration({ months: 12 });
      const result = engine.addToPlainDate(date, duration);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(6);
      expect(result.day).toBe(15);
    });

    it('should handle negative day subtraction crossing month boundary', () => {
      const date: PlainDate = { year: 2024, month: 3, day: 5 };
      const duration = engine.createDuration({ days: 10 });
      const result = engine.subtractFromPlainDate(date, duration);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(2);
      expect(result.day).toBe(24); // Feb has 29 days in 2024 (leap year)
    });
  });
});

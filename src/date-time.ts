import type { DataLoader } from './data-loader';
import { Temporal } from '@js-temporal/polyfill';

/**
 * Duration representation following Temporal spec
 * Durations are stored as separate date and time components
 * because month/year arithmetic requires calendar-aware operations
 */
export interface Duration {
  // Date components
  years: number;
  months: number;
  weeks: number;
  days: number;

  // Time components
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

/**
 * PlainDate representation (calendar date without time or timezone)
 */
export interface PlainDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

/**
 * PlainTime representation (time without date or timezone)
 */
export interface PlainTime {
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
  millisecond: number; // 0-999
}

/**
 * PlainDateTime representation (date and time without timezone)
 */
export interface PlainDateTime {
  date: PlainDate;
  time: PlainTime;
}

/**
 * Instant representation (absolute point in time, stored as Unix timestamp)
 */
export interface Instant {
  timestamp: number; // milliseconds since Unix epoch
}

/**
 * ZonedDateTime representation (date, time, and timezone)
 */
export interface ZonedDateTime {
  dateTime: PlainDateTime;
  timezone: string; // IANA timezone
}

/**
 * Date/Time arithmetic engine
 * Implements Temporal-spec arithmetic operations
 */
export class DateTimeEngine {
  constructor(private dataLoader: DataLoader) {}

  /**
   * Create a duration from components
   */
  createDuration(components: Partial<Duration> = {}): Duration {
    return {
      years: components.years || 0,
      months: components.months || 0,
      weeks: components.weeks || 0,
      days: components.days || 0,
      hours: components.hours || 0,
      minutes: components.minutes || 0,
      seconds: components.seconds || 0,
      milliseconds: components.milliseconds || 0
    };
  }

  /**
   * Add duration to PlainDate
   * Implements month clamping: Jan 31 + 1 month = Feb 28/29
   * Uses Temporal API for accurate date arithmetic
   */
  addToPlainDate(date: PlainDate, duration: Duration): PlainDate {
    const temporalDate = Temporal.PlainDate.from({
      year: date.year,
      month: date.month,
      day: date.day
    });

    const result = temporalDate.add({
      years: duration.years,
      months: duration.months,
      weeks: duration.weeks,
      days: duration.days
    }, { overflow: 'constrain' });  // Handles month-end clamping automatically

    return { year: result.year, month: result.month, day: result.day };
  }

  /**
   * Subtract duration from PlainDate
   */
  subtractFromPlainDate(date: PlainDate, duration: Duration): PlainDate {
    // Negate the duration and add
    const negated = this.negateDuration(duration);
    return this.addToPlainDate(date, negated);
  }

  /**
   * Add duration to PlainTime
   * Returns PlainDateTime if the result crosses day boundaries or has date components
   * Uses Temporal API for accurate time arithmetic
   */
  addToPlainTime(time: PlainTime, duration: Duration): PlainTime | PlainDateTime {
    // Check if duration has date components OR if time arithmetic might cross day boundary
    const hasDateComponents = duration.years !== 0 || duration.months !== 0 ||
                              duration.weeks !== 0 || duration.days !== 0;

    // For time-only arithmetic, we need to detect day boundary crossing
    // Use PlainDateTime arithmetic to detect this
    if (hasDateComponents || duration.hours !== 0 || duration.minutes !== 0 ||
        duration.seconds !== 0 || duration.milliseconds !== 0) {
      const now = Temporal.Now.plainDateTimeISO();
      const dateTime = Temporal.PlainDateTime.from({
        year: now.year,
        month: now.month,
        day: now.day,
        hour: time.hour,
        minute: time.minute,
        second: time.second,
        millisecond: time.millisecond
      });

      const result = dateTime.add(duration, { overflow: 'constrain' });

      // If date changed, return PlainDateTime
      if (result.year !== now.year || result.month !== now.month || result.day !== now.day) {
        return {
          date: { year: result.year, month: result.month, day: result.day },
          time: { hour: result.hour, minute: result.minute, second: result.second, millisecond: result.millisecond }
        };
      }

      // Date didn't change, return just PlainTime
      return {
        hour: result.hour,
        minute: result.minute,
        second: result.second,
        millisecond: result.millisecond
      };
    }

    // No duration at all, return unchanged time
    return time;
  }

  /**
   * Subtract duration from PlainTime
   */
  subtractFromPlainTime(time: PlainTime, duration: Duration): PlainTime | PlainDateTime {
    const negated = this.negateDuration(duration);
    return this.addToPlainTime(time, negated);
  }

  /**
   * Add duration to PlainDateTime
   * Uses Temporal API for accurate datetime arithmetic
   */
  addToPlainDateTime(dateTime: PlainDateTime, duration: Duration): PlainDateTime {
    const temporal = Temporal.PlainDateTime.from({
      year: dateTime.date.year,
      month: dateTime.date.month,
      day: dateTime.date.day,
      hour: dateTime.time.hour,
      minute: dateTime.time.minute,
      second: dateTime.time.second,
      millisecond: dateTime.time.millisecond
    });

    const result = temporal.add(duration, { overflow: 'constrain' });

    return {
      date: { year: result.year, month: result.month, day: result.day },
      time: { hour: result.hour, minute: result.minute, second: result.second, millisecond: result.millisecond }
    };
  }

  /**
   * Subtract duration from PlainDateTime
   */
  subtractFromPlainDateTime(dateTime: PlainDateTime, duration: Duration): PlainDateTime {
    const negated = this.negateDuration(duration);
    return this.addToPlainDateTime(dateTime, negated);
  }

  /**
   * Subtract two PlainDates to get a duration
   * Uses Temporal API for accurate date difference calculation
   */
  subtractPlainDates(left: PlainDate, right: PlainDate): Duration {
    const leftTemporal = Temporal.PlainDate.from({
      year: left.year,
      month: left.month,
      day: left.day
    });
    const rightTemporal = Temporal.PlainDate.from({
      year: right.year,
      month: right.month,
      day: right.day
    });

    // since() calculates right to left (left - right), which matches expected semantics
    const duration = leftTemporal.since(rightTemporal, { largestUnit: 'year' });

    return this.createDuration({
      years: duration.years,
      months: duration.months,
      weeks: duration.weeks,
      days: duration.days
    });
  }

  /**
   * Subtract two PlainTimes to get a duration
   * Uses Temporal API for accurate time difference calculation
   */
  subtractPlainTimes(left: PlainTime, right: PlainTime): Duration {
    const leftTemporal = Temporal.PlainTime.from({
      hour: left.hour,
      minute: left.minute,
      second: left.second,
      millisecond: left.millisecond
    });
    const rightTemporal = Temporal.PlainTime.from({
      hour: right.hour,
      minute: right.minute,
      second: right.second,
      millisecond: right.millisecond
    });

    // since() calculates right to left (left - right), which matches expected semantics
    const duration = leftTemporal.since(rightTemporal, { largestUnit: 'hour' });

    return this.createDuration({
      hours: duration.hours,
      minutes: duration.minutes,
      seconds: duration.seconds,
      milliseconds: duration.milliseconds
    });
  }

  /**
   * Subtract two PlainDateTimes to get a duration
   * Uses Temporal API for accurate datetime difference calculation
   */
  subtractPlainDateTimes(left: PlainDateTime, right: PlainDateTime): Duration {
    const leftTemporal = Temporal.PlainDateTime.from({
      year: left.date.year,
      month: left.date.month,
      day: left.date.day,
      hour: left.time.hour,
      minute: left.time.minute,
      second: left.time.second,
      millisecond: left.time.millisecond
    });
    const rightTemporal = Temporal.PlainDateTime.from({
      year: right.date.year,
      month: right.date.month,
      day: right.date.day,
      hour: right.time.hour,
      minute: right.time.minute,
      second: right.time.second,
      millisecond: right.time.millisecond
    });

    // since() calculates right to left (left - right), which matches expected semantics
    const duration = leftTemporal.since(rightTemporal, { largestUnit: 'year' });

    return this.createDuration({
      years: duration.years,
      months: duration.months,
      weeks: duration.weeks,
      days: duration.days,
      hours: duration.hours,
      minutes: duration.minutes,
      seconds: duration.seconds,
      milliseconds: duration.milliseconds
    });
  }

  /**
   * Add two durations
   */
  addDurations(left: Duration, right: Duration): Duration {
    return {
      years: left.years + right.years,
      months: left.months + right.months,
      weeks: left.weeks + right.weeks,
      days: left.days + right.days,
      hours: left.hours + right.hours,
      minutes: left.minutes + right.minutes,
      seconds: left.seconds + right.seconds,
      milliseconds: left.milliseconds + right.milliseconds
    };
  }

  /**
   * Subtract two durations
   */
  subtractDurations(left: Duration, right: Duration): Duration {
    return {
      years: left.years - right.years,
      months: left.months - right.months,
      weeks: left.weeks - right.weeks,
      days: left.days - right.days,
      hours: left.hours - right.hours,
      minutes: left.minutes - right.minutes,
      seconds: left.seconds - right.seconds,
      milliseconds: left.milliseconds - right.milliseconds
    };
  }

  /**
   * Negate a duration
   */
  negateDuration(duration: Duration): Duration {
    return {
      years: -duration.years,
      months: -duration.months,
      weeks: -duration.weeks,
      days: -duration.days,
      hours: -duration.hours,
      minutes: -duration.minutes,
      seconds: -duration.seconds,
      milliseconds: -duration.milliseconds
    };
  }

  /**
   * Add duration to Instant
   * Uses Temporal API for accurate instant arithmetic
   */
  addToInstant(instant: Instant, duration: Duration): Instant {
    const temporalInstant = Temporal.Instant.fromEpochMilliseconds(instant.timestamp);

    // For any calendar/day-based operations, work through UTC timezone
    // This is necessary because Instant doesn't support day-level durations directly
    if (duration.years !== 0 || duration.months !== 0 || duration.weeks !== 0 || duration.days !== 0) {
      const zdt = temporalInstant.toZonedDateTimeISO('UTC');
      const result = zdt.add(duration);
      return { timestamp: Number(result.toInstant().epochMilliseconds) };
    }

    // For pure time-based addition (hours/minutes/seconds/milliseconds)
    const result = temporalInstant.add({
      hours: duration.hours,
      minutes: duration.minutes,
      seconds: duration.seconds,
      milliseconds: duration.milliseconds
    });

    return { timestamp: Number(result.epochMilliseconds) };
  }

  /**
   * Subtract duration from Instant
   */
  subtractFromInstant(instant: Instant, duration: Duration): Instant {
    const negated = this.negateDuration(duration);
    return this.addToInstant(instant, negated);
  }

  /**
   * Subtract two Instants to get a duration
   * Uses Temporal API for accurate instant difference calculation
   */
  subtractInstants(left: Instant, right: Instant): Duration {
    const leftTemporal = Temporal.Instant.fromEpochMilliseconds(left.timestamp);
    const rightTemporal = Temporal.Instant.fromEpochMilliseconds(right.timestamp);

    // since() calculates right to left (left - right), which matches expected semantics
    const duration = leftTemporal.since(rightTemporal, { largestUnit: 'hour' });

    // Convert hours to days + remaining hours
    const totalHours = duration.hours;
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;

    return this.createDuration({
      days,
      hours: remainingHours,
      minutes: duration.minutes,
      seconds: duration.seconds,
      milliseconds: duration.milliseconds
    });
  }

  /**
   * Convert PlainDateTime to Instant using timezone
   * Uses DataLoader to resolve timezone names and Temporal for timezone offset calculation
   */
  toInstant(dateTime: PlainDateTime, timezone: string): Instant {
    // Resolve timezone using DataLoader
    const ianaTimezone = this.dataLoader.resolveTimezone(timezone) || timezone;

    // Use Temporal API for proper timezone-aware conversion
    // Create Temporal.PlainDateTime from our internal representation
    const temporalDateTime = Temporal.PlainDateTime.from({
      year: dateTime.date.year,
      month: dateTime.date.month,
      day: dateTime.date.day,
      hour: dateTime.time.hour,
      minute: dateTime.time.minute,
      second: dateTime.time.second,
      millisecond: dateTime.time.millisecond
    });

    // Convert to Temporal.Instant using the specific timezone
    // This properly accounts for timezone offsets and DST transitions
    const temporalInstant = temporalDateTime.toZonedDateTime(ianaTimezone).toInstant();

    // Convert Temporal.Instant to our internal Instant representation (Unix timestamp in milliseconds)
    const timestamp = Number(temporalInstant.epochMilliseconds);

    return { timestamp };
  }

  /**
   * Convert Instant to ZonedDateTime using Temporal for proper timezone conversion
   */
  toZonedDateTime(instant: Instant, timezone: string): ZonedDateTime {
    // Resolve timezone using DataLoader
    const ianaTimezone = this.dataLoader.resolveTimezone(timezone) || timezone;

    // Use Temporal API for proper timezone-aware conversion
    // Create Temporal.Instant from our internal representation
    const temporalInstant = Temporal.Instant.fromEpochMilliseconds(instant.timestamp);

    // Convert to ZonedDateTime in the target timezone
    // This properly accounts for timezone offsets and DST
    const temporalZDT = temporalInstant.toZonedDateTimeISO(ianaTimezone);

    // Extract components and convert to our internal representation
    return {
      dateTime: {
        date: {
          year: temporalZDT.year,
          month: temporalZDT.month,
          day: temporalZDT.day
        },
        time: {
          hour: temporalZDT.hour,
          minute: temporalZDT.minute,
          second: temporalZDT.second,
          millisecond: temporalZDT.millisecond
        }
      },
      timezone: ianaTimezone
    };
  }

  /**
   * Add duration to ZonedDateTime
   */
  addToZonedDateTime(zdt: ZonedDateTime, duration: Duration): ZonedDateTime {
    // Convert to instant, add duration, convert back
    const instant = this.toInstant(zdt.dateTime, zdt.timezone);
    const newInstant = this.addToInstant(instant, duration);
    return this.toZonedDateTime(newInstant, zdt.timezone);
  }

  /**
   * Subtract duration from ZonedDateTime
   */
  subtractFromZonedDateTime(zdt: ZonedDateTime, duration: Duration): ZonedDateTime {
    const negated = this.negateDuration(duration);
    return this.addToZonedDateTime(zdt, negated);
  }

  /**
   * Subtract two ZonedDateTimes to get a duration
   */
  subtractZonedDateTimes(left: ZonedDateTime, right: ZonedDateTime): Duration {
    const leftInstant = this.toInstant(left.dateTime, left.timezone);
    const rightInstant = this.toInstant(right.dateTime, right.timezone);
    return this.subtractInstants(leftInstant, rightInstant);
  }

  /**
   * Combine PlainDate and PlainTime to PlainDateTime
   */
  combineDateAndTime(date: PlainDate, time: PlainTime): PlainDateTime {
    return { date, time };
  }

}

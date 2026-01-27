import type { DataLoader } from './data-loader';

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
   */
  addToPlainDate(date: PlainDate, duration: Duration): PlainDate {
    let year = date.year;
    let month = date.month;
    let day = date.day;

    // Add years
    year += duration.years;

    // Add months
    month += duration.months;
    while (month > 12) {
      month -= 12;
      year += 1;
    }
    while (month < 1) {
      month += 12;
      year -= 1;
    }

    // Clamp day to valid range for the target month
    const maxDay = this.getDaysInMonth(year, month);
    if (day > maxDay) {
      day = maxDay;
    }

    // Add weeks
    day += duration.weeks * 7;

    // Add days
    day += duration.days;

    // Normalize day overflow/underflow
    while (day > this.getDaysInMonth(year, month)) {
      day -= this.getDaysInMonth(year, month);
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    while (day < 1) {
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      day += this.getDaysInMonth(year, month);
    }

    // If there are time components in duration, treat as PlainDateTime (handled by caller)
    // Here we just return the date part

    return { year, month, day };
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
   * Returns PlainDateTime if the result crosses day boundaries
   */
  addToPlainTime(time: PlainTime, duration: Duration): PlainTime | PlainDateTime {
    let millisecond = time.millisecond;
    let second = time.second;
    let minute = time.minute;
    let hour = time.hour;
    let dayOffset = 0;

    // Add milliseconds
    millisecond += duration.milliseconds;
    second += Math.floor(millisecond / 1000);
    millisecond = millisecond % 1000;
    if (millisecond < 0) {
      millisecond += 1000;
      second -= 1;
    }

    // Add seconds
    second += duration.seconds;
    minute += Math.floor(second / 60);
    second = second % 60;
    if (second < 0) {
      second += 60;
      minute -= 1;
    }

    // Add minutes
    minute += duration.minutes;
    hour += Math.floor(minute / 60);
    minute = minute % 60;
    if (minute < 0) {
      minute += 60;
      hour -= 1;
    }

    // Add hours
    hour += duration.hours;
    dayOffset = Math.floor(hour / 24);
    hour = hour % 24;
    if (hour < 0) {
      hour += 24;
      dayOffset -= 1;
    }

    // If no day offset and no date components in duration, return PlainTime
    if (dayOffset === 0 && duration.years === 0 && duration.months === 0 && duration.weeks === 0 && duration.days === 0) {
      return { hour, minute, second, millisecond };
    }

    // Otherwise, treat as PlainDateTime (assume today's date + offset)
    // For type-checking purposes, the caller should handle this case
    // Here we'll return PlainDateTime with a reference date
    const today = new Date();
    const date = this.addToPlainDate(
      { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() },
      { ...duration, days: duration.days + dayOffset, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }
    );

    return {
      date,
      time: { hour, minute, second, millisecond }
    };
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
   */
  addToPlainDateTime(dateTime: PlainDateTime, duration: Duration): PlainDateTime {
    // Handle time components and track day overflow
    let millisecond = dateTime.time.millisecond;
    let second = dateTime.time.second;
    let minute = dateTime.time.minute;
    let hour = dateTime.time.hour;
    let dayOffset = 0;

    // Add milliseconds
    millisecond += duration.milliseconds;
    second += Math.floor(millisecond / 1000);
    millisecond = millisecond % 1000;
    if (millisecond < 0) {
      millisecond += 1000;
      second -= 1;
    }

    // Add seconds
    second += duration.seconds;
    minute += Math.floor(second / 60);
    second = second % 60;
    if (second < 0) {
      second += 60;
      minute -= 1;
    }

    // Add minutes
    minute += duration.minutes;
    hour += Math.floor(minute / 60);
    minute = minute % 60;
    if (minute < 0) {
      minute += 60;
      hour -= 1;
    }

    // Add hours
    hour += duration.hours;
    dayOffset = Math.floor(hour / 24);
    hour = hour % 24;
    if (hour < 0) {
      hour += 24;
      dayOffset -= 1;
    }

    // Add date components plus day offset
    const totalDuration = { ...duration, days: duration.days + dayOffset, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
    const newDate = this.addToPlainDate(dateTime.date, totalDuration);

    return {
      date: newDate,
      time: { hour, minute, second, millisecond }
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
   */
  subtractPlainDates(left: PlainDate, right: PlainDate): Duration {
    // Convert both dates to day count from a reference point
    const leftDays = this.dateToDayCount(left);
    const rightDays = this.dateToDayCount(right);

    const dayDiff = leftDays - rightDays;

    return this.createDuration({ days: dayDiff });
  }

  /**
   * Subtract two PlainTimes to get a duration
   */
  subtractPlainTimes(left: PlainTime, right: PlainTime): Duration {
    const leftMs = left.hour * 3600000 + left.minute * 60000 + left.second * 1000 + left.millisecond;
    const rightMs = right.hour * 3600000 + right.minute * 60000 + right.second * 1000 + right.millisecond;

    const diffMs = leftMs - rightMs;

    const hours = Math.floor(Math.abs(diffMs) / 3600000);
    const minutes = Math.floor((Math.abs(diffMs) % 3600000) / 60000);
    const seconds = Math.floor((Math.abs(diffMs) % 60000) / 1000);
    const milliseconds = Math.abs(diffMs) % 1000;

    const sign = diffMs < 0 ? -1 : 1;

    return this.createDuration({
      hours: sign * hours,
      minutes: sign * minutes,
      seconds: sign * seconds,
      milliseconds: sign * milliseconds
    });
  }

  /**
   * Subtract two PlainDateTimes to get a duration
   */
  subtractPlainDateTimes(left: PlainDateTime, right: PlainDateTime): Duration {
    const dateDur = this.subtractPlainDates(left.date, right.date);
    const timeDur = this.subtractPlainTimes(left.time, right.time);

    return this.addDurations(dateDur, timeDur);
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
   */
  addToInstant(instant: Instant, duration: Duration): Instant {
    // Convert duration to milliseconds (ignoring month/year components for now)
    let ms = instant.timestamp;

    // For years and months, we need to work in calendar space
    // Convert to Date, add calendar components, then back to timestamp
    const date = new Date(instant.timestamp);

    // Add years and months using UTC methods
    let year = date.getUTCFullYear() + duration.years;
    let month = date.getUTCMonth() + duration.months;

    // Normalize month
    while (month > 11) {
      month -= 12;
      year += 1;
    }
    while (month < 0) {
      month += 12;
      year -= 1;
    }

    date.setUTCFullYear(year, month, date.getUTCDate());

    // Add other components
    ms = date.getTime();
    ms += duration.weeks * 7 * 86400000;
    ms += duration.days * 86400000;
    ms += duration.hours * 3600000;
    ms += duration.minutes * 60000;
    ms += duration.seconds * 1000;
    ms += duration.milliseconds;

    return { timestamp: ms };
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
   */
  subtractInstants(left: Instant, right: Instant): Duration {
    const diffMs = left.timestamp - right.timestamp;

    const days = Math.floor(Math.abs(diffMs) / 86400000);
    const hours = Math.floor((Math.abs(diffMs) % 86400000) / 3600000);
    const minutes = Math.floor((Math.abs(diffMs) % 3600000) / 60000);
    const seconds = Math.floor((Math.abs(diffMs) % 60000) / 1000);
    const milliseconds = Math.abs(diffMs) % 1000;

    const sign = diffMs < 0 ? -1 : 1;

    return this.createDuration({
      days: sign * days,
      hours: sign * hours,
      minutes: sign * minutes,
      seconds: sign * seconds,
      milliseconds: sign * milliseconds
    });
  }

  /**
   * Convert PlainDateTime to Instant using timezone
   * Uses DataLoader to resolve timezone names
   */
  toInstant(dateTime: PlainDateTime, timezone: string): Instant {
    // Resolve timezone using DataLoader
    const ianaTimezone = this.dataLoader.resolveTimezone(timezone) || timezone;

    // Note: This is a simplified implementation. A full implementation would use a library like Temporal.
    // For now, we assume UTC for all timezones.
    // Create a timestamp using UTC interpretation
    const timestamp = Date.UTC(
      dateTime.date.year,
      dateTime.date.month - 1, // Month is 0-indexed in Date.UTC
      dateTime.date.day,
      dateTime.time.hour,
      dateTime.time.minute,
      dateTime.time.second,
      dateTime.time.millisecond
    );

    return { timestamp };
  }

  /**
   * Convert Instant to ZonedDateTime
   */
  toZonedDateTime(instant: Instant, timezone: string): ZonedDateTime {
    // Resolve timezone using DataLoader
    const ianaTimezone = this.dataLoader.resolveTimezone(timezone) || timezone;

    const date = new Date(instant.timestamp);

    // Use UTC methods to get the date/time components
    // Note: This is a simplified implementation. A full implementation would
    // use a proper timezone library to convert to the target timezone.
    // For now, we assume UTC for all timezones.
    return {
      dateTime: {
        date: {
          year: date.getUTCFullYear(),
          month: date.getUTCMonth() + 1,
          day: date.getUTCDate()
        },
        time: {
          hour: date.getUTCHours(),
          minute: date.getUTCMinutes(),
          second: date.getUTCSeconds(),
          millisecond: date.getUTCMilliseconds()
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

  // Helper methods

  /**
   * Get number of days in a month
   */
  private getDaysInMonth(year: number, month: number): number {
    // Month is 1-12
    if (month === 2) {
      return this.isLeapYear(year) ? 29 : 28;
    }
    if ([4, 6, 9, 11].includes(month)) {
      return 30;
    }
    return 31;
  }

  /**
   * Check if a year is a leap year
   */
  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   * Convert a PlainDate to a day count from year 0
   * Used for date arithmetic
   */
  private dateToDayCount(date: PlainDate): number {
    let days = 0;

    // Add days for complete years
    for (let y = 1; y < date.year; y++) {
      days += this.isLeapYear(y) ? 366 : 365;
    }

    // Add days for complete months in the current year
    for (let m = 1; m < date.month; m++) {
      days += this.getDaysInMonth(date.year, m);
    }

    // Add remaining days
    days += date.day;

    return days;
  }

  /**
   * Convert PlainDateTime to ISO string (for Date parsing)
   */
  private plainDateTimeToISOString(dateTime: PlainDateTime): string {
    const { date, time } = dateTime;
    const year = date.year.toString().padStart(4, '0');
    const month = date.month.toString().padStart(2, '0');
    const day = date.day.toString().padStart(2, '0');
    const hour = time.hour.toString().padStart(2, '0');
    const minute = time.minute.toString().padStart(2, '0');
    const second = time.second.toString().padStart(2, '0');
    const ms = time.millisecond.toString().padStart(3, '0');

    return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}`;
  }
}

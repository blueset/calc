/**
 * Formatter - converts evaluation results to formatted strings
 */

import type { Value, NumberValue, DerivedUnitValue, CompositeUnitValue, DateTimeValue, BooleanValue, ErrorValue } from './evaluator';
import type { Settings } from './settings';
import { defaultSettings } from './settings';
import type { Unit } from '../types/types';
import type { PresentationFormat } from './ast';
import { Temporal } from '@js-temporal/polyfill';

/**
 * Formatter class - formats values according to settings
 */
export class Formatter {
  private settings: Settings;

  constructor(settings: Settings = defaultSettings) {
    this.settings = settings;
  }

  /**
   * Main entry point: format any value to string
   */
  format(value: Value): string {
    switch (value.kind) {
      case 'number':
        return this.formatNumberValue(value);
      case 'derivedUnit':
        return this.formatDerivedUnitValue(value);
      case 'composite':
        return this.formatCompositeUnitValue(value);
      case 'boolean':
        return this.formatBooleanValue(value);
      case 'error':
        return this.formatErrorValue(value);
      // Date/time cases
      case 'plainDate':
      case 'plainTime':
      case 'plainDateTime':
      case 'instant':
      case 'zonedDateTime':
      case 'duration':
        return this.formatDateTimeValue(value);
      default:
        const _exhaustive: never = value;
        return String(_exhaustive);
    }
  }

  /**
   * Format a number value (with optional unit)
   */
  private formatNumberValue(value: NumberValue): string {
    const numStr = this.formatNumber(value.value);
    if (value.unit) {
      const unitStr = this.formatUnit(value.unit);
      return `${numStr} ${unitStr}`;
    }
    return numStr;
  }

  /**
   * Format a derived unit value (e.g., "50 km/h", "9.8 m/s²")
   */
  private formatDerivedUnitValue(value: DerivedUnitValue): string {
    const numStr = this.formatNumber(value.value);
    const unitStr = this.formatDerivedUnit(value.terms);
    return `${numStr} ${unitStr}`;
  }

  /**
   * Format a composite unit value (e.g., "5 ft 7.32 in")
   */
  private formatCompositeUnitValue(value: CompositeUnitValue): string {
    const parts = value.components.map((comp) => {
      const numStr = this.formatNumber(comp.value);
      const unitStr = this.formatUnit(comp.unit);
      return `${numStr} ${unitStr}`;
    });
    return parts.join(' ');
  }

  /**
   * Format date/time values
   */
  private formatDateTimeValue(value: DateTimeValue): string {
    switch (value.kind) {
      case 'plainDate':
        return this.formatPlainDate(value.date.year, value.date.month, value.date.day);
      case 'plainTime':
        return this.formatPlainTime(value.time.hour, value.time.minute, value.time.second, value.time.millisecond);
      case 'plainDateTime':
        const dateStr = this.formatPlainDate(value.dateTime.date.year, value.dateTime.date.month, value.dateTime.date.day);
        const timeStr = this.formatPlainTime(value.dateTime.time.hour, value.dateTime.time.minute, value.dateTime.time.second, value.dateTime.time.millisecond);
        return this.formatDateTime(dateStr, timeStr);
      case 'instant':
        // Format as ISO 8601
        return this.formatInstant(value.instant.timestamp);
      case 'zonedDateTime':
        const zdtDateStr = this.formatPlainDate(value.zonedDateTime.dateTime.date.year, value.zonedDateTime.dateTime.date.month, value.zonedDateTime.dateTime.date.day);
        const zdtTimeStr = this.formatPlainTime(value.zonedDateTime.dateTime.time.hour, value.zonedDateTime.dateTime.time.minute, value.zonedDateTime.dateTime.time.second, value.zonedDateTime.dateTime.time.millisecond);
        return `${this.formatDateTime(zdtDateStr, zdtTimeStr)} ${value.zonedDateTime.timezone}`;
      case 'duration':
        return this.formatDuration(value.duration);
      default:
        const _exhaustive: never = value;
        return String(_exhaustive);
    }
  }

  /**
   * Format boolean value
   */
  private formatBooleanValue(value: BooleanValue): string {
    return value.value ? 'true' : 'false';
  }

  /**
   * Format error value
   */
  private formatErrorValue(value: ErrorValue): string {
    return `Error: ${value.error.message}`;
  }

  /**
   * Format a number with precision, decimal separator, and digit grouping
   */
  private formatNumber(num: number): string {
    // Handle special cases
    if (!isFinite(num)) {
      if (isNaN(num)) return 'NaN';
      return num > 0 ? 'Infinity' : '-Infinity';
    }

    // Apply precision
    let formatted: string;
    if (this.settings.precision === -1) {
      // Automatic precision
      formatted = this.formatNumberAutoPrecision(num);
    } else {
      // Fixed precision
      formatted = num.toFixed(this.settings.precision);
    }

    // Apply decimal separator
    const decimalSep = this.settings.decimalSeparator;
    if (decimalSep === ',') {
      formatted = formatted.replace('.', ',');
    }

    // Apply digit grouping
    if (this.settings.digitGroupingSeparator !== '' && this.settings.digitGroupingSize !== 'off') {
      formatted = this.applyDigitGrouping(formatted, decimalSep);
    }

    return formatted;
  }

  /**
   * Format number with automatic precision based on magnitude
   */
  private formatNumberAutoPrecision(num: number): string {
    const absNum = Math.abs(num);

    // Very large or very small numbers use scientific notation
    if (absNum >= 1e6 || (absNum > 0 && absNum < 1e-4)) {
      return num.toExponential(6);
    }

    // For normal range, use appropriate decimal places
    if (absNum >= 100) {
      return num.toFixed(2);
    } else if (absNum >= 1) {
      return num.toFixed(4);
    } else if (absNum > 0) {
      return num.toFixed(6);
    }

    return '0';
  }

  /**
   * Apply digit grouping to a formatted number string
   */
  private applyDigitGrouping(numStr: string, decimalSep: string): string {
    // Get the grouping separator character (it's already the actual character)
    const groupSep = this.settings.digitGroupingSeparator;

    // Split into integer and decimal parts
    const parts = numStr.split(decimalSep);
    let integerPart = parts[0];
    const decimalPart = parts.length > 1 ? parts[1] : '';

    // Handle negative sign
    const isNegative = integerPart.startsWith('-');
    if (isNegative) {
      integerPart = integerPart.slice(1);
    }

    // Apply grouping based on size
    let grouped: string;
    const size = this.settings.digitGroupingSize;

    if (size === '3') {
      // European style: groups of 3 from right (1,234,567)
      grouped = this.groupBySize(integerPart, 3, groupSep);
    } else if (size === '2-3') {
      // South Asian style: first 3, then groups of 2 (12,34,567)
      grouped = this.groupBySouthAsian(integerPart, groupSep);
    } else if (size === '4') {
      // East Asian style: groups of 4 from right (1234,5678)
      grouped = this.groupBySize(integerPart, 4, groupSep);
    } else {
      grouped = integerPart; // 'off' - no grouping
    }

    // Reconstruct
    const result = isNegative ? '-' + grouped : grouped;
    return decimalPart ? result + decimalSep + decimalPart : result;
  }

  /**
   * Group digits by a specific size from right
   */
  private groupBySize(integerPart: string, size: number, groupSep: string): string {
    const reversed = integerPart.split('').reverse();
    const grouped: string[] = [];
    for (let i = 0; i < reversed.length; i++) {
      if (i > 0 && i % size === 0) {
        grouped.push(groupSep);
      }
      grouped.push(reversed[i]);
    }
    return grouped.reverse().join('');
  }


  /**
   * Group digits by South Asian numbering system
   * First group of 3 from right, then groups of 2
   */
  private groupBySouthAsian(integerPart: string, groupSep: string): string {
    if (integerPart.length <= 3) {
      return integerPart;
    }

    const reversed = integerPart.split('').reverse();
    const grouped: string[] = [];

    // First group of 3
    for (let i = 0; i < Math.min(3, reversed.length); i++) {
      grouped.push(reversed[i]);
    }

    // Remaining groups of 2
    for (let i = 3; i < reversed.length; i++) {
      if ((i - 3) % 2 === 0 && i > 3) {
        grouped.push(groupSep);
      }
      grouped.push(reversed[i]);
    }

    // Add separator after first group if there are more digits
    if (reversed.length > 3) {
      grouped.splice(3, 0, groupSep);
    }

    return grouped.reverse().join('');
  }

  /**
   * Format a unit (display name based on settings)
   */
  private formatUnit(unit: Unit): string {
    if (this.settings.unitDisplayStyle === 'symbol') {
      return unit.displayName.symbol;
    } else {
      // Use singular or plural based on context (for now, always use singular)
      return unit.displayName.singular;
    }
  }

  /**
   * Format derived unit (e.g., "km/h", "m²", "kg m/s²")
   * Uses signed exponents: positive for numerator, negative for denominator
   */
  private formatDerivedUnit(terms: Array<{ unit: Unit; exponent: number }>): string {
    // Separate into numerator and denominator
    const numerator = terms.filter((t) => t.exponent > 0);
    const denominator = terms.filter((t) => t.exponent < 0);

    // Format numerator
    const numParts = numerator.map((t) => this.formatUnitTerm(t.unit, t.exponent));
    const numStr = numParts.join(' ');

    // Format denominator
    if (denominator.length === 0) {
      return numStr || '1'; // dimensionless if empty
    }

    const denomParts = denominator.map((t) => this.formatUnitTerm(t.unit, -t.exponent));
    const denomStr = denomParts.join(' ');

    // If single term in denominator, use "/" notation without parentheses
    if (denominator.length === 1) {
      return `${numStr || '1'}/${denomStr}`;
    }

    // Multiple terms in denominator, use parentheses
    return `${numStr || '1'}/(${denomStr})`;
  }

  /**
   * Format a single unit term with exponent
   * Uses Unicode superscripts for exponents > 1
   */
  private formatUnitTerm(unit: Unit, exponent: number): string {
    const unitStr = this.formatUnit(unit);

    if (exponent === 1) {
      return unitStr;
    }

    // Use Unicode superscripts for common exponents
    const superscripts: Record<string, string> = {
      '0': '⁰',
      '1': '¹',
      '2': '²',
      '3': '³',
      '4': '⁴',
      '5': '⁵',
      '6': '⁶',
      '7': '⁷',
      '8': '⁸',
      '9': '⁹',
      '-': '⁻',
      '.': '·',
    };

    // Convert exponent to superscript
    const expStr = String(exponent);
    let superscript = '';
    for (const char of expStr) {
      superscript += superscripts[char] || char;
    }

    return `${unitStr}${superscript}`;
  }

  /**
   * Format a date and time according to dateTimeFormat setting
   */
  private formatDateTime(dateStr: string, timeStr: string): string {
    if (this.settings.dateTimeFormat === '{time} {date}') {
      return `${timeStr} ${dateStr}`;
    } else {
      return `${dateStr} ${timeStr}`;
    }
  }

  /**
   * Format a plain date
   * Supports tokens: YYYY (year), MM (month number), DD (day), MMM (month name), DDD (day of week)
   */
  private formatPlainDate(year: number, month: number, day: number): string {
    const format = this.settings.dateFormat;

    // Pad numbers
    const yyyy = String(year).padStart(4, '0');
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');

    // Month names (abbreviated)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mmm = monthNames[month - 1] || '';

    // Day of week using Temporal (Monday=1, Sunday=7)
    const dayOfWeekNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const temporalDate = Temporal.PlainDate.from({ year, month, day });
    const ddd = dayOfWeekNames[temporalDate.dayOfWeek - 1];

    return format
      .replace('YYYY', yyyy)
      .replace('MMM', mmm)
      .replace('MM', mm)
      .replace('DDD', ddd)
      .replace('DD', dd);
  }

  /**
   * Format a plain time
   */
  private formatPlainTime(hour: number, minute: number, second: number, millisecond: number): string {
    if (this.settings.timeFormat === 'h12') {
      return this.formatTime12Hour(hour, minute, second, millisecond);
    } else {
      return this.formatTime24Hour(hour, minute, second, millisecond);
    }
  }

  /**
   * Format time in 12-hour format with AM/PM
   */
  private formatTime12Hour(hour: number, minute: number, second: number, millisecond: number): string {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // 0 becomes 12

    const hh = String(hour12);
    const mm = String(minute).padStart(2, '0');
    const ss = String(second).padStart(2, '0');

    // Include milliseconds if non-zero
    if (millisecond > 0) {
      const ms = String(millisecond).padStart(3, '0');
      return `${hh}:${mm}:${ss}.${ms} ${ampm}`;
    }

    // Include seconds if non-zero
    if (second > 0) {
      return `${hh}:${mm}:${ss} ${ampm}`;
    }

    return `${hh}:${mm} ${ampm}`;
  }

  /**
   * Format time in 24-hour format
   */
  private formatTime24Hour(hour: number, minute: number, second: number, millisecond: number): string {
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    const ss = String(second).padStart(2, '0');

    // Include milliseconds if non-zero
    if (millisecond > 0) {
      const ms = String(millisecond).padStart(3, '0');
      return `${hh}:${mm}:${ss}.${ms}`;
    }

    // Include seconds if non-zero
    if (second > 0) {
      return `${hh}:${mm}:${ss}`;
    }

    return `${hh}:${mm}`;
  }

  /**
   * Format an instant (epoch milliseconds) as ISO 8601
   * Uses Temporal API for consistent formatting
   */
  private formatInstant(epochMs: number): string {
    const instant = Temporal.Instant.fromEpochMilliseconds(epochMs);
    return instant.toString(); // ISO 8601 format
  }

  /**
   * Format a duration
   */
  private formatDuration(duration: any): string {
    const parts: string[] = [];

    // Date components
    if (duration.years) parts.push(`${duration.years} year${duration.years !== 1 ? 's' : ''}`);
    if (duration.months) parts.push(`${duration.months} month${duration.months !== 1 ? 's' : ''}`);
    if (duration.weeks) parts.push(`${duration.weeks} week${duration.weeks !== 1 ? 's' : ''}`);
    if (duration.days) parts.push(`${duration.days} day${duration.days !== 1 ? 's' : ''}`);

    // Time components
    if (duration.hours) parts.push(`${duration.hours} hour${duration.hours !== 1 ? 's' : ''}`);
    if (duration.minutes) parts.push(`${duration.minutes} minute${duration.minutes !== 1 ? 's' : ''}`);
    if (duration.seconds) parts.push(`${duration.seconds} second${duration.seconds !== 1 ? 's' : ''}`);
    if (duration.milliseconds) parts.push(`${duration.milliseconds} millisecond${duration.milliseconds !== 1 ? 's' : ''}`);

    return parts.length > 0 ? parts.join(' ') : '0 seconds';
  }

  /**
   * Format a number in a specific presentation format
   */
  formatPresentation(value: number, format: PresentationFormat): string {
    switch (format) {
      case 'binary':
        return this.formatBinary(value);
      case 'octal':
        return this.formatOctal(value);
      case 'hex':
        return this.formatHex(value);
      case 'fraction':
        return this.formatFraction(value);
      case 'scientific':
        return this.formatScientific(value);
      case 'ordinal':
        return this.formatOrdinal(value);
      default:
        const _exhaustive: never = format;
        return String(_exhaustive);
    }
  }

  /**
   * Format as binary (0b...)
   */
  private formatBinary(value: number): string {
    if (!Number.isInteger(value)) {
      return `Error: Binary format requires integer value`;
    }
    const binary = (value >>> 0).toString(2); // >>> 0 converts to unsigned 32-bit
    return `0b${binary}`;
  }

  /**
   * Format as octal (0o...)
   */
  private formatOctal(value: number): string {
    if (!Number.isInteger(value)) {
      return `Error: Octal format requires integer value`;
    }
    const octal = (value >>> 0).toString(8);
    return `0o${octal}`;
  }

  /**
   * Format as hexadecimal (0x...)
   */
  private formatHex(value: number): string {
    if (!Number.isInteger(value)) {
      return `Error: Hexadecimal format requires integer value`;
    }
    const hex = (value >>> 0).toString(16).toUpperCase();
    return `0x${hex}`;
  }

  /**
   * Format as fraction (approximate for irrational numbers)
   */
  private formatFraction(value: number): string {
    // Handle special cases
    if (!isFinite(value)) return String(value);
    if (value === 0) return '0';

    // Handle negative
    const sign = value < 0 ? '-' : '';
    const absValue = Math.abs(value);

    // Extract integer part
    const intPart = Math.floor(absValue);
    const fracPart = absValue - intPart;

    if (fracPart < 1e-10) {
      return sign + String(intPart);
    }

    // Find best rational approximation using continued fractions
    const { numerator, denominator } = this.approximateFraction(fracPart, 1000);

    if (intPart === 0) {
      return `${sign}${numerator}/${denominator}`;
    } else {
      return `${sign}${intPart} ${numerator}/${denominator}`;
    }
  }

  /**
   * Approximate a decimal as a fraction using continued fractions
   */
  private approximateFraction(value: number, maxDenominator: number): { numerator: number; denominator: number } {
    let a = value;
    let h1 = 1, h2 = 0;
    let k1 = 0, k2 = 1;

    while (k1 <= maxDenominator) {
      const ai = Math.floor(a);
      const h = ai * h1 + h2;
      const k = ai * k1 + k2;

      if (k > maxDenominator) break;

      // Check if we're close enough
      if (Math.abs(value - h / k) < 1e-10) {
        return { numerator: h, denominator: k };
      }

      // Continue fraction
      const remainder = a - ai;
      if (remainder < 1e-10) break;

      a = 1 / remainder;
      h2 = h1; h1 = h;
      k2 = k1; k1 = k;
    }

    return { numerator: h1, denominator: k1 };
  }

  /**
   * Format in scientific notation
   */
  private formatScientific(value: number): string {
    return value.toExponential(this.settings.precision);
  }

  /**
   * Format as ordinal (1st, 2nd, 3rd, etc.)
   * Uses Intl.PluralRules for proper ordinal suffix determination
   */
  private formatOrdinal(value: number): string {
    if (!Number.isInteger(value)) {
      return `Error: Ordinal format requires integer value`;
    }

    // Use Intl.PluralRules to determine the ordinal suffix
    const pluralRules = new Intl.PluralRules('en', { type: 'ordinal' });
    const rule = pluralRules.select(value);

    // Map plural rule to ordinal suffix
    const suffixes: Record<string, string> = {
      'one': 'st',
      'two': 'nd',
      'few': 'rd',
      'other': 'th'
    };

    const suffix = suffixes[rule] || 'th';
    return `${value}${suffix}`;
  }
}

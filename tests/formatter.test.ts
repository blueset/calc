import { describe, it, expect, beforeAll } from 'vitest';
import { Formatter } from '../src/formatter';
import { Settings, defaultSettings, createSettings } from '../src/settings';
import { NumberValue, DerivedUnitValue, CompositeUnitValue, BooleanValue, ErrorValue, PlainDateValue, PlainTimeValue, PlainDateTimeValue, DurationValue } from '../src/evaluator';
import { DataLoader } from '../src/data-loader';
import type { Unit } from '../types/types';

let dataLoader: DataLoader;
let meterUnit: Unit;
let secondUnit: Unit;
let footUnit: Unit;
let inchUnit: Unit;
let kilometerUnit: Unit;
let hourUnit: Unit;

beforeAll(async () => {
  dataLoader = new DataLoader();
  await dataLoader.load('data');

  // Get commonly used units
  meterUnit = dataLoader.getUnitById('meter')!;
  secondUnit = dataLoader.getUnitById('second')!;
  footUnit = dataLoader.getUnitById('foot')!;
  inchUnit = dataLoader.getUnitById('inch')!;
  kilometerUnit = dataLoader.getUnitById('kilometer')!;
  hourUnit = dataLoader.getUnitById('hour')!;
});

describe('Formatter', () => {
  describe('Number Formatting', () => {
    it('should format simple numbers with default precision', () => {
      const formatter = new Formatter();
      const value: NumberValue = { kind: 'number', value: 123.456789 };
      expect(formatter.format(value)).toBe('123.456789'); // 10 sig figs, trailing zeros stripped
    });

    it('should format numbers with custom precision', () => {
      const settings = createSettings({ precision: 4 });
      const formatter = new Formatter(settings);
      const value: NumberValue = { kind: 'number', value: 123.456789 };
      expect(formatter.format(value)).toBe('123.4568');
    });

    it('should format numbers with decimal comma', () => {
      const settings = createSettings({ decimalSeparator: ',', precision: 2 });
      const formatter = new Formatter(settings);
      const value: NumberValue = { kind: 'number', value: 123.45 };
      expect(formatter.format(value)).toBe('123,45');
    });

    it('should format numbers with thousands grouping', () => {
      const settings = createSettings({ digitGroupingSeparator: ',', digitGroupingSize: '3', precision: 0 });
      const formatter = new Formatter(settings);
      const value: NumberValue = { kind: 'number', value: 1234567 };
      expect(formatter.format(value)).toBe('1,234,567');
    });

    it('should format numbers with South Asian grouping', () => {
      const settings = createSettings({ digitGroupingSeparator: ',', digitGroupingSize: '2-3', precision: 0 });
      const formatter = new Formatter(settings);
      const value: NumberValue = { kind: 'number', value: 1234567 };
      expect(formatter.format(value)).toBe('12,34,567');
    });

    it('should format numbers with European style (comma decimal, dot thousands)', () => {
      const settings = createSettings({
        decimalSeparator: ',',
        digitGroupingSeparator: '.',
        digitGroupingSize: '3',
        precision: 2
      });
      const formatter = new Formatter(settings);
      const value: NumberValue = { kind: 'number', value: 1234567.89 };
      expect(formatter.format(value)).toBe('1.234.567,89');
    });

    it('should format negative numbers correctly', () => {
      const settings = createSettings({ digitGroupingSeparator: ',', digitGroupingSize: '3', precision: 2 });
      const formatter = new Formatter(settings);
      const value: NumberValue = { kind: 'number', value: -1234.56 };
      expect(formatter.format(value)).toBe('-1,234.56');
    });

    it('should format special values (Infinity, NaN)', () => {
      const formatter = new Formatter();
      expect(formatter.format({ kind: 'number', value: Infinity })).toBe('Infinity');
      expect(formatter.format({ kind: 'number', value: -Infinity })).toBe('-Infinity');
      expect(formatter.format({ kind: 'number', value: NaN })).toBe('NaN');
    });

    it('should format zero correctly', () => {
      const formatter = new Formatter();
      const value: NumberValue = { kind: 'number', value: 0 };
      expect(formatter.format(value)).toBe('0'); // Auto-precision returns '0' for zero
    });

    it('should format numbers with space grouping separator', () => {
      const settings = createSettings({ digitGroupingSeparator: ' ', digitGroupingSize: '3', precision: 0 });
      const formatter = new Formatter(settings);
      const value: NumberValue = { kind: 'number', value: 1234567 };
      expect(formatter.format(value)).toBe('1 234 567');
    });

    it('should format numbers with prime grouping separator', () => {
      const settings = createSettings({ digitGroupingSeparator: '′', digitGroupingSize: '3', precision: 0 });
      const formatter = new Formatter(settings);
      const value: NumberValue = { kind: 'number', value: 1234567 };
      expect(formatter.format(value)).toBe('1′234′567');
    });

    it('should format numbers with East Asian grouping (4 digits)', () => {
      const settings = createSettings({ digitGroupingSeparator: ',', digitGroupingSize: '4', precision: 0 });
      const formatter = new Formatter(settings);
      const value: NumberValue = { kind: 'number', value: 12345678 };
      expect(formatter.format(value)).toBe('1234,5678');
    });

    it('should not group digits when size is off', () => {
      const settings = createSettings({ digitGroupingSeparator: ',', digitGroupingSize: 'off', precision: 0 });
      const formatter = new Formatter(settings);
      const value: NumberValue = { kind: 'number', value: 1234567 };
      expect(formatter.format(value)).toBe('1234567');
    });
  });

  describe('Simple Unit Formatting', () => {
    it('should format number with unit (symbol style)', () => {
      const settings = createSettings({ unitDisplayStyle: 'symbol' });
      const formatter = new Formatter(settings);
      const value: NumberValue = { kind: 'number', value: 5, unit: meterUnit };
      expect(formatter.format(value)).toBe('5 m');
    });

    it('should format number with unit (name style)', () => {
      const settings = createSettings({ unitDisplayStyle: 'name' });
      const formatter = new Formatter(settings);
      const value: NumberValue = { kind: 'number', value: 5, unit: meterUnit };
      expect(formatter.format(value)).toBe('5 meter');
    });

    it('should format fractional values with units', () => {
      const formatter = new Formatter();
      const value: NumberValue = { kind: 'number', value: 3.14159, unit: meterUnit };
      expect(formatter.format(value)).toBe('3.14159 m');
    });
  });

  describe('Derived Unit Formatting', () => {
    it('should format simple derived unit (m/s)', () => {
      const formatter = new Formatter();
      const value: DerivedUnitValue = {
        kind: 'derivedUnit',
        value: 50,
        terms: [
          { unit: meterUnit, exponent: 1 },
          { unit: secondUnit, exponent: -1 }
        ]
      };
      expect(formatter.format(value)).toBe('50 m/s');
    });

    it('should format derived unit with exponent > 1 (m²)', () => {
      const formatter = new Formatter();
      const value: DerivedUnitValue = {
        kind: 'derivedUnit',
        value: 25,
        terms: [{ unit: meterUnit, exponent: 2 }]
      };
      expect(formatter.format(value)).toBe('25 m²');
    });

    it('should format derived unit with exponent 3 (m³)', () => {
      const formatter = new Formatter();
      const value: DerivedUnitValue = {
        kind: 'derivedUnit',
        value: 8,
        terms: [{ unit: meterUnit, exponent: 3 }]
      };
      expect(formatter.format(value)).toBe('8 m³');
    });

    it('should format complex derived unit (kg m/s²)', () => {
      const kgUnit = dataLoader.getUnitById('kilogram')!;
      const formatter = new Formatter();
      const value: DerivedUnitValue = {
        kind: 'derivedUnit',
        value: 9.8,
        terms: [
          { unit: kgUnit, exponent: 1 },
          { unit: meterUnit, exponent: 1 },
          { unit: secondUnit, exponent: -2 }
        ]
      };
      expect(formatter.format(value)).toBe('9.8 kg m/s²');
    });

    it('should format km/h correctly', () => {
      const formatter = new Formatter();
      const value: DerivedUnitValue = {
        kind: 'derivedUnit',
        value: 100,
        terms: [
          { unit: kilometerUnit, exponent: 1 },
          { unit: hourUnit, exponent: -1 }
        ]
      };
      expect(formatter.format(value)).toBe('100 km/h');
    });

    it('should format multiple numerator terms', () => {
      const formatter = new Formatter();
      const kgUnit = dataLoader.getUnitById('kilogram')!;
      const value: DerivedUnitValue = {
        kind: 'derivedUnit',
        value: 50,
        terms: [
          { unit: kgUnit, exponent: 1 },
          { unit: meterUnit, exponent: 1 }
        ]
      };
      expect(formatter.format(value)).toBe('50 kg m');
    });

    it('should format multiple denominator terms with parentheses', () => {
      const formatter = new Formatter();
      const value: DerivedUnitValue = {
        kind: 'derivedUnit',
        value: 10,
        terms: [
          { unit: meterUnit, exponent: 1 },
          { unit: secondUnit, exponent: -1 },
          { unit: kilometerUnit, exponent: -1 }
        ]
      };
      expect(formatter.format(value)).toBe('10 m/(s km)');
    });
  });

  describe('Composite Unit Formatting', () => {
    it('should format simple composite unit (5 ft 7 in)', () => {
      const formatter = new Formatter();
      const value: CompositeUnitValue = {
        kind: 'composite',
        components: [
          { value: 5, unit: footUnit },
          { value: 7.32, unit: inchUnit }
        ]
      };
      expect(formatter.format(value)).toBe('5 ft 7.32 in');
    });

    it('should format time composite (2 hr 30 min)', () => {
      const hrUnit = dataLoader.getUnitById('hour')!;
      const minUnit = dataLoader.getUnitById('minute')!;
      const formatter = new Formatter();
      const value: CompositeUnitValue = {
        kind: 'composite',
        components: [
          { value: 2, unit: hrUnit },
          { value: 30, unit: minUnit }
        ]
      };
      // Note: hour symbol is 'h', not 'hr'
      expect(formatter.format(value)).toBe('2 h 30 min');
    });

    it('should format single component composite unit', () => {
      const formatter = new Formatter();
      const value: CompositeUnitValue = {
        kind: 'composite',
        components: [{ value: 10, unit: meterUnit }]
      };
      expect(formatter.format(value)).toBe('10 m');
    });
  });

  describe('Date/Time Formatting', () => {
    it('should format plain date with default format (YYYY-MM-DD DDD)', () => {
      const formatter = new Formatter();
      const value: PlainDateValue = {
        kind: 'plainDate',
        date: { year: 2024, month: 1, day: 31 }
      };
      // Default format includes day of week: 'YYYY-MM-DD DDD'
      expect(formatter.format(value)).toBe('2024-01-31 Wed');
    });

    it('should format plain date with custom format (MM/DD/YYYY)', () => {
      const settings = createSettings({ dateFormat: 'MM/DD/YYYY' });
      const formatter = new Formatter(settings);
      const value: PlainDateValue = {
        kind: 'plainDate',
        date: { year: 2024, month: 1, day: 31 }
      };
      expect(formatter.format(value)).toBe('01/31/2024');
    });

    it('should format plain date with custom format (DD.MM.YYYY)', () => {
      const settings = createSettings({ dateFormat: 'DD.MM.YYYY' });
      const formatter = new Formatter(settings);
      const value: PlainDateValue = {
        kind: 'plainDate',
        date: { year: 2024, month: 12, day: 5 }
      };
      expect(formatter.format(value)).toBe('05.12.2024');
    });

    it('should format plain date with month name (YYYY MMM DD)', () => {
      const settings = createSettings({ dateFormat: 'YYYY MMM DD' });
      const formatter = new Formatter(settings);
      const value: PlainDateValue = {
        kind: 'plainDate',
        date: { year: 2024, month: 1, day: 31 }
      };
      expect(formatter.format(value)).toBe('2024 Jan 31');
    });

    it('should format plain date with day of week first (DDD DD MMM YYYY)', () => {
      const settings = createSettings({ dateFormat: 'DDD DD MMM YYYY' });
      const formatter = new Formatter(settings);
      const value: PlainDateValue = {
        kind: 'plainDate',
        date: { year: 2024, month: 1, day: 31 }
      };
      expect(formatter.format(value)).toBe('Wed 31 Jan 2024');
    });

    it('should format plain time in 24-hour format', () => {
      const settings = createSettings({ timeFormat: 'h23' });
      const formatter = new Formatter(settings);
      const value: PlainTimeValue = {
        kind: 'plainTime',
        time: { hour: 15, minute: 45, second: 30, millisecond: 0 }
      };
      expect(formatter.format(value)).toBe('15:45:30');
    });

    it('should format plain time in 12-hour format', () => {
      const settings = createSettings({ timeFormat: 'h12' });
      const formatter = new Formatter(settings);
      const value: PlainTimeValue = {
        kind: 'plainTime',
        time: { hour: 15, minute: 45, second: 0, millisecond: 0 }
      };
      expect(formatter.format(value)).toBe('3:45 PM');
    });

    it('should format midnight in 12-hour format', () => {
      const settings = createSettings({ timeFormat: 'h12' });
      const formatter = new Formatter(settings);
      const value: PlainTimeValue = {
        kind: 'plainTime',
        time: { hour: 0, minute: 0, second: 0, millisecond: 0 }
      };
      expect(formatter.format(value)).toBe('12:00 AM');
    });

    it('should format noon in 12-hour format', () => {
      const settings = createSettings({ timeFormat: 'h12' });
      const formatter = new Formatter(settings);
      const value: PlainTimeValue = {
        kind: 'plainTime',
        time: { hour: 12, minute: 30, second: 0, millisecond: 0 }
      };
      expect(formatter.format(value)).toBe('12:30 PM');
    });

    it('should format time with milliseconds', () => {
      const formatter = new Formatter();
      const value: PlainTimeValue = {
        kind: 'plainTime',
        time: { hour: 10, minute: 30, second: 45, millisecond: 123 }
      };
      expect(formatter.format(value)).toBe('10:30:45.123');
    });

    it('should format plain datetime', () => {
      const formatter = new Formatter();
      const value: PlainDateTimeValue = {
        kind: 'plainDateTime',
        dateTime: {
          date: { year: 2024, month: 1, day: 31 },
          time: { hour: 15, minute: 45, second: 0, millisecond: 0 }
        }
      };
      // Default dateFormat includes day of week
      expect(formatter.format(value)).toBe('2024-01-31 Wed 15:45');
    });

    it('should format plain datetime with time first', () => {
      const settings = createSettings({ dateFormat: 'YYYY-MM-DD', dateTimeFormat: '{time} {date}' });
      const formatter = new Formatter(settings);
      const value: PlainDateTimeValue = {
        kind: 'plainDateTime',
        dateTime: {
          date: { year: 2024, month: 1, day: 31 },
          time: { hour: 15, minute: 45, second: 0, millisecond: 0 }
        }
      };
      expect(formatter.format(value)).toBe('15:45 2024-01-31');
    });

    it('should format duration with multiple components', () => {
      const formatter = new Formatter();
      const value: DurationValue = {
        kind: 'duration',
        duration: {
          years: 1,
          months: 2,
          weeks: 0,
          days: 3,
          hours: 4,
          minutes: 5,
          seconds: 6,
          milliseconds: 0
        }
      };
      expect(formatter.format(value)).toBe('1 year 2 months 3 days 4 hours 5 minutes 6 seconds');
    });

    it('should format duration with singular values', () => {
      const formatter = new Formatter();
      const value: DurationValue = {
        kind: 'duration',
        duration: {
          years: 0,
          months: 0,
          weeks: 1,
          days: 1,
          hours: 1,
          minutes: 1,
          seconds: 1,
          milliseconds: 1
        }
      };
      expect(formatter.format(value)).toBe('1 week 1 day 1 hour 1 minute 1 second 1 millisecond');
    });

    it('should format zero duration', () => {
      const formatter = new Formatter();
      const value: DurationValue = {
        kind: 'duration',
        duration: {
          years: 0,
          months: 0,
          weeks: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          milliseconds: 0
        }
      };
      expect(formatter.format(value)).toBe('0 seconds');
    });
  });

  describe('Boolean Formatting', () => {
    it('should format true', () => {
      const formatter = new Formatter();
      const value: BooleanValue = { kind: 'boolean', value: true };
      expect(formatter.format(value)).toBe('true');
    });

    it('should format false', () => {
      const formatter = new Formatter();
      const value: BooleanValue = { kind: 'boolean', value: false };
      expect(formatter.format(value)).toBe('false');
    });
  });

  describe('Error Formatting', () => {
    it('should format error values', () => {
      const formatter = new Formatter();
      const value: ErrorValue = {
        kind: 'error',
        error: { type: 'RuntimeError', message: 'Division by zero' }
      };
      expect(formatter.format(value)).toBe('Error: Division by zero');
    });
  });

  describe('Presentation Format', () => {
    it('should format binary', () => {
      const formatter = new Formatter();
      expect(formatter.formatPresentation(5, 'binary')).toBe('0b101');
      expect(formatter.formatPresentation(255, 'binary')).toBe('0b11111111');
    });

    it('should format octal', () => {
      const formatter = new Formatter();
      expect(formatter.formatPresentation(8, 'octal')).toBe('0o10');
      expect(formatter.formatPresentation(64, 'octal')).toBe('0o100');
    });

    it('should format hexadecimal', () => {
      const formatter = new Formatter();
      expect(formatter.formatPresentation(255, 'hex')).toBe('0xFF');
      expect(formatter.formatPresentation(4096, 'hex')).toBe('0x1000');
    });

    it('should format fraction (simple)', () => {
      const formatter = new Formatter();
      expect(formatter.formatPresentation(0.5, 'fraction')).toBe('1/2');
      expect(formatter.formatPresentation(0.25, 'fraction')).toBe('1/4');
      expect(formatter.formatPresentation(0.75, 'fraction')).toBe('3/4');
    });

    it('should format fraction (mixed number)', () => {
      const formatter = new Formatter();
      expect(formatter.formatPresentation(2.5, 'fraction')).toBe('2 1/2');
      expect(formatter.formatPresentation(3.75, 'fraction')).toBe('3 3/4');
    });

    it('should format fraction (approximate)', () => {
      const formatter = new Formatter();
      // 1/3 = 0.333333... Use a closer approximation
      const result = formatter.formatPresentation(0.3333333, 'fraction');
      // Should approximate to 1/3
      expect(result).toMatch(/1\/3/);
    });

    it('should format scientific notation', () => {
      const settings = createSettings({ precision: 2 });
      const formatter = new Formatter(settings);
      expect(formatter.formatPresentation(1234, 'scientific')).toBe('1.23e+3');
      expect(formatter.formatPresentation(0.00123, 'scientific')).toBe('1.23e-3');
    });

    it('should format ordinal', () => {
      const formatter = new Formatter();
      expect(formatter.formatPresentation(1, 'ordinal')).toBe('1st');
      expect(formatter.formatPresentation(2, 'ordinal')).toBe('2nd');
      expect(formatter.formatPresentation(3, 'ordinal')).toBe('3rd');
      expect(formatter.formatPresentation(4, 'ordinal')).toBe('4th');
      expect(formatter.formatPresentation(11, 'ordinal')).toBe('11th');
      expect(formatter.formatPresentation(12, 'ordinal')).toBe('12th');
      expect(formatter.formatPresentation(13, 'ordinal')).toBe('13th');
      expect(formatter.formatPresentation(21, 'ordinal')).toBe('21st');
      expect(formatter.formatPresentation(22, 'ordinal')).toBe('22nd');
      expect(formatter.formatPresentation(23, 'ordinal')).toBe('23rd');
      expect(formatter.formatPresentation(100, 'ordinal')).toBe('100th');
      expect(formatter.formatPresentation(101, 'ordinal')).toBe('101st');
    });

    it('should reject binary format for non-integers', () => {
      const formatter = new Formatter();
      expect(formatter.formatPresentation(3.14, 'binary')).toContain('Error');
    });

    it('should reject octal format for non-integers', () => {
      const formatter = new Formatter();
      expect(formatter.formatPresentation(3.14, 'octal')).toContain('Error');
    });

    it('should reject hex format for non-integers', () => {
      const formatter = new Formatter();
      expect(formatter.formatPresentation(3.14, 'hex')).toContain('Error');
    });

    it('should reject ordinal format for non-integers', () => {
      const formatter = new Formatter();
      expect(formatter.formatPresentation(3.14, 'ordinal')).toContain('Error');
    });
  });

  describe('Auto Precision', () => {
    it('should use auto precision for large numbers', () => {
      const settings = createSettings({ precision: -1 });
      const formatter = new Formatter(settings);
      const value: NumberValue = { kind: 'number', value: 1234567 };
      expect(formatter.format(value)).toBe('1 234 567');
    });

    it('should use auto precision for small numbers', () => {
      const settings = createSettings({ precision: -1 });
      const formatter = new Formatter(settings);
      const value: NumberValue = { kind: 'number', value: 0.00001 };
      expect(formatter.format(value)).toBe('0.00001');
    });

    it('should use auto precision for normal numbers', () => {
      const settings = createSettings({ precision: -1 });
      const formatter = new Formatter(settings);
      const value: NumberValue = { kind: 'number', value: 123.456 };
      expect(formatter.format(value)).toBe('123.456');
    });
  });
});

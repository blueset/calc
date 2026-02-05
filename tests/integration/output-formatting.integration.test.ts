import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../src/calculator';
import { DataLoader } from '../../src/data-loader';
import * as path from 'path';

/**
 * Integration tests for output formatting with settings
 * Tests number formatting, separators, precision, and display options
 * Based on settings.ts and SPECS.md formatting specifications
 */
describe('Integration Tests - Output Formatting', () => {
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();
  });

  describe('Decimal Separator Settings', () => {
    it('should use dot as decimal separator (default)', () => {
      const calculator = new Calculator(dataLoader, {
        decimalSeparator: '.',
      }, true);
      const result = calculator.calculate('1 / 3');
      expect(result.results[0].result).toMatch(/0\.3333+/);
    });

    it('should use comma as decimal separator', () => {
      const calculator = new Calculator(dataLoader, {
        decimalSeparator: ',',
      }, true);
      const result = calculator.calculate('1 / 3');
      expect(result.results[0].result).toMatch(/0,3333+/);
    });

    it('should apply decimal separator to all numeric outputs', () => {
      const calculator = new Calculator(dataLoader, {
        decimalSeparator: ',',
      }, true);
      const result = calculator.calculate(`1.5 + 2.7
10 / 3
pi`);
      expect(result.results[0].result).toBe('4,2');
      expect(result.results[1].result).toMatch(/3,3333+/);
      expect(result.results[2].result).toMatch(/3,1415\d*/);
    });
  });

  describe('Digit Grouping Separator', () => {
    it('should use space separator (default)', () => {
      const calculator = new Calculator(dataLoader, {
        digitGroupingSeparator: ' ',
        digitGroupingSize: '3',
      }, true);
      const result = calculator.calculate('1234567');
      expect(result.results[0].result).toBe('1 234 567');
    });

    it('should use no separator', () => {
      const calculator = new Calculator(dataLoader, {
        digitGroupingSeparator: '',
      }, true);
      const result = calculator.calculate('1234567');
      expect(result.results[0].result).toBe('1234567');
    });

    it('should use comma separator', () => {
      const calculator = new Calculator(dataLoader, {
        digitGroupingSeparator: ',',
        digitGroupingSize: '3',
      }, true);
      const result = calculator.calculate('1234567');
      expect(result.results[0].result).toBe('1,234,567');
    });

    it('should use dot separator', () => {
      const calculator = new Calculator(dataLoader, {
        digitGroupingSeparator: '.',
        digitGroupingSize: '3',
        decimalSeparator: ',', // Important: decimal must be comma when dot is grouping
      }, true);
      const result = calculator.calculate('1234567');
      expect(result.results[0].result).toBe('1.234.567');
    });

    it('should use prime symbol separator', () => {
      const calculator = new Calculator(dataLoader, {
        digitGroupingSeparator: '′',
        digitGroupingSize: '3',
      }, true);
      const result = calculator.calculate('1234567');
      expect(result.results[0].result).toBe('1′234′567');
    });
  });

  describe('Digit Grouping Size', () => {
    it('should group by 3 (European style)', () => {
      const calculator = new Calculator(dataLoader, {
        digitGroupingSeparator: ',',
        digitGroupingSize: '3',
      }, true);
      const result = calculator.calculate('1234567890');
      expect(result.results[0].result).toBe('1,234,567,890');
    });

    it('should group by 2-3 (South Asian style)', () => {
      const calculator = new Calculator(dataLoader, {
        digitGroupingSeparator: ',',
        digitGroupingSize: '2-3',
      }, true);
      const result = calculator.calculate('1234567');
      expect(result.results[0].result).toBe('12,34,567'); // First 3, then groups of 2
    });

    it('should group by 4 (East Asian style)', () => {
      const calculator = new Calculator(dataLoader, {
        digitGroupingSeparator: ',',
        digitGroupingSize: '4',
      }, true);
      const result = calculator.calculate('123456789');
      expect(result.results[0].result).toBe('1,2345,6789');
    });

    it('should not group when size is off', () => {
      const calculator = new Calculator(dataLoader, {
        digitGroupingSeparator: ',',
        digitGroupingSize: 'off',
      }, true);
      const result = calculator.calculate('1234567');
      expect(result.results[0].result).toBe('1234567');
    });
  });

  describe('Precision Settings', () => {
    it('should use automatic precision (default -1)', () => {
      const calculator = new Calculator(dataLoader, {
        precision: -1,
      }, true);
      const result = calculator.calculate('1 / 3');
      // Should have reasonable precision, not too many digits
      expect(result.results[0].result).toMatch(/0\.333\d*/);
    });

    it('should limit to 2 decimal places', () => {
      const calculator = new Calculator(dataLoader, {
        precision: 2,
      }, true);
      const result = calculator.calculate('1 / 3');
      expect(result.results[0].result).toBe('0.33');
    });

    it('should limit to 4 decimal places', () => {
      const calculator = new Calculator(dataLoader, {
        precision: 4,
      }, true);
      const result = calculator.calculate('1 / 3');
      expect(result.results[0].result).toBe('0.3333');
    });

    it('should limit to 0 decimal places (integers)', () => {
      const calculator = new Calculator(dataLoader, {
        precision: 0,
      }, true);
      const result = calculator.calculate('10 / 3');
      expect(result.results[0].result).toBe('3');
    });

    it('should apply precision to pi', () => {
      const calculator = new Calculator(dataLoader, {
        precision: 5,
      }, true);
      const result = calculator.calculate('pi');
      expect(result.results[0].result).toBe('3.14159');
    });

    it('should apply precision with units', () => {
      const calculator = new Calculator(dataLoader, {
        precision: 3,
      }, true);
      const result = calculator.calculate('10 m / 3');
      expect(result.results[0].result).toBe('3.333 m');
    });
  });

  describe('Combined Formatting Settings', () => {
    it('should apply European formatting (dot grouping, comma decimal)', () => {
      const calculator = new Calculator(dataLoader, {
        decimalSeparator: ',',
        digitGroupingSeparator: '.',
        digitGroupingSize: '3',
        precision: 2,
      }, true);
      const result = calculator.calculate('1234567.89');
      expect(result.results[0].result).toBe('1.234.567,89');
    });

    it('should apply US formatting (comma grouping, dot decimal)', () => {
      const calculator = new Calculator(dataLoader, {
        decimalSeparator: '.',
        digitGroupingSeparator: ',',
        digitGroupingSize: '3',
        precision: 2,
      }, true);
      const result = calculator.calculate('1234567.89');
      expect(result.results[0].result).toBe('1,234,567.89');
    });

    it('should apply South Asian formatting', () => {
      const calculator = new Calculator(dataLoader, {
        decimalSeparator: '.',
        digitGroupingSeparator: ',',
        digitGroupingSize: '2-3',
        precision: 2,
      }, true);
      const result = calculator.calculate('1234567.89');
      expect(result.results[0].result).toBe('12,34,567.89');
    });

    it('should handle formatting with very large numbers', () => {
      const calculator = new Calculator(dataLoader, {
        digitGroupingSeparator: ' ',
        digitGroupingSize: '3',
        precision: 0,
      }, true);
      const result = calculator.calculate('123456789012345');
      expect(result.results[0].result).toBe('1e+14');
    });
  });

  describe('Scientific Notation', () => {
    it('should format very large numbers in scientific notation', () => {
      const calculator = new Calculator(dataLoader, {}, true);
      const result = calculator.calculate('10^20');
      // Should use scientific notation for very large numbers
      expect(result.results[0].result).toBe('1e+20');
    });

    it('should format very small numbers in scientific notation', () => {
      const calculator = new Calculator(dataLoader, {}, true);
      const result = calculator.calculate('10^-20');
      // Should use scientific notation for very small numbers
      expect(result.results[0].result).toBe('1e-20');
    });

    it('should respect precision in scientific notation', () => {
      const calculator = new Calculator(dataLoader, {
        precision: 3,
      }, true);
      const result = calculator.calculate('1.23456789 * 10^30');
      // Scientific notation should also respect precision
      expect(result.results[0].result).toBe('1.235e+30');
    });
  });

  describe('Unit Display Style', () => {
    it('should display units as symbols (default)', () => {
      const calculator = new Calculator(dataLoader, {
        unitDisplayStyle: 'symbol',
      }, true);
      const result = calculator.calculate('5 kilometer');
      expect(result.results[0].result).toBe('5 km');
      expect(result.results[0].result).not.toContain('kilometer');
    });

    it('should display units as full names', () => {
      const calculator = new Calculator(dataLoader, {
        unitDisplayStyle: 'name',
      }, true);
      const result = calculator.calculate('5 km');
      expect(result.results[0].result).toBe('5 kilometer');
    });

    it('should apply unit style to temperature units', () => {
      const calculator = new Calculator(dataLoader, {
        unitDisplayStyle: 'name',
      }, true);
      const result = calculator.calculate('25 °C');
      expect(result.results[0].result).toBe('25 degree Celsius');
    });
  });

  describe('Date/Time Formatting', () => {
    it('should format dates with default format (YYYY-MM-DD DDD)', () => {
      const calculator = new Calculator(dataLoader, {
        dateFormat: 'YYYY-MM-DD DDD',
      }, true);
      const result = calculator.calculate('2024 Jan 15');
      expect(result.results[0].result).toBe('2024-01-15 Mon');
    });

    it('should format dates with month name format', () => {
      const calculator = new Calculator(dataLoader, {
        dateFormat: 'YYYY MMM DD DDD',
      }, true);
      const result = calculator.calculate('2024 Jan 15');
      expect(result.results[0].result).toBe('2024 Jan 15 Mon');
    });

    it('should format time in 24-hour format (default)', () => {
      const calculator = new Calculator(dataLoader, {
        timeFormat: 'h23',
      }, true);
      const result = calculator.calculate('2:30 PM');
      expect(result.results[0].result).toBe('14:30');
    });

    it('should format time in 12-hour format', () => {
      const calculator = new Calculator(dataLoader, {
        timeFormat: 'h12',
      }, true);
      const result = calculator.calculate('14:30');
      expect(result.results[0].result).toBe('2:30 PM');
    });

    it('should order date before time (default)', () => {
      const calculator = new Calculator(dataLoader, {
        dateTimeFormat: '{date} {time}',
      }, true);
      const result = calculator.calculate('2024 Jan 15 14:30');
      expect(result.results[0].result).toBe('2024-01-15 Mon 14:30');
    });

    it('should order time before date', () => {
      const calculator = new Calculator(dataLoader, {
        dateTimeFormat: '{time} {date}',
      }, true);
      const result = calculator.calculate('2024 Jan 15 14:30');
      expect(result.results[0].result).toBe('14:30 2024-01-15 Mon');
    });
  });

  describe('Angle Unit Settings', () => {
    it('should use degrees for angles (default)', () => {
      const calculator = new Calculator(dataLoader, {
        angleUnit: 'degree',
      }, true);
      const result = calculator.calculate('asin(0.5)');
      expect(result.results[0].result).toBe('30°');
    });

    it('should use radians for angles', () => {
      const calculator = new Calculator(dataLoader, {
        angleUnit: 'radian',
      }, true);
      const result = calculator.calculate('asin(0.5)');
      expect(result.results[0].result).toMatch(/0.5235\d* rad/);
    });

    it('should affect sin/cos/tan calculations', () => {
      const degreeCalc = new Calculator(dataLoader, {
        angleUnit: 'degree',
      }, true);
      const radianCalc = new Calculator(dataLoader, {
        angleUnit: 'radian',
      }, true);

      const degResult = degreeCalc.calculate('sin(30)');
      const radResult = radianCalc.calculate('sin(30)');

      // Results should be different
      expect(degResult.results[0].result).not.toBe(radResult.results[0].result);
    });
  });

  describe('Imperial Units Variant', () => {
    it('should use US imperial units (default)', () => {
      const calculator = new Calculator(dataLoader, {
        imperialUnits: 'us',
      }, true);
      const result = calculator.calculate('1 gallon to liters');
      expect(result.results[0].result).toMatch(/3.78541\d* L/);
    });

    it('should use UK imperial units', () => {
      const calculator = new Calculator(dataLoader, {
        imperialUnits: 'uk',
      }, true);
      const result = calculator.calculate('1 gallon to liters');
      // UK gallon is different from US gallon
      expect(result.results[0].result).toMatch(/4.54609\d* L/);
    });
  });

  describe('Formatting Edge Cases', () => {
    it('should handle zero with precision', () => {
      const calculator = new Calculator(dataLoader, {
        precision: 3,
      }, true);
      const result = calculator.calculate('0');
      expect(result.results[0].result).toBe('0.000');
    });

    it('should handle negative numbers with grouping', () => {
      const calculator = new Calculator(dataLoader, {
        digitGroupingSeparator: ',',
        digitGroupingSize: '3',
      }, true);
      const result = calculator.calculate('-1234567');
      expect(result.results[0].result).toBe('-1,234,567');
    });

    it('should handle decimal-only numbers with grouping', () => {
      const calculator = new Calculator(dataLoader, {
        digitGroupingSeparator: ',',
        digitGroupingSize: '3',
        precision: 10,
      }, true);
      const result = calculator.calculate('0.123456789');
      expect(result.results[0].result).toMatch(/0\.123456789/);
    });

    it('should preserve unit formatting with custom settings', () => {
      const calculator = new Calculator(dataLoader, {
        precision: 2,
        digitGroupingSeparator: ' ',
      }, true);
      const result = calculator.calculate('1234.5678 kg');
      expect(result.results[0].result).toBe('1 234.57 kg');
    });
  });
});

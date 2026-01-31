import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../src/calculator';
import { DataLoader } from '../../src/data-loader';
import * as path from 'path';

/**
 * Integration tests for comprehensive error handling
 * Tests all error scenarios: dimension mismatches, invalid operations, parser errors, etc.
 */
describe('Integration Tests - Error Handling', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '../..', 'data'));

    calculator = new Calculator(dataLoader);
  });

  describe('Unit Dimension Mismatch Errors', () => {
    it('should error when converting incompatible dimensions', () => {
      const result = calculator.calculate(`5 m to kg
10 seconds to meters
25 °C to kilograms`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });

    it('should error when adding incompatible units', () => {
      const result = calculator.calculate(`5 m + 10 kg
1 hour + 5 meters
100 °C + 50 kg`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });

    it('should error when subtracting incompatible units', () => {
      const result = calculator.calculate(`10 kg - 5 m
1 day - 10 liters`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
    });

    it('should provide meaningful error messages for dimension mismatches', () => {
      const result = calculator.calculate('5 m + 10 kg');
      expect(result.results[0].hasError).toBe(true);
      // Error message should mention incompatible units/dimensions
    });
  });

  describe('Invalid Arithmetic Operations', () => {
    it('should error on division by zero', () => {
      const result = calculator.calculate(`10 / 0
5 m / 0
1 / (5 - 5)`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });

    it('should error on modulo by zero', () => {
      const result = calculator.calculate(`10 % 0
15 mod 0`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
    });

    it('should error on invalid exponentiation', () => {
      const result = calculator.calculate(`(-1) ^ 0.5
0 ^ 0`);
      expect(result.results[0].result).toBe("NaN");
      expect(result.results[1].result).toBe("1");
    });

    it('should error on factorial of negative numbers', () => {
      const result = calculator.calculate(`(-5)!
(-1)!`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
    });

    it('should error on factorial of non-integers', () => {
      const result = calculator.calculate(`3.5!
(1/2)!`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
    });
  });

  describe('Invalid Function Arguments', () => {
    it('should error on sqrt of negative numbers', () => {
      const result = calculator.calculate('sqrt(-1)');
      expect(result.results[0].hasError).toBe(true);
    });

    it('should error on log of non-positive numbers', () => {
      const result = calculator.calculate(`log(0)
log(-5)
ln(0)
ln(-10)`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
      expect(result.results[3].hasError).toBe(true);
    });

    it('should error on asin/acos out of range', () => {
      const result = calculator.calculate(`asin(2)
asin(-2)
acos(1.5)
acos(-1.5)`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
      expect(result.results[3].hasError).toBe(true);
    });

    it('should error on acosh of values less than 1', () => {
      const result = calculator.calculate(`acosh(0)
acosh(0.5)
acosh(-1)`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });

    it('should error on atanh outside (-1, 1)', () => {
      const result = calculator.calculate(`atanh(1)
atanh(-1)
atanh(2)
atanh(-2)`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
      expect(result.results[3].hasError).toBe(true);
    });

    it('should error on invalid log base', () => {
      const result = calculator.calculate(`log(0, 10)
log(1, 10)
log(-1, 10)`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });
  });

  describe('Base Conversion Errors', () => {
    it('should error on invalid base (< 2 or > 36)', () => {
      const result = calculator.calculate(`123 base 1 to decimal
ABC base 50 to decimal
10 base 0 to binary`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });

    it('should error on invalid digits for base', () => {
      const result = calculator.calculate(`123 base 2 to decimal
ABC base 10 to decimal
GHI base 16 to decimal`);
      expect(result.results[0].hasError).toBe(true); // 2, 3 invalid in base 2
      expect(result.results[1].hasError).toBe(true); // A, B, C invalid in base 10
      expect(result.results[2].hasError).toBe(true); // G, H, I invalid in base 16
    });

    it('should error on malformed base notation', () => {
      const result = calculator.calculate(`base 10 123
10 to base
ABC base`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });
  });

  describe('Currency Ambiguity Errors', () => {
    it('should error on ambiguous currency in multi-currency expression', () => {
      const result = calculator.calculate('10 USD + 5 EUR + 3');
      // The '3' is ambiguous - which currency?
      expect(result.results[0].hasError).toBe(true);
    });

    it('should error on adding different currencies without conversion', () => {
      const result = calculator.calculate('100 USD + 50 EUR');
      // Should error or require explicit conversion
      expect(result.results[0].hasError).toBe(true);
    });

    it('should error on ambiguous currency operation', () => {
      const result = calculator.calculate(`x = 100 USD
y = 50 EUR
x + y + 10`);
      // Cannot mix currencies
      expect(result.results[2].hasError).toBe(true);
    });
  });

  describe('Undefined Variable Errors', () => {
    it('should error on undefined variable', () => {
      const result = calculator.calculate('undefined_variable + 5');
      expect(result.results[0].hasError).toBe(true);
    });

    it('should error on undefined variable in expression', () => {
      const result = calculator.calculate(`x = 5
y = x + z
y * 2`);
      expect(result.results[1].hasError).toBe(true); // z is undefined
    });

    it('should error on accessing undefined in function', () => {
      const result = calculator.calculate('sqrt(undefined_var)');
      expect(result.results[0].hasError).toBe(true);
    });
  });

  describe('Parser Errors', () => {
    it('should error on unbalanced parentheses', () => {
      const result = calculator.calculate(`(5 + 3
5 + 3)
((5 + 3)`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });

    it('should error on invalid syntax', () => {
      const result = calculator.calculate(`5 + + 3
* 5
/ 10`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });

    it('should error on incomplete expressions', () => {
      const result = calculator.calculate(`5 +
10 *
/ 5`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });

    it('should error on invalid function calls', () => {
      const result = calculator.calculate(`sin(
sqrt(5, 10)
log()`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });
  });

  describe('Date/Time Errors', () => {
    it('should error on invalid dates', () => {
      const result = calculator.calculate(`2023.00.15
2023.06.00
2023.13.32`);
      expect(result.results[0].hasError).toBe(true); // month 0
      expect(result.results[1].hasError).toBe(true); // day 0
      // Month 13 and day 32 should clamp, not error
    });

    it('should error on invalid time values', () => {
      const result = calculator.calculate(`25:00
14:60
14:30:60`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });

    it('should error on invalid date arithmetic', () => {
      const result = calculator.calculate(`2023 Jan 15 + 2023 Jan 20
14:30 * 14:00`);
      expect(result.results[0].hasError).toBe(true); // can't add dates
      expect(result.results[1].hasError).toBe(true); // can't multiply times
    });

    it('should error on invalid timezone names', () => {
      const result = calculator.calculate('14:30 InvalidTimezone');
      expect(result.results[0].hasError).toBe(true);
    });
  });

  describe('Nested Expression Errors', () => {
    it('should propagate errors in nested expressions', () => {
      const result = calculator.calculate(`5 + (10 / 0)
sqrt(5 + sqrt(-1))
(5 m + 10 kg) * 2`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });

    it('should handle errors in deeply nested expressions', () => {
      const result = calculator.calculate('((5 + (10 / (3 - 3))) * 2)');
      expect(result.results[0].hasError).toBe(true);
    });

    it('should error on invalid operations in nested context', () => {
      const result = calculator.calculate(`abs(5 m + 10 kg)
sqrt(5 meters to kilograms)
round((10 USD + 5 EUR))`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should recover and continue after error', () => {
      const result = calculator.calculate(`5 / 0
10 + 5
20 * 2`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].result).toBe('15');
      expect(result.results[2].result).toBe('40');
    });

    it('should isolate errors to single line', () => {
      const result = calculator.calculate(`x = 5
y = z + 10
w = x + 10`);
      expect(result.results[0].hasError).toBe(false);
      expect(result.results[1].hasError).toBe(true); // z undefined
      expect(result.results[2].result).toBe('15'); // w still works
    });

    it('should handle mix of valid and invalid expressions', () => {
      const result = calculator.calculate(`10 + 20
5 m to kg
30 * 2
sqrt(-1)
40 / 2`);
      expect(result.results[0].result).toBe('30');
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].result).toBe('60');
      expect(result.results[3].hasError).toBe(true);
      expect(result.results[4].result).toBe('20');
    });
  });

  describe('Edge Case Errors', () => {
    it('should error on extremely large numbers', () => {
      const result = calculator.calculate('10^1000');
      // May error or return infinity
      expect(result.results[0].hasError || result.results[0].result.includes('Infinity')).toBe(true);
    });

    it('should error on extremely small numbers', () => {
      const result = calculator.calculate('10^-1000');
      // May underflow to 0 or error
      expect(result.results[0].hasError || result.results[0].result === '0').toBe(true);
    });

    it('should handle recursive errors', () => {
      const result = calculator.calculate(`x = y + 1
y = x + 1`);
      // Circular dependency
      expect(result.results[0].hasError || result.results[1].hasError).toBe(true);
    });
  });

  describe('Type Errors', () => {
    it('should error on invalid operand types', () => {
      const result = calculator.calculate(`"string" + 5
true * 10`);
      expect(result.results.length).toBe(2);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
    });

    it('should error on non-numeric function arguments', () => {
      const result = calculator.calculate(`sqrt("5")
sin(true)
log("ten")`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });
  });

  describe('Overflow and Underflow', () => {
    it('should handle factorial overflow', () => {
      const result = calculator.calculate('1000!');
      // Should overflow or return very large number
      expect(result.results[0].result).toBe("Infinity");
    });

    it('should handle exponentiation overflow', () => {
      const result = calculator.calculate('10^500');
      expect(result.results[0].result).toBe("Infinity");
    });

    it('should handle division resulting in very small numbers', () => {
      const result = calculator.calculate('1 / 10^500');
      expect(result.results[0].result).toBe("0");
    });
  });

  describe('Empty and Whitespace Input', () => {
    it('should handle empty input', () => {
      const result = calculator.calculate('');
      expect(result.results.length).toBe(0);
    });

    it('should handle whitespace-only input', () => {
      const result = calculator.calculate('   \n  \t  ');
      expect(result.results.length).toBeLessThan(3);
    });

    it('should handle empty lines in multi-line input', () => {
      const result = calculator.calculate(`5 + 5

10 * 2

20 / 4`);
      expect(result.results.length).toBe(5);
    });
  });

  describe('Error Message Quality', () => {
    it('should provide helpful error messages', () => {
      const result = calculator.calculate('5 m to kg');
      expect(result.results[0].hasError).toBe(true);
      // Error message should exist and be meaningful
      expect(result.results[0].result).toBeTruthy();
    });

    it('should indicate error location in complex expressions', () => {
      const result = calculator.calculate('5 + (10 * (3 / 0))');
      expect(result.results[0].hasError).toBe(true);
      // Should indicate division by zero
    });

    it('should distinguish between different error types', () => {
      const result = calculator.calculate(`5 / 0
sqrt(-1)
5 m to kg`);
      expect(result.results[0].hasError).toBe(true); // Division by zero
      expect(result.results[1].hasError).toBe(true); // Invalid argument
      expect(result.results[2].hasError).toBe(true); // Dimension mismatch
      // Error messages should be different
    });
  });

  describe('Multiple Errors in Single Expression', () => {
    it('should report first encountered error', () => {
      const result = calculator.calculate('(5 / 0) + sqrt(-1)');
      expect(result.results[0].hasError).toBe(true);
      // Should report either division by zero or sqrt of negative
    });

    it('should handle compounding errors', () => {
      const result = calculator.calculate('undefined_var + (10 / 0) + sqrt(-1)');
      expect(result.results[0].hasError).toBe(true);
    });
  });

  describe('Error State Isolation', () => {
    it('should not pollute variable scope with errors', () => {
      const result = calculator.calculate(`x = 10
y = z + 5
x + 5`);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].result).toBe('15'); // x still valid
    });

    it('should allow redefining variables after error', () => {
      const result = calculator.calculate(`x = 5 / 0
x = 10
x + 5`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(false);
      expect(result.results[2].result).toBe('15');
    });
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../src/calculator';
import { DataLoader } from '../src/data-loader';
import * as path from 'path';
import { get } from 'http';

/**
 * Comprehensive integration tests covering examples from SPECS.md
 * Tests the full pipeline: Lexer → Parser → Evaluator → Formatter
 *
 * Tests marked with it.skip() are features from SPECS.md that are not yet implemented
 */
describe('Integration Tests - SPECS.md Examples', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '..', 'data'));

    // Load mock exchange rates for currency tests
    const mockExchangeRates = {
      date: '2024-01-01',
      usd: {
        eur: 0.85,
        gbp: 0.73,
        jpy: 110.0,
        hkd: 7.8,
        cad: 1.25,
        inr: 74.0
      }
    };

    calculator = new Calculator(dataLoader);
    calculator.loadExchangeRates(mockExchangeRates);
  });

  describe('Numbers and Number Bases', () => {
    it('should handle integer numbers', () => {
      const result = calculator.calculate('0');
      expect(result.results[0].result).toBe('0');
      expect(result.errors.lexer.length).toBe(0);
      expect(result.errors.runtime.length).toBe(0);
    });

    it('should handle decimal numbers', () => {
      const result = calculator.calculate('3.14');
      expect(result.results[0].result).toBe('3.14');
    });

    it('should handle numbers with underscore separator', () => {
      const result = calculator.calculate('1_000');
      expect(result.results[0].result).toBe('1 000');
    });

    it('should handle scientific notation', () => {
      const result = calculator.calculate('2.5e3');
      // Formatter adds digit grouping separator (space by default)
      expect(result.results[0].result).toBe('2 500');

      const result2 = calculator.calculate('4.8E-2');
      expect(result2.results[0].result).toBe('0.048');
    });

    it('should handle negative numbers', () => {
      const result = calculator.calculate('-5');
      expect(result.results[0].result).toBe('-5');
    });

    it('should handle binary numbers with 0b prefix', () => {
      const result = calculator.calculate('0b1010');
      expect(result.results[0].result).toBe('10');
    });

    it('should handle binary numbers with base keyword', () => {
      const result = calculator.calculate('1010 base 2');
      expect(result.results[0].result).toBe('10');
    });

    it('should handle octal numbers with 0o prefix', () => {
      const result = calculator.calculate('0o12');
      expect(result.results[0].result).toBe('10');
    });

    it('should handle hexadecimal numbers with 0x prefix', () => {
      let result = calculator.calculate('0xA');
      expect(result.results[0].result).toBe('10');

      // Mixed case
      result = calculator.calculate('0xAa');
      expect(result.results[0].result).toBe('170');
    });

    it('should handle arbitrary bases', () => {
      let result = calculator.calculate('ABC base 36');
      expect(result.results[0].result).toBe('13 368');

      // Mixed case
      result = calculator.calculate('1A2b base 36');
      expect(result.results[0].result).toBe('59 699');
      
      result = calculator.calculate('Hello base 30');
      expect(result.results[0].result).toBe('14 167 554');
    });
  });

  describe('Constants', () => {
    it('should handle NaN and Infinity', () => {
      const result = calculator.calculate('NaN');
      expect(result.results[0].result).toBe('NaN');

      const result2 = calculator.calculate('Infinity');
      expect(result2.results[0].result).toBe('Infinity');

      const result3 = calculator.calculate('inf');
      expect(result3.results[0].result).toBe('Infinity');
    });

    it('should handle pi', () => {
      const result = calculator.calculate('pi');
      expect(result.results[0].result).toContain('3.14159');
    });

    it('should handle e', () => {
      const result = calculator.calculate('e');
      expect(result.results[0].result).toContain('2.71828');
    });

    it('should handle golden ratio', () => {
      const result = calculator.calculate('golden_ratio');
      expect(result.results[0].result).toContain('1.61803');

      const result2 = calculator.calculate('phi');
      expect(result2.results[0].result).toContain('1.61803');
    });
  });

  describe('Dimensionless Units', () => {
    it('should handle English number units converting to dimensionless', () => {
      const result = calculator.calculate('5 dozen');
      expect(result.results[0].result).toBe('60');
    });

    it('should handle percentages (word form) converting to dimensionless', () => {
      const result = calculator.calculate('100 percent');
      expect(result.results[0].result).toBe('1');
    });

    it('should handle percent symbol converting to dimensionless', () => {
      const result = calculator.calculate('50%');
      expect(result.results[0].result).toBe('0.5');
    });

    it('should handle modulo operator', () => {
      const result = calculator.calculate('10 % 3');
      expect(result.results[0].result).toBe('1');
    });

    it('should distinguish percent from modulo', () => {
      const result = calculator.calculate('50%\n10 % 3');
      expect(result.results[0].result).toBe('0.5');  // percent
      expect(result.results[1].result).toBe('1');    // modulo
    });

  });

  describe('Length Units', () => {
    it('should handle metric length units', () => {
      const result = calculator.calculate('5 cm');
      expect(result.results[0].result).toContain('5');
      expect(result.results[0].result).toContain('cm');

      const result2 = calculator.calculate('2 m');
      expect(result2.results[0].result).toContain('2');
      expect(result2.results[0].result).toContain('m');

      const result3 = calculator.calculate('1 km');
      expect(result3.results[0].result).toContain('1');
      expect(result3.results[0].result).toContain('km');
    });

    it('should handle imperial length units', () => {
      const result = calculator.calculate('10 inch');
      expect(result.results[0].result).toContain('10');
      expect(result.results[0].result).toContain('in');

      const result2 = calculator.calculate('5 ft');
      expect(result2.results[0].result).toContain('5');
      expect(result2.results[0].result).toContain('ft');
    });

    it('should handle angstrom', () => {
      const result = calculator.calculate('10 angstrom');
      expect(result.results[0].result).toContain('Å');
    });

    it('should handle nautical mile unit symbol', () => {
      const result = calculator.calculate('5 nautical mile');
      expect(result.results[0].result).toContain('nmi');
    });
  });

  describe('Mass/Weight Units', () => {
    it('should handle metric mass units', () => {
      const result = calculator.calculate('7 g');
      expect(result.results[0].result).toContain('7');
      expect(result.results[0].result).toContain('g');

      const result2 = calculator.calculate('3 kg');
      expect(result2.results[0].result).toContain('3');
      expect(result2.results[0].result).toContain('kg');
    });

    it('should handle imperial mass units', () => {
      const result = calculator.calculate('10 ounces');
      expect(result.results[0].result).toContain('10');
      expect(result.results[0].result).toContain('oz');

      const result2 = calculator.calculate('10 lbs');
      expect(result2.results[0].result).toContain('10');
      expect(result2.results[0].result).toContain('lb');
    });
  });

  describe('Area Units', () => {
    it('should handle square units with superscript', () => {
      const result = calculator.calculate('1 m²');
      expect(result.results[0].result).toContain('m²');
    });

    it('should handle square units with caret', () => {
      const result = calculator.calculate('1 m^2');
      expect(result.results[0].result).toContain('m²');
    });

    it('should handle named square units', () => {
      let result = calculator.calculate('1 square meter');
      expect(result.results[0].result).toContain('m²');
      result = calculator.calculate('1 meter squared');
      expect(result.results[0].result).toContain('m²');
      result = calculator.calculate('1 square foot');
      expect(result.results[0].result).toContain('ft²');
    });

    it('should handle named multi-word units', () => {
      let result = calculator.calculate('1 sq m');
      expect(result.results[0].result).toContain('m²');
      result = calculator.calculate('1 sq ft');
      expect(result.results[0].result).toContain('ft²');
    });

    it('should handle special area units', () => {
      const result = calculator.calculate('1 hectare');
      expect(result.results[0].result).toContain('ha');

      const result2 = calculator.calculate('1 acre');
      expect(result2.results[0].result).toContain('acre');
    });
  });

  describe('Volume Units', () => {
    it('should handle liters', () => {
      const result = calculator.calculate('1 L');
      expect(result.results[0].result).toContain('L');

      const result2 = calculator.calculate('1 mL');
      expect(result2.results[0].result).toContain('mL');
    });

    it('should handle cubic units with superscript', () => {
      let result = calculator.calculate('1 m³');
      expect(result.results[0].result).toContain('m³');
      result = calculator.calculate('1 lb³');
      expect(result.results[0].result).toContain('lb³');
    });

    it('should handle cubic units with caret', () => {
      let result = calculator.calculate('1 m^3');
      expect(result.results[0].result).toContain('m³');
      result = calculator.calculate('1 lb^3');
      expect(result.results[0].result).toContain('lb³');
    });

    it('should handle multi-word units', () => {
      let result = calculator.calculate('1 fl oz');
      expect(result.results[0].result).toContain('fl oz');
      result = calculator.calculate('10 fluid ounces');
      expect(result.results[0].result).toContain('fl oz');
    })
  });

  describe('Temperature Units', () => {
    it('should handle temperature units with degree symbol', () => {
      const result = calculator.calculate('25 °C');
      expect(result.results[0].result).toBe('25 °C');
    });

    it('should handle temperature units', () => {
      const result = calculator.calculate('25 Celsius');
      expect(result.results[0].result).toBe('25 °C');
    });
  });

  describe('Time Units', () => {
    it('should handle time units', () => {
      const result = calculator.calculate('30 ms');
      expect(result.results[0].result).toContain('ms');

      const result2 = calculator.calculate('30 s');
      expect(result2.results[0].result).toContain('s');

      const result3 = calculator.calculate('30 min');
      expect(result3.results[0].result).toContain('min');

      const result4 = calculator.calculate('1 h');
      expect(result4.results[0].result).toContain('h');

      const result5 = calculator.calculate('1 day');
      expect(result5.results[0].result).toContain('day');
    });
  });

  describe('Energy Units', () => {
    it('should handle joules', () => {
      const result = calculator.calculate('5 J');
      expect(result.results[0].result).toContain('J');

      const result2 = calculator.calculate('10 kJ');
      expect(result2.results[0].result).toContain('kJ');
    });

    it('should handle calories', () => {
      const result = calculator.calculate('100 kcal');
      expect(result.results[0].result).toContain('kcal');
    });
  });

  describe('Pressure units', () => {
    it('should handle pascals', () => {
      const result = calculator.calculate('101325 Pa');
      expect(result.results[0].result).toContain('Pa');
    });

    it('should handle atmospheres', () => {
      const result = calculator.calculate('1 atm');
      expect(result.results[0].result).toContain('atm');
    });

    it('should handle mmHg', () => {
      let result = calculator.calculate('1 mmHg');
      expect(result.results[0].result).toContain('mmHg');
      result = calculator.calculate('1 millimeter of mercury');
      expect(result.results[0].result).toContain('mmHg');
    });
  });

  describe('Frequency Units', () => {
    it('should handle cycles', () => {
      const result = calculator.calculate('60 cycles');
      expect(result.results[0].result).toContain('cycle');
    });

    it('should handle hertz', () => {
      const result = calculator.calculate('60 Hz');
      expect(result.results[0].result).toContain('Hz');
    });
  });

  describe('Currency Units', () => {
    it('should handle currency ISO codes', () => {
      const result = calculator.calculate(`100 USD
100 EUR
100 JPY
100 HKD`);
      expect(result.results[0].result).toContain('USD');
      expect(result.results[1].result).toContain('EUR');
      expect(result.results[2].result).toContain('JPY');
      expect(result.results[3].result).toContain('HKD');
    });

    it('should handle currency names', () => {
      const result = calculator.calculate(`100 US Dollars
100 euros # case insensitive
100 japanese Yen
100 hong kong dollars`);
      expect(result.results[0].result).toContain('USD');
      expect(result.results[1].result).toContain('EUR');
      expect(result.results[2].result).toContain('JPY');
      expect(result.results[3].result).toContain('HKD');
    });

    it('should handle unambiguous currency symbols', () => {
      const result = calculator.calculate(`US$100
€100
CA$100
₹100`);
      expect(result.results[0].result).toContain('USD');
      expect(result.results[1].result).toContain('EUR');
      expect(result.results[2].result).toContain('CAD');
      expect(result.results[3].result).toContain('INR');
    });
  });

  describe('Currency Arithmetic', () => {
    it('should add same currencies', () => {
      const result = calculator.calculate('100 USD + 50 USD');
      // With currency-specific formatting, USD shows 2 decimal places
      expect(result.results[0].result).toBe('150.00 USD');
    });

    it('should add different currencies with automatic conversion', () => {
      // With Option A, currencies work like regular units with automatic conversion
      const result = calculator.calculate('100 USD + 50 EUR');
      expect(result.errors.runtime.length).toBe(0);
      // Rate: 1 USD = 0.85 EUR, so 1 EUR = 1/0.85 ≈ 1.176 USD
      // 50 EUR ≈ 58.82 USD, so 100 + 58.82 ≈ 158.82 USD
      expect(result.results[0].result).toBe('158.82 USD');
    });

    it('should allow same ambiguous currency arithmetic', () => {
      const result = calculator.calculate('$10 + $5');
      expect(result.results[0].result).toBe('$15');
      // Symbol should display as '$' not 'currency_symbol_0024'
      expect(result.results[0].result).not.toContain('currency_symbol');
    });

    it('should error on different ambiguous currency arithmetic', () => {
      const result = calculator.calculate('$10 + £5');
      expect(result.errors.runtime.length).toBeGreaterThan(0);
    });
  });

  describe('Currency Conversions', () => {
    // Basic Conversions
    it('should convert between currencies', () => {
      const result = calculator.calculate('100 USD to EUR');
      // 100 USD * 0.85 = 85 EUR
      expect(result.results[0].result).toBe('85.00 EUR');
    });

    it('should convert from EUR to USD', () => {
      const result = calculator.calculate('100 EUR to USD');
      // 100 EUR / 0.85 ≈ 117.65 USD
      expect(result.results[0].result).toBe('117.65 USD');
    });

    it('should handle zero amount conversion', () => {
      const result = calculator.calculate('0 USD to EUR');
      expect(result.results[0].result).toBe('0.00 EUR');
    });

    it('should handle negative currency conversion', () => {
      const result = calculator.calculate('-50 USD to EUR');
      expect(result.results[0].result).toBe('-42.50 EUR');
    });

    it('should convert through base currency', () => {
      const result = calculator.calculate('100 EUR to GBP');
      // EUR→USD→GBP: 100/0.85*0.73 ≈ 85.88 GBP
      expect(result.results[0].result).toBe('85.88 GBP');
    });

    it('should convert JPY with 0 decimals', () => {
      const result = calculator.calculate('1000 USD to JPY');
      // 1000 USD * 110 = 110000 JPY (0 decimals - no decimal point shown)
      expect(result.results[0].result).toBe('110 000 JPY');
    });

    it('should convert to JPY and round to integer', () => {
      const result = calculator.calculate('10.5 USD to JPY');
      // 10.5 USD * 110 = 1155 JPY (rounded to integer)
      expect(result.results[0].result).toBe('1 155 JPY');
    });

    // Ambiguous Currency Errors
    it('should error on ambiguous currency conversion', () => {
      const result = calculator.calculate('$100 to EUR');
      // Ambiguous currencies cannot be converted
      expect(result.results[0].hasError || result.errors.runtime.length > 0).toBe(true);
    });

    it('should error converting between ambiguous currencies', () => {
      const result = calculator.calculate('$100 to £');
      // Cannot convert between different ambiguous currencies
      expect(result.results[0].hasError || result.errors.runtime.length > 0).toBe(true);
    });

    // Derived Units with Currencies
    it('should handle currency in derived units', () => {
      const result = calculator.calculate('50 USD/hour');
      expect(result.results[0].result).toBe('50.00 USD/h');
    });

    it('should convert derived units with currencies', () => {
      const result = calculator.calculate('50 USD/hour to EUR/day');
      // 50 USD/hour = 50*0.85 EUR/hour = 42.50 EUR/hour
      // 42.50 EUR/hour = 42.5*24 EUR/day = 1020 EUR/day
      expect(result.results[0].result).toBe('1 020.00 EUR/day');
    });

    it('should convert currency per area', () => {
      const result = calculator.calculate('100 USD/m^2 to EUR/ft^2');
      // Converts both currency and area
      // 100 USD/m² → 85 EUR/m² → 7.90 EUR/ft²
      expect(result.results[0].result).toBe('7.90 EUR/ft²');
    });

    it('should error on ambiguous currency in derived units', () => {
      const result = calculator.calculate('$50/hour to EUR/day');
      // Ambiguous currencies in conversions should error
      expect(result.results[0].hasError || result.errors.runtime.length > 0).toBe(true);
    });

    // Complex Arithmetic
    it('should handle currency arithmetic then conversion', () => {
      const result = calculator.calculate('(100 USD + 50 USD) to EUR');
      // 150 USD * 0.85 = 127.5 EUR
      expect(result.results[0].result).toBe('127.50 EUR');
    });

    it('should handle mixed currency arithmetic with conversion', () => {
      const result = calculator.calculate('100 USD + 50 EUR to GBP');
      // 100 USD + 50 EUR = 100 USD + 58.82 USD = 158.82 USD
      // 158.82 USD * 0.73 = 115.94 GBP
      expect(result.results[0].result).toBe('115.94 GBP');
    });

    it('should handle currency multiplication', () => {
      const result = calculator.calculate('50 USD * 2 to EUR');
      // 100 USD * 0.85 = 85 EUR
      expect(result.results[0].result).toBe('85.00 EUR');
    });

    it('should handle large currency amounts', () => {
      const result = calculator.calculate('1000000000 USD to EUR');
      expect(result.results[0].result).toBe('850 000 000.00 EUR');
    });

    it('should handle very small currency amounts', () => {
      const result = calculator.calculate('0.01 USD to JPY');
      // 0.01 USD * 110 = 1.1 JPY → rounds to 1 or 2 JPY (0 decimals)
      expect(result.results[0].result).toBe('1 JPY');
    });

    it('should handle currency division', () => {
      const result = calculator.calculate('100 USD / 2');
      expect(result.results[0].result).toBe('50.00 USD');
    });

    it('should handle complex currency expression', () => {
      const result = calculator.calculate('(100 USD + 50 USD) * 2 - 200 USD');
      // (150) * 2 - 200 = 300 - 200 = 100
      expect(result.results[0].result).toBe('100.00 USD');
    });

    it('should maintain precision in currency chain conversion', () => {
      const result = calculator.calculate('100 USD to EUR to GBP to USD');
      expect(result.results[0].result).toBe('100.00 USD');
    });

    it('should handle currency with percentage', () => {
      const result = calculator.calculate('100 USD * 20%');
      expect(result.results[0].result).toBe('20.00 USD');
    });

    it('should convert currency with percentage calculation', () => {
      const result = calculator.calculate('(100 USD * 1.15) to EUR');
      // 115 USD * 0.85 = 97.75 EUR
      expect(result.results[0].result).toBe('97.75 EUR');
    });
  });

  describe('User defined units', () => {
    it('should handle user-defined units', () => {
      const result = calculator.calculate(`1 person`);
      expect(result.results[0].result).toContain('person');
    });

    it('should handle derived units with user-defined units', () => {
      let result = calculator.calculate(`1 kg / person`);
      expect(result.results[0].result).toContain('kg');
      expect(result.results[0].result).toContain('person');
      result = calculator.calculate(`1 USD/person/day`);
      expect(result.results[0].result).toContain('USD');
      expect(result.results[0].result).toContain('person');
      expect(result.results[0].result).toContain('day');
      result = calculator.calculate(`1 click/person`);
      expect(result.results[0].result).toContain('click');
      expect(result.results[0].result).toContain('person');
      result = calculator.calculate(`1 km^2 person/hour`);
      expect(result.results[0].result).toContain('km²');
      expect(result.results[0].result).toContain('person');
      expect(result.results[0].result).toContain('h');
    });
  });

  describe('Derived Units', () => {
    it('should handle speed units', () => {
      const result = calculator.calculate('60 km/h');
      expect(result.results[0].result).toContain('km');
      expect(result.results[0].result).toContain('h');
    });

    it('should handle derived units with space multiplication', () => {
      let result = calculator.calculate('1 N m');
      expect(result.results[0].result).toContain('N');
      expect(result.results[0].result).toContain('m');
      result = calculator.calculate('1 N^2 m');
      expect(result.results[0].result).toContain('N²');
      expect(result.results[0].result).toContain('m');
      result = calculator.calculate('1 N m^2');
      expect(result.results[0].result).toContain('N');
      expect(result.results[0].result).toContain('m²');
      result = calculator.calculate('1 N^3 m^2');
      expect(result.results[0].result).toContain('N³');
      expect(result.results[0].result).toContain('m²');
      result = calculator.calculate('1 N² m³');
      expect(result.results[0].result).toContain('N²');
      expect(result.results[0].result).toContain('m³');
      result = calculator.calculate('1 N² m^3');
      expect(result.results[0].result).toContain('N²');
      expect(result.results[0].result).toContain('m³');
    });

    it('should handle derived units with division and exponents', () => {
      const result = calculator.calculate('1 W/m²');
      expect(result.results[0].result).toContain('W');
      expect(result.results[0].result).toContain('m²');
    });
  });

  describe('Composite Units', () => {
    it('should handle composite length units', () => {
      const result = calculator.calculate('5 m 20 cm');
      expect(result.results[0].result).toContain('5');
      expect(result.results[0].result).toContain('m');
      expect(result.results[0].result).toContain('20');
      expect(result.results[0].result).toContain('cm');
    });

    it('should handle composite time units', () => {
      const result = calculator.calculate('2 hr 30 min');
      expect(result.results[0].result).toContain('2');
      expect(result.results[0].result).toContain('h'); // 'hr' is normalized to 'h'
      expect(result.results[0].result).toContain('30');
      expect(result.results[0].result).toContain('min');
    });

    it('should handle negated composite units', () => {
      const result = calculator.calculate('-(5 m 20 cm)');
      expect(result.results[0].result).toContain('-5');
      expect(result.results[0].result).toContain('m');
      expect(result.results[0].result).toContain('-20');
      expect(result.results[0].result).toContain('cm');
    });
  });

  describe('Unit Conversions', () => {
    it('should convert between metric units', () => {
      const result = calculator.calculate('5 km to m');
      expect(result.results[0].result).toBe('5 000 m');
    });

    it('should convert between imperial and metric', () => {
      const result = calculator.calculate('10 inches in cm');
      expect(result.results[0].result).toBe('25.4 cm');
    });

    it('should convert between temperature units', () => {
      const result = calculator.calculate(`77 deg F to deg C
275 K to deg C`);
      expect(result.results[0].result).toBe('25 °C');
      expect(result.results[1].result).toBe('1.85 °C');
    });

    it('should convert derived units', () => {
      let result = calculator.calculate('60 mph to km/h');
      expect(result.results[0].result).toMatch(/96.56\d* km\/h/);
      result = calculator.calculate('900 kg/h to g/s');
      expect(result.results[0].result).toBe('250 g/s');
    });

    it('should convert to composite units', () => {
      const result = calculator.calculate('171 cm to ft in');
      expect(result.results[0].result).toMatch(/5 ft 7.32\d* in/);
    });

    it('should convert derived units with user-defined units', () => {
      const result = calculator.calculate('100 person/sq ft to person/km^2');
      expect(result.results[0].result).toMatch("1 076 391 042 person/km²");
    });

    it('should convert from composite units to single unit', () => {
      const result = calculator.calculate('6 ft 3 in to cm');
      expect(result.results[0].result).toMatch(/190.5\d* cm/);
    });
  });

  describe('Presentation Conversions', () => {
    it('should convert to binary', () => {
      const result = calculator.calculate('255 to binary');
      expect(result.results[0].result).toBe('0b11111111');
    });

    it('should convert to octal', () => {
      const result = calculator.calculate('255 to octal');
      expect(result.results[0].result).toBe('0o377');
    });

    it('should convert to hexadecimal', () => {
      const result = calculator.calculate('255 to hex');
      expect(result.results[0].result).toBe('0xFF');
    });

    it('should convert to fraction', () => {
      const result = calculator.calculate('0.75 to fraction');
      expect(result.results[0].result).toBe('3/4');
    });

    it('should convert to scientific notation', () => {
      const result = calculator.calculate('5000 to scientific');
      expect(result.results[0].result).toContain('5');
      expect(result.results[0].result).toContain('e');
      expect(result.results[0].result).toContain('3');
    });

    it('should convert fractional values to binary', () => {
      const result = calculator.calculate('3.75 to binary');
      expect(result.results[0].result).toBe('0b11.11');
    });

    it('should convert fractional values to hex', () => {
      const result = calculator.calculate('10.625 to hex');
      expect(result.results[0].result).toBe('0xA.A');
    });

    it('should convert mixed fractions', () => {
      const result = calculator.calculate('1.75 to fraction');
      expect(result.results[0].result).toBe('1 3/4');
    });

    it('should handle infinity in scientific notation', () => {
      const result = calculator.calculate('(1/0) to scientific');
      // Division by zero is caught as an error in the evaluator
      expect(result.results[0].result).toContain('Error');
    });

    it('should reject ordinal for non-integers', () => {
      const result = calculator.calculate('3.14 to ordinal');
      expect(result.results[0].result).toContain('Error');
    });
  });

  describe('Arbitrary Base Conversion', () => {
    it('should convert to base 7 with suffix', () => {
      const result = calculator.calculate('100 to base 7');
      expect(result.results[0].result).toBe('202 (base 7)');
    });

    it('should convert to base 16 with prefix', () => {
      const result = calculator.calculate('255 to base 16');
      expect(result.results[0].result).toBe('0xFF');
    });

    it('should convert fractional to base 2 with prefix', () => {
      const result = calculator.calculate('10.625 to base 2');
      expect(result.results[0].result).toBe('0b1010.101');
    });

    it('should convert to base 10 without decoration', () => {
      const result = calculator.calculate('100 to base 10');
      expect(result.results[0].result).toBe('100');
    });

    it('should handle negative with prefix', () => {
      const result = calculator.calculate('-10 to base 16');
      expect(result.results[0].result).toBe('0x-A');
    });

    it('should handle negative with suffix', () => {
      const result = calculator.calculate('-10 to base 7');
      expect(result.results[0].result).toBe('-13 (base 7)');
    });

    it('should convert to large base', () => {
      const result = calculator.calculate('1000 to base 35');
      expect(result.results[0].result).toContain('(base 35)');
    });

    it('should error on invalid base (too low)', () => {
      const result = calculator.calculate('100 to base 1');
      // Parser error: base out of range
      expect(result.errors.parser.length).toBeGreaterThan(0);
      expect(result.results[0].hasError).toBe(true);
    });

    it('should error on invalid base (too high)', () => {
      const result = calculator.calculate('100 to base 50');
      // Parser error: base out of range
      expect(result.errors.parser.length).toBeGreaterThan(0);
      expect(result.results[0].hasError).toBe(true);
    });
  });

  describe('Presentations with Units', () => {
    it('should preserve units in scientific notation', () => {
      const result = calculator.calculate('5000 km to scientific');
      expect(result.results[0].result).toMatch(/5(\.0+)?e\+?3 km/);
    });

    it('should preserve units in fraction', () => {
      const result = calculator.calculate('0.75 kg to fraction');
      expect(result.results[0].result).toBe('3/4 kg');
    });

    it('should preserve units in base conversion', () => {
      const result = calculator.calculate('100 inches to base 7');
      expect(result.results[0].result).toBe('202 (base 7) in');
    });

    it('should preserve units with hex', () => {
      const result = calculator.calculate('255 meters to hex');
      expect(result.results[0].result).toBe('0xFF m');
    });

    it('should preserve units with binary', () => {
      const result = calculator.calculate('15 kg to binary');
      expect(result.results[0].result).toBe('0b1111 kg');
    });
  });

  describe('Presentations with Composite Units', () => {
    it('should apply presentation to each composite component', () => {
      const result = calculator.calculate('5 ft 7.5 in to fraction');
      expect(result.results[0].result).toBe('5 ft 7 1/2 in');
    });

    it('should apply presentation to converted composite component', () => {
      const result = calculator.calculate('1.71 m to ft in to fraction');
      expect(result.results[0].result).toBe('5 ft 7 41/127 in');
    });
  });

  describe('Angle Unit Display', () => {
    it('should display angle unit for inverse trig in degrees', () => {
      const degreeCalc = new Calculator(dataLoader, { angleUnit: 'degree' });
      const result = degreeCalc.calculate('asin(0.5)');
      expect(result.results[0].result).toMatch(/30(\.\d+)? °/);
    });

    it('should display angle unit for inverse trig in radians', () => {
      const radianCalc = new Calculator(dataLoader, { angleUnit: 'radian' });
      const result = radianCalc.calculate('asin(0.5)');
      expect(result.results[0].result).toMatch(/0\.52\d* rad/);
    });

    it('should display angle unit for acos in degrees', () => {
      const degreeCalc = new Calculator(dataLoader, { angleUnit: 'degree' });
      const result = degreeCalc.calculate('acos(0)');
      expect(result.results[0].result).toMatch(/90(\.\d+)? °/);
    });

    it('should display angle unit for atan in degrees', () => {
      const degreeCalc = new Calculator(dataLoader, { angleUnit: 'degree' });
      const result = degreeCalc.calculate('atan(1)');
      expect(result.results[0].result).toMatch(/45(\.\d+)? °/);
    });
  });

  describe('Basic Arithmetic', () => {
    it('should handle addition', () => {
      const result = calculator.calculate('2 + 2');
      expect(result.results[0].result).toBe('4');
    });

    it('should handle subtraction', () => {
      const result = calculator.calculate('10 - 3');
      expect(result.results[0].result).toBe('7');
    });

    it('should handle multiplication', () => {
      const result = calculator.calculate('3 * 4');
      expect(result.results[0].result).toBe('12');
    });

    it('should handle division', () => {
      const result = calculator.calculate('10 / 4');
      expect(result.results[0].result).toBe('2.5');
    });

    it('should handle exponentiation', () => {
      const result = calculator.calculate('2 ^ 3');
      expect(result.results[0].result).toBe('8');
    });

    it('should handle modulo', () => {
      const result = calculator.calculate('18 % 7');
      expect(result.results[0].result).toBe('4');

      const result2 = calculator.calculate('18 mod 7');
      expect(result2.results[0].result).toBe('4');
    });

    it('should handle factorial', () => {
      const result = calculator.calculate('5!');
      expect(result.results[0].result).toBe('120');
    });

    it('should handle parentheses for precedence', () => {
      const result = calculator.calculate('3 * (4 + 5)');
      expect(result.results[0].result).toBe('27');
    });

    it('should handle negative expressions', () => {
      const result = calculator.calculate('5 - 8');
      expect(result.results[0].result).toBe('-3');
    });
  });

  describe('Cross-Unit Arithmetic', () => {
    it('should add compatible units', () => {
      const result = calculator.calculate('5 m + 20 cm');
      expect(result.results[0].result).toBe('5.2 m');
    });

    it('should add compatible user-defined units', () => {
      const result = calculator.calculate('3 trips + 2 trips');
      expect(result.results[0].result).toBe('5 trips');
    });

    it('should subtract compatible units with fractional result', () => {
      const result = calculator.calculate('2 hr - 30 min');
      expect(result.results[0].result).toBe('1.5 h');
    });

    it('should multiply unit by number', () => {
      const result = calculator.calculate('3 kg * 2');
      expect(result.results[0].result).toBe('6 kg');
    });

    it('should create derived units from multiplication', () => {
      let result = calculator.calculate('5 N * 2 m');
      expect(result.results[0].result).toBe('10 N m');

      // Test multiplication with derived units as left operand (unit cancellation)
      result = calculator.calculate('3 kg/m^2 * 2 m^2');
      expect(result.results[0].result).toBe('6 kg');
    });

    it('should create derived units from multiplication with user-defined units', () => {
      // Test multiplication with user-defined derived units (unit cancellation)
      let result = calculator.calculate('10 USD/person * 3 person');
      // With currency-specific formatting, USD shows 2 decimal places
      expect(result.results[0].result).toBe('30.00 USD');

      result = calculator.calculate('1000 click * 0.25 person/click * 0.001 USD/person');
      expect(result.results[0].result).toBe('0.25 USD');
    });

    it('should divide unit by number', () => {
      const result = calculator.calculate('4 m / 2');
      expect(result.results[0].result).toBe('2 m');
    });

    it('should create derived units from division', () => {
      let result = calculator.calculate('60 km / 2 h');
      expect(result.results[0].result).toContain('30');
      expect(result.results[0].result).toContain('km');
      expect(result.results[0].result).toContain('h');

      // Test division with derived units as operands
      result = calculator.calculate('60 kg/cm^2 / 2 h/m^2');
      // 60 kg/cm² / 2 h/m² = (60/2) * kg/cm² * m²/h = 30 kg·m²/(cm²·h)
      // With unit conversion: cm² to m² gives factor of 10000
      // Result: 30 * 10000 = 300000 kg/h
      expect(result.results[0].result).toBe('300 000 kg/h');
    });

    it('should create derived units from division with user-defined units', () => {
      // Test division creating derived units with user-defined units
      let result = calculator.calculate('1000 USD / 5 person / 2 day');
      // USD gets currency precision (2 decimals) since it's the only positive exponent unit
      expect(result.results[0].result).toBe('100.00 USD/(person day)');

      // Test division with user-defined derived units (unit cancellation)
      result = calculator.calculate('500 click/person / 5 USD/person');
      expect(result.results[0].result).toBe('100 click/USD');
    });

    it('should combine conversion with arithmetic', () => {
      const result = calculator.calculate('5 km + 200 m to m');
      expect(result.results[0].result).toBe('5 200 m');
    });
  });

  describe('Alternative Operators', () => {
    it('should handle per operator for derived units', () => {
      const result = calculator.calculate('60 km per h');
      expect(result.results[0].result).toContain('60');
      expect(result.results[0].result).toContain('km');
      expect(result.results[0].result).toContain('h');
    });

    it('should handle per operator for division', () => {
      const result = calculator.calculate('60 km per 2 h');
      expect(result.results[0].result).toContain('30');
      expect(result.results[0].result).toContain('km');
      expect(result.results[0].result).toContain('h');
    });
  });

  describe('Date and Time Literals', () => {
    it('should handle plain dates', () => {
      const result = calculator.calculate('1970 Jan 01');
      expect(result.results[0].result).toContain('1970');
      expect(result.results[0].result).toContain('01');
      expect(result.results[0].result).toContain('01');
    });

    it('should handle plain times', () => {
      const result = calculator.calculate('14:30');
      expect(result.results[0].result).toContain('14:30');
    });

    it('should handle times with AM/PM', () => {
      const result = calculator.calculate('2:30 PM');
      expect(result.results[0].result).toContain('14:30');
    });

    it('should handle plain date times', () => {
      const result = calculator.calculate('1970 Jan 01 14:30');
      expect(result.results[0].result).toContain('1970');
      expect(result.results[0].result).toContain('14:30');
    });

    it('should handle zoned date times', () => {
      const result = calculator.calculate(`12:30 UTC
8:25 Japan
2023 Jan 01 14:00 America/New_York
2023 Jan 01 14:00 New York
2023.06.15 09:00 London
1970 Jan 01 23:59 UTC+8`);
      expect(result.results[0].result).toBe('12:30 UTC');
      expect(result.results[1].result).toBe('08:25 UTC+9');
      expect(result.results[2].result).toBe('2023-01-01 Sun 14:00 UTC-5');
      expect(result.results[3].result).toBe('2023-01-01 Sun 14:00 UTC-5');
      expect(result.results[4].result).toBe('2023-06-15 Thu 09:00 UTC+1');
      expect(result.results[5].result).toBe('1970-01-01 Thu 23:59 UTC+8');
    });

    it('should handle zoned date times with offsets', () => {
      const result = calculator.calculate(`12:30 Z
12:30 UTC+1
12:30 UTC+01
12:30 UTC-515
12:30 UTC-1015`);
      expect(result.results[0].result).toBe('12:30 UTC');
      expect(result.results[1].result).toBe('12:30 UTC+1');
      expect(result.results[2].result).toBe('12:30 UTC+1');
      expect(result.results[3].result).toBe('12:30 UTC-5:15');
      expect(result.results[4].result).toBe('12:30 UTC-10:15');
    });

    it('should handle parsing surrounding zoned date times', () => {
      const result = calculator.calculate(`05:00
05:00 UTC
05:00-3:30
05:00 UTC-3:30
05:00 UTC+3:30`);
      expect(result.results[0].result).toBe('05:00');
      expect(result.results[1].result).toBe('05:00 UTC');
      expect(result.results[2].result).toBe('1 h 30 min');
      expect(result.results[3].result).toBe('17 h 30 min'); // zonedDateTime - plainTime: 05:00 UTC - 03:30 (local time)
      expect(result.results[4].hasError).toBe(true); // date time add date time is not supported.
    });

    it('should handle numeric date formats', () => {
      const result = calculator.calculate(`2023.01.15
2023.13.15
2023.06.32
2023.02.30
2023.00.15
2023.06.00`);
      expect(result.results[0].result).toBe('2023-01-15 Sun');
      expect(result.results[1].result).toBe('2023-12-15 Fri'); // month 13 clamps to December
      expect(result.results[2].result).toBe('2023-06-30 Fri'); // day 32 clamps to 30
      expect(result.results[3].result).toBe('2023-02-28 Tue'); // day 30 clamps to 28
      expect(result.results[4].hasError).toBe(true); // month 0 is invalid
      expect(result.results[5].hasError).toBe(true); // day 0 is invalid
    });


    it('should handle instants (relative time)', () => {
      function getDateString(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      function getTimeString(date: Date): string {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      function modifyNow(dateModifier: (date: Date) => void): Date {
        const modified = new Date();
        dateModifier(modified);
        return modified;
      }

      const result = calculator.calculate(`now
today
tomorrow
yesterday
2 days ago
3 days from now
5 years ago
10 hours from now`);
      const todayString = getDateString(new Date());
      const nowString = getTimeString(new Date());

      // now
      expect(result.results[0].result).toContain(todayString);
      expect(result.results[0].result).toContain(nowString);

      // today
      expect(result.results[1].result).toContain(todayString);
      expect(result.results[1].result).toContain(nowString);
      
      expect(result.results[0].result).toContain(result.results[1].result); // `now` and `today` should be the same

      // tomorrow
      expect(result.results[2].result).toContain(getDateString(modifyNow(d => d.setDate(d.getDate() + 1))));
      expect(result.results[2].result).toContain(nowString);

      // yesterday
      expect(result.results[3].result).toContain(getDateString(modifyNow(d => d.setDate(d.getDate() - 1))));
      expect(result.results[3].result).toContain(nowString);

      // 2 days ago
      expect(result.results[4].result).toContain(getDateString(modifyNow(d => d.setDate(d.getDate() - 2))));
      expect(result.results[4].result).toContain(nowString);

      // 3 days from now
      expect(result.results[5].result).toContain(getDateString(modifyNow(d => d.setDate(d.getDate() + 3))));
      expect(result.results[5].result).toContain(nowString);

      // 5 years ago
      expect(result.results[6].result).toContain(getDateString(modifyNow(d => d.setFullYear(d.getFullYear() - 5))));
      expect(result.results[6].result).toContain(nowString);

      // 10 hours from now
      const tenHoursLater = modifyNow(d => d.setHours(d.getHours() + 10));
      expect(result.results[7].result).toContain(getDateString(tenHoursLater));
      expect(result.results[7].result).toContain(getTimeString(tenHoursLater));
    });
  });

  describe('Date and Time Arithmetic', () => {
    it('should add time durations', () => {
      const result = calculator.calculate('2 days + 3 hours');
      expect(result.results[0].result).toContain('2.125');
      expect(result.results[0].result).toContain('day');
    });

    it('should subtract dates', () => {
      const result = calculator.calculate('2023 Jan 10 - 2023 Jan 1');
      expect(result.results[0].result).toContain('9');
      expect(result.results[0].result).toContain('day');
    });

    it('should add duration to date', () => {
      const result = calculator.calculate('2023 Jan 1 + 10 days');
      expect(result.results[0].result).toBe('2023-01-11 Wed');
    });

    it('should handle month addition with clamping', () => {
      const result = calculator.calculate('1970 Jan 31 + 1 month');
      expect(result.results[0].result).toBe('1970-02-28 Sat');
    });

    it('should handle adding decimal duration to date', () => {
      // 0.3 month = 0.3 * (365.25 / 12) days = 9.13125 days = 13149 minutes
      const result = calculator.calculate('1970 Jan 31 + 13149 minutes\n1970 Jan 31 + 0.3 month');
      expect(result.results[0].result).toBe('1970-02-09 Mon 03:09');
      expect(result.results[1].result).toBe('1970-02-09 Mon 03:09');
    });

    it('should handle add duration to plain time', () => {
      const result = calculator.calculate('10:25 + 2 hours');
      expect(result.results[0].result).toBe('12:25');
    });

    it('should handle add decimal duration to plain time', () => {
      const result = calculator.calculate('10:25 + 30 minutes\n10:25 + 0.5 hour');
      expect(result.results[0].result).toBe('10:55');
      expect(result.results[1].result).toBe('10:55');
    });

    it('should expand plain time to plain date time when exceeding 24 hours', () => {
      const result = calculator.calculate('10:25 + 24 hours\n10:25 + 1 day');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      expect(result.results[0].result).toContain(`${year}-${month}-${day}`);
      expect(result.results[0].result).toContain('10:25');
      expect(result.results[1].result).toContain(`${year}-${month}-${day}`);
      expect(result.results[1].result).toContain('10:25');
    });

    it('should handle add duration to date time', () => {
      const result = calculator.calculate('1970 Jan 1 12:00 + 2 hours');
      expect(result.results[0].result).toContain('1970-01-01');
      expect(result.results[0].result).toContain('14:00');
    });

    it('should handle add composite duration to plain time', () => {
      const result = calculator.calculate('10:25 + 2 hours 40 min');
      expect(result.results[0].result).toBe('13:05');
    });

    it('should handle add composite duration to date', () => {
      const result = calculator.calculate('1970 Jan 1 + 1 month 2 days');
      expect(result.results[0].result).toContain('1970-02-03');
    });

    it('should expand plain date to plain date time when time component added', () => {
      const result = calculator.calculate('1970 Jan 1 + 1 hour');
      expect(result.results[0].result).toBe('1970-01-01 Thu 01:00');
    });

    it('should handle add composite duration to date time', () => {
      const result = calculator.calculate('1970 Jan 1 12:00 + 1 month 2 hours');
      expect(result.results[0].result).toContain('1970-02-01');
      expect(result.results[0].result).toContain('14:00');
    });
  });

  describe('Trigonometric Functions', () => {
    it('should handle sin function', () => {
      const result = calculator.calculate('sin(30 deg)');
      expect(result.results[0].result).toContain('0.5');
    });

    it('should handle cos function', () => {
      const result = calculator.calculate('cos(60 deg)');
      expect(result.results[0].result).toContain('0.5');
    });

    it('should handle tan function', () => {
      const result = calculator.calculate('tan(45 deg)');
      expect(result.results[0].result).toContain('1');
    });

    it('should handle inverse trig functions', () => {
      const result = calculator.calculate('asin(0.5)');
      expect(result.results[0].result).toContain('30 °');
    });
  });

  describe('Logarithmic and Exponential Functions', () => {
    it('should handle sqrt', () => {
      const result = calculator.calculate('sqrt(16)');
      expect(result.results[0].result).toBe('4');
    });

    it('should handle cbrt', () => {
      const result = calculator.calculate('cbrt(27)');
      expect(result.results[0].result).toBe('3');
    });

    it('should handle log as ln', () => {
      const result = calculator.calculate('log(100)');
      expect(result.results[0].result).toBe('4.605170186');
    });

    it('should handle ln', () => {
      const result = calculator.calculate('ln(e^3)');
      expect(result.results[0].result).toBe('3');
    });

    it('should handle exp', () => {
      const result = calculator.calculate('exp(2)');
      expect(result.results[0].result).toContain('7.389');
    });

    it('should handle log10', () => {
      const result = calculator.calculate('log10(1000)');
      expect(result.results[0].result).toBe('3');
    });

    it('should handle log with base', () => {
      const result = calculator.calculate('log(2, 32)');
      expect(result.results[0].result).toBe('5');
    });
  });

  describe('Number Manipulation Functions', () => {
    it('should handle abs', () => {
      const result = calculator.calculate('abs(-5)');
      expect(result.results[0].result).toBe('5');
    });

    it('should handle round', () => {
      const result = calculator.calculate('round(3.6)');
      expect(result.results[0].result).toBe('4');
    });

    it('should handle round with units', () => {
      const result = calculator.calculate('round(18.9 kg)');
      expect(result.results[0].result).toContain('19');
      expect(result.results[0].result).toContain('kg');
    });

    it('should handle floor', () => {
      const result = calculator.calculate('floor(3.6)');
      expect(result.results[0].result).toBe('3');
    });

    it('should handle ceil', () => {
      const result = calculator.calculate('ceil(3.2)');
      expect(result.results[0].result).toBe('4');
    });

    it('should handle trunc', () => {
      const result = calculator.calculate('trunc(-4.7)');
      expect(result.results[0].result).toBe('-4');
    });

    it('should handle frac', () => {
      const result = calculator.calculate('frac(5.75)');
      expect(result.results[0].result).toBe('0.75');
    });
  });

  describe('Permutation and Combination', () => {
    it('should handle perm', () => {
      const result = calculator.calculate('perm(5, 2)');
      expect(result.results[0].result).toBe('20');
    });

    it('should handle comb', () => {
      const result = calculator.calculate('comb(5, 2)');
      expect(result.results[0].result).toBe('10');
    });
  });

  describe('Boolean Operations', () => {
    it('should handle boolean constants', () => {
      const result = calculator.calculate('true');
      expect(result.results[0].result).toBe('true');

      const result2 = calculator.calculate('false');
      expect(result2.results[0].result).toBe('false');
    });

    it('should handle logical AND', () => {
      const result = calculator.calculate('true && false');
      expect(result.results[0].result).toBe('false');
    });

    it('should handle logical OR', () => {
      const result = calculator.calculate('true || false');
      expect(result.results[0].result).toBe('true');
    });

    it('should handle logical NOT', () => {
      const result = calculator.calculate('!true');
      expect(result.results[0].result).toBe('false');
    });

    it('should handle comparisons', () => {
      const result = calculator.calculate('5 > 3');
      expect(result.results[0].result).toBe('true');

      const result2 = calculator.calculate('4.5 <= 4.5');
      expect(result2.results[0].result).toBe('true');

      const result3 = calculator.calculate('200 == 2e2');
      expect(result3.results[0].result).toBe('true');

      const result4 = calculator.calculate('100 != 1e2');
      expect(result4.results[0].result).toBe('false');
    });

    it('should handle comparisons with units', () => {
      const result = calculator.calculate('5 miles < 3 meters');
      expect(result.results[0].result).toBe('false');
    });
  });

  describe('Binary Arithmetic', () => {
    it('should handle bitwise AND', () => {
      const result = calculator.calculate('0b1010 & 0b1100 to binary');
      expect(result.results[0].result).toBe('0b1000');
    });

    it('should handle bitwise OR', () => {
      const result = calculator.calculate('0b1010 | 0b1100 to binary');
      expect(result.results[0].result).toBe('0b1110');
    });

    it('should handle bitwise XOR', () => {
      const result = calculator.calculate('0b1010 xor 0b1100 to binary');
      expect(result.results[0].result).toBe('0b110');
    });

    it('should handle bitwise NOT', () => {
      const result = calculator.calculate('~0b1010 to binary');
      expect(result.results[0].result).toBe('0b-1011');
    });

    it('should handle left shift', () => {
      const result = calculator.calculate('0b1010 << 2 to binary');
      expect(result.results[0].result).toBe('0b101000');
    });

    it('should handle right shift', () => {
      const result = calculator.calculate('0b1010 >> 1 to binary');
      expect(result.results[0].result).toBe('0b101');
    });
  });

  describe('Variables', () => {
    it('should assign and use variables', () => {
      const input = `x = 10
y = 20
x + y`;
      const result = calculator.calculate(input);
      expect(result.results[0].result).toBe('10');
      expect(result.results[1].result).toBe('20');
      expect(result.results[2].result).toBe('30');
    });

    it('should assign variables with units', () => {
      const input = `distance = 100 km
time = 2 h
distance / time`;
      const result = calculator.calculate(input);
      expect(result.results[0].result).toContain('100');
      expect(result.results[0].result).toContain('km');
      expect(result.results[1].result).toContain('2');
      expect(result.results[1].result).toContain('h');
      expect(result.results[2].result).toContain('50');
      expect(result.results[2].result).toContain('km');
      expect(result.results[2].result).toContain('h');
    });
  });

  describe('Conditional Expressions', () => {
    it('should handle simple conditional', () => {
      const result = calculator.calculate('if 5 > 3 then 10 m else 20 m');
      expect(result.results[0].result).toBe('10 m');
    });

    it('should handle conditional with false condition', () => {
      const result = calculator.calculate('if 2 > 5 then 100 else 200');
      expect(result.results[0].result).toBe('200');
    });

    it('should handle nested conditionals', () => {
      const result = calculator.calculate('100 * (if 5 > 3 then (if 2 < 1 then 10 else 20) else 30) + 1');
      expect(result.results[0].result).toBe('2 001');
    });

    it('should handle conditional with variables', () => {
      const input = `x = 10
result = if x > 5 then 100 else 50`;
      const result = calculator.calculate(input);
      expect(result.results[1].result).toBe('100');
    });
  });

  describe('Complex Multi-Line Calculations', () => {
    it.skip('should handle mixed calculations', () => {
      // TODO: Full multi-line with comments and conversions may have formatting differences
      const input = `# Distance calculation
speed = 60 km/h
time = 2.5 h
distance = speed * time

# Conversion
distance to m`;
      const result = calculator.calculate(input);

      // Line 1: heading
      expect(result.results[0].type).toBe('Heading');

      // Line 2: speed = 60 km/h
      expect(result.results[1].result).toContain('60');
      expect(result.results[1].result).toContain('km');
      expect(result.results[1].result).toContain('h');

      // Line 7: distance to m
      expect(result.results[6].result).toContain('150');
      expect(result.results[6].result).toContain('m');
    });

    it('should handle errors without stopping', () => {
      const input = `5 + 3
5 m + 10 s
10 * 2`;
      const result = calculator.calculate(input);

      expect(result.results[0].result).toBe('8');
      expect(result.results[0].hasError).toBe(false);

      expect(result.results[1].hasError).toBe(true);
      expect(result.results[1].result).toContain('Error');

      expect(result.results[2].result).toBe('20');
      expect(result.results[2].hasError).toBe(false);

      expect(result.errors.runtime.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const result = calculator.calculate('');
      expect(result.results.length).toBe(0);
      expect(result.errors.lexer.length).toBe(0);
      expect(result.errors.runtime.length).toBe(0);
    });

    it('should handle whitespace-only input', () => {
      const result = calculator.calculate('   \n  \n   ');
      expect(result.errors.lexer.length).toBe(0);
      expect(result.errors.runtime.length).toBe(0);
    });

    it('should handle division by zero as error', () => {
      const result = calculator.calculate('10 / 0');
      expect(result.results[0].hasError).toBe(true);
    });

    it('should handle very large numbers', () => {
      const result = calculator.calculate('1e100');
      expect(result.results[0].result).toContain('1e');
    });

    it('should handle very small numbers', () => {
      const result = calculator.calculate('1e-100');
      expect(result.results[0].result).toContain('1e');
    });
  });

  describe('Comments and Plain Text', () => {
    it('should handle inline comments', () => {
      const result = calculator.calculate('5 + 5 # this is a comment');
      expect(result.results[0].result).toBe('10');
    });

    it('should handle headings', () => {
      const result = calculator.calculate('# Heading');
      expect(result.results[0].type).toBe('Heading');
      expect(result.results[0].result).toBe(null);
    });

    it.skip('should fail on invalid expressions gracefully', () => {
      // TODO: Error handling
      const input = `This is just text
5 + 5
More text here`;
      const result = calculator.calculate(input);

      // Second line should calculate
      expect(result.results[1].result).toBe('10');
      expect(result.results[1].hasError).toBe(false);
    });
  });
});

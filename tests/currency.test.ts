import { describe, it, expect, beforeAll } from 'vitest';
import { DataLoader } from '../src/data-loader';
import { Calculator } from '../src/calculator';
import { CurrencyConverter, type CurrencyValue } from '../src/currency';
import type { ExchangeRatesDatabase } from '../types/types';
import * as path from 'path';

describe('CurrencyConverter', () => {
  let dataLoader: DataLoader;
  let converter: CurrencyConverter;

  // Mock exchange rates for testing
  // Structure: Single base currency (USD) with rates to other currencies
  // This should support all 6 combinations: USD↔EUR, USD↔GBP, EUR↔GBP
  const mockExchangeRates: ExchangeRatesDatabase = {
    date: '2024-01-01T00:00:00Z',
    usd: {
      eur: 0.85,
      gbp: 0.73,
      jpy: 110.0
    }
  };

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '..', 'data'));
    converter = new CurrencyConverter(dataLoader);
    converter.loadExchangeRates(mockExchangeRates);
  });

  describe('Exchange Rate Loading', () => {
    it('should load exchange rates correctly', () => {
      expect(converter.getBaseCurrency()).toBe('USD');
      expect(converter.getLastUpdate()).toBe('2024-01-01T00:00:00Z');
    });

    it('should check if conversion is available', () => {
      expect(converter.canConvert('USD', 'EUR')).toBe(true);
      expect(converter.canConvert('USD', 'GBP')).toBe(true);
      expect(converter.canConvert('EUR', 'GBP')).toBe(true);
    });
  });

  describe('Direct Exchange Rate Conversion', () => {
    it('should convert USD to EUR using direct rate', () => {
      const value: CurrencyValue = { amount: 100, currencyCode: 'USD' };
      const result = converter.convert(value, 'EUR');

      expect(result.currencyCode).toBe('EUR');
      expect(result.amount).toBeCloseTo(85.0, 2);
    });

    it('should convert USD to GBP using direct rate', () => {
      const value: CurrencyValue = { amount: 100, currencyCode: 'USD' };
      const result = converter.convert(value, 'GBP');

      expect(result.currencyCode).toBe('GBP');
      expect(result.amount).toBeCloseTo(73.0, 2);
    });

    it('should convert USD to JPY using direct rate', () => {
      const value: CurrencyValue = { amount: 100, currencyCode: 'USD' };
      const result = converter.convert(value, 'JPY');

      expect(result.currencyCode).toBe('JPY');
      expect(result.amount).toBe(11000); // JPY has 0 decimal places
    });
  });

  describe('Inverse Exchange Rate Conversion', () => {
    it('should convert EUR to USD using inverse rate', () => {
      const value: CurrencyValue = { amount: 85, currencyCode: 'EUR' };
      const result = converter.convert(value, 'USD');

      expect(result.currencyCode).toBe('USD');
      // 85 EUR / 0.85 = 100 USD
      expect(result.amount).toBeCloseTo(100.0, 1);
    });

    it('should convert GBP to USD using inverse rate', () => {
      const value: CurrencyValue = { amount: 73, currencyCode: 'GBP' };
      const result = converter.convert(value, 'USD');

      expect(result.currencyCode).toBe('USD');
      // 73 GBP / 0.73 = 100 USD
      expect(result.amount).toBeCloseTo(100.0, 1);
    });

    it('should convert JPY to USD using inverse rate', () => {
      const value: CurrencyValue = { amount: 11000, currencyCode: 'JPY' };
      const result = converter.convert(value, 'USD');

      expect(result.currencyCode).toBe('USD');
      // 11000 JPY / 110 = 100 USD
      expect(result.amount).toBeCloseTo(100.0, 1);
    });
  });

  describe('Conversion Through Base Currency', () => {
    it('should support all 6 conversion combinations with single base currency', () => {
      // With base currency USD and rates to EUR (0.85) and GBP (0.73):
      // All 6 combinations should work: USD↔EUR, USD↔GBP, EUR↔GBP

      // 1. USD → EUR (direct from data)
      const usdToEur = converter.convert({ amount: 100, currencyCode: 'USD' }, 'EUR');
      expect(usdToEur.amount).toBeCloseTo(85.0, 2);

      // 2. USD → GBP (direct from data)
      const usdToGbp = converter.convert({ amount: 100, currencyCode: 'USD' }, 'GBP');
      expect(usdToGbp.amount).toBeCloseTo(73.0, 2);

      // 3. EUR → USD (inverse: 1 / 0.85)
      const eurToUsd = converter.convert({ amount: 85, currencyCode: 'EUR' }, 'USD');
      expect(eurToUsd.amount).toBeCloseTo(100.0, 1);

      // 4. EUR → GBP (through base: (1/0.85) * 0.73)
      const eurToGbp = converter.convert({ amount: 85, currencyCode: 'EUR' }, 'GBP');
      expect(eurToGbp.amount).toBeCloseTo(73.0, 1);

      // 5. GBP → USD (inverse: 1 / 0.73)
      const gbpToUsd = converter.convert({ amount: 73, currencyCode: 'GBP' }, 'USD');
      expect(gbpToUsd.amount).toBeCloseTo(100.0, 1);

      // 6. GBP → EUR (through base: (1/0.73) * 0.85)
      const gbpToEur = converter.convert({ amount: 73, currencyCode: 'GBP' }, 'EUR');
      expect(gbpToEur.amount).toBeCloseTo(85.0, 1);
    });

    it('should convert GBP to EUR through USD', () => {
      // GBP → USD → EUR = (1/0.73) * 0.85 = 1.1643835...
      // So 100 GBP = 116.44 EUR
      const value: CurrencyValue = { amount: 100, currencyCode: 'GBP' };
      const result = converter.convert(value, 'EUR');

      expect(result.currencyCode).toBe('EUR');
      expect(result.amount).toBeCloseTo(116.44, 1);
    });

    it('should convert JPY to EUR through USD', () => {
      // JPY → USD → EUR
      // Rate should be (1/110) * 0.85 = 0.00773
      const value: CurrencyValue = { amount: 11000, currencyCode: 'JPY' };
      const result = converter.convert(value, 'EUR');

      expect(result.currencyCode).toBe('EUR');
      expect(result.amount).toBeCloseTo(85.0, 1);
    });
  });

  describe('Same Currency Conversion', () => {
    it('should return same amount for same currency', () => {
      const value: CurrencyValue = { amount: 100, currencyCode: 'USD' };
      const result = converter.convert(value, 'USD');

      expect(result.currencyCode).toBe('USD');
      expect(result.amount).toBe(100);
    });
  });

  describe('Minor Units Rounding', () => {
    it('should round USD to 2 decimal places', () => {
      const usd = dataLoader.getCurrencyByCode('USD');
      if (!usd) {
        throw new Error('USD currency not found');
      }

      const rounded = converter.roundToMinorUnits(12.3456789, usd);
      expect(rounded).toBe(12.35);
    });

    it('should round JPY to 0 decimal places', () => {
      const jpy = dataLoader.getCurrencyByCode('JPY');
      if (!jpy) {
        throw new Error('JPY currency not found');
      }

      const rounded = converter.roundToMinorUnits(12.3456789, jpy);
      expect(rounded).toBe(12);
    });

    it('should handle rounding in conversion', () => {
      // Convert amount that results in fractional minor units
      const value: CurrencyValue = { amount: 33.33, currencyCode: 'USD' };
      const result = converter.convert(value, 'EUR', true); // Request rounding
      
      // 33.33 * 0.85 = 28.3305, should round to 28.33
      expect(result.amount).toBeCloseTo(28.33, 2);
    });
  });

  describe('Currency Formatting', () => {
    it('should format USD with 2 decimal places', () => {
      const value: CurrencyValue = { amount: 123.456, currencyCode: 'USD' };
      const formatted = converter.format(value);

      expect(formatted).toBe('123.46 USD');
    });

    it('should format JPY with 0 decimal places', () => {
      const value: CurrencyValue = { amount: 12345.67, currencyCode: 'JPY' };
      const formatted = converter.format(value);

      expect(formatted).toBe('12346 JPY');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown source currency', () => {
      const value: CurrencyValue = { amount: 100, currencyCode: 'INVALID' };

      expect(() => {
        converter.convert(value, 'USD');
      }).toThrow(/Currency not found: INVALID/);
    });

    it('should throw error for unknown target currency', () => {
      const value: CurrencyValue = { amount: 100, currencyCode: 'USD' };

      expect(() => {
        converter.convert(value, 'INVALID');
      }).toThrow(/Currency not found: INVALID/);
    });

    it('should throw error when exchange rate is unavailable', () => {
      // Create a converter without loading exchange rates
      const emptyConverter = new CurrencyConverter(dataLoader);

      const value: CurrencyValue = { amount: 100, currencyCode: 'USD' };

      expect(() => {
        emptyConverter.convert(value, 'EUR');
      }).toThrow(/Exchange rate not available/);
    });

    it('should return false for unavailable conversion', () => {
      const emptyConverter = new CurrencyConverter(dataLoader);
      expect(emptyConverter.canConvert('USD', 'EUR')).toBe(false);
    });
  });

  describe('Exchange Rate Lookup', () => {
    it('should get direct exchange rate', () => {
      const rate = converter.getExchangeRate('USD', 'EUR');
      expect(rate).toBe(0.85);
    });

    it('should get inverse exchange rate', () => {
      const rate = converter.getExchangeRate('EUR', 'USD');
      expect(rate).toBeCloseTo(1 / 0.85, 5);
    });

    it('should get exchange rate through base currency', () => {
      const rate = converter.getExchangeRate('GBP', 'EUR');
      // GBP → USD → EUR: (1/0.73) * 0.85
      expect(rate).toBeCloseTo((1 / 0.73) * 0.85, 2);
    });

    it('should return 1.0 for same currency', () => {
      const rate = converter.getExchangeRate('USD', 'USD');
      expect(rate).toBe(1.0);
    });

    it('should return null for unavailable rate', () => {
      const emptyConverter = new CurrencyConverter(dataLoader);
      const rate = emptyConverter.getExchangeRate('USD', 'EUR');
      expect(rate).toBeNull();
    });
  });

  describe('Available Currencies', () => {
    it('should return list of available currencies', () => {
      const currencies = converter.getAvailableCurrencies();
      expect(currencies).toContain('USD');
      expect(currencies).toContain('EUR');
      expect(currencies).toContain('GBP');
      expect(currencies).toContain('JPY');
    });
  });

  describe('Complex Conversions', () => {
    it('should handle chain conversions correctly', () => {
      // USD → EUR → GBP
      const value1: CurrencyValue = { amount: 100, currencyCode: 'USD' };
      const eur = converter.convert(value1, 'EUR');
      const gbp = converter.convert(eur, 'GBP');

      // Should be close to direct USD → GBP conversion
      // Note: Chain conversions may have small precision differences
      const direct = converter.convert(value1, 'GBP');

      // Allow 1% difference due to chaining through different rates
      expect(Math.abs(gbp.amount - direct.amount)).toBeLessThan(1);
    });

    it('should handle conversion with large amounts', () => {
      const value: CurrencyValue = { amount: 1000000, currencyCode: 'USD' };
      const result = converter.convert(value, 'EUR');

      expect(result.amount).toBeCloseTo(850000, 2);
    });

    it('should handle conversion with small amounts', () => {
      const value: CurrencyValue = { amount: 0.01, currencyCode: 'USD' };
      const result = converter.convert(value, 'EUR');

      expect(result.amount).toBeCloseTo(0.01, 2);
    });
  });
});

describe('Currency Formatting Tests', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '..', 'data'));

    const mockExchangeRates = {
      date: '2024-01-01',
      usd: {
        eur: 0.85,
        gbp: 0.73,
        jpy: 110.0,
        hkd: 7.8,
        cad: 1.25,
        inr: 74.0,
        bhd: 0.377,  // Bahraini Dinar (3 decimals)
        clp: 800.0   // Chilean Peso (0 decimals)
      }
    };

    calculator = new Calculator(dataLoader, { precision: -1 });
    calculator.loadExchangeRates(mockExchangeRates);
  });

  describe('Currency-Specific Decimal Places', () => {
    it('should format USD with 2 decimals when precision=-1', () => {
      const result = calculator.calculate('123.456 USD');
      expect(result.results[0].result).toBe('123.46 USD');
    });

    it('should format JPY with 0 decimals when precision=-1', () => {
      const result = calculator.calculate('123.456 JPY');
      expect(result.results[0].result).toBe('123 JPY');
    });

    it('should format EUR with 2 decimals when precision=-1', () => {
      const result = calculator.calculate('99.999 EUR');
      expect(result.results[0].result).toBe('100.00 EUR');
    });

    it('should honor user precision over currency minorUnits', () => {
      const calcWithPrecision = new Calculator(dataLoader, { precision: 4 });
      calcWithPrecision.loadExchangeRates({
        date: '2024-01-01',
        usd: { eur: 0.85, jpy: 110.0 }
      });
      const result = calcWithPrecision.calculate('123.456789 USD');
      expect(result.results[0].result).toBe('123.4568 USD');
    });

    it('should display ambiguous symbol not dimension', () => {
      const result = calculator.calculate('$100 + $50');
      expect(result.results[0].result).toBe('$150');
      expect(result.results[0].result).not.toContain('currency_symbol_0024');
    });

    it('should format currency in derived units', () => {
      const result = calculator.calculate('50.123 USD/hour');
      // USD has 2 decimals, so should show 50.12 USD/h
      expect(result.results[0].result).toBe('50.12 USD/h');
    });

    it('should round JPY in arithmetic', () => {
      const result = calculator.calculate('100.7 JPY + 50.3 JPY');
      // JPY rounds to 0 decimals, result should be around 151
      expect(result.results[0].result).toBe('151 JPY');
    });

    it('should handle very small amounts rounding to zero', () => {
      const result = calculator.calculate('0.001 USD');
      // 0.001 rounds to 0.00 with 2 decimals
      expect(result.results[0].result).toBe('0.00 USD');
    });

    it('should handle currency names with correct formatting', () => {
      const result = calculator.calculate('100.567 euros');
      expect(result.results[0].result).toBe('100.57 EUR');
    });

    it('should handle multi-word currency names with formatting', () => {
      const result = calculator.calculate('123.456 US Dollars');
      expect(result.results[0].result).toBe('123.46 USD');
    });
  });

  describe('Currency Edge Cases', () => {
    it('should handle decimal currency conversion', () => {
      const result = calculator.calculate('0.5 USD to EUR');
      expect(result.results[0].result).toBe('0.42 EUR');
    });

    it('should handle currency raised to power 1', () => {
      const result = calculator.calculate('100 USD^1');
      expect(result.results[0].result).toBe('100.00 USD');
    });

    it('should handle currency raised to power 2', () => {
      const result = calculator.calculate('100 USD^2');
      expect(result.results[0].result).toBe('100.00 USD²');
    });

    it('should handle currency in complex derived unit', () => {
      const result = calculator.calculate('1000 USD/sq m/month');
      expect(result.results[0].result).toBe('1 000.00 USD/(m² mo)');
    });

    it('should handle multiple currency conversions in one line', () => {
      const result = calculator.calculate('100 USD to EUR\n50 GBP to USD');
      expect(result.results[0].result).toBe('85.00 EUR');
      expect(result.results[1].result).toBe('68.49 USD');
    });
  });
});

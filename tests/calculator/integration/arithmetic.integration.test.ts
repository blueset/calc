import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../../src/calculator/calculator';
import { DataLoader } from '../../../src/calculator/data-loader';
import * as path from 'path';

/**
 * Integration tests for arithmetic operations
 * Tests the full pipeline: Lexer → Parser → Evaluator → Formatter
 */
describe('Integration Tests - Arithmetic', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();

    calculator = new Calculator(dataLoader, {}); // Use Nearley parser

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
    calculator.loadExchangeRates(mockExchangeRates);
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
      expect(result.results[0].result).toContain('60 km/h');
    });

    it('should handle per operator for division', () => {
      const result = calculator.calculate('60 km per 2 h');
      expect(result.results[0].result).toContain('30 km/h');
    });

    it('should handle × symbol for multiplication', () => {
      const result = calculator.calculate(`3 × 4
5 × 2
10 × 10`);
      expect(result.results[0].result).toBe('12');
      expect(result.results[1].result).toBe('10');
      expect(result.results[2].result).toBe('100');
    });

    it('should handle · symbol for multiplication', () => {
      const result = calculator.calculate(`3 · 4
5 · 2
10 · 10`);
      expect(result.results[0].result).toBe('12');
      expect(result.results[1].result).toBe('10');
      expect(result.results[2].result).toBe('100');
    });

    it('should handle ÷ symbol for division', () => {
      const result = calculator.calculate(`10 ÷ 2
20 ÷ 4
100 ÷ 5`);
      expect(result.results[0].result).toBe('5');
      expect(result.results[1].result).toBe('5');
      expect(result.results[2].result).toBe('20');
    });

    it('should handle mixed alternative operators', () => {
      const result = calculator.calculate(`3 × 4 + 2
10 ÷ 2 + 3
5 · 2 × 3`);
      expect(result.results[0].result).toBe('14');
      expect(result.results[1].result).toBe('8');
      expect(result.results[2].result).toBe('30');
    });

    it('should handle alternative operators with units', () => {
      const result = calculator.calculate(`5 m × 3
20 kg ÷ 4
10 N · 2 m`);
      expect(result.results[0].result).toContain('15 m');
      expect(result.results[1].result).toContain('5 kg');
      expect(result.results[2].result).toContain('20 N m');
    });
  });
});

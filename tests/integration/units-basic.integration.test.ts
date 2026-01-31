import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../src/calculator';
import { DataLoader } from '../../src/data-loader';
import * as path from 'path';

/**
 * Integration tests for basic unit handling
 * Tests the full pipeline: Lexer → Parser → Evaluator → Formatter
 */
describe('Integration Tests - Basic Units', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '../..', 'data'));

    calculator = new Calculator(dataLoader);
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
});

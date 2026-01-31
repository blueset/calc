import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../src/calculator';
import { DataLoader } from '../../src/data-loader';
import * as path from 'path';

/**
 * Integration tests for advanced unit handling
 * Tests user-defined units, derived units, and composite units
 */
describe('Integration Tests - Advanced Units', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '../..', 'data'));

    calculator = new Calculator(dataLoader);
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
});

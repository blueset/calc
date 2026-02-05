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
    dataLoader.load();

    calculator = new Calculator(dataLoader, {}); // Use Nearley parser
  });

  describe('User defined units', () => {
    it('should handle user-defined units', () => {
      const result = calculator.calculate(`1 person`);
      expect(result.results[0].result).toBe('1 person');
    });

    it('should handle derived units with user-defined units', () => {
      let result = calculator.calculate(`1 kg / person`);
      expect(result.results[0].result).toBe('1 kg/person');
      result = calculator.calculate(`1 USD/person/day`);
      expect(result.results[0].result).toBe('1.00 USD/(person day)');
      result = calculator.calculate(`1 click/person`);
      expect(result.results[0].result).toBe('1 click/person');
      result = calculator.calculate(`1 km^2 person/hour`);
      expect(result.results[0].result).toBe('1 km² person/h');
    });
  });

  describe('Derived Units', () => {
    it('should handle speed units', () => {
      const result = calculator.calculate('60 km/h');
      expect(result.results[0].result).toBe('60 km/h');
    });

    it('should handle derived units with space multiplication', () => {
      let result = calculator.calculate('1 N m');
      expect(result.results[0].result).toBe('1 N m');
      result = calculator.calculate('1 N^2 m');
      expect(result.results[0].result).toBe('1 N² m');
      result = calculator.calculate('1 N m^2');
      expect(result.results[0].result).toBe('1 N m²');
      expect(result.results[0].result).toContain('m²');
      result = calculator.calculate('1 N^3 m^2');
      expect(result.results[0].result).toBe('1 N³ m²');
      result = calculator.calculate('1 N² m³');
      expect(result.results[0].result).toBe('1 N² m³');
      result = calculator.calculate('1 N² m^3');
      expect(result.results[0].result).toBe('1 N² m³');
    });

    it('should handle derived units with division and exponents', () => {
      const result = calculator.calculate('1 W/m²');
      expect(result.results[0].result).toBe('1 W/m²');
    });
  });

  describe('Composite Units', () => {
    it('should handle composite length units', () => {
      const result = calculator.calculate('5 m 20 cm');
      expect(result.results[0].result).toBe('5 m 20 cm');
    });

    it('should handle composite time units', () => {
      const result = calculator.calculate('2 hr 30 min');
      expect(result.results[0].result).toBe('2 h 30 min');
    });

    it('should handle negated composite units', () => {
      const result = calculator.calculate('-(5 m 20 cm)');
      expect(result.results[0].result).toBe('-5 m -20 cm');
    });
  });
});

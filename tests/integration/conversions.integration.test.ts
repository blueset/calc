import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../src/calculator';
import { DataLoader } from '../../src/data-loader';
import * as path from 'path';

/**
 * Integration tests for unit conversions and presentations
 * Tests the full pipeline: Lexer → Parser → Evaluator → Formatter
 */
describe('Integration Tests - Conversions', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '../..', 'data'));

    calculator = new Calculator(dataLoader);
  });

  describe('Unit Conversions', () => {
    it('should convert between metric units', () => {
      const result = calculator.calculate('5 km to m');
      expect(result.results[0].result).toBe('5 000 m');
    });

    it('should convert using Unicode arrow operator →', () => {
      // SPECS.md mentions both -> and → should work
      const result = calculator.calculate('5 km → m');
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

  describe('Presentations with Units', () => {
    it('should preserve units in scientific notation', () => {
      const result = calculator.calculate('5000 km to scientific');
      expect(result.results[0].result).toBe('5e+3 km');
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
      expect(result.results[0].result).toBe('30 °');
    });

    it('should display angle unit for inverse trig in radians', () => {
      const radianCalc = new Calculator(dataLoader, { angleUnit: 'radian' });
      const result = radianCalc.calculate('asin(0.5)');
      expect(result.results[0].result).toMatch(/0\.52\d* rad/);
    });

    it('should display angle unit for acos in degrees', () => {
      const degreeCalc = new Calculator(dataLoader, { angleUnit: 'degree' });
      const result = degreeCalc.calculate('acos(0)');
      expect(result.results[0].result).toBe('90 °');
    });

    it('should display angle unit for atan in degrees', () => {
      const degreeCalc = new Calculator(dataLoader, { angleUnit: 'degree' });
      const result = degreeCalc.calculate('atan(1)');
      expect(result.results[0].result).toBe('45 °');
    });
  });
});

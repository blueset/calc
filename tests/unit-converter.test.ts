import { describe, it, expect, beforeAll } from 'vitest';
import { DataLoader } from '../src/data-loader';
import { UnitConverter } from '../src/unit-converter';
import * as path from 'path';

describe('UnitConverter', () => {
  let dataLoader: DataLoader;
  let converter: UnitConverter;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();
    converter = new UnitConverter(dataLoader);
  });

  describe('Linear Conversions', () => {
    it('should convert kilometers to meters', () => {
      const km = dataLoader.getUnitById('kilometer');
      const m = dataLoader.getUnitById('meter');
      expect(km).toBeDefined();
      expect(m).toBeDefined();

      const result = converter.convert(5, km!, m!);
      expect(result).toBe(5000);
    });

    it('should convert meters to kilometers', () => {
      const m = dataLoader.getUnitById('meter');
      const km = dataLoader.getUnitById('kilometer');
      expect(m).toBeDefined();
      expect(km).toBeDefined();

      const result = converter.convert(5000, m!, km!);
      expect(result).toBe(5);
    });

    it('should convert centimeters to meters', () => {
      const cm = dataLoader.getUnitById('centimeter');
      const m = dataLoader.getUnitById('meter');
      expect(cm).toBeDefined();
      expect(m).toBeDefined();

      const result = converter.convert(520, cm!, m!);
      expect(result).toBe(5.2);
    });

    it('should convert feet to inches', () => {
      const ft = dataLoader.getUnitById('foot');
      const inch = dataLoader.getUnitById('inch');
      expect(ft).toBeDefined();
      expect(inch).toBeDefined();

      const result = converter.convert(5, ft!, inch!);
      expect(result).toBeCloseTo(60, 5);
    });

    it('should handle same unit conversion (no-op)', () => {
      const m = dataLoader.getUnitById('meter');
      expect(m).toBeDefined();

      const result = converter.convert(42, m!, m!);
      expect(result).toBe(42);
    });
  });

  describe('Affine Conversions (Temperature)', () => {
    it('should convert Celsius to Fahrenheit', () => {
      const celsius = dataLoader.getUnitById('celsius');
      const fahrenheit = dataLoader.getUnitById('fahrenheit');

      if (!celsius || !fahrenheit) {
        console.log('Temperature units not found in database, skipping test');
        return;
      }

      // 0°C = 32°F
      const result1 = converter.convert(0, celsius, fahrenheit);
      expect(result1).toBeCloseTo(32, 5);

      // 100°C = 212°F
      const result2 = converter.convert(100, celsius, fahrenheit);
      expect(result2).toBeCloseTo(212, 5);

      // 37°C ≈ 98.6°F
      const result3 = converter.convert(37, celsius, fahrenheit);
      expect(result3).toBeCloseTo(98.6, 1);
    });

    it('should convert Fahrenheit to Celsius', () => {
      const fahrenheit = dataLoader.getUnitById('fahrenheit');
      const celsius = dataLoader.getUnitById('celsius');

      if (!celsius || !fahrenheit) {
        console.log('Temperature units not found in database, skipping test');
        return;
      }

      // 32°F = 0°C
      const result1 = converter.convert(32, fahrenheit, celsius);
      expect(result1).toBeCloseTo(0, 5);

      // 212°F = 100°C
      const result2 = converter.convert(212, fahrenheit, celsius);
      expect(result2).toBeCloseTo(100, 5);
    });

    it('should convert Celsius to Kelvin', () => {
      const celsius = dataLoader.getUnitById('celsius');
      const kelvin = dataLoader.getUnitById('kelvin');

      if (!celsius || !kelvin) {
        console.log('Temperature units not found in database, skipping test');
        return;
      }

      // 0°C = 273.15 K
      const result1 = converter.convert(0, celsius, kelvin);
      expect(result1).toBeCloseTo(273.15, 2);

      // 100°C = 373.15 K
      const result2 = converter.convert(100, celsius, kelvin);
      expect(result2).toBeCloseTo(373.15, 2);
    });
  });

  describe('Variant Conversions', () => {
    it('should convert US gallons to liters', () => {
      const gallon = dataLoader.getUnitById('gallon');
      const liter = dataLoader.getUnitById('liter');

      if (!gallon || !liter) {
        console.log('Volume units not found in database, skipping test');
        return;
      }

      // Default should be US variant
      converter.setSettings({ variant: 'us' });

      // 1 US gallon ≈ 3.785411784 liters
      const result = converter.convert(1, gallon, liter);
      expect(result).toBeCloseTo(3.785411784, 5);
    });

    it('should convert UK gallons to liters', () => {
      const gallon = dataLoader.getUnitById('gallon');
      const liter = dataLoader.getUnitById('liter');

      if (!gallon || !liter) {
        console.log('Volume units not found in database, skipping test');
        return;
      }

      converter.setSettings({ variant: 'uk' });

      // 1 UK gallon ≈ 4.54609 liters
      const result = converter.convert(1, gallon, liter);
      expect(result).toBeCloseTo(4.54609, 5);

      // Reset to US variant
      converter.setSettings({ variant: 'us' });
    });
  });

  describe('Composite Unit Conversions', () => {
    it('should convert composite units to single unit (5 ft 7 in to cm)', () => {
      const ft = dataLoader.getUnitById('foot');
      const inch = dataLoader.getUnitById('inch');
      const cm = dataLoader.getUnitById('centimeter');

      expect(ft).toBeDefined();
      expect(inch).toBeDefined();
      expect(cm).toBeDefined();

      const result = converter.convertComposite(
        [
          { value: 5, unitId: 'foot' },
          { value: 7, unitId: 'inch' }
        ],
        ['centimeter']
      );

      expect(result.components).toHaveLength(1);
      expect(result.components[0].unitId).toBe('centimeter');

      // 5 ft 7 in ≈ 170.18 cm
      expect(result.components[0].value).toBeCloseTo(170.18, 1);
    });

    it('should convert single unit to composite (171 cm to ft in)', () => {
      const cm = dataLoader.getUnitById('centimeter');
      const ft = dataLoader.getUnitById('foot');
      const inch = dataLoader.getUnitById('inch');

      expect(cm).toBeDefined();
      expect(ft).toBeDefined();
      expect(inch).toBeDefined();

      const result = converter.convertComposite(
        [{ value: 171, unitId: 'centimeter' }],
        ['foot', 'inch']
      );

      expect(result.components).toHaveLength(2);

      // 171 cm ≈ 5 ft 7.32 in
      expect(result.components[0].unitId).toBe('foot');
      expect(result.components[0].value).toBe(5); // Integer part

      expect(result.components[1].unitId).toBe('inch');
      expect(result.components[1].value).toBeCloseTo(7.32, 1); // Decimal remainder
    });

    it('should handle composite to composite conversion', () => {
      const result = converter.convertComposite(
        [
          { value: 1, unitId: 'meter' },
          { value: 50, unitId: 'centimeter' }
        ],
        ['foot', 'inch']
      );

      expect(result.components).toHaveLength(2);

      // 1.5 m ≈ 4 ft 11.055 in
      expect(result.components[0].unitId).toBe('foot');
      expect(result.components[0].value).toBe(4);

      expect(result.components[1].unitId).toBe('inch');
      expect(result.components[1].value).toBeCloseTo(11.055, 1);
    });

    it('should handle time composite units (hours, minutes, seconds)', () => {
      const hour = dataLoader.getUnitById('hour');
      const minute = dataLoader.getUnitById('minute');
      const second = dataLoader.getUnitById('second');

      if (!hour || !minute || !second) {
        console.log('Time units not found in database, skipping test');
        return;
      }

      const result = converter.convertComposite(
        [{ value: 3665, unitId: 'second' }],
        ['hour', 'minute', 'second']
      );

      expect(result.components).toHaveLength(3);

      // 3665 seconds = 1 hour, 1 minute, 5 seconds
      expect(result.components[0].value).toBe(1); // hour
      expect(result.components[1].value).toBe(1); // minute
      expect(result.components[2].value).toBe(5); // second
    });
  });

  describe('Error Handling', () => {
    it('should throw error when converting between different dimensions', () => {
      const meter = dataLoader.getUnitById('meter');
      const second = dataLoader.getUnitById('second');

      expect(meter).toBeDefined();
      expect(second).toBeDefined();

      expect(() => {
        converter.convert(5, meter!, second!);
      }).toThrow(/different dimensions/);
    });

    it('should throw error for unknown unit ID in composite conversion', () => {
      expect(() => {
        converter.convertComposite(
          [{ value: 5, unitId: 'nonexistent_unit' }],
          ['meter']
        );
      }).toThrow(/Unknown unit ID/);
    });

    it('should throw error when composite components have different dimensions', () => {
      expect(() => {
        converter.convertComposite(
          [
            { value: 5, unitId: 'meter' },
            { value: 3, unitId: 'second' }
          ],
          ['foot']
        );
      }).toThrow(/same dimension/);
    });

    it('should throw error when target unit has wrong dimension', () => {
      expect(() => {
        converter.convertComposite(
          [{ value: 5, unitId: 'meter' }],
          ['second']
        );
      }).toThrow(/wrong dimension/);
    });
  });

  describe('Settings Management', () => {
    it('should get and set conversion settings', () => {
      const initialSettings = converter.getSettings();
      expect(initialSettings.variant).toBe('us');

      converter.setSettings({ variant: 'uk' });
      const updatedSettings = converter.getSettings();
      expect(updatedSettings.variant).toBe('uk');

      // Reset
      converter.setSettings({ variant: 'us' });
    });
  });
});

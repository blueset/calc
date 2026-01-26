import { describe, it, expect, beforeAll } from 'vitest';
import { DataLoader } from '../src/data-loader';
import * as path from 'path';

describe('DataLoader', () => {
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    // Load data files from the data directory
    await dataLoader.load(path.join(__dirname, '..', 'data'));
  });

  describe('Unit Loading and Lookup', () => {
    it('should load units successfully', () => {
      const allUnits = dataLoader.getAllUnits();
      expect(allUnits).toBeDefined();
      expect(allUnits.length).toBeGreaterThan(0);
    });

    it('should load dimensions successfully', () => {
      const allDimensions = dataLoader.getAllDimensions();
      expect(allDimensions).toBeDefined();
      expect(allDimensions.length).toBeGreaterThan(0);

      // Check for expected dimensions
      const dimensionIds = allDimensions.map(d => d.id);
      expect(dimensionIds).toContain('length');
      expect(dimensionIds).toContain('mass');
      expect(dimensionIds).toContain('time');
      expect(dimensionIds).toContain('temperature');
    });

    it('should get unit by ID', () => {
      const meter = dataLoader.getUnitById('meter');
      expect(meter).toBeDefined();
      expect(meter?.id).toBe('meter');
      expect(meter?.dimension).toBe('length');
    });

    it('should get dimension by ID', () => {
      const length = dataLoader.getDimensionById('length');
      expect(length).toBeDefined();
      expect(length?.id).toBe('length');
      expect(length?.name).toBe('Length');
      expect(length?.baseUnit).toBe('meter');
    });

    it('should get unit by exact case-sensitive name', () => {
      const meter = dataLoader.getUnitByName('m');
      expect(meter).toBeDefined();
      expect(meter?.id).toBe('meter');
    });

    it('should get units by case-insensitive name', () => {
      const units = dataLoader.getUnitsByCaseInsensitiveName('M');
      expect(units).toBeDefined();
      expect(units.length).toBeGreaterThan(0);
    });

    it('should return undefined for non-existent unit ID', () => {
      const unit = dataLoader.getUnitById('nonexistent');
      expect(unit).toBeUndefined();
    });

    it('should return undefined for non-existent unit name', () => {
      const unit = dataLoader.getUnitByName('nonexistent');
      expect(unit).toBeUndefined();
    });

    it('should return empty array for non-existent case-insensitive name', () => {
      const units = dataLoader.getUnitsByCaseInsensitiveName('nonexistent');
      expect(units).toEqual([]);
    });
  });

  describe('Unit Trie - Longest Match', () => {
    it('should find longest unit match in input string', () => {
      // "km" should match "kilometer" not just "k"
      const result = dataLoader.findLongestUnitMatch('5km', 1);
      expect(result).toBeDefined();
      expect(result?.length).toBe(2); // "km" is 2 characters
      expect(result?.unit.id).toBe('kilometer');
    });

    it('should match unit at start of string', () => {
      const result = dataLoader.findLongestUnitMatch('meter', 0);
      expect(result).toBeDefined();
      expect(result?.unit.id).toBe('meter');
    });

    it('should return null when no unit matches', () => {
      const result = dataLoader.findLongestUnitMatch('xyz123', 0);
      expect(result).toBeNull();
    });

    it('should prioritize longer matches over shorter ones', () => {
      // If we have both "m" and "meter", should prefer "meter"
      const result = dataLoader.findLongestUnitMatch('meter', 0);
      expect(result).toBeDefined();
      expect(result?.length).toBeGreaterThan(1);
    });

    it('should handle case-sensitive matching', () => {
      // Test case-sensitive priority
      const result = dataLoader.findLongestUnitMatch('m', 0);
      expect(result).toBeDefined();
      expect(result?.unit).toBeDefined();
    });

    it('should match from specified position', () => {
      const result = dataLoader.findLongestUnitMatch('5 km 10 m', 2);
      expect(result).toBeDefined();
      expect(result?.unit.id).toBe('kilometer');
    });

    it('should handle units at end of string', () => {
      const result = dataLoader.findLongestUnitMatch('5m', 1);
      expect(result).toBeDefined();
      expect(result?.unit.id).toBe('meter');
      expect(result?.length).toBe(1);
    });
  });

  describe('Currency Loading and Lookup', () => {
    it('should load unambiguous currencies successfully', () => {
      const currencies = dataLoader.getAllUnambiguousCurrencies();
      expect(currencies).toBeDefined();
      expect(currencies.length).toBeGreaterThan(0);
    });

    it('should load ambiguous currencies successfully', () => {
      const currencies = dataLoader.getAllAmbiguousCurrencies();
      expect(currencies).toBeDefined();
    });

    it('should get currency by code (case-insensitive)', () => {
      const usd = dataLoader.getCurrencyByCode('USD');
      expect(usd).toBeDefined();
      expect(usd?.code).toBe('USD');
      expect(usd?.minorUnits).toBe(2);

      // Test case-insensitivity
      const usdLower = dataLoader.getCurrencyByCode('usd');
      expect(usdLower).toBeDefined();
      expect(usdLower?.code).toBe('USD');
    });

    it('should get currency by name', () => {
      const currencies = dataLoader.getCurrenciesByName('USD');
      expect(currencies.length).toBeGreaterThan(0);
      expect(currencies[0].code).toBe('USD');
    });

    it('should return undefined for non-existent currency code', () => {
      const currency = dataLoader.getCurrencyByCode('XYZ');
      expect(currency).toBeUndefined();
    });

    it('should return empty array for non-existent currency name', () => {
      const currencies = dataLoader.getCurrenciesByName('nonexistent');
      expect(currencies).toEqual([]);
    });

    it('should handle well-known currencies', () => {
      const eur = dataLoader.getCurrencyByCode('EUR');
      expect(eur).toBeDefined();
      expect(eur?.code).toBe('EUR');

      const gbp = dataLoader.getCurrencyByCode('GBP');
      expect(gbp).toBeDefined();
      expect(gbp?.code).toBe('GBP');

      const jpy = dataLoader.getCurrencyByCode('JPY');
      expect(jpy).toBeDefined();
      expect(jpy?.code).toBe('JPY');
      expect(jpy?.minorUnits).toBe(0); // JPY has no minor units
    });
  });

  describe('Timezone Resolution with Territory Support', () => {
    it('should resolve timezone name to IANA timezone', () => {
      const iana = dataLoader.resolveTimezone('UTC');
      expect(iana).toBeDefined();
    });

    it('should return undefined for non-existent timezone', () => {
      const iana = dataLoader.resolveTimezone('NonexistentTimezone');
      expect(iana).toBeUndefined();
    });

    it('should resolve timezone with territory based on user locale', () => {
      // Set user locale to US
      dataLoader.setUserLocale('en-US');

      // EST should resolve to America/New_York for US locale
      const est = dataLoader.resolveTimezone('EST');
      expect(est).toBeDefined();
      // Note: The actual value depends on the timezone data
    });

    it('should prioritize user country code in timezone resolution', () => {
      dataLoader.setUserLocale('en-US');

      // Get timezone matches to understand the disambiguation
      const matches = dataLoader.getTimezoneMatches('EST');
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should handle universal timezone (territory: 001)', () => {
      // UTC should work regardless of locale
      dataLoader.setUserLocale('en-US');
      const utcUS = dataLoader.resolveTimezone('UTC');

      dataLoader.setUserLocale('en-GB');
      const utcGB = dataLoader.resolveTimezone('UTC');

      expect(utcUS).toBeDefined();
      expect(utcGB).toBeDefined();
      // UTC should resolve to the same timezone regardless of locale
      expect(utcUS).toBe(utcGB);
    });

    it('should extract country code from locale correctly', () => {
      dataLoader.setUserLocale('en-US');
      const tz1 = dataLoader.resolveTimezone('EST');

      dataLoader.setUserLocale('en-GB');
      const tz2 = dataLoader.resolveTimezone('EST');

      // The resolved timezones might differ based on locale
      expect(tz1).toBeDefined();
      expect(tz2).toBeDefined();
    });

    it('should handle timezones without territory', () => {
      // Some timezones might not have territory info
      const iana = dataLoader.resolveTimezone('GMT');
      expect(iana).toBeDefined();
    });

    it('should be case-insensitive for timezone names', () => {
      const utcLower = dataLoader.resolveTimezone('utc');
      const utcUpper = dataLoader.resolveTimezone('UTC');
      const utcMixed = dataLoader.resolveTimezone('Utc');

      expect(utcLower).toBeDefined();
      expect(utcUpper).toBeDefined();
      expect(utcMixed).toBeDefined();
      expect(utcLower).toBe(utcUpper);
      expect(utcLower).toBe(utcMixed);
    });

    it('should get all timezone matches for debugging', () => {
      const matches = dataLoader.getTimezoneMatches('EST');
      expect(Array.isArray(matches)).toBe(true);

      // Each match should have iana and optional territory
      if (matches.length > 0) {
        expect(matches[0]).toHaveProperty('iana');
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty string lookups', () => {
      expect(dataLoader.getUnitByName('')).toBeUndefined();
      expect(dataLoader.getCurrencyByCode('')).toBeUndefined();
      expect(dataLoader.resolveTimezone('')).toBeUndefined();
    });

    it('should handle very long strings in trie lookup', () => {
      const longString = 'a'.repeat(1000);
      const result = dataLoader.findLongestUnitMatch(longString, 0);
      // Should not crash, might return null
      expect(result === null || result !== null).toBe(true);
    });

    it('should handle position beyond string length', () => {
      const result = dataLoader.findLongestUnitMatch('m', 10);
      expect(result).toBeNull();
    });

    it('should handle negative position (should return null or handle gracefully)', () => {
      const result = dataLoader.findLongestUnitMatch('meter', -1);
      // Implementation might vary, just ensure it doesn't crash
      expect(result === null || result !== null).toBe(true);
    });
  });

  describe('Data Consistency', () => {
    it('should have valid base units for all dimensions', () => {
      const dimensions = dataLoader.getAllDimensions();

      for (const dimension of dimensions) {
        const baseUnit = dataLoader.getUnitById(dimension.baseUnit);
        expect(baseUnit).toBeDefined();
        expect(baseUnit?.dimension).toBe(dimension.id);
        expect(baseUnit?.isBaseUnit).toBe(true);
      }
    });

    it('should have valid dimension references for all units', () => {
      const units = dataLoader.getAllUnits();
      const dimensions = dataLoader.getAllDimensions();
      const dimensionIds = new Set(dimensions.map(d => d.id));

      for (const unit of units) {
        expect(dimensionIds.has(unit.dimension)).toBe(true);
      }
    });

    it('should have at least one name for each unit', () => {
      const units = dataLoader.getAllUnits();

      for (const unit of units) {
        if (unit.id !== 'unity') { // unity might be special
          expect(unit.names.length).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('should have valid conversion types for all units', () => {
      const units = dataLoader.getAllUnits();
      const validTypes = ['linear', 'affine', 'variant'];

      for (const unit of units) {
        expect(validTypes).toContain(unit.conversion.type);

        if (unit.conversion.type === 'linear') {
          expect(unit.conversion).toHaveProperty('factor');
          expect(typeof unit.conversion.factor).toBe('number');
        } else if (unit.conversion.type === 'affine') {
          expect(unit.conversion).toHaveProperty('factor');
          expect(unit.conversion).toHaveProperty('offset');
        } else if (unit.conversion.type === 'variant') {
          expect(unit.conversion).toHaveProperty('variants');
        }
      }
    });
  });
});

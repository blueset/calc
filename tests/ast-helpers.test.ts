/**
 * Tests for AST Helper Functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as NearleyAST from '../src/nearley/types';
import {
  resolveUnitFromNode,
  resolveUnitsExpression,
  isDegreeUnit,
  hasDegreeInUnits
} from '../src/ast-helpers';
import { DataLoader } from '../src/data-loader';

describe('Unit Resolution Functions', () => {
  let dataLoader: DataLoader;

  beforeEach(() => {
    dataLoader = new DataLoader();
    dataLoader.load();
  });

  describe('resolveUnitFromNode', () => {
    it('should resolve exact case-sensitive unit names', () => {
      const node: NearleyAST.UnitNode = {
        type: 'Unit',
        name: 'meter',
        matched: 'unit',
        location: 0
      };

      const result = resolveUnitFromNode(node, dataLoader);
      expect(result.id).toBe('meter');
      expect(result.displayName).toBe('m');
    });

    it('should resolve case-insensitive unit names', () => {
      const node: NearleyAST.UnitNode = {
        type: 'Unit',
        name: 'METER',
        matched: 'unit',
        location: 0
      };

      const result = resolveUnitFromNode(node, dataLoader);
      expect(result.id).toBe('meter');
    });

    it('should fallback to name if dataLoader is null', () => {
      const node: NearleyAST.UnitNode = {
        type: 'Unit',
        name: 'foo',
        matched: 'identifier',
        location: 0
      };

      const result = resolveUnitFromNode(node, null);
      expect(result.id).toBe('foo');
      expect(result.displayName).toBe('foo');
    });

    it('should resolve prime to foot by default', () => {
      const node: NearleyAST.UnitNode = {
        type: 'Unit',
        name: 'prime',
        matched: 'symbol',
        location: 0
      };

      const result = resolveUnitFromNode(node, dataLoader);
      expect(result.id).toBe('foot');
    });

    it('should resolve prime to arcminute in degree context', () => {
      const node: NearleyAST.UnitNode = {
        type: 'Unit',
        name: 'prime',
        matched: 'symbol',
        location: 0
      };

      const result = resolveUnitFromNode(node, dataLoader, { hasDegreeUnit: true });
      expect(result.id).toBe('arcminute');
    });

    it('should resolve doublePrime to inch by default', () => {
      const node: NearleyAST.UnitNode = {
        type: 'Unit',
        name: 'doublePrime',
        matched: 'symbol',
        location: 0
      };

      const result = resolveUnitFromNode(node, dataLoader);
      expect(result.id).toBe('inch');
    });

    it('should resolve doublePrime to arcsecond in degree context', () => {
      const node: NearleyAST.UnitNode = {
        type: 'Unit',
        name: 'doublePrime',
        matched: 'symbol',
        location: 0
      };

      const result = resolveUnitFromNode(node, dataLoader, { hasDegreeUnit: true });
      expect(result.id).toBe('arcsecond');
    });

    it('should resolve currency codes', () => {
      const node: NearleyAST.UnitNode = {
        type: 'Unit',
        name: 'USD',
        matched: 'currencyCode',
        location: 0
      };

      const result = resolveUnitFromNode(node, dataLoader);
      expect(result.id).toBe('USD');
      expect(result.displayName).toBe('USD');
    });
  });

  describe('resolveUnitsExpression', () => {
    it('should resolve simple unit expression', () => {
      const node: NearleyAST.UnitsNode = {
        type: 'Units',
        subType: 'simple',
        terms: [{
          type: 'UnitWithExponent',
          unit: { type: 'Unit', name: 'meter', matched: 'unit', location: 0 },
          exponent: 1,
          location: 0
        }],
        location: 0
      };

      const result = resolveUnitsExpression(node, dataLoader);
      expect('id' in result).toBe(true);
      if ('id' in result) {
        expect(result.id).toBe('meter');
      }
    });

    it('should resolve derived unit expression', () => {
      const node: NearleyAST.UnitsNode = {
        type: 'Units',
        subType: 'derived',
        terms: [
          {
            type: 'UnitWithExponent',
            unit: { type: 'Unit', name: 'meter', matched: 'unit', location: 0 },
            exponent: 1,
            location: 0
          },
          {
            type: 'UnitWithExponent',
            unit: { type: 'Unit', name: 'second', matched: 'unit', location: 0 },
            exponent: -1,
            location: 0
          }
        ],
        location: 0
      };

      const result = resolveUnitsExpression(node, dataLoader);
      expect('terms' in result).toBe(true);
      if ('terms' in result) {
        expect(result.terms).toHaveLength(2);
        expect(result.terms[0].id).toBe('meter');
        expect(result.terms[0].exponent).toBe(1);
        expect(result.terms[1].id).toBe('second');
        expect(result.terms[1].exponent).toBe(-1);
      }
    });
  });

  describe('isDegreeUnit', () => {
    it('should identify degree units', () => {
      expect(isDegreeUnit('degree')).toBe(true);
      expect(isDegreeUnit('deg')).toBe(true);
      expect(isDegreeUnit('°')).toBe(true);
    });

    it('should not identify non-degree units', () => {
      expect(isDegreeUnit('meter')).toBe(false);
      expect(isDegreeUnit('radian')).toBe(false);
      expect(isDegreeUnit('ft')).toBe(false);
    });
  });

  describe('hasDegreeInUnits', () => {
    it('should detect degree in units node', () => {
      const node: NearleyAST.UnitsNode = {
        type: 'Units',
        subType: 'simple',
        terms: [{
          type: 'UnitWithExponent',
          unit: { type: 'Unit', name: 'degree', matched: 'unit', location: 0 },
          exponent: 1,
          location: 0
        }],
        location: 0
      };

      expect(hasDegreeInUnits(node)).toBe(true);
    });

    it('should not detect degree when absent', () => {
      const node: NearleyAST.UnitsNode = {
        type: 'Units',
        subType: 'simple',
        terms: [{
          type: 'UnitWithExponent',
          unit: { type: 'Unit', name: 'meter', matched: 'unit', location: 0 },
          exponent: 1,
          location: 0
        }],
        location: 0
      };

      expect(hasDegreeInUnits(node)).toBe(false);
    });
  });
});

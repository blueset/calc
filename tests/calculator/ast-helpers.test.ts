/**
 * Tests for AST Helper Functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as NearleyAST from '../../src/calculator/nearley/types';
import {
  resolveUnitFromNode,
  isDegreeUnit,
  hasDegreeInUnits
} from '../../src/calculator/ast-helpers';
import { DataLoader } from '../../src/calculator/data-loader';

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
        offset: 0
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
        offset: 0
      };

      const result = resolveUnitFromNode(node, dataLoader);
      expect(result.id).toBe('meter');
    });

    it('should fallback to name if dataLoader is null', () => {
      const node: NearleyAST.UnitNode = {
        type: 'Unit',
        name: 'foo',
        matched: 'identifier',
        offset: 0
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
        offset: 0
      };

      const result = resolveUnitFromNode(node, dataLoader);
      expect(result.id).toBe('foot');
    });

    it('should resolve prime to arcminute in degree context', () => {
      const node: NearleyAST.UnitNode = {
        type: 'Unit',
        name: 'prime',
        matched: 'symbol',
        offset: 0
      };

      const result = resolveUnitFromNode(node, dataLoader, { hasDegreeUnit: true });
      expect(result.id).toBe('arcminute');
    });

    it('should resolve doublePrime to inch by default', () => {
      const node: NearleyAST.UnitNode = {
        type: 'Unit',
        name: 'doublePrime',
        matched: 'symbol',
        offset: 0
      };

      const result = resolveUnitFromNode(node, dataLoader);
      expect(result.id).toBe('inch');
    });

    it('should resolve doublePrime to arcsecond in degree context', () => {
      const node: NearleyAST.UnitNode = {
        type: 'Unit',
        name: 'doublePrime',
        matched: 'symbol',
        offset: 0
      };

      const result = resolveUnitFromNode(node, dataLoader, { hasDegreeUnit: true });
      expect(result.id).toBe('arcsecond');
    });

    it('should resolve currency codes', () => {
      const node: NearleyAST.UnitNode = {
        type: 'Unit',
        name: 'USD',
        matched: 'currencyCode',
        offset: 0
      };

      const result = resolveUnitFromNode(node, dataLoader);
      expect(result.id).toBe('USD');
      expect(result.displayName).toBe('USD');
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
          unit: { type: 'Unit', name: 'degree', matched: 'unit', offset: 0 },
          exponent: 1,
          offset: 0
        }],
        offset: 0
      };

      expect(hasDegreeInUnits(node)).toBe(true);
    });

    it('should not detect degree when absent', () => {
      const node: NearleyAST.UnitsNode = {
        type: 'Units',
        subType: 'simple',
        terms: [{
          type: 'UnitWithExponent',
          unit: { type: 'Unit', name: 'meter', matched: 'unit', offset: 0 },
          exponent: 1,
          offset: 0
        }],
        offset: 0
      };

      expect(hasDegreeInUnits(node)).toBe(false);
    });
  });
});

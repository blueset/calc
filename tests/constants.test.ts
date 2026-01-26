import { describe, it, expect } from 'vitest';
import { CONSTANTS, isConstant, getConstant, getAllConstantNames } from '../src/constants';

describe('Constants', () => {
  describe('CONSTANTS object', () => {
    it('should have pi constant', () => {
      expect(CONSTANTS.pi).toBeDefined();
      expect(CONSTANTS.pi.name).toBe('pi');
      expect(CONSTANTS.pi.value).toBeCloseTo(Math.PI);
      expect(CONSTANTS.pi.description).toContain('circumference');
      expect(CONSTANTS.pi.aliases).toContain('π');
    });

    it('should have e constant', () => {
      expect(CONSTANTS.e).toBeDefined();
      expect(CONSTANTS.e.name).toBe('e');
      expect(CONSTANTS.e.value).toBeCloseTo(Math.E);
      expect(CONSTANTS.e.description).toContain('Euler');
    });

    it('should have golden_ratio constant with phi and φ as aliases', () => {
      expect(CONSTANTS.golden_ratio).toBeDefined();
      expect(CONSTANTS.golden_ratio.name).toBe('golden_ratio');
      expect(CONSTANTS.golden_ratio.value).toBeCloseTo((1 + Math.sqrt(5)) / 2);
      expect(CONSTANTS.golden_ratio.description).toContain('golden ratio');
      expect(CONSTANTS.golden_ratio.aliases).toContain('phi');
      expect(CONSTANTS.golden_ratio.aliases).toContain('φ');
    });

    it('should not have phi as separate constant (it is an alias)', () => {
      expect(CONSTANTS.phi).toBeUndefined();
    });

    it('should have NaN constant', () => {
      expect(CONSTANTS.NaN).toBeDefined();
      expect(CONSTANTS.NaN.name).toBe('NaN');
      expect(Number.isNaN(CONSTANTS.NaN.value)).toBe(true);
    });

    it('should have Infinity constant with aliases', () => {
      expect(CONSTANTS.Infinity).toBeDefined();
      expect(CONSTANTS.Infinity.name).toBe('Infinity');
      expect(CONSTANTS.Infinity.value).toBe(Infinity);
      expect(CONSTANTS.Infinity.aliases).toContain('inf');
      expect(CONSTANTS.Infinity.aliases).toContain('∞');
    });

    it('should have sqrt2 constant', () => {
      expect(CONSTANTS.sqrt2).toBeDefined();
      expect(CONSTANTS.sqrt2.value).toBeCloseTo(Math.SQRT2);
      expect(CONSTANTS.sqrt2.aliases).toContain('√2');
    });

    it('should have sqrt1_2 constant', () => {
      expect(CONSTANTS.sqrt1_2).toBeDefined();
      expect(CONSTANTS.sqrt1_2.value).toBeCloseTo(Math.SQRT1_2);
      expect(CONSTANTS.sqrt1_2.aliases).toContain('√½');
    });

    it('should have ln2 constant', () => {
      expect(CONSTANTS.ln2).toBeDefined();
      expect(CONSTANTS.ln2.value).toBeCloseTo(Math.LN2);
    });

    it('should have ln10 constant', () => {
      expect(CONSTANTS.ln10).toBeDefined();
      expect(CONSTANTS.ln10.value).toBeCloseTo(Math.LN10);
    });

    it('should have log2e constant', () => {
      expect(CONSTANTS.log2e).toBeDefined();
      expect(CONSTANTS.log2e.value).toBeCloseTo(Math.LOG2E);
    });

    it('should have log10e constant', () => {
      expect(CONSTANTS.log10e).toBeDefined();
      expect(CONSTANTS.log10e.value).toBeCloseTo(Math.LOG10E);
    });
  });

  describe('isConstant', () => {
    it('should return true for existing constants', () => {
      expect(isConstant('pi')).toBe(true);
      expect(isConstant('e')).toBe(true);
      expect(isConstant('golden_ratio')).toBe(true);
      expect(isConstant('NaN')).toBe(true);
      expect(isConstant('Infinity')).toBe(true);
    });

    it('should return true for aliases', () => {
      expect(isConstant('phi')).toBe(true);
      expect(isConstant('φ')).toBe(true);
      expect(isConstant('π')).toBe(true);
      expect(isConstant('inf')).toBe(true);
      expect(isConstant('∞')).toBe(true);
      expect(isConstant('√2')).toBe(true);
      expect(isConstant('√½')).toBe(true);
    });

    it('should return false for non-existent constants', () => {
      expect(isConstant('unknown')).toBe(false);
      expect(isConstant('foo')).toBe(false);
      expect(isConstant('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isConstant('pi')).toBe(true);
      expect(isConstant('PI')).toBe(false);
      expect(isConstant('Pi')).toBe(false);
    });
  });

  describe('getConstant', () => {
    it('should return correct values for existing constants', () => {
      expect(getConstant('pi')).toBeCloseTo(Math.PI);
      expect(getConstant('e')).toBeCloseTo(Math.E);
      expect(getConstant('golden_ratio')).toBeCloseTo((1 + Math.sqrt(5)) / 2);
      expect(getConstant('Infinity')).toBe(Infinity);
    });

    it('should return correct values for aliases', () => {
      expect(getConstant('phi')).toBeCloseTo((1 + Math.sqrt(5)) / 2);
      expect(getConstant('φ')).toBeCloseTo((1 + Math.sqrt(5)) / 2);
      expect(getConstant('π')).toBeCloseTo(Math.PI);
      expect(getConstant('inf')).toBe(Infinity);
      expect(getConstant('∞')).toBe(Infinity);
      expect(getConstant('√2')).toBeCloseTo(Math.SQRT2);
      expect(getConstant('√½')).toBeCloseTo(Math.SQRT1_2);
    });

    it('should return same value for primary name and alias', () => {
      expect(getConstant('golden_ratio')).toBe(getConstant('phi'));
      expect(getConstant('golden_ratio')).toBe(getConstant('φ'));
      expect(getConstant('pi')).toBe(getConstant('π'));
      expect(getConstant('Infinity')).toBe(getConstant('inf'));
      expect(getConstant('Infinity')).toBe(getConstant('∞'));
    });

    it('should return NaN for NaN constant', () => {
      const value = getConstant('NaN');
      expect(value).toBeDefined();
      expect(Number.isNaN(value!)).toBe(true);
    });

    it('should return undefined for non-existent constants', () => {
      expect(getConstant('unknown')).toBeUndefined();
      expect(getConstant('foo')).toBeUndefined();
      expect(getConstant('')).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      expect(getConstant('pi')).toBeDefined();
      expect(getConstant('PI')).toBeUndefined();
    });
  });

  describe('getAllConstantNames', () => {
    it('should return an array of all constant names', () => {
      const names = getAllConstantNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);
    });

    it('should include all expected constant names (primary names only)', () => {
      const names = getAllConstantNames();
      expect(names).toContain('pi');
      expect(names).toContain('e');
      expect(names).toContain('golden_ratio');
      expect(names).toContain('NaN');
      expect(names).toContain('Infinity');
      expect(names).toContain('sqrt2');
      expect(names).toContain('sqrt1_2');
      expect(names).toContain('ln2');
      expect(names).toContain('ln10');
      expect(names).toContain('log2e');
      expect(names).toContain('log10e');
    });

    it('should not include aliases in the names list', () => {
      const names = getAllConstantNames();
      expect(names).not.toContain('phi');
      expect(names).not.toContain('φ');
      expect(names).not.toContain('π');
      expect(names).not.toContain('inf');
      expect(names).not.toContain('∞');
    });

    it('should have exactly 11 constants', () => {
      const names = getAllConstantNames();
      expect(names.length).toBe(11);
    });
  });

  describe('Mathematical correctness', () => {
    it('should have accurate values with proper precision', () => {
      // Test mathematical relationships
      expect(getConstant('sqrt2')! ** 2).toBeCloseTo(2, 10);
      expect(getConstant('sqrt1_2')! ** 2).toBeCloseTo(0.5, 10);

      // Test logarithmic relationships
      const ln2 = getConstant('ln2')!;
      const ln10 = getConstant('ln10')!;
      expect(Math.exp(ln2)).toBeCloseTo(2, 10);
      expect(Math.exp(ln10)).toBeCloseTo(10, 10);

      // Test log base conversions
      const log2e = getConstant('log2e')!;
      const log10e = getConstant('log10e')!;
      expect(log2e).toBeCloseTo(Math.log2(Math.E), 10);
      expect(log10e).toBeCloseTo(Math.log10(Math.E), 10);
    });

    it('should have golden ratio with correct mathematical properties', () => {
      const phi = getConstant('golden_ratio')!;
      // φ² = φ + 1
      expect(phi * phi).toBeCloseTo(phi + 1, 10);
      // 1/φ = φ - 1
      expect(1 / phi).toBeCloseTo(phi - 1, 10);
    });
  });
});

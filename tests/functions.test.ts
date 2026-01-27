import { describe, it, expect } from 'vitest';
import { MathFunctions } from '../src/functions';

describe('MathFunctions', () => {
  const functions = new MathFunctions();

  describe('Function Recognition', () => {
    it('should recognize trigonometric functions', () => {
      expect(functions.isFunction('sin')).toBe(true);
      expect(functions.isFunction('cos')).toBe(true);
      expect(functions.isFunction('tan')).toBe(true);
      expect(functions.isFunction('asin')).toBe(true);
      expect(functions.isFunction('arcsin')).toBe(true);
      expect(functions.isFunction('sinh')).toBe(true);
    });

    it('should recognize logarithmic functions', () => {
      expect(functions.isFunction('sqrt')).toBe(true);
      expect(functions.isFunction('cbrt')).toBe(true);
      expect(functions.isFunction('log')).toBe(true);
      expect(functions.isFunction('ln')).toBe(true);
      expect(functions.isFunction('exp')).toBe(true);
      expect(functions.isFunction('log10')).toBe(true);
    });

    it('should recognize number functions', () => {
      expect(functions.isFunction('abs')).toBe(true);
      expect(functions.isFunction('round')).toBe(true);
      expect(functions.isFunction('floor')).toBe(true);
      expect(functions.isFunction('ceil')).toBe(true);
      expect(functions.isFunction('trunc')).toBe(true);
      expect(functions.isFunction('frac')).toBe(true);
    });

    it('should recognize random function', () => {
      expect(functions.isFunction('random')).toBe(true);
    });

    it('should recognize combinatoric functions', () => {
      expect(functions.isFunction('perm')).toBe(true);
      expect(functions.isFunction('comb')).toBe(true);
    });

    it('should not recognize invalid functions', () => {
      expect(functions.isFunction('invalid')).toBe(false);
      expect(functions.isFunction('notafunction')).toBe(false);
    });
  });

  describe('Trigonometric Functions', () => {
    it('should calculate sin', () => {
      const result = functions.execute('sin', [0]);
      expect(result.value).toBeCloseTo(0, 10);
      expect(result.error).toBeUndefined();

      const result2 = functions.execute('sin', [Math.PI / 2]);
      expect(result2.value).toBeCloseTo(1, 10);
    });

    it('should calculate cos', () => {
      const result = functions.execute('cos', [0]);
      expect(result.value).toBeCloseTo(1, 10);

      const result2 = functions.execute('cos', [Math.PI]);
      expect(result2.value).toBeCloseTo(-1, 10);
    });

    it('should calculate tan', () => {
      const result = functions.execute('tan', [0]);
      expect(result.value).toBeCloseTo(0, 10);

      const result2 = functions.execute('tan', [Math.PI / 4]);
      expect(result2.value).toBeCloseTo(1, 10);
    });

    it('should calculate asin', () => {
      const result = functions.execute('asin', [0]);
      expect(result.value).toBeCloseTo(0, 10);

      const result2 = functions.execute('asin', [1]);
      expect(result2.value).toBeCloseTo(Math.PI / 2, 10);
    });

    it('should calculate asin with arcsin alias', () => {
      const result = functions.execute('arcsin', [0.5]);
      expect(result.error).toBeUndefined();
      expect(result.value).toBeCloseTo(Math.asin(0.5), 10);
    });

    it('should validate asin range', () => {
      const result = functions.execute('asin', [2]);
      expect(result.error).toContain('range');
    });

    it('should calculate acos', () => {
      const result = functions.execute('acos', [1]);
      expect(result.value).toBeCloseTo(0, 10);

      const result2 = functions.execute('acos', [0]);
      expect(result2.value).toBeCloseTo(Math.PI / 2, 10);
    });

    it('should validate acos range', () => {
      const result = functions.execute('acos', [-2]);
      expect(result.error).toContain('range');
    });

    it('should calculate atan', () => {
      const result = functions.execute('atan', [0]);
      expect(result.value).toBeCloseTo(0, 10);

      const result2 = functions.execute('atan', [1]);
      expect(result2.value).toBeCloseTo(Math.PI / 4, 10);
    });

    it('should calculate sinh', () => {
      const result = functions.execute('sinh', [0]);
      expect(result.value).toBeCloseTo(0, 10);

      const result2 = functions.execute('sinh', [1]);
      expect(result2.value).toBeCloseTo(Math.sinh(1), 10);
    });

    it('should calculate cosh', () => {
      const result = functions.execute('cosh', [0]);
      expect(result.value).toBeCloseTo(1, 10);
    });

    it('should calculate tanh', () => {
      const result = functions.execute('tanh', [0]);
      expect(result.value).toBeCloseTo(0, 10);
    });

    it('should calculate asinh', () => {
      const result = functions.execute('asinh', [0]);
      expect(result.value).toBeCloseTo(0, 10);

      const result2 = functions.execute('arsinh', [1]);
      expect(result2.value).toBeCloseTo(Math.asinh(1), 10);
    });

    it('should calculate acosh', () => {
      const result = functions.execute('acosh', [1]);
      expect(result.value).toBeCloseTo(0, 10);
    });

    it('should validate acosh range', () => {
      const result = functions.execute('acosh', [0.5]);
      expect(result.error).toContain('>=');
    });

    it('should calculate atanh', () => {
      const result = functions.execute('atanh', [0]);
      expect(result.value).toBeCloseTo(0, 10);

      const result2 = functions.execute('artanh', [0.5]);
      expect(result2.value).toBeCloseTo(Math.atanh(0.5), 10);
    });

    it('should validate atanh range', () => {
      const result1 = functions.execute('atanh', [1]);
      expect(result1.error).toContain('range');

      const result2 = functions.execute('atanh', [-1]);
      expect(result2.error).toContain('range');
    });

    it('should require exactly 1 argument for trig functions', () => {
      const result = functions.execute('sin', []);
      expect(result.error).toContain('1 argument');

      const result2 = functions.execute('sin', [1, 2]);
      expect(result2.error).toContain('1 argument');
    });
  });

  describe('Logarithmic Functions', () => {
    it('should calculate sqrt', () => {
      const result = functions.execute('sqrt', [4]);
      expect(result.value).toBeCloseTo(2, 10);

      const result2 = functions.execute('sqrt', [9]);
      expect(result2.value).toBeCloseTo(3, 10);
    });

    it('should validate sqrt non-negative', () => {
      const result = functions.execute('sqrt', [-1]);
      expect(result.error).toContain('non-negative');
    });

    it('should calculate cbrt', () => {
      const result = functions.execute('cbrt', [8]);
      expect(result.value).toBeCloseTo(2, 10);

      const result2 = functions.execute('cbrt', [-8]);
      expect(result2.value).toBeCloseTo(-2, 10);
    });

    it('should calculate log (natural logarithm)', () => {
      const result = functions.execute('log', [Math.E]);
      expect(result.value).toBeCloseTo(1, 10);

      const result2 = functions.execute('log', [1]);
      expect(result2.value).toBeCloseTo(0, 10);
    });

    it('should calculate ln (natural logarithm)', () => {
      const result = functions.execute('ln', [Math.E]);
      expect(result.value).toBeCloseTo(1, 10);
    });

    it('should validate log positive', () => {
      const result = functions.execute('log', [0]);
      expect(result.error).toContain('positive');

      const result2 = functions.execute('log', [-1]);
      expect(result2.error).toContain('positive');
    });

    it('should calculate log10', () => {
      const result = functions.execute('log10', [10]);
      expect(result.value).toBeCloseTo(1, 10);

      const result2 = functions.execute('log10', [100]);
      expect(result2.value).toBeCloseTo(2, 10);
    });

    it('should calculate exp', () => {
      const result = functions.execute('exp', [0]);
      expect(result.value).toBeCloseTo(1, 10);

      const result2 = functions.execute('exp', [1]);
      expect(result2.value).toBeCloseTo(Math.E, 10);
    });

    it('should require exactly 1 argument for log functions', () => {
      const result = functions.execute('sqrt', []);
      expect(result.error).toContain('1 argument');
    });
  });

  describe('Number Functions', () => {
    it('should calculate abs', () => {
      const result = functions.execute('abs', [-5]);
      expect(result.value).toBe(5);

      const result2 = functions.execute('abs', [5]);
      expect(result2.value).toBe(5);

      const result3 = functions.execute('abs', [0]);
      expect(result3.value).toBe(0);
    });

    it('should calculate round', () => {
      const result = functions.execute('round', [3.4]);
      expect(result.value).toBe(3);

      const result2 = functions.execute('round', [3.5]);
      expect(result2.value).toBe(4);

      const result3 = functions.execute('round', [-3.5]);
      expect(result3.value).toBe(-3);
    });

    it('should calculate floor', () => {
      const result = functions.execute('floor', [3.7]);
      expect(result.value).toBe(3);

      const result2 = functions.execute('floor', [-3.2]);
      expect(result2.value).toBe(-4);
    });

    it('should calculate ceil', () => {
      const result = functions.execute('ceil', [3.2]);
      expect(result.value).toBe(4);

      const result2 = functions.execute('ceil', [-3.7]);
      expect(result2.value).toBe(-3);
    });

    it('should calculate trunc', () => {
      const result = functions.execute('trunc', [3.7]);
      expect(result.value).toBe(3);

      const result2 = functions.execute('trunc', [-3.7]);
      expect(result2.value).toBe(-3);
    });

    it('should calculate frac (fractional part)', () => {
      const result = functions.execute('frac', [3.7]);
      expect(result.value).toBeCloseTo(0.7, 10);

      const result2 = functions.execute('frac', [-3.7]);
      expect(result2.value).toBeCloseTo(-0.7, 10);

      const result3 = functions.execute('frac', [5]);
      expect(result3.value).toBe(0);
    });

    it('should require exactly 1 argument for number functions', () => {
      const result = functions.execute('abs', []);
      expect(result.error).toContain('1 argument');
    });
  });

  describe('Random Function', () => {
    it('should generate random number between 0 and 1', () => {
      const result = functions.execute('random', []);
      expect(result.error).toBeUndefined();
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThan(1);
    });

    it('should require no arguments', () => {
      const result = functions.execute('random', [1]);
      expect(result.error).toContain('0 arguments');
    });

    it('should generate different values', () => {
      const result1 = functions.execute('random', []);
      const result2 = functions.execute('random', []);
      // Very unlikely to be exactly equal
      expect(result1.value).not.toBe(result2.value);
    });
  });

  describe('Combinatoric Functions', () => {
    it('should calculate permutation P(n, k)', () => {
      // P(5, 2) = 5! / 3! = 5 * 4 = 20
      const result = functions.execute('perm', [5, 2]);
      expect(result.value).toBe(20);

      // P(5, 5) = 5! = 120
      const result2 = functions.execute('perm', [5, 5]);
      expect(result2.value).toBe(120);

      // P(5, 0) = 1
      const result3 = functions.execute('perm', [5, 0]);
      expect(result3.value).toBe(1);
    });

    it('should calculate combination C(n, k)', () => {
      // C(5, 2) = 5! / (2! * 3!) = 10
      const result = functions.execute('comb', [5, 2]);
      expect(result.value).toBe(10);

      // C(5, 5) = 1
      const result2 = functions.execute('comb', [5, 5]);
      expect(result2.value).toBe(1);

      // C(5, 0) = 1
      const result3 = functions.execute('comb', [5, 0]);
      expect(result3.value).toBe(1);

      // C(6, 3) = 20
      const result4 = functions.execute('comb', [6, 3]);
      expect(result4.value).toBe(20);
    });

    it('should require exactly 2 arguments', () => {
      const result = functions.execute('perm', [5]);
      expect(result.error).toContain('2 arguments');

      const result2 = functions.execute('comb', [5, 2, 3]);
      expect(result2.error).toContain('2 arguments');
    });

    it('should require non-negative integer arguments', () => {
      const result = functions.execute('perm', [5.5, 2]);
      expect(result.error).toContain('non-negative integers');

      const result2 = functions.execute('comb', [5, -1]);
      expect(result2.error).toContain('non-negative integers');
    });

    it('should require k <= n', () => {
      const result = functions.execute('perm', [3, 5]);
      expect(result.error).toContain('cannot be greater');

      const result2 = functions.execute('comb', [3, 5]);
      expect(result2.error).toContain('cannot be greater');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown functions', () => {
      const result = functions.execute('unknown', [1]);
      expect(result.error).toContain('Unknown function');
    });

    it('should be case-insensitive', () => {
      const result1 = functions.execute('SIN', [0]);
      expect(result1.error).toBeUndefined();
      expect(result1.value).toBeCloseTo(0, 10);

      const result2 = functions.execute('SQRT', [4]);
      expect(result2.error).toBeUndefined();
      expect(result2.value).toBe(2);
    });
  });
});

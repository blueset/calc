import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../../src/calculator';
import { DataLoader } from '../../src/data-loader';
import * as path from 'path';

/**
 * Integration tests for Greek letters and special symbol input
 * Tests π, φ, μ prefix, Å, ‰, ×, ·, ÷, and various currency symbols
 */
describe('Integration Tests - Greek and Special Symbols', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();

    calculator = new Calculator(dataLoader);

    // Load mock exchange rates for currency tests
    const mockExchangeRates = {
      date: '2024-01-01',
      usd: {
        eur: 0.85,
        gbp: 0.73,
        jpy: 110.0,
        inr: 74.0,
        rub: 75.0,
        thb: 33.0,
        krw: 1100.0
      }
    };
    calculator.loadExchangeRates(mockExchangeRates);
  });

  describe('Greek Letter π (Pi)', () => {
    it('should recognize π symbol as pi constant', () => {
      const result = calculator.calculate('π');
      expect(result.results[0].result).toMatch(/3\.14159\d*/);
    });

    it('should use π in expressions', () => {
      const result = calculator.calculate(`2 * π
r = 5
π * r^2
π / 2`);
      expect(result.results[0].result).toMatch(/6\.28\d*/);
      expect(result.results[2].result).toMatch(/78\.5\d*/);
      expect(result.results[3].result).toMatch(/1\.57\d*/);
    });

    it('should handle both π symbol and pi word', () => {
      const result = calculator.calculate(`π
pi
pi == π`);
      expect(result.results[0].result).toMatch(/3\.14159\d*/);
      expect(result.results[1].result).toMatch(/3\.14159\d*/);
      expect(result.results[2].result).toBe('true');
    });
  });

  describe('Greek Letter φ (Phi/Golden Ratio)', () => {
    it('should recognize φ symbol as golden ratio', () => {
      const result = calculator.calculate('φ');
      expect(result.results[0].result).toMatch(/1\.618\d*/);
    });

    it('should use φ in expressions', () => {
      const result = calculator.calculate(`φ^2
φ - 1
1 / φ`);
      expect(result.results[0].result).toMatch(/2\.618\d*/);
      expect(result.results[1].result).toMatch(/0\.618\d*/);
      expect(result.results[2].result).toMatch(/0\.618\d*/);
    });

    it('should handle both φ symbol and phi word', () => {
      const result = calculator.calculate(`φ
phi
phi == φ`);
      expect(result.results[0].result).toMatch(/1\.618\d*/);
      expect(result.results[1].result).toMatch(/1\.618\d*/);
      expect(result.results[2].result).toBe('true');
    });

    it('should verify golden ratio properties', () => {
      const result = calculator.calculate(`φ^2 - φ - 1
φ * (φ - 1)`);
      // φ² = φ + 1
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(0, 5);
      // φ * (φ - 1) = 1
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(1, 5);
    });
  });

  describe('Greek Letter μ (Micro Prefix)', () => {
    it('should recognize μ as micro prefix for meters', () => {
      const result = calculator.calculate(`1 μm
10 μm
1000 μm`);
      expect(result.results[0].result).toBe('1 μm');
      expect(result.results[1].result).toBe('10 μm');
      expect(result.results[2].result).toBe('1 000 μm');
    });

    it('should recognize μ as micro prefix for grams', () => {
      const result = calculator.calculate(`1 μg
100 μg
1000 μg`);
      expect(result.results[0].result).toBe('1 μg');
      expect(result.results[1].result).toBe('100 μg');
      expect(result.results[2].result).toBe('1 000 μg');
    });

    it('should recognize μ as micro prefix for amperes', () => {
      const result = calculator.calculate(`1 μA
50 μA
1000 μA`);
      expect(result.results[0].result).toBe('1 μA');
      expect(result.results[1].result).toBe('50 μA');
      expect(result.results[2].result).toBe('1 000 μA');
    });

    it('should recognize μ as micro prefix for seconds', () => {
      const result = calculator.calculate(`1 μs
100 μs
1000 μs`);
      expect(result.results[0].result).toBe('1 μs');
      expect(result.results[1].result).toBe('100 μs');
      expect(result.results[2].result).toBe('1 000 μs');
    });

    it('should recognize μ as micro prefix for liters', () => {
      const result = calculator.calculate(`1 μL
500 μL`);
      expect(result.results[0].result).toBe('1 μL');
      expect(result.results[1].result).toBe('500 μL');
    });

    it('should recognize μ as micro prefix for volts', () => {
      const result = calculator.calculate(`1 μV
100 μV`);
      expect(result.results[0].result).toBe('1 μV');
      expect(result.results[1].result).toBe('100 μV');
    });

    it('should convert between μ-prefixed units and base units', () => {
      const result = calculator.calculate(`1000 μm to mm
1000 μg to mg
1000 μA to mA`);
      expect(result.results[0].result).toBe('1 mm');
      expect(result.results[1].result).toBe('1 mg');
      expect(result.results[2].result).toBe('1 mA');
    });

    it('should handle arithmetic with μ-prefixed units', () => {
      const result = calculator.calculate(`10 μm + 5 μm
100 μg * 2
1000 μA / 10`);
      expect(result.results[0].result).toBe('15 μm');
      expect(result.results[1].result).toBe('200 μg');
      expect(result.results[2].result).toBe('100 μA');
    });
  });

  describe('Special Symbol Å (Angstrom)', () => {
    it('should recognize Å symbol for angstrom', () => {
      const result = calculator.calculate(`1 Å
10 Å
100 Å`);
      expect(result.results[0].result).toBe('1 Å');
      expect(result.results[1].result).toBe('10 Å');
      expect(result.results[2].result).toBe('100 Å');
    });

    it('should convert angstroms to other length units', () => {
      const result = calculator.calculate(`10 Å to nm
1 Å to m`);
      expect(result.results[0].result).toBe('1 nm');
      expect(result.results[1].result).toBe('1e-10 m');
    });

    it('should handle both Å symbol and word form', () => {
      const result = calculator.calculate(`1 Å
1 angstrom`);
      expect(result.results[0].result).toBe('1 Å');
      expect(result.results[1].result).toBe('1 Å');
    });
  });

  describe('Special Symbol ‰ (Per Mille)', () => {
    it('should recognize ‰ symbol as per mille', () => {
      const result = calculator.calculate(`1‰
10‰
100‰`);
      expect(result.results[0].result).toBe('0.001');
      expect(result.results[1].result).toBe('0.01');
      expect(result.results[2].result).toBe('0.1');
    });

    it('should use ‰ in expressions', () => {
      const result = calculator.calculate(`5‰ * 1000
100 * 25‰`);
      expect(result.results[0].result).toBe('5');
      expect(result.results[1].result).toBe('2.5');
    });
  });

  describe('Alternative Multiplication Symbol ×', () => {
    it('should recognize × as multiplication', () => {
      const result = calculator.calculate(`3 × 4
5 × 10
12 × 12`);
      expect(result.results[0].result).toBe('12');
      expect(result.results[1].result).toBe('50');
      expect(result.results[2].result).toBe('144');
    });

    it('should use × with units', () => {
      const result = calculator.calculate(`5 m × 3
10 kg × 2.5`);
      expect(result.results[0].result).toBe('15 m');
      expect(result.results[1].result).toBe('25 kg');
    });

    it('should handle × in complex expressions', () => {
      const result = calculator.calculate(`2 × 3 + 4
(2 × 3) × 4`);
      expect(result.results[0].result).toBe('10');
      expect(result.results[1].result).toBe('24');
    });
  });

  describe('Alternative Multiplication Symbol · (Middle Dot)', () => {
    it('should recognize · as multiplication', () => {
      const result = calculator.calculate(`3 · 4
5 · 10
12 · 12`);
      expect(result.results[0].result).toBe('12');
      expect(result.results[1].result).toBe('50');
      expect(result.results[2].result).toBe('144');
    });

    it('should use · with units', () => {
      const result = calculator.calculate(`5 m · 3
10 kg · 2.5`);
      expect(result.results[0].result).toBe('15 m');
      expect(result.results[1].result).toBe('25 kg');
    });

    it('should use · for derived units', () => {
      const result = calculator.calculate(`10 N · 2 m
5 kg · 10 m/s²`);
      expect(result.results[0].result).toBe('20 N m');
      expect(result.results[1].result).toBe('50 kg m/s²');
    });
  });

  describe('Alternative Division Symbol ÷', () => {
    it('should recognize ÷ as division', () => {
      const result = calculator.calculate(`10 ÷ 2
20 ÷ 4
100 ÷ 5`);
      expect(result.results[0].result).toBe('5');
      expect(result.results[1].result).toBe('5');
      expect(result.results[2].result).toBe('20');
    });

    it('should use ÷ with units', () => {
      const result = calculator.calculate(`20 m ÷ 4
100 kg ÷ 5`);
      expect(result.results[0].result).toBe('5 m');
      expect(result.results[1].result).toBe('20 kg');
    });

    it('should handle ÷ in complex expressions', () => {
      const result = calculator.calculate(`20 ÷ 2 + 3
(20 ÷ 2) ÷ 5`);
      expect(result.results[0].result).toBe('13');
      expect(result.results[1].result).toBe('2');
    });
  });

  describe('Currency Symbols', () => {
    it('should recognize unambiguous € (Euro) symbol', () => {
      const result = calculator.calculate('€100');
      expect(result.results[0].result).toBe('100.00 EUR');
    });

    it('should recognize ambiguous £ (Pound) symbol', () => {
      const result = calculator.calculate('£50');
      expect(result.results[0].result).toBe('£50');
    });

    it('should recognize ambiguous ¥ (Yen) symbol', () => {
      const result = calculator.calculate('¥1000');
      expect(result.results[0].result).toBe('¥1 000');
    });

    it('should recognize unambiguous ₹ (Rupee) symbol', () => {
      const result = calculator.calculate('₹500');
      expect(result.results[0].result).toBe('500.00 INR');
    });

    it('should recognize ambiguous $ (Dollar) symbol', () => {
      const result = calculator.calculate('$100');
      expect(result.results[0].result).toBe('$100');
    });

    it('should recognize unambiguous ₽ (Ruble) symbol', () => {
      const result = calculator.calculate('₽1000');
      expect(result.results[0].result).toBe('1 000.00 RUB');
    });

    it('should recognize ambiguous ₩ (Won) symbol', () => {
      const result = calculator.calculate('₩10000');
      expect(result.results[0].result).toBe('₩10 000');
    });

    it('should recognize unambiguous ฿ (Baht) symbol', () => {
      const result = calculator.calculate('฿500');
      expect(result.results[0].result).toBe('500.00 THB');
    });

    it('should use currency symbols in arithmetic', () => {
      const result = calculator.calculate(`€100 + €50
£200 - £75
¥1000 * 2`);
      expect(result.results[0].result).toBe('150.00 EUR');
      expect(result.results[1].result).toBe('£125');
      expect(result.results[2].result).toBe('¥2 000');
    });
  });

  describe('Mixed Symbol Usage', () => {
    it('should use Greek letters with operators', () => {
      const result = calculator.calculate(`π × 2
φ · 3
π ÷ φ`);
      expect(result.results[0].result).toMatch(/6\.28\d*/);
      expect(result.results[1].result).toMatch(/4\.85\d*/);
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(1.94, 2);
    });

    it('should combine multiple symbol types', () => {
      const result = calculator.calculate(`10 μm × 5
€100 ÷ 4
1‰ · 1000`);
      expect(result.results[0].result).toBe('50 μm');
      expect(result.results[1].result).toBe('25.00 EUR');
      expect(result.results[2].result).toBe('1');
    });

    it('should use symbols in complex expressions', () => {
      const result = calculator.calculate(`r = 5 μm
π × r^2
(€100 + €50) ÷ 3`);
      expect(result.results[1].result).toMatch(/78\.5\d+ μm²/);
      expect(result.results[2].result).toBe('50.00 EUR');
    });
  });

  describe('Symbol Equivalence', () => {
    it('should treat × and * as equivalent', () => {
      const result = calculator.calculate(`5 × 3
5 * 3
(5 × 3) == (5 * 3)`);
      expect(result.results[0].result).toBe('15');
      expect(result.results[1].result).toBe('15');
      expect(result.results[2].result).toBe('true');
    });

    it('should treat · and * as equivalent', () => {
      const result = calculator.calculate(`5 · 3
5 * 3
(5 · 3) == (5 * 3)`);
      expect(result.results[0].result).toBe('15');
      expect(result.results[1].result).toBe('15');
      expect(result.results[2].result).toBe('true');
    });

    it('should treat ÷ and / as equivalent', () => {
      const result = calculator.calculate(`10 ÷ 2
10 / 2
(10 ÷ 2) == (10 / 2)`);
      expect(result.results[0].result).toBe('5');
      expect(result.results[1].result).toBe('5');
      expect(result.results[2].result).toBe('true');
    });
  });

  describe('Symbol Edge Cases', () => {
    it('should handle Unicode in variable names', () => {
      const result = calculator.calculate(`π_value = π
π_value * 2`);
      expect(result.results[1].result).toMatch(/6\.28\d*/);
    });

    it('should handle multiple consecutive symbols', () => {
      const result = calculator.calculate(`π × π
φ · φ
π ÷ π`);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(9.87, 2);
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(2.618, 2);
      expect(result.results[2].result).toBe('1');
    });

    it('should handle symbols with parentheses', () => {
      const result = calculator.calculate(`(π + φ) × 2
(€100 + €50) ÷ 3
(10 μm) · 5`);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(9.5192, 2);
      expect(result.results[1].result).toBe('50.00 EUR');
      expect(result.results[2].result).toBe('50 μm');
    });

    it('should preserve symbol units in results', () => {
      const result = calculator.calculate(`x = 10 μm
y = €100
z = 5‰
x + x
y + y
z * 2`);
      expect(result.results[3].result).toBe('20 μm');
      expect(result.results[4].result).toBe('200.00 EUR');
      expect(result.results[5].result).toBe('0.01');
    });
  });
});

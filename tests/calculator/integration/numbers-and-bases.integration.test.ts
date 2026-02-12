import { describe, it, expect, beforeAll } from "vitest";
import { Calculator } from "../../../src/calculator/calculator";
import { DataLoader } from "../../../src/calculator/data-loader";

/**
 * Integration tests for numbers and number bases
 * Tests the full pipeline: Lexer → Parser → Evaluator → Formatter
 */
describe("Integration Tests - Numbers and Bases", () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();

    calculator = new Calculator(dataLoader, {}); // Use Nearley parser
  });

  describe("Numbers and Number Bases", () => {
    it("should handle integer numbers", () => {
      const result = calculator.calculate("0");
      expect(result.results[0].result).toBe("0");
      expect(result.errors.runtime.length).toBe(0);
    });

    it("should handle decimal numbers", () => {
      const result = calculator.calculate("3.14");
      expect(result.results[0].result).toBe("3.14");
    });

    it("should handle numbers with underscore separator", () => {
      const result = calculator.calculate("1_000");
      expect(result.results[0].result).toBe("1 000");
    });

    it("should handle scientific notation", () => {
      const result = calculator.calculate("2.5e3");
      // Formatter adds digit grouping separator (space by default)
      expect(result.results[0].result).toBe("2 500");

      const result2 = calculator.calculate("4.8E-2");
      expect(result2.results[0].result).toBe("0.048");
    });

    it("should handle negative numbers", () => {
      const result = calculator.calculate("-5");
      expect(result.results[0].result).toBe("-5");
    });

    it("should handle binary numbers with 0b prefix", () => {
      const result = calculator.calculate("0b1010");
      expect(result.results[0].result).toBe("10");
    });

    it("should handle binary numbers with base keyword", () => {
      const result = calculator.calculate("1010 base 2");
      expect(result.results[0].result).toBe("10");
    });

    it("should handle octal numbers with 0o prefix", () => {
      const result = calculator.calculate("0o12");
      expect(result.results[0].result).toBe("10");
    });

    it("should handle hexadecimal numbers with 0x prefix", () => {
      let result = calculator.calculate("0xA");
      expect(result.results[0].result).toBe("10");

      // Mixed case
      result = calculator.calculate("0xAa");
      expect(result.results[0].result).toBe("170");
    });

    it("should handle arbitrary bases", () => {
      let result = calculator.calculate("ABC base 36");
      expect(result.results[0].result).toBe("13 368");

      // Mixed case
      result = calculator.calculate("1A2b base 36");
      expect(result.results[0].result).toBe("59 699");

      result = calculator.calculate("Hello base 30");
      expect(result.results[0].result).toBe("14 167 554");
    });
  });

  describe("Constants", () => {
    it("should handle NaN and Infinity", () => {
      const result = calculator.calculate("NaN");
      expect(result.results[0].result).toBe("NaN");

      const result2 = calculator.calculate("Infinity");
      expect(result2.results[0].result).toBe("Infinity");

      const result3 = calculator.calculate("inf");
      expect(result3.results[0].result).toBe("Infinity");
    });

    it("should handle pi", () => {
      const result = calculator.calculate("pi");
      expect(result.results[0].result).toContain("3.14159");
    });

    it("should handle e", () => {
      const result = calculator.calculate("e");
      expect(result.results[0].result).toContain("2.71828");
    });

    it("should handle golden ratio", () => {
      const result = calculator.calculate("golden_ratio");
      expect(result.results[0].result).toContain("1.61803");

      const result2 = calculator.calculate("phi");
      expect(result2.results[0].result).toContain("1.61803");
    });

    it("should handle case insensitive pi variants", () => {
      const result = calculator.calculate(`pi
PI
Pi`);
      // All should evaluate to the same value
      expect(result.results[0].result).toContain("3.14159");
      expect(result.results[1].result).toContain("3.14159");
      expect(result.results[2].result).toContain("3.14159");
    });

    it("should handle case insensitive NaN variants", () => {
      const result = calculator.calculate(`NaN
nan
NAN
Nan`);
      expect(result.results[0].result).toBe("NaN");
      expect(result.results[1].result).toBe("NaN");
      expect(result.results[2].result).toBe("NaN");
      expect(result.results[3].result).toBe("NaN");
    });

    it("should handle case insensitive Infinity variants", () => {
      const result = calculator.calculate(`Infinity
infinity
INFINITY
inf
INF
Inf`);
      expect(result.results[0].result).toBe("Infinity");
      expect(result.results[1].result).toBe("Infinity");
      expect(result.results[2].result).toBe("Infinity");
      expect(result.results[3].result).toBe("Infinity");
      expect(result.results[4].result).toBe("Infinity");
      expect(result.results[5].result).toBe("Infinity");
    });

    it("should handle case insensitive e constant variants", () => {
      const result = calculator.calculate(`e
E`);
      // Both should evaluate to Euler's number
      expect(result.results[0].result).toContain("2.71828");
      expect(result.results[1].result).toContain("2.71828");
    });

    it("should handle case insensitive phi variants", () => {
      const result = calculator.calculate(`phi
Phi
PHI`);
      expect(result.results[0].result).toContain("1.61803");
      expect(result.results[1].result).toContain("1.61803");
      expect(result.results[2].result).toContain("1.61803");
    });
  });

  describe("Arbitrary Base Conversion", () => {
    it("should convert to base 7 with suffix", () => {
      const result = calculator.calculate("100 to base 7");
      expect(result.results[0].result).toBe("202 (base 7)");
    });

    it("should convert to base 16 with prefix", () => {
      const result = calculator.calculate("255 to base 16");
      expect(result.results[0].result).toBe("0xFF");
    });

    it("should convert fractional to base 2 with prefix", () => {
      const result = calculator.calculate("10.625 to base 2");
      expect(result.results[0].result).toBe("0b1010.101");
    });

    it("should convert to base 10 without decoration", () => {
      const result = calculator.calculate("100 to base 10");
      expect(result.results[0].result).toBe("100");
    });

    it("should handle negative with prefix", () => {
      const result = calculator.calculate("-10 to base 16");
      expect(result.results[0].result).toBe("0x-A");
    });

    it("should handle negative with suffix", () => {
      const result = calculator.calculate("-10 to base 7");
      expect(result.results[0].result).toBe("-13 (base 7)");
    });

    it("should convert to large base", () => {
      const result = calculator.calculate("1000 to base 35");
      expect(result.results[0].result).toContain("(base 35)");
    });

    it("should error on invalid base (too low)", () => {
      const result = calculator.calculate("100 to base 1");
      // Parser error: base out of range
      expect(result.errors.runtime.length).toBeGreaterThan(0);
      expect(result.results[0].hasError).toBe(true);
    });

    it("should error on invalid base (too high)", () => {
      const result = calculator.calculate("100 to base 50");
      // Parser error: base out of range
      expect(result.errors.runtime.length).toBeGreaterThan(0);
      expect(result.results[0].hasError).toBe(true);
    });
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import { Calculator } from "../../../src/calculator/calculator";
import { DataLoader } from "../../../src/calculator/data-loader";

/**
 * Integration tests for boolean and binary operations
 * Tests the full pipeline: Lexer → Parser → Evaluator → Formatter
 */
describe("Integration Tests - Boolean and Binary", () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();

    calculator = new Calculator(dataLoader, {}); // Use Nearley parser
  });

  describe("Boolean Operations", () => {
    it("should handle boolean constants", () => {
      const result = calculator.calculate("true");
      expect(result.results[0].result).toBe("true");

      const result2 = calculator.calculate("false");
      expect(result2.results[0].result).toBe("false");
    });

    it("should handle logical AND", () => {
      const result = calculator.calculate("true && false");
      expect(result.results[0].result).toBe("false");
    });

    it("should handle logical OR", () => {
      const result = calculator.calculate("true || false");
      expect(result.results[0].result).toBe("true");
    });

    it("should handle logical NOT", () => {
      const result = calculator.calculate("!true");
      expect(result.results[0].result).toBe("false");
    });

    it("should handle comparisons", () => {
      const result = calculator.calculate("5 > 3");
      expect(result.results[0].result).toBe("true");

      const result2 = calculator.calculate("4.5 <= 4.5");
      expect(result2.results[0].result).toBe("true");

      const result3 = calculator.calculate("200 == 2e2");
      expect(result3.results[0].result).toBe("true");

      const result4 = calculator.calculate("100 != 1e2");
      expect(result4.results[0].result).toBe("false");
    });

    it("should handle comparisons with units", () => {
      const result = calculator.calculate("5 miles < 3 meters");
      expect(result.results[0].result).toBe("false");
    });

    it("should handle comparisons with composite values", () => {
      const result = calculator.calculate(`7 ft 5 in > 5 ft
5 ft > 7 ft 5 in
5 ft 5 in < 5 ft 6 in`);
      expect(result.results[0].result).toBe("true");
      expect(result.results[1].result).toBe("false");
      expect(result.results[2].result).toBe("true");
    });

    it("should handle comparisons with derived units", () => {
      const result = calculator.calculate(`60 km/h > 15 m/s
1 cm^2 < 1 m^2
1 ha >= 10 km^2
1 ha <= 10 km m
10 km/mg > 1 m/ton`);
      expect(result.results[0].result).toBe("true");
      expect(result.results[1].result).toBe("true");
      expect(result.results[2].result).toBe("false");
      expect(result.results[3].result).toBe("true");
      expect(result.results[4].result).toBe("true");
    });
  });

  describe("Binary Arithmetic", () => {
    it("should handle bitwise AND", () => {
      const result = calculator.calculate("0b1010 & 0b1100 to binary");
      expect(result.results[0].result).toBe("0b1000");
    });

    it("should handle bitwise OR", () => {
      const result = calculator.calculate("0b1010 | 0b1100 to binary");
      expect(result.results[0].result).toBe("0b1110");
    });

    it("should handle bitwise XOR", () => {
      const result = calculator.calculate("0b1010 xor 0b1100 to binary");
      expect(result.results[0].result).toBe("0b110");
    });

    it("should handle bitwise NOT", () => {
      const result = calculator.calculate("~0b1010 to binary");
      expect(result.results[0].result).toBe("0b-1011");
    });

    it("should handle left shift", () => {
      const result = calculator.calculate("0b1010 << 2 to binary");
      expect(result.results[0].result).toBe("0b101000");
    });

    it("should handle right shift", () => {
      const result = calculator.calculate("0b1010 >> 1 to binary");
      expect(result.results[0].result).toBe("0b101");
    });
  });
});

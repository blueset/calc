import { describe, it, expect, beforeAll } from "vitest";
import { Calculator } from "../../../src/calculator/calculator";
import { DataLoader } from "../../../src/calculator/data-loader";

/**
 * Integration tests for composite unit edge cases
 * Tests arcminutes/arcseconds disambiguation and complex negated composites
 */
describe("Integration Tests - Composite Units Edge Cases", () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();

    calculator = new Calculator(dataLoader, {}); // Use Nearley parser
  });

  describe("Arcminutes and Arcseconds Disambiguation", () => {
    it("should handle arcminutes after degrees", () => {
      // After degree symbol, ′ is arcminutes
      const result = calculator.calculate("45°30′");
      expect(result.results[0].result).toBe("45° 30′");
    });

    it("should handle arcseconds after degrees", () => {
      // After degree symbol, ″ is arcseconds
      const result = calculator.calculate("45°30″");
      // 45 degrees 30 arcseconds = 45 + 30/3600 = 45.00833... degrees
      expect(result.results[0].result).toBe("45° 30″");
    });

    it("should handle degrees, arcminutes, and arcseconds", () => {
      // Complete angle notation
      const result = calculator.calculate("45°30′15″");
      // 45 + 30/60 + 15/3600 = 45.50416... degrees
      expect(result.results[0].result).toBe("45° 30′ 15″");
    });

    it("should handle prime symbol as feet outside degree context", () => {
      // Without degree context, ′ is feet
      const result = calculator.calculate("5′");
      expect(result.results[0].result).toBe("5 ft");
    });

    it("should handle double prime as inches outside degree context", () => {
      // Without degree context, ″ is inches
      const result = calculator.calculate("10″");
      expect(result.results[0].result).toBe("10 in");
    });
  });

  describe("Complex Negated Composites", () => {
    it("should handle negated composite length", () => {
      const result = calculator.calculate("-(5 ft 6 in)");
      // Should negate the entire composite
      expect(result.results[0].result).toBe("-5 ft -6 in");
    });

    it("should handle negated composite time", () => {
      const result = calculator.calculate("-(2 hours 30 minutes)");
      expect(result.results[0].result).toBe("-2 h -30 min");
    });

    it("should handle arithmetic with negated composites", () => {
      const result = calculator.calculate("10 ft - (5 ft 6 in)");
      // 10 ft - 5.5 ft = 4.5 ft = 4 ft 6 in
      expect(result.results[0].result).toBe("4.5 ft");
    });

    it("should handle composite with fractional parts", () => {
      const result = calculator.calculate("5 ft 10.5 in");
      expect(result.results[0].result).toBe("5 ft 10.5 in");
    });
  });

  describe("Composite Unit Conversions", () => {
    it("should convert composite angles to decimal degrees", () => {
      const result = calculator.calculate("45°30′ to degrees");
      expect(result.results[0].result).toBe("45.5°");
    });

    it("should convert decimal degrees to composite angle notation", () => {
      const result = calculator.calculate("45.5 degrees to ° ′");
      expect(result.results[0].result).toBe("45° 30′");
    });

    it("should convert decimal feet to composite length notation", () => {
      const result = calculator.calculate("45.5 ft to ′ ″");
      expect(result.results[0].result).toBe("45 ft 6 in");
    });

    it("should convert between composite length units", () => {
      const result = calculator.calculate("1 ft 6 in to cm");
      // 1.5 ft = 45.72 cm
      expect(result.results[0].result).toMatch(/45\.72\d* cm/);
    });

    it("should convert to composite from single unit", () => {
      const result = calculator.calculate("100 cm to ft in");
      // 100 cm ≈ 3 ft 3.37 in
      expect(result.results[0].result).toMatch(/3 ft 3\.37\d* in/);
    });
  });
});

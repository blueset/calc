import { describe, it, expect, beforeAll } from "vitest";
import { Calculator } from "../../../src/calculator/calculator";
import { DataLoader } from "../../../src/calculator/data-loader";

/**
 * Integration tests for advanced unit handling
 * Tests user-defined units, derived units, and composite units
 */
describe("Integration Tests - Advanced Units", () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();

    calculator = new Calculator(dataLoader, {}); // Use Nearley parser
  });

  describe("User defined units", () => {
    it("should handle user-defined units", () => {
      const result = calculator.calculate(`1 person`);
      expect(result.results[0].result).toBe("1 person");
    });

    it("should handle derived units with user-defined units", () => {
      let result = calculator.calculate(`1 kg / person`);
      expect(result.results[0].result).toBe("1 kg/person");
      result = calculator.calculate(`1 USD/person/day`);
      expect(result.results[0].result).toBe("1.00 USD/(person day)");
      result = calculator.calculate(`1 click/person`);
      expect(result.results[0].result).toBe("1 click/person");
      result = calculator.calculate(`1 km^2 person/hour`);
      expect(result.results[0].result).toBe("1 km² person/h");
    });
  });

  describe("Derived Units", () => {
    it("should handle speed units", () => {
      const result = calculator.calculate("60 km/h");
      expect(result.results[0].result).toBe("60 km/h");
    });

    it("should handle derived units with space multiplication", () => {
      let result = calculator.calculate("1 N m");
      expect(result.results[0].result).toBe("1 N m");
      result = calculator.calculate("1 N^2 m");
      expect(result.results[0].result).toBe("1 N² m");
      result = calculator.calculate("1 N m^2");
      expect(result.results[0].result).toBe("1 N m²");
      expect(result.results[0].result).toContain("m²");
      result = calculator.calculate("1 N^3 m^2");
      expect(result.results[0].result).toBe("1 N³ m²");
      result = calculator.calculate("1 N² m³");
      expect(result.results[0].result).toBe("1 N² m³");
      result = calculator.calculate("1 N² m^3");
      expect(result.results[0].result).toBe("1 N² m³");
    });

    it("should handle derived units with division and exponents", () => {
      const result = calculator.calculate("1 W/m²");
      expect(result.results[0].result).toBe("1 W/m²");
    });

    it("should handle derived units in the same dimension", () => {
      const result = calculator.calculate(`1 cm/h + 5 m/s
10 cm^2 + 5 m^2
1 ha + 10 km^2
1 ha + 10 km m
1 ha + 10 km m to km m
10 km m + 1 ha
10 km m + 1000 m cm
10 km/kg + 1 m/ton
1 km/t + 1 cm/kg
1 km/t + 1 cm/kg to ft/lb`);
      expect(result.results[0].result).toBe("1 800 001 cm/h");
      expect(result.results[1].result).toBe("50 010 cm²");
      expect(result.results[2].result).toBe("1 001 ha");
      expect(result.results[3].result).toBe("2 ha");
      expect(result.results[4].result).toBe("20 km m");
      expect(result.results[5].result).toBe("20 km m");
      expect(result.results[6].result).toBe("10.01 km m");
      expect(result.results[7].result).toBe("10.000001 km/kg");
      expect(result.results[8].result).toBe("1.01 km/t");
      expect(result.results[9].result).toMatch(/1.503\d+ ft\/lb/);
    });

    it("should handle mixed derived units with variant conversions", () => {
      const result = calculator.calculate(`1 tsp to mL
1 tsp / 1 ml
1 tsp/s / 1 ml/s`);
      expect(result.results[0].result).toMatch(/4\.9289\d+ mL/);
      expect(result.results[1].result).toMatch(/4\.9289\d+$/);
      expect(result.results[2].result).toMatch(/4\.9289\d+$/);
    });
  });

  describe("Composite Units", () => {
    it("should handle composite length units", () => {
      const result = calculator.calculate("5 m 20 cm");
      expect(result.results[0].result).toBe("5 m 20 cm");
    });

    it("should handle composite time units", () => {
      const result = calculator.calculate("2 hr 30 min");
      expect(result.results[0].result).toBe("2 h 30 min");
    });

    it("should handle negated composite units", () => {
      const result = calculator.calculate("-(5 m 20 cm)");
      expect(result.results[0].result).toBe("-5 m -20 cm");
    });
  });
});

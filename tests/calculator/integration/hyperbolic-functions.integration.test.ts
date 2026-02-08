import { describe, it, expect, beforeAll } from "vitest";
import { Calculator } from "../../../src/calculator/calculator";
import { DataLoader } from "../../../src/calculator/data-loader";

/**
 * Integration tests for hyperbolic trigonometric functions
 * Tests sinh, cosh, tanh, asinh, acosh, atanh and their aliases
 * Spec lines: 950-951
 */
describe("Integration Tests - Hyperbolic Functions", () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();

    calculator = new Calculator(dataLoader, {}); // Use Nearley parser
  });

  describe("Hyperbolic Sine (sinh)", () => {
    it("should calculate sinh for various values", () => {
      const result = calculator.calculate(`sinh(0)
sinh(1)
sinh(-1)
sinh(2)`);
      expect(result.results[0].hasError).toBe(false);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(
        0,
        5,
      );
      expect(result.results[1].hasError).toBe(false);
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(
        1.1752011936,
        5,
      );
      expect(result.results[2].hasError).toBe(false);
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(
        -1.1752011936,
        5,
      );
      expect(result.results[3].hasError).toBe(false);
      expect(parseFloat(result.results[3].result ?? "Infinity")).toBeCloseTo(
        3.6268604078,
        5,
      );
    });

    it("should handle large values", () => {
      const result = calculator.calculate("sinh(10)");
      expect(result.results[0].hasError).toBe(false);
      expect(result.results[0].result).toMatch(/11 013\.232\d+/);
    });
  });

  describe("Hyperbolic Cosine (cosh)", () => {
    it("should calculate cosh for various values", () => {
      const result = calculator.calculate(`cosh(0)
cosh(1)
cosh(-1)
cosh(2)`);
      expect(result.results[0].hasError).toBe(false);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(
        1,
        5,
      );
      expect(result.results[1].hasError).toBe(false);
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(
        1.5430806348,
        5,
      );
      expect(result.results[2].hasError).toBe(false);
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(
        1.5430806348,
        5,
      );
      expect(result.results[3].hasError).toBe(false);
      expect(parseFloat(result.results[3].result ?? "Infinity")).toBeCloseTo(
        3.762195691,
        5,
      );
    });

    it("should be symmetric (even function)", () => {
      const result = calculator.calculate(`cosh(3)
cosh(-3)`);
      expect(result.results[0].result).toBe(result.results[1].result);
    });
  });

  describe("Hyperbolic Tangent (tanh)", () => {
    it("should calculate tanh for various values", () => {
      const result = calculator.calculate(`tanh(0)
tanh(1)
tanh(-1)
tanh(2)`);
      expect(result.results[0].hasError).toBe(false);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(
        0,
        5,
      );
      expect(result.results[1].hasError).toBe(false);
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(
        0.7615941559,
        5,
      );
      expect(result.results[2].hasError).toBe(false);
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(
        -0.7615941559,
        5,
      );
      expect(result.results[3].hasError).toBe(false);
      expect(parseFloat(result.results[3].result ?? "Infinity")).toBeCloseTo(
        0.9640275801,
        5,
      );
    });

    it("should approach ±1 for large values", () => {
      const result = calculator.calculate(`tanh(10)
tanh(-10)`);
      expect(result.results[0].hasError).toBe(false);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(
        1,
        5,
      );
      expect(result.results[1].hasError).toBe(false);
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(
        -1,
        5,
      );
    });
  });

  describe("Inverse Hyperbolic Sine (asinh/arsinh)", () => {
    it("should calculate asinh for various values", () => {
      const result = calculator.calculate(`asinh(0)
asinh(1)
asinh(-1)
asinh(2)`);
      expect(result.results[0].hasError).toBe(false);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(
        0,
        5,
      );
      expect(result.results[1].hasError).toBe(false);
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(
        0.881373587,
        5,
      );
      expect(result.results[2].hasError).toBe(false);
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(
        -0.881373587,
        5,
      );
      expect(result.results[3].hasError).toBe(false);
      expect(parseFloat(result.results[3].result ?? "Infinity")).toBeCloseTo(
        1.4436354751,
        5,
      );
    });

    it("should support arsinh alias", () => {
      const result = calculator.calculate(`arsinh(0)
arsinh(1)
arsinh(2)`);
      expect(result.results[0].hasError).toBe(false);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(
        0,
        5,
      );
      expect(result.results[1].hasError).toBe(false);
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(
        0.881373587,
        5,
      );
      expect(result.results[2].hasError).toBe(false);
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(
        1.4436354751,
        5,
      );
    });

    it("should be inverse of sinh", () => {
      const result = calculator.calculate(`asinh(sinh(0.5))
asinh(sinh(2))
sinh(asinh(0.5))
sinh(asinh(2))`);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(
        0.5,
        5,
      );
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(
        2,
        5,
      );
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(
        0.5,
        5,
      );
      expect(parseFloat(result.results[3].result ?? "Infinity")).toBeCloseTo(
        2,
        5,
      );
    });
  });

  describe("Inverse Hyperbolic Cosine (acosh/arcosh)", () => {
    it("should calculate acosh for values >= 1", () => {
      const result = calculator.calculate(`acosh(1)
acosh(2)
acosh(5)
acosh(10)`);
      expect(result.results[0].hasError).toBe(false);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(
        0,
        5,
      );
      expect(result.results[1].hasError).toBe(false);
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(
        1.3169578969,
        5,
      );
      expect(result.results[2].hasError).toBe(false);
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(
        2.2924316695,
        5,
      );
      expect(result.results[3].hasError).toBe(false);
      expect(parseFloat(result.results[3].result ?? "Infinity")).toBeCloseTo(
        2.9932228461,
        5,
      );
    });

    it("should error for values < 1", () => {
      const result = calculator.calculate(`acosh(0)
acosh(0.5)
acosh(-1)`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
    });

    it("should support arcosh alias", () => {
      const result = calculator.calculate(`arcosh(1)
arcosh(2)
arcosh(5)`);
      expect(result.results[0].hasError).toBe(false);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(
        0,
        5,
      );
      expect(result.results[1].hasError).toBe(false);
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(
        1.3169578969,
        5,
      );
      expect(result.results[2].hasError).toBe(false);
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(
        2.2924316695,
        5,
      );
    });

    it("should be inverse of cosh for positive results", () => {
      const result = calculator.calculate(`acosh(cosh(0.5))
acosh(cosh(2))
cosh(acosh(2))
cosh(acosh(5))`);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(
        0.5,
        5,
      );
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(
        2,
        5,
      );
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(
        2,
        5,
      );
      expect(parseFloat(result.results[3].result ?? "Infinity")).toBeCloseTo(
        5,
        5,
      );
    });
  });

  describe("Inverse Hyperbolic Tangent (atanh/artanh)", () => {
    it("should calculate atanh for values in (-1, 1)", () => {
      const result = calculator.calculate(`atanh(0)
atanh(0.5)
atanh(-0.5)
atanh(0.9)`);
      expect(result.results[0].hasError).toBe(false);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(
        0,
        5,
      );
      expect(result.results[1].hasError).toBe(false);
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(
        0.5493061443,
        5,
      );
      expect(result.results[2].hasError).toBe(false);
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(
        -0.5493061443,
        5,
      );
      expect(result.results[3].hasError).toBe(false);
      expect(parseFloat(result.results[3].result ?? "Infinity")).toBeCloseTo(
        1.4722194895,
        5,
      );
    });

    it("should error for values outside (-1, 1)", () => {
      const result = calculator.calculate(`atanh(1)
atanh(-1)
atanh(2)
atanh(-2)`);
      expect(result.results[0].hasError).toBe(true);
      expect(result.results[1].hasError).toBe(true);
      expect(result.results[2].hasError).toBe(true);
      expect(result.results[3].hasError).toBe(true);
    });

    it("should support artanh alias", () => {
      const result = calculator.calculate(`artanh(0)
artanh(0.5)
artanh(0.9)`);
      expect(result.results[0].hasError).toBe(false);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(
        0,
        5,
      );
      expect(result.results[1].hasError).toBe(false);
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(
        0.5493061443,
        5,
      );
      expect(result.results[2].hasError).toBe(false);
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(
        1.4722194895,
        5,
      );
    });

    it("should be inverse of tanh", () => {
      const result = calculator.calculate(`atanh(tanh(0.5))
atanh(tanh(1))
tanh(atanh(0.5))
tanh(atanh(0.9))`);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(
        0.5,
        5,
      );
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(
        1,
        5,
      );
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(
        0.5,
        5,
      );
      expect(parseFloat(result.results[3].result ?? "Infinity")).toBeCloseTo(
        0.9,
        5,
      );
    });
  });

  describe("Hyperbolic Identities", () => {
    it("should satisfy cosh²(x) - sinh²(x) = 1", () => {
      const result = calculator.calculate(`cosh(2)^2 - sinh(2)^2
cosh(5)^2 - sinh(5)^2`);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(
        1,
        5,
      );
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(
        1,
        5,
      );
    });

    it("should satisfy tanh(x) = sinh(x) / cosh(x)", () => {
      const result = calculator.calculate(`tanh(2)
sinh(2) / cosh(2)
tanh(3)
sinh(3) / cosh(3)`);
      expect(parseFloat(result.results[0].result ?? "Infinity")).toBeCloseTo(
        parseFloat(result.results[1].result ?? "Infinity"),
        5,
      );
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(
        parseFloat(result.results[3].result ?? "Infinity"),
        5,
      );
    });
  });

  describe("Hyperbolic Functions in Expressions", () => {
    it("should work in arithmetic expressions", () => {
      const result = calculator.calculate(`sinh(1) + cosh(1)
sinh(2) * tanh(2)
asinh(1) / 2`);
      expect(result.results[0].hasError).toBe(false);
      expect(result.results[1].hasError).toBe(false);
      expect(result.results[2].hasError).toBe(false);
    });

    it("should work with variables", () => {
      const result = calculator.calculate(`x = 2
sinh(x)
cosh(x)
tanh(x)`);
      expect(result.results[1].hasError).toBe(false);
      expect(parseFloat(result.results[1].result ?? "Infinity")).toBeCloseTo(
        3.6268604078,
        5,
      );
      expect(result.results[2].hasError).toBe(false);
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(
        3.762195691,
        5,
      );
      expect(result.results[3].hasError).toBe(false);
      expect(parseFloat(result.results[3].result ?? "Infinity")).toBeCloseTo(
        0.9640275801,
        5,
      );
    });

    it("should compose with other functions", () => {
      const result = calculator.calculate(`sin(sinh(1))
sqrt(cosh(2))
abs(tanh(-3))`);
      expect(result.results[0].hasError).toBe(false);
      expect(result.results[1].hasError).toBe(false);
      expect(result.results[2].hasError).toBe(false);
      expect(parseFloat(result.results[2].result ?? "Infinity")).toBeCloseTo(
        0.9950547537,
        5,
      );
    });
  });
});

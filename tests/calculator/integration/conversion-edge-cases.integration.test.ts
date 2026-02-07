import { describe, it, expect, beforeAll } from "vitest";
import { Calculator } from "../../../src/calculator/calculator";
import { DataLoader } from "../../../src/calculator/data-loader";

/**
 * Integration tests for conversion edge cases
 * Tests nested conversions, conversion chains, precision specifications, and complex scenarios
 */
describe("Integration Tests - Conversion Edge Cases", () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();

    calculator = new Calculator(dataLoader, {}); // Use Nearley parser
  });

  describe("Nested Conversions", () => {
    it("should handle double conversions", () => {
      const result = calculator.calculate("10 m to km to fraction");
      // 10 m = 0.01 km = 1/100 km
      expect(result.results[0].result).toBe("1/100 km");
    });

    it("should handle triple conversions", () => {
      const result = calculator.calculate("1000 m to km to mi to ft");
      // 1000m = 1km → miles → feet
      expect(result.results[0].result).toMatch(/3 280.83\d* ft/);
    });

    it("should handle unit conversion then format conversion", () => {
      const result = calculator.calculate("100 cm to m to fraction");
      expect(result.results[0].result).toBe("1 m"); // 100cm = 1m
    });
  });

  describe("Conversion Chains", () => {
    it("should chain multiple unit conversions", () => {
      const result = calculator.calculate("1 km to m to cm to mm");
      expect(result.results[0].result).toBe("1 000 000 mm"); // 1 million mm
    });

    it("should preserve value through conversion chain", () => {
      const result = calculator.calculate(`value = 5 km
value to m to cm to mm to m to km`);
      expect(result.results[1].result).toBe("5 km");
    });

    it("should chain temperature conversions", () => {
      const result = calculator.calculate("0 °C to °F to K");
      // 0°C = 32°F = 273.15K
      expect(result.results[0].result).toBe("273.15 K");
    });

    it("should chain time unit conversions", () => {
      const result = calculator.calculate(
        "1 day to hours to minutes to seconds",
      );
      expect(result.results[0].result).toBe("86 400 s"); // seconds
    });
  });

  describe("Precision Specifications", () => {
    it("should convert to N decimals", () => {
      const result = calculator.calculate(`pi to 2 decimals
pi to 5 decimals
1/3 to 4 decimals`);
      expect(result.results[0].result).toBe("3.14");
      expect(result.results[1].result).toBe("3.14159");
      expect(result.results[2].result).toBe("0.3333");
    });

    it("should convert to N significant figures", () => {
      const result = calculator.calculate(`123.456 to 3 sig figs
0.00123456 to 3 sig figs
1234567 to 3 sig figs
10 km to 3 sig figs
10 km/h to 3 sig figs
10 ft 5 in to 3 sig figs`);
      expect(result.results[0].result).toBe("123");
      expect(result.results[1].result).toContain("0.00123");
      expect(result.results[2].result).toContain("1 230 000");
      expect(result.results[3].result).toBe("10.0 km");
      expect(result.results[4].result).toBe("10.0 km/h");
      expect(result.results[5].result).toContain("10.0 ft 5.00 in");
    });

    it("should combine unit conversion with decimal specification", () => {
      const result = calculator.calculate("1 km to m to 0 decimals");
      expect(result.results[0].result).toBe("1 000 m");
    });

    it("should combine unit conversion with sig fig specification", () => {
      const result = calculator.calculate("123.456 m to cm to 4 sig figs");
      expect(result.results[0].result).toContain("12 350"); // or 1.235e4
      expect(result.results[0].result).toContain("cm");
    });
  });

  describe("Conversion Ambiguity Resolution", () => {
    it("should resolve ambiguous conversion path", () => {
      // When multiple conversion paths exist, choose the most direct
      const result = calculator.calculate("5 km to m in cm");
      // Should resolve to converting 5 km to (m in cm)
      expect(result.results[0].result).toBe("5 000 m 0 in 0 cm");
    });

    it("should handle conversion with intermediate units", () => {
      const result = calculator.calculate("10 ft to m to cm");
      // 10 ft → meters → centimeters
      expect(result.results[0].result).toBe("304.8 cm");
    });

    it("should disambiguate per vs division in conversions", () => {
      const result = calculator.calculate(`60 km per h
60 km / h
60 km / h to m per h`);
      expect(result.results[0].result).toBe("60 km/h");
      expect(result.results[1].result).toBe("60 km/h");
      expect(result.results[2].result).toBe("60 000 m/h"); // 60km = 60000m
    });

    it('should parse "10 in in cm" as 10 inches to cm', () => {
      // Critical parser test: unit "in" followed by keyword "in"
      // Should parse as: 10(value) in(unit) in(keyword) cm(unit)
      const result = calculator.calculate("10 in in cm");
      // 10 inches = 25.4 cm
      expect(result.results[0].result).toBe("25.4 cm");
    });

    it('should parse "10 cm in in" as 10 cm to inches', () => {
      // Critical parser test: reverse case
      // Should parse as: 10(value) cm(unit) in(keyword) in(unit)
      const result = calculator.calculate("10 cm in in");
      // 10 cm ≈ 3.937 inches
      expect(result.results[0].result).toMatch(/3.937\d* in/);
    });

    it('should handle "5 ft in in" as 5 feet to inches', () => {
      // Another disambiguation test
      const result = calculator.calculate("5 ft in in");
      // 5 ft = 60 inches
      expect(result.results[0].result).toBe("60 in");
    });
  });

  describe("Fractional Base Conversions", () => {
    it("should handle fractional values in different bases", () => {
      const result = calculator.calculate(`0.5 to binary
0.25 to binary
0.75 to binary`);
      expect(result.results[0].result).toBe("0b0.1"); // 0.5 = 0.1 in binary
      expect(result.results[1].result).toBe("0b0.01"); // 0.25 = 0.01 in binary
      expect(result.results[2].result).toBe("0b0.11"); // 0.75 = 0.11 in binary
    });

    it("should convert 0.1 to hexadecimal with repeating pattern", () => {
      // Exact spec example: 0.1 to hexadecimal → 0x0.1999999999999A
      const result = calculator.calculate("0.1 to hexadecimal");
      // 0.1 in hex is 0.199999... (repeating)
      expect(result.results[0].result).toMatch(/0x0\.19+/);
    });

    it("should handle repeating decimals in base conversion", () => {
      const result = calculator.calculate("1/3 to binary");
      // 1/3 in binary is repeating: 0.010101...
      expect(result.results[0].result).toMatch(/0b0\.0101(01)+/);
    });

    it("should convert between arbitrary bases with fractions", () => {
      const result = calculator.calculate(`A.8 base 16
A.8 base 16 to decimal
0xA
0xA.8`);
      expect(result.results[0].result).toBe("10.5");
      expect(result.results[1].result).toBe("10.5");
      expect(result.results[2].result).toBe("10");
      expect(result.results[3].result).toBe("10.5");
    });

    describe("Base conversion variants", () => {
      const cases = Object.entries({
        "1": "1",
        A: "10",
        "1A": "26",
        A1: "161",
        "1A1": "417",
      }).flatMap(([hexDecimal, decDecimal]) =>
        Object.entries({
          "": "",
          ".8": ".5",
          ".C": ".75",
          ".8C": ".546875",
          ".C8": ".78125",
        }).flatMap(([hexFraction, decFraction]) =>
          ["", " to decimal", " to dec", " to base 10"].flatMap(
            (conversion) => [
              [
                `${hexDecimal}${hexFraction} base 16${conversion}`,
                `${decDecimal}${decFraction}`,
              ],
              [
                `0x${hexDecimal}${hexFraction}${conversion}`,
                `${decDecimal}${decFraction}`,
              ],
            ],
          ),
        ),
      );

      it.each(cases)('should convert "%s" to "%s"', (input, expected) => {
        const result = calculator.calculate(input);
        expect(result.results[0].result).toBe(expected);
      });
    });

    it("should convert between bases", () => {
      const result = calculator.calculate(`A.8 base 16
A.8 base 16 to decimal
0xA.8`);
      expect(result.results[0].result).toBe("10.5");
      expect(result.results[1].result).toBe("10.5");
      expect(result.results[2].result).toBe("10.5");
    });

    it("should handle base conversion precision limits", () => {
      const result = calculator.calculate("1/7 to binary");
      // 1/7 is a repeating fraction in binary
      expect(result.results[0].result).toMatch(/0b0\.001001\d+/);
    });
  });

  describe("Arbitrary Base Conversions", () => {
    it("should convert between non-standard bases", () => {
      const result = calculator.calculate(`ABC base 14 to base 18
123 base 7 to base 9
ZZ base 36 to base 10`);
      expect(result.results[0].result).toBe("6A2 (base 18)");
      expect(result.results[1].result).toBe("73 (base 9)");
      expect(result.results[2].result).toBe("1 295");
    });

    it("should handle base 36 alphabet", () => {
      const result = calculator.calculate(`HELLO base 36 to decimal
123ABC base 36 to decimal`);
      // Base 36 uses 0-9 and A-Z
      expect(result.results[0].result).toBe("29 234 652");
      expect(result.results[0].hasError).toBe(false);
      expect(result.results[1].result).toBe("63 978 744");
      expect(result.results[1].hasError).toBe(false);
    });

    it("should validate base ranges", () => {
      const result = calculator.calculate(`ABC base 10 to base 16
23 base 2 to base 10`);
      expect(result.results[0].hasError).toBe(true); // A, B, C not valid in base 10
      expect(result.results[1].hasError).toBe(true); // 2, 3 not valid in base 2
    });
  });

  describe("Complex Unit Conversion Chains", () => {
    it("should convert derived units through multiple steps", () => {
      const result = calculator.calculate("60 km/h to m/s");
      // 60 km/h = 16.666... m/s
      expect(result.results[0].result).toMatch(/16\.66\d* m\/s/);
    });

    it("should convert area units through chains", () => {
      const result = calculator.calculate("1 km² to m² to cm²");
      // 1 km² = 1,000,000 m² = 10,000,000,000 cm²
      expect(result.results[0].result).toBe("10 000 000 000 cm²");
    });

    it("should convert volume units with density", () => {
      const result = calculator.calculate("1 L to mL to cm³");
      // 1 L = 1000 mL = 1000 cm³
      expect(result.results[0].result).toBe("1 000 cm³");
    });

    it("should convert energy units through chains", () => {
      const result = calculator.calculate("1 kJ to J to cal");
      // 1 kJ = 1000 J = ~239 cal
      expect(result.results[0].result).toMatch(/0\.239\d* kcal/);
    });
  });

  describe("Conversion with Composite Units", () => {
    it("should convert composite length units", () => {
      const result = calculator.calculate("5 ft 6 in to cm");
      // 5 ft 6 in = 167.64 cm
      expect(result.results[0].result).toMatch(/167\.64\d* cm/);
    });

    it("should convert composite time units", () => {
      const result = calculator.calculate("2 hr 30 min to minutes");
      expect(result.results[0].result).toContain("150 min");
    });

    it("should preserve composite units when appropriate", () => {
      const result = calculator.calculate("100 cm to m cm");
      // 100 cm = 1 m 0 cm
      expect(result.results[0].result).toContain("1 m 0 cm");
    });
  });

  describe("Conversion Edge Cases", () => {
    it("should handle zero in conversions", () => {
      const result = calculator.calculate(`0 m to km
0 °C to °F
0 to binary`);
      expect(result.results[0].result).toBe("0 km");
      expect(result.results[1].result).toBe("32°F");
      expect(result.results[2].result).toBe("0b0");
    });

    it("should handle negative values in conversions", () => {
      const result = calculator.calculate(`-10 m to cm
-40 °C to °F
-5 to binary`);
      expect(result.results[0].result).toBe("-1 000 cm");
      expect(result.results[1].result).toBe("-40°F");
      expect(result.results[2].result).toBe("0b-101");
    });

    it("should handle very large numbers in conversions", () => {
      const result = calculator.calculate("1000000 m to km");
      expect(result.results[0].result).toBe("1 000 km");
    });

    it("should handle very small numbers in conversions", () => {
      const result = calculator.calculate("0.000001 m to μm");
      expect(result.results[0].result).toBe("1 μm");
    });
  });

  describe("Conversion with Expressions", () => {
    it("should convert results of expressions", () => {
      const result = calculator.calculate("5 m + 3 m to ft");
      expect(result.results[0].result).toMatch(/26.24\d* ft/);
    });

    it("should convert within expression", () => {
      const result = calculator.calculate("(5 km to m) + 100 m");
      expect(result.results[0].result).toBe("5 100 m");
    });

    it("should chain conversions in expressions", () => {
      const result = calculator.calculate("(10 m to cm) to mm");
      expect(result.results[0].result).toBe("10 000 mm");
    });
  });

  describe("Invalid Conversion Attempts", () => {
    it("should reject dimension-incompatible conversions", () => {
      const result = calculator.calculate("5 m to kg");
      expect(result.results[0].hasError).toBe(true);
    });

    it("should reject converting time to length", () => {
      const result = calculator.calculate("5 seconds to meters");
      expect(result.results[0].hasError).toBe(true);
    });

    it("should reject temperature to length", () => {
      const result = calculator.calculate("25 °C to meters");
      expect(result.results[0].hasError).toBe(true);
    });

    it("should reject invalid base conversions", () => {
      const result = calculator.calculate(`123 base 50 to decimal
ABC base 1 to decimal
ZZZ base 2 to decimal`);
      expect(result.results[0].hasError).toBe(true); // base > 36
      expect(result.results[1].hasError).toBe(true); // base < 2
      expect(result.results[2].hasError).toBe(true); // Z not valid in base 2
    });
  });

  describe("Conversion with Variables", () => {
    it("should convert variables", () => {
      const result = calculator.calculate(`distance = 1000 m
distance to km`);
      expect(result.results[1].result).toBe("1 km");
    });

    it("should chain convert variables", () => {
      const result = calculator.calculate(`length = 100 cm
length to m to ft`);
      expect(result.results[1].result).toMatch(/3\.28\d* ft/);
    });

    it("should convert derived unit variables", () => {
      const result = calculator.calculate(`speed = 100 km/h
speed to m/s`);
      expect(result.results[1].result).toMatch(/27\.77\d* m\/s/);
    });
  });

  describe("Implicit vs Explicit Conversions", () => {
    it("should handle implicit conversion in arithmetic", () => {
      const result = calculator.calculate("1 km + 500 m");
      // Should auto-convert to common unit
      expect(result.results[0].result).toBe("1.5 km");
    });

    it("should handle explicit conversion override", () => {
      const result = calculator.calculate("(1 km + 500 m) to m");
      expect(result.results[0].result).toBe("1 500 m");
    });

    it("should prioritize explicit over implicit", () => {
      const result = calculator.calculate("1000 m + 1 km to cm");
      // Should convert final result to cm
      expect(result.results[0].result).toBe("200 000 cm");
    });
  });
});

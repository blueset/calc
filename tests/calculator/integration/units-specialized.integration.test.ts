import { describe, it, expect, beforeAll } from "vitest";
import { Calculator } from "../../../src/calculator/calculator";
import { DataLoader } from "../../../src/calculator/data-loader";

/**
 * Integration tests for specialized units
 * Tests current (ampere), luminous intensity (candela), and printing/display units
 * Spec lines: 457-477
 */
describe("Integration Tests - Specialized Units", () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();

    calculator = new Calculator(dataLoader, {}); // Use Nearley parser
  });

  describe("Current Units (Ampere)", () => {
    it("should handle amperes", () => {
      const result = calculator.calculate(`10 A
10 ampere
10 amperes`);
      expect(result.results[0].result).toBe("10 A");
      expect(result.results[1].result).toBe("10 A");
      expect(result.results[2].result).toBe("10 A");
    });

    it("should handle SI prefixes for amperes", () => {
      const result = calculator.calculate(`1 mA
1 μA
1 kA
1 MA`);
      expect(result.results[0].result).toBe("1 mA");
      expect(result.results[1].result).toBe("1 μA");
      expect(result.results[2].result).toBe("1 kA");
      expect(result.results[3].result).toBe("1 MA");
    });

    it("should handle milliamperes variations", () => {
      const result = calculator.calculate(`100 milliampere
100 milliamperes`);
      expect(result.results[0].result).toBe("100 mA");
      expect(result.results[1].result).toBe("100 mA");
    });
  });

  describe("Luminous Intensity Units (Candela)", () => {
    it("should handle candelas", () => {
      const result = calculator.calculate(`10 cd
10 candela
10 candelas`);
      expect(result.results[0].result).toBe("10 cd");
      expect(result.results[1].result).toBe("10 cd");
      expect(result.results[2].result).toBe("10 cd");
    });

    it("should handle SI prefixes for candelas", () => {
      const result = calculator.calculate(`1 mcd
1 kcd`);
      expect(result.results[0].result).toBe("1 mcd");
      expect(result.results[1].result).toBe("1 kcd");
    });
  });

  describe("Printing and Display Units", () => {
    it("should handle dots", () => {
      const result = calculator.calculate(`1 dot
100 dots`);
      expect(result.results[0].result).toBe("1 dot");
      expect(result.results[1].result).toBe("100 dot");
    });

    it("should handle dpi (dots per inch)", () => {
      const result = calculator.calculate("320 dpi\n320 dpi * 2 inches");
      expect(result.results[0].result).toBe("320 dpi");
      expect(result.results[1].result).toBe("640 dot");
    });

    it("should handle pixel-related units", () => {
      const result = calculator.calculate(`1920 pixel
1920 px`);
      expect(result.results[0].result).toBe("1 920 px");
      expect(result.results[1].result).toBe("1 920 px");
    });
  });

  describe("Electrical Units", () => {
    it("should handle volts", () => {
      const result = calculator.calculate(`12 V
12 volt
12 volts`);
      expect(result.results[0].result).toBe("12 V");
      expect(result.results[1].result).toBe("12 V");
      expect(result.results[2].result).toBe("12 V");
    });

    it("should handle SI prefixes for volts", () => {
      const result = calculator.calculate(`1 mV
1 kV
1 MV`);
      expect(result.results[0].result).toBe("1 mV");
      expect(result.results[1].result).toBe("1 kV");
      expect(result.results[2].result).toBe("1 MV");
    });

    it("should handle ohms", () => {
      const result = calculator.calculate(`100 Ω
100 ohm
100 ohms`);
      expect(result.results[0].result).toBe("100 Ω");
      expect(result.results[1].result).toBe("100 Ω");
      expect(result.results[2].result).toBe("100 Ω");
    });

    it("should handle SI prefixes for ohms", () => {
      const result = calculator.calculate(`1 kΩ
1 MΩ`);
      expect(result.results[0].result).toBe("1 kΩ");
      expect(result.results[1].result).toBe("1 MΩ");
    });

    it("should handle watts for power", () => {
      const result = calculator.calculate(`100 W
100 watt
100 watts`);
      expect(result.results[0].result).toBe("100 W");
      expect(result.results[1].result).toBe("100 W");
      expect(result.results[2].result).toBe("100 W");
    });

    it("should handle SI prefixes for watts", () => {
      const result = calculator.calculate(`1 mW
1 kW
1 MW
1 GW`);
      expect(result.results[0].result).toBe("1 mW");
      expect(result.results[1].result).toBe("1 kW");
      expect(result.results[2].result).toBe("1 MW");
      expect(result.results[3].result).toBe("1 GW");
    });
  });

  describe("Digital Storage Units", () => {
    it("should handle bits", () => {
      const result = calculator.calculate(`8 bit
8 bits
8 b`);
      expect(result.results[0].result).toBe("8 b");
      expect(result.results[1].result).toBe("8 b");
      expect(result.results[2].result).toBe("8 b");
    });

    it("should handle bytes", () => {
      const result = calculator.calculate(`1 byte
1 B`);
      expect(result.results[0].result).toBe("1 B");
      expect(result.results[1].result).toBe("1 B");
    });

    it("should handle binary prefixes for bytes", () => {
      const result = calculator.calculate(`1 KB
1 MB
1 GB
1 TB
1 PB`);
      expect(result.results[0].result).toBe("1 kB");
      expect(result.results[1].result).toBe("1 MB");
      expect(result.results[2].result).toBe("1 GB");
      expect(result.results[3].result).toBe("1 TB");
      expect(result.results[4].result).toBe("1 PB");
    });

    it("should handle IEC binary prefixes", () => {
      const result = calculator.calculate(`1 KiB
1 MiB
1 GiB
1 TiB`);
      expect(result.results[0].result).toBe("1 KiB");
      expect(result.results[1].result).toBe("1 MiB");
      expect(result.results[2].result).toBe("1 GiB");
      expect(result.results[3].result).toBe("1 TiB");
    });
  });

  describe("Angle Units", () => {
    it("should handle degrees", () => {
      const result = calculator.calculate(`90 degrees
90 deg
90 °
90°`);
      expect(result.results[0].result).toBe("90°");
      expect(result.results[1].result).toBe("90°");
      expect(result.results[2].result).toBe("90°");
      expect(result.results[3].result).toBe("90°");
    });

    it("should handle radians", () => {
      const result = calculator.calculate(`1 radian
1 rad`);
      expect(result.results[0].result).toBe("1 rad");
      expect(result.results[1].result).toBe("1 rad");
    });

    it("should handle arcminutes and arcseconds", () => {
      const result = calculator.calculate(`1 arcminute
1 arcsecond`);
      expect(result.results[0].result).toBe("1′");
      expect(result.results[1].result).toBe("1″");
    });

    it("should handle arcminutes and arcseconds after degree symbol", () => {
      // After degree symbol, prime and double prime are arcminutes/arcseconds
      const result = calculator.calculate(`10° 30' 15"`);
      // This should be interpreted as 10 degrees, 30 arcminutes, 15 arcseconds
      expect(result.results[0].result).toBe("10° 30′ 15″");
    });

    it("should handle prime symbols as arcminutes/arcseconds after degree", () => {
      const result = calculator.calculate(`45° 30′ 0″`);
      expect(result.results[0].result).toBe("45° 30′ 0″");
    });

    it("should distinguish angle notation from length notation", () => {
      // Without degree symbol, should be feet and inches
      const result = calculator.calculate(`5' 10"`);
      expect(result.results[0].result).toBe("5 ft 10 in");
    });

    it("should handle degrees, minutes, seconds conversion", () => {
      // DMS format
      const result = calculator.calculate(`1° 0' 0"
0° 60' 0"
0° 0' 3600"`);
      // All should be equivalent angles
      expect(result.results[0].result).toBe("1° 0′ 0″");
      expect(result.results[1].result).toBe("0° 60′ 0″");
      expect(result.results[2].result).toBe("0° 0′ 3 600″");
    });
  });

  describe("Composite Specialized Units", () => {
    it("should handle volt-amperes", () => {
      const result = calculator.calculate("100 V A");
      expect(result.results[0].result).toBe("100 V A");
    });

    it("should handle ampere-hours", () => {
      const result = calculator.calculate("10 A h");
      expect(result.results[0].result).toBe("10 A h");
    });

    it("should handle watt-hours", () => {
      const result = calculator.calculate("100 W h");
      expect(result.results[0].result).toBe("100 W h");
    });

    it("should handle kilowatt-hour variations", () => {
      const result = calculator.calculate(`1 kWh
1 kilowatt hour
1 kW h
1 Wh
1 watt hour`);
      // All should be recognized as watt-hours (energy unit)
      expect(result.results[0].result).toMatch(/1 (kWh|kW h)/);
      expect(result.results[1].result).toMatch(/1 (kWh|kW h)/);
      expect(result.results[2].result).toMatch(/1 (kWh|kW h)/);
      expect(result.results[3].result).toMatch(/1 (Wh|W h)/);
      expect(result.results[4].result).toMatch(/1 (Wh|W h)/);
    });
  });
});

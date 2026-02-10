import { describe, it, expect, beforeAll } from "vitest";
import { Calculator } from "../../../src/calculator/calculator";
import { DataLoader } from "../../../src/calculator/data-loader";

/**
 * Integration tests for currency units and operations
 * Tests the full pipeline: Lexer → Parser → Evaluator → Formatter
 */
describe("Integration Tests - Currency", () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();

    calculator = new Calculator(dataLoader, {}); // Use Nearley parser

    // Load mock exchange rates for currency tests
    const mockExchangeRates = {
      date: "2024-01-01",
      usd: {
        eur: 0.85,
        gbp: 0.73,
        jpy: 110.0,
        hkd: 7.8,
        cad: 1.25,
        inr: 74.0,
      },
    };
    calculator.loadExchangeRates(mockExchangeRates);
  });

  describe("Currency Units", () => {
    it("should handle currency ISO codes", () => {
      const result = calculator.calculate(`100 USD
100 EUR
100 JPY
100 HKD`);
      expect(result.results[0].result).toContain("USD");
      expect(result.results[1].result).toContain("EUR");
      expect(result.results[2].result).toContain("JPY");
      expect(result.results[3].result).toContain("HKD");
    });

    it("should handle currency names", () => {
      const result = calculator.calculate(`100 US Dollars
100 euros # case insensitive
100 japanese Yen
100 hong kong dollars`);
      expect(result.results[0].result).toContain("USD");
      expect(result.results[1].result).toContain("EUR");
      expect(result.results[2].result).toContain("JPY");
      expect(result.results[3].result).toContain("HKD");
    });

    it("should handle unambiguous currency symbols", () => {
      const result = calculator.calculate(`US$100
€100
CA$100
₹100`);
      expect(result.results[0].result).toContain("USD");
      expect(result.results[1].result).toContain("EUR");
      expect(result.results[2].result).toContain("CAD");
      expect(result.results[3].result).toContain("INR");
    });
  });

  describe("Currency Arithmetic", () => {
    it("should add same currencies", () => {
      const result = calculator.calculate("100 USD + 50 USD");
      // With currency-specific formatting, USD shows 2 decimal places
      expect(result.results[0].result).toBe("150.00 USD");
    });

    it("should add different currencies with automatic conversion", () => {
      // With Option A, currencies work like regular units with automatic conversion
      const result = calculator.calculate("100 USD + 50 EUR");
      expect(result.errors.runtime.length).toBe(0);
      // Rate: 1 USD = 0.85 EUR, so 1 EUR = 1/0.85 ≈ 1.176 USD
      // 50 EUR ≈ 58.82 USD, so 100 + 58.82 ≈ 158.82 USD
      expect(result.results[0].result).toBe("158.82 USD");
    });

    it("should allow same ambiguous currency arithmetic", () => {
      const result = calculator.calculate("$10 + $5");
      expect(result.results[0].result).toBe("$15.00");
      // Symbol should display as '$' not 'currency_symbol_0024'
      expect(result.results[0].result).not.toContain("currency_symbol");
    });

    it("should error on different ambiguous currency arithmetic", () => {
      const result = calculator.calculate("$10 + £5");
      expect(result.errors.runtime.length).toBeGreaterThan(0);
    });
  });

  describe("Currency Conversions", () => {
    // Basic Conversions
    it("should convert between currencies", () => {
      const result = calculator.calculate("100 USD to EUR");
      // 100 USD * 0.85 = 85 EUR
      expect(result.results[0].result).toBe("85.00 EUR");
    });

    it("should convert from EUR to USD", () => {
      const result = calculator.calculate("100 EUR to USD");
      // 100 EUR / 0.85 ≈ 117.65 USD
      expect(result.results[0].result).toBe("117.65 USD");
    });

    it("should handle zero amount conversion", () => {
      const result = calculator.calculate("0 USD to EUR");
      expect(result.results[0].result).toBe("0.00 EUR");
    });

    it("should handle negative currency conversion", () => {
      const result = calculator.calculate("-50 USD to EUR");
      expect(result.results[0].result).toBe("-42.50 EUR");
    });

    it("should convert through base currency", () => {
      const result = calculator.calculate("100 EUR to GBP");
      // EUR→USD→GBP: 100/0.85*0.73 ≈ 85.88 GBP
      expect(result.results[0].result).toBe("85.88 GBP");
    });

    it("should convert JPY with 0 decimals", () => {
      const result = calculator.calculate("1000 USD to JPY");
      // 1000 USD * 110 = 110000 JPY (0 decimals - no decimal point shown)
      expect(result.results[0].result).toBe("110 000 JPY");
    });

    it("should convert to JPY and round to integer", () => {
      const result = calculator.calculate("10.5 USD to JPY");
      // 10.5 USD * 110 = 1155 JPY (rounded to integer)
      expect(result.results[0].result).toBe("1 155 JPY");
    });

    it("should handle JPY (0 decimals) formatting", () => {
      const result = calculator.calculate("1000 JPY");
      // JPY has 0 decimal places - no decimal point shown
      expect(result.results[0].result).toBe("1 000 JPY");
      expect(result.results[0].result).not.toContain(".");
    });
  });

  describe("ISO 4217 Minor Units (Decimal Places)", () => {
    beforeAll(() => {
      // Add exchange rates for 3-decimal currencies
      const mockExchangeRates = {
        date: "2024-01-01",
        usd: {
          eur: 0.85,
          gbp: 0.73,
          jpy: 110.0,
          hkd: 7.8,
          cad: 1.25,
          inr: 74.0,
          kwd: 0.3, // Kuwaiti Dinar
          bhd: 0.38, // Bahraini Dinar
          omr: 0.38, // Omani Rial
          tnd: 3.1, // Tunisian Dinar
          krw: 1200, // South Korean Won (0 decimals)
          vnd: 23000, // Vietnamese Dong (0 decimals)
        },
      };
      calculator.loadExchangeRates(mockExchangeRates);
    });

    it("should handle KWD with 3 decimal places", () => {
      // Kuwaiti Dinar: 3 decimal places
      const result = calculator.calculate("10 KWD");
      expect(result.results[0].result).toBe("10.000 KWD");
    });

    it("should handle BHD with 3 decimal places", () => {
      // Bahraini Dinar: 3 decimal places
      const result = calculator.calculate("10 BHD");
      expect(result.results[0].result).toBe("10.000 BHD");
    });

    it("should handle OMR with 3 decimal places", () => {
      // Omani Rial: 3 decimal places
      const result = calculator.calculate("10 OMR");
      expect(result.results[0].result).toBe("10.000 OMR");
    });

    it("should handle TND with 3 decimal places", () => {
      // Tunisian Dinar: 3 decimal places
      const result = calculator.calculate("10 TND");
      expect(result.results[0].result).toBe("10.000 TND");
    });

    it("should convert to KWD and maintain 3 decimal precision", () => {
      const result = calculator.calculate("100 USD to KWD");
      // 100 USD * 0.30 = 30 KWD
      expect(result.results[0].result).toBe("30.000 KWD");
    });

    it("should convert fractional amounts to 3-decimal currencies", () => {
      const result = calculator.calculate("10.5 USD to BHD");
      // 10.5 USD * 0.38 = 3.99 BHD → 3.990 BHD
      expect(result.results[0].result).toBe("3.990 BHD");
    });

    it("should handle KRW with 0 decimal places", () => {
      // South Korean Won: 0 decimal places
      const result = calculator.calculate("10000 KRW");
      expect(result.results[0].result).toBe("10 000 KRW");
    });

    it("should handle VND with 0 decimal places", () => {
      // Vietnamese Dong: 0 decimal places
      const result = calculator.calculate("100000 VND");
      expect(result.results[0].result).toBe("100 000 VND");
    });

    it("should convert to KRW and round to integer", () => {
      const result = calculator.calculate("10 USD to KRW");
      // 10 USD * 1200 = 12000 KRW (0 decimals)
      expect(result.results[0].result).toBe("12 000 KRW");
    });

    // Ambiguous Currency Errors
    it("should error on ambiguous currency conversion", () => {
      const result = calculator.calculate("$100 to EUR");
      // Ambiguous currencies cannot be converted
      expect(
        result.results[0].hasError || result.errors.runtime.length > 0,
      ).toBe(true);
    });

    it("should error converting between ambiguous currencies", () => {
      const result = calculator.calculate("$100 to £");
      // Cannot convert between different ambiguous currencies
      expect(
        result.results[0].hasError || result.errors.runtime.length > 0,
      ).toBe(true);
    });

    // Derived Units with Currencies
    it("should handle currency in derived units", () => {
      const result = calculator.calculate("50 USD/hour");
      expect(result.results[0].result).toBe("50.00 USD/h");
    });

    it("should convert derived units with currencies", () => {
      const result = calculator.calculate("50 USD/hour to EUR/day");
      // 50 USD/hour = 50*0.85 EUR/hour = 42.50 EUR/hour
      // 42.50 EUR/hour = 42.5*24 EUR/day = 1020 EUR/day
      expect(result.results[0].result).toBe("1 020.00 EUR/day");
    });

    it("should convert currency per area", () => {
      const result = calculator.calculate("100 USD/m^2 to EUR/ft^2");
      // Converts both currency and area
      // 100 USD/m² → 85 EUR/m² → 7.90 EUR/ft²
      expect(result.results[0].result).toBe("7.90 EUR/ft²");
    });

    it("should error on ambiguous currency in derived units", () => {
      const result = calculator.calculate("$50/hour to EUR/day");
      // Ambiguous currencies in conversions should error
      expect(
        result.results[0].hasError || result.errors.runtime.length > 0,
      ).toBe(true);
    });

    // Complex Arithmetic
    it("should handle currency arithmetic then conversion", () => {
      const result = calculator.calculate("(100 USD + 50 USD) to EUR");
      // 150 USD * 0.85 = 127.5 EUR
      expect(result.results[0].result).toBe("127.50 EUR");
    });

    it("should handle mixed currency arithmetic with conversion", () => {
      const result = calculator.calculate("100 USD + 50 EUR to GBP");
      // 100 USD + 50 EUR = 100 USD + 58.82 USD = 158.82 USD
      // 158.82 USD * 0.73 = 115.94 GBP
      expect(result.results[0].result).toBe("115.94 GBP");
    });

    it("should handle currency multiplication", () => {
      const result = calculator.calculate("50 USD * 2 to EUR");
      // 100 USD * 0.85 = 85 EUR
      expect(result.results[0].result).toBe("85.00 EUR");
    });

    it("should handle large currency amounts", () => {
      const result = calculator.calculate("1000000000 USD to EUR");
      expect(result.results[0].result).toBe("850 000 000.00 EUR");
    });

    it("should handle very small currency amounts", () => {
      const result = calculator.calculate("0.01 USD to JPY");
      // 0.01 USD * 110 = 1.1 JPY → rounds to 1 or 2 JPY (0 decimals)
      expect(result.results[0].result).toBe("1 JPY");
    });

    it("should handle currency division", () => {
      const result = calculator.calculate("100 USD / 2");
      expect(result.results[0].result).toBe("50.00 USD");
    });

    it("should handle complex currency expression", () => {
      const result = calculator.calculate("(100 USD + 50 USD) * 2 - 200 USD");
      // (150) * 2 - 200 = 300 - 200 = 100
      expect(result.results[0].result).toBe("100.00 USD");
    });

    it("should maintain precision in currency chain conversion", () => {
      const result = calculator.calculate("100 USD to EUR to GBP to USD");
      expect(result.results[0].result).toBe("100.00 USD");
    });

    it("should handle currency with percentage", () => {
      const result = calculator.calculate("100 USD * 20%");
      expect(result.results[0].result).toBe("20.00 USD");
    });

    it("should convert currency with percentage calculation", () => {
      const result = calculator.calculate("(100 USD * 1.15) to EUR");
      // 115 USD * 0.85 = 97.75 EUR
      expect(result.results[0].result).toBe("97.75 EUR");
    });
  });
});

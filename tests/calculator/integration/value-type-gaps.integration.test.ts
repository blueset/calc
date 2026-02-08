import { describe, it, expect, beforeAll } from "vitest";
import { Calculator } from "../../../src/calculator/calculator";
import { DataLoader } from "../../../src/calculator/data-loader";

/**
 * Integration tests for value type processing gaps:
 * Gap E: Duration * N, Duration / N
 * Gap F: Duration comparison
 * Gap G: Duration → composite target conversion
 * Gap H: ISO 8601/RFC 9557 formatting for Duration and time values
 * Gap B: Unit-preserving functions for CompositeUnitValue
 */
describe("Integration Tests - Value Type Processing Gaps", () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();
    calculator = new Calculator(dataLoader, {});
  });

  describe("Gap E: Duration arithmetic (Duration * N, Duration / N)", () => {
    it("should multiply a date-subtraction duration by an integer", () => {
      // (date - date) produces a Duration; multiply by integer scales each field
      const result = calculator.calculate(
        "d = 1970 Jan 3 - 1970 Jan 1\nd * 3",
      );
      // 2 days * 3 = 6 days
      expect(result.results[1].result).toBe("6 day");
    });

    it("should support N * Duration (commutative)", () => {
      const result = calculator.calculate(
        "d = 1970 Jan 3 - 1970 Jan 1\n2 * d",
      );
      // 2 * 2 days = 4 days
      expect(result.results[1].result).toBe("4 day");
    });

    it("should divide a date-subtraction duration by a number", () => {
      const result = calculator.calculate(
        "d = 1970 Jan 3 - 1970 Jan 1\nd / 2",
      );
      // 2 days / 2 = 1 day
      expect(result.results[1].result).toBe("1 day");
    });

    it("should handle Duration / Duration as a ratio", () => {
      const result = calculator.calculate(
        "a = 1970 Jan 5 - 1970 Jan 1\nb = 1970 Jan 3 - 1970 Jan 1\na / b",
      );
      // 4 days / 2 days = 2
      expect(result.results[2].result).toBe("2");
    });

    it("should handle fractional scaling of duration", () => {
      const result = calculator.calculate(
        "d = 1970 Jan 2 - 1970 Jan 1\nd * 0.5",
      );
      // 1 day * 0.5 = 12 hours
      expect(result.results[1].result).toBe("12 h");
    });

    it("should return division by zero error", () => {
      const result = calculator.calculate(
        "d = 1970 Jan 3 - 1970 Jan 1\nd / 0",
      );
      expect(result.results[1].result).toContain("Error");
    });
  });

  describe("Gap F: Duration comparison", () => {
    it("should compare two durations with >", () => {
      const result = calculator.calculate(
        "a = 1970 Jan 5 - 1970 Jan 1\nb = 1970 Jan 3 - 1970 Jan 1\na > b",
      );
      // 4 days > 2 days → true
      expect(result.results[2].result).toBe("true");
    });

    it("should compare two durations with <", () => {
      const result = calculator.calculate(
        "a = 1970 Jan 3 - 1970 Jan 1\nb = 1970 Jan 5 - 1970 Jan 1\na < b",
      );
      // 2 days < 4 days → true
      expect(result.results[2].result).toBe("true");
    });

    it("should compare two durations with ==", () => {
      const result = calculator.calculate(
        "a = 1970 Jan 3 - 1970 Jan 1\nb = 1970 Jan 3 - 1970 Jan 1\na == b",
      );
      // 2 days == 2 days → true
      expect(result.results[2].result).toBe("true");
    });

    it("should compare duration with time-unit numeric value", () => {
      // Duration vs NumericValue-with-time-unit (cross-type)
      const result = calculator.calculate(
        "d = 1970 Jan 2 - 1970 Jan 1\nd > 12 hours",
      );
      // 1 day > 12 hours → true
      expect(result.results[1].result).toBe("true");
    });

    it("should compare duration with time-unit numeric value (equal)", () => {
      const result = calculator.calculate(
        "d = 1970 Jan 2 - 1970 Jan 1\nd == 24 hours",
      );
      // 1 day == 24 hours → true
      expect(result.results[1].result).toBe("true");
    });
  });

  describe("Gap G: Duration → composite target conversion", () => {
    it("should convert duration to composite time units (hours minutes)", () => {
      const result = calculator.calculate(
        "d = 1970 Jan 2 14:30 - 1970 Jan 2 10:00\nd to hours minutes",
      );
      // 4 hours 30 minutes
      expect(result.results[1].result).toBe("4 h 30 min");
    });

    it("should convert duration to single time unit", () => {
      const result = calculator.calculate(
        "d = 1970 Jan 3 - 1970 Jan 1\nd to hours",
      );
      // 2 days = 48 hours
      expect(result.results[1].result).toBe("48 h");
    });

    it("should convert duration to days hours minutes", () => {
      const result = calculator.calculate(
        "d = 1970 Jan 2 14:30 - 1970 Jan 1 10:00\nd to days hours minutes",
      );
      // 1 day 4 h 30 min
      expect(result.results[1].result).toBe("1 day 4 h 30 min");
    });
  });

  describe("Gap H: ISO 8601/RFC 9557 formatting for Duration and time values", () => {
    it("should format a DurationValue as ISO 8601", () => {
      const result = calculator.calculate(
        "d = 1970 Jan 2 14:30 - 1970 Jan 2 10:00\nd to ISO 8601",
      );
      // 4 hours 30 minutes → PT4H30M
      expect(result.results[1].result).toBe("PT4H30M");
    });

    it("should format a time NumericValue as ISO 8601", () => {
      const result = calculator.calculate("5 hours to ISO 8601");
      // 5 hours → PT5H
      expect(result.results[0].result).toBe("PT5H");
    });

    it("should format a time CompositeUnitValue as ISO 8601", () => {
      const result = calculator.calculate("2 hours 30 minutes to ISO 8601");
      // 2h 30min → PT2H30M
      expect(result.results[0].result).toBe("PT2H30M");
    });

    it("should format a DurationValue as RFC 9557", () => {
      const result = calculator.calculate(
        "d = 1970 Jan 2 14:30 - 1970 Jan 2 10:00\nd to RFC 9557",
      );
      // RFC 9557 for durations should also use ISO 8601 duration format
      expect(result.results[1].result).toBe("PT4H30M");
    });

    it("should reject RFC 2822 for durations", () => {
      const result = calculator.calculate(
        "d = 1970 Jan 2 14:30 - 1970 Jan 2 10:00\nd to RFC 2822",
      );
      // RFC 2822 has no duration format
      expect(result.results[1].result).toContain("Error");
    });

    it("should reject RFC 2822 for time numeric values", () => {
      const result = calculator.calculate("5 hours to RFC 2822");
      expect(result.results[0].result).toContain("Error");
    });
  });

  describe("Gap B: Unit-preserving functions for CompositeUnitValue", () => {
    it("should apply round to composite unit value", () => {
      // 5 ft 6.7 in = 5.5583... ft → round → 6 ft → 6 ft 0 in
      const result = calculator.calculate("round(5 ft 6.7 in)");
      expect(result.results[0].result).toBe("6 ft 0 in");
    });

    it("should apply floor to composite unit value", () => {
      // 5 ft 6.7 in = 5.5583... ft → floor → 5 ft → 5 ft 0 in
      const result = calculator.calculate("floor(5 ft 6.7 in)");
      expect(result.results[0].result).toBe("5 ft 0 in");
    });

    it("should apply ceil to composite unit value", () => {
      // 5 ft 6.3 in = 5.525 ft → ceil → 6 ft → 6 ft 0 in
      const result = calculator.calculate("ceil(5 ft 6.3 in)");
      expect(result.results[0].result).toBe("6 ft 0 in");
    });

    it("should apply abs to composite unit value", () => {
      const result = calculator.calculate("abs(-(5 ft 6 in))");
      expect(result.results[0].result).toBe("5 ft 6 in");
    });

    it("should apply trunc to composite unit value", () => {
      // 5 ft 6.9 in = 5.575 ft → trunc → 5 ft → 5 ft 0 in
      const result = calculator.calculate("trunc(5 ft 6.9 in)");
      expect(result.results[0].result).toBe("5 ft 0 in");
    });

    it("should apply round to duration (all fields)", () => {
      const result = calculator.calculate("round(2.7 hours)");
      // 2.7 hours rounds to 3 hours
      expect(result.results[0].result).toBe("3 h");
    });

    it("should apply floor to duration", () => {
      const result = calculator.calculate("floor(2.7 hours)");
      expect(result.results[0].result).toBe("2 h");
    });

    it("should apply ceil to duration", () => {
      const result = calculator.calculate("ceil(2.3 hours)");
      expect(result.results[0].result).toBe("3 h");
    });

    it("should apply trunc to duration value from date subtraction", () => {
      const result = calculator.calculate(
        "d = 1970 Jan 2 14:30:45 - 1970 Jan 2 10:00\ntrunc(d)",
      );
      // 4 h 30 min 45 sec → truncate each component → 4 h 30 min 45 sec (all are integers)
      expect(result.results[1].result).toBe("4 h 30 min 45 s");
    });
  });
});

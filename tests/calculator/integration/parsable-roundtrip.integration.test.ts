import { describe, it, expect, beforeAll } from "vitest";
import { Calculator } from "../../../src/calculator/calculator";
import { DataLoader } from "../../../src/calculator/data-loader";
import { createSettings, type Settings } from "../../../src/calculator/settings";
import { serializeParsable } from "../../../src/calculator/parsable-serializer";
import type { Value } from "../../../src/calculator/evaluator";

/**
 * Round-trip identity tests for the parsable copy/paste serializer (issue #2).
 *
 * The core guarantee: the parsable string produced for a value, when parsed and
 * evaluated, yields the same underlying value. Because presentation styles
 * (base/fraction/scientific/...) are emitted as literal forms that evaluate to
 * plain numbers, correctness is asserted at the *value* level via a canonical
 * oracle:
 *
 *   serialize(strip(original)) === serialize(reparsed)
 *
 * where `strip` removes the (display-only) presentation wrapper. Explicit-string
 * tests separately lock down the RESPECT/IGNORE formatting rules.
 */
describe("Integration Tests - Parsable Round-Trip (issue #2)", () => {
  let dataLoader: DataLoader;

  beforeAll(() => {
    dataLoader = new DataLoader();
    dataLoader.load();
  });

  /** Remove the display-only presentation wrapper to reach the real value. */
  function strip(value: Value | null | undefined): Value | null {
    if (!value) return null;
    return value.kind === "presentation" ? value.innerValue : value;
  }

  /** Normalize the non-breaking spaces the formatter uses to plain spaces. */
  function norm(text: string): string {
    return text.replace(/[\u202F\u00A0]/g, " ");
  }

  /**
   * Assert that `input`, once serialized to a parsable string and re-evaluated,
   * yields the same underlying value (value-level round-trip identity).
   */
  function expectRoundTrip(input: string, settings: Partial<Settings> = {}) {
    const calc = new Calculator(dataLoader, settings);
    const first = calc.calculate(input).results[0];
    expect(first, `no result for "${input}"`).toBeTruthy();
    expect(first.hasError, `error evaluating "${input}"`).toBe(false);
    expect(
      first.parsableResult,
      `missing parsable for "${input}"`,
    ).toBeTruthy();

    const full = createSettings(settings);
    const expected = norm(
      serializeParsable(strip(first.rawValue)!, full, dataLoader),
    );

    // Re-evaluate the parsable string; the reparsed value carries no
    // presentation wrapper, so its serialization is the underlying value.
    const second = calc.calculate(first.parsableResult!).results[0];
    expect(second.hasError, `reparse error for "${first.parsableResult}"`).toBe(
      false,
    );
    const actual = norm(
      serializeParsable(strip(second.rawValue)!, full, dataLoader),
    );

    expect(actual, `round-trip mismatch for "${input}"`).toBe(expected);
  }

  /** Return the parsable serialization of `input`'s first result. */
  function parsable(input: string, settings: Partial<Settings> = {}): string {
    const calc = new Calculator(dataLoader, settings);
    const r = calc.calculate(input).results[0];
    return r.parsableResult ?? "";
  }

  // ── Value-level round-trip identity across the full matrix ─────────────

  describe("round-trip identity (value-level)", () => {
    const cases: string[] = [
      // Plain numbers
      "0",
      "42",
      "-5",
      "3.14",
      "1234567.89",
      "1_000_000",
      "0.000123",
      "2.5e3",
      "pi",
      "1 / 3",
      "1 / 7",
      "-3.75",
      // Bases (presentation)
      "255 to hex",
      "10 to binary",
      "255 to octal",
      "513 to base 7",
      "1000 to base 35",
      // Fraction / scientific / percentage / ordinal (presentation)
      "0.75 to fraction",
      "3.75 to fraction",
      "-3.75 to fraction",
      "0.5 to fraction",
      "2500 to scientific",
      "0.5 to percentage",
      "5 to ordinal",
      // Units: simple, derived, compound
      "5 km",
      "5 km/h",
      "9.8 m/s^2",
      "5 ft 3 in",
      "1 kg m/s^2",
      // Currency
      "100 USD",
      "$5",
      // Boolean
      "true",
      "false",
      "1 > 2",
      // Dates / times / datetimes
      "2024-01-31",
      "15:45",
      "3:45 PM",
      "2024-01-31 15:45",
      "2024-01-31 15:45:30",
      // Zoned / instant
      "2024-01-31 15:45 America/New_York",
      "2024-07-01 12:00 UTC+2",
      "1719900000 unix",
      "now",
      // Durations
      "2 hours + 30 minutes",
      "1h 30min",
      "2024-01-03 - 2024-01-01",
    ];

    const settingsVariants: Array<[string, Partial<Settings>]> = [
      ["default", {}],
      ["12-hour time", { timeFormat: "h12" }],
      ["unit names", { unitDisplayStyle: "name" }],
      ["grouping 2-3", { digitGroupingSize: "2-3" }],
      ["grouping off", { digitGroupingSize: "off" }],
      ["time-then-date", { dateTimeFormat: "{time} {date}" }],
      ["comma decimal", { decimalSeparator: ",", digitGroupingSeparator: "." }],
    ];

    for (const [label, settings] of settingsVariants) {
      describe(label, () => {
        for (const input of cases) {
          it(`round-trips: ${input}`, () => {
            expectRoundTrip(input, settings);
          });
        }
      });
    }
  });

  // ── RESPECT: styles preserved in the parsable form ─────────────────────

  describe("RESPECT — digit grouping size (separator canonicalized to _)", () => {
    it("groups by 3 (default)", () => {
      expect(parsable("1234567")).toBe("1_234_567");
    });
    it("groups South-Asian 2-3", () => {
      expect(parsable("1234567", { digitGroupingSize: "2-3" })).toBe(
        "12_34_567",
      );
    });
    it("groups East-Asian 4", () => {
      expect(parsable("12345678", { digitGroupingSize: "4" })).toBe(
        "1234_5678",
      );
    });
    it("no grouping when off", () => {
      expect(parsable("1234567", { digitGroupingSize: "off" })).toBe("1234567");
    });
  });

  describe("RESPECT — base", () => {
    it("hex uses 0x", () => {
      expect(parsable("255 to hex")).toBe("0xFF");
    });
    it("binary uses 0b", () => {
      expect(parsable("10 to binary")).toBe("0b1010");
    });
    it("octal uses 0o", () => {
      expect(parsable("255 to octal")).toBe("0o377");
    });
    it("arbitrary base uses 'a base b'", () => {
      expect(parsable("255 to base 7")).toBe("513 base 7");
    });
    it("base 10 is plain (ignored)", () => {
      expect(parsable("255 to base 10")).toBe("255");
    });
  });

  describe("RESPECT — fractions", () => {
    it("pure fraction uses a / b", () => {
      expect(parsable("0.75 to fraction")).toBe("3 / 4");
    });
    it("mixed fraction uses n + a / b", () => {
      expect(parsable("3.75 to fraction")).toBe("3 + 3 / 4");
    });
    it("negative mixed fraction stays negative", () => {
      expect(parsable("-3.75 to fraction")).toBe("-3 - 3 / 4");
    });
  });

  describe("RESPECT — scientific notation", () => {
    it("uses e notation", () => {
      expect(parsable("2500 to scientific")).toBe("2.5e+3");
    });
  });

  describe("RESPECT — unit style", () => {
    it("symbol style (default)", () => {
      expect(norm(parsable("5 km"))).toBe("5 km");
    });
    it("name style", () => {
      expect(norm(parsable("5 km", { unitDisplayStyle: "name" }))).toBe(
        "5 kilometers",
      );
    });
    it("derived unit with symbol", () => {
      expect(norm(parsable("9.8 m/s^2"))).toBe("9.8 m/s²");
    });
    it("compound unit", () => {
      expect(norm(parsable("5 ft 3 in"))).toBe("5 ft 3 in");
    });
  });

  describe("RESPECT — time format", () => {
    it("24-hour (default)", () => {
      expect(parsable("15:45")).toBe("15:45");
    });
    it("12-hour uses AM/PM", () => {
      expect(parsable("15:45", { timeFormat: "h12" })).toBe("3:45 PM");
    });
    it("12-hour AM", () => {
      expect(parsable("9:05", { timeFormat: "h12" })).toBe("9:05 AM");
    });
  });

  describe("RESPECT — date-time order", () => {
    it("date then time (default)", () => {
      expect(parsable("2024-01-31 15:45")).toBe("2024-01-31 15:45");
    });
    it("time then date", () => {
      expect(
        parsable("2024-01-31 15:45", { dateTimeFormat: "{time} {date}" }),
      ).toBe("15:45 2024-01-31");
    });
  });

  describe("RESPECT — timezones (IANA name)", () => {
    it("keeps the IANA name", () => {
      expect(parsable("2024-01-31 15:45 America/New_York")).toBe(
        "2024-01-31 15:45 America/New_York",
      );
    });
  });

  // ── IGNORE: styles canonicalized regardless of settings ────────────────

  describe("IGNORE — decimal separator is always '.'", () => {
    it("comma-decimal setting still emits '.'", () => {
      expect(parsable("1.5", { decimalSeparator: "," })).toBe("1.5");
    });
  });

  describe("IGNORE — digit grouping separator is always '_'", () => {
    it("comma-separator setting still emits '_'", () => {
      expect(
        parsable("1234567", { digitGroupingSeparator: "," }),
      ).toBe("1_234_567");
    });
    it("narrow-space setting still emits '_'", () => {
      expect(
        parsable("1234567", { digitGroupingSeparator: "\u202F" }),
      ).toBe("1_234_567");
    });
  });

  describe("IGNORE — date format is always YYYY-MM-DD without weekday", () => {
    it("drops the weekday token", () => {
      expect(parsable("2024-01-31", { dateFormat: "YYYY-MM-DD DDD" })).toBe(
        "2024-01-31",
      );
    });
    it("ignores a reordered date format", () => {
      expect(parsable("2024-01-31", { dateFormat: "DDD DD MMM YYYY" })).toBe(
        "2024-01-31",
      );
    });
  });

  describe("IGNORE — ordinals become plain numbers", () => {
    it("drops the ordinal suffix", () => {
      expect(parsable("5 to ordinal")).toBe("5");
    });
  });

  describe("IGNORE — full date/time formats are canonicalized", () => {
    it("ISO 8601 becomes the canonical plain form", () => {
      expect(parsable("2024-01-31 15:45 to ISO 8601")).toBe(
        "2024-01-31 15:45",
      );
    });
  });

  // ── Explicit round-trip correctness for absolute time ──────────────────

  describe("absolute time preserves the instant", () => {
    it("a zoned datetime re-evaluates to the same instant", () => {
      const calc = new Calculator(dataLoader, {});
      const input = "2024-01-31 15:45 America/New_York";
      const s = calc.calculate(input).results[0].parsableResult!;
      const reDisplay = calc.calculate(s).results[0].result!;
      // Same wall-clock + zone => identical display.
      expect(calc.calculate(input).results[0].result).toBe(reDisplay);
    });

    it("parsable serialization reaches a fixed point (idempotent from gen 2)", () => {
      const calc = new Calculator(dataLoader, {});
      const gen1 = calc.calculate("1719900000 unix").results[0].parsableResult!;
      const gen2 = calc.calculate(gen1).results[0].parsableResult!;
      const gen3 = calc.calculate(gen2).results[0].parsableResult!;
      expect(gen3).toBe(gen2);
    });
  });
});

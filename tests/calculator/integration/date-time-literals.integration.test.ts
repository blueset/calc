import { describe, it, expect, beforeAll } from "vitest";
import { Calculator } from "../../../src/calculator/calculator";
import { DataLoader } from "../../../src/calculator/data-loader";

/**
 * Integration tests for date and time literals
 * Tests the full pipeline: Lexer → Parser → Evaluator → Formatter
 */
describe("Integration Tests - Date and Time Literals", () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();

    calculator = new Calculator(dataLoader, {}); // Use Nearley parser
  });

  describe("Date and Time Literals", () => {
    it("should handle plain dates", () => {
      const result = calculator.calculate("1970 Jan 01");
      expect(result.results[0].result).toBe("1970-01-01 Thu");
    });

    it("should handle plain times", () => {
      const result = calculator.calculate("14:30");
      expect(result.results[0].result).toBe("14:30");
    });

    it("should handle times with AM/PM", () => {
      const result = calculator.calculate("2:30 PM");
      expect(result.results[0].result).toBe("14:30");
    });

    it("should handle plain date times", () => {
      const result = calculator.calculate("1970 Jan 01 14:30");
      expect(result.results[0].result).toBe("1970-01-01 Thu 14:30");
    });

    it("should handle zoned date times", () => {
      const result = calculator.calculate(`12:30 UTC
8:25 Japan
2023 Jan 01 14:00 America/New_York
2023 Jan 01 14:00 New York
2023.06.15 09:00 London
1970 Jan 01 23:59 UTC+8`);
      expect(result.results[0].result).toMatch(/(tomorrow )?12:30 UTC/);
      expect(result.results[1].result).toMatch(/(tomorrow )?08:25 UTC\+9/);
      expect(result.results[2].result).toBe("2023-01-01 Sun 14:00 UTC-5");
      expect(result.results[3].result).toBe("2023-01-01 Sun 14:00 UTC-5");
      expect(result.results[4].result).toBe("2023-06-15 Thu 09:00 UTC+1");
      expect(result.results[5].result).toBe("1970-01-01 Thu 23:59 UTC+8");
    });

    it("should handle zoned date times with respect to user region", () => {
      calculator.setUserLocale("en-US");
      let result = calculator.calculate(
        "2023 Jan 01 14:00 Central Time to RFC 9557\n2023 Jan 01 14:00 PST to RFC 9557",
      );
      expect(result.results[0].result).toBe(
        "2023-01-01T14:00:00-06:00[America/Chicago]",
      );
      expect(result.results[1].result).toBe(
        "2023-01-01T14:00:00-08:00[America/Los_Angeles]",
      );
      calculator.setUserLocale("en-CA");
      result = calculator.calculate(
        "2023 Jan 01 14:00 Central Time to RFC 9557\n2023 Jan 01 14:00 PST to RFC 9557",
      );
      expect(result.results[0].result).toBe(
        "2023-01-01T14:00:00-06:00[America/Winnipeg]",
      );
      expect(result.results[1].result).toBe(
        "2023-01-01T14:00:00-08:00[America/Vancouver]",
      );
    });

    it("should handle zoned date times with offsets", () => {
      const result = calculator.calculate(`12:30 Zulu
12:30 UTC+1
12:30 UTC+01
12:30 UTC-515
12:30 UTC-1015`);
      expect(result.results[0].result).toMatch(/(tomorrow )?12:30 UTC/);
      expect(result.results[1].result).toMatch(/(tomorrow )?12:30 UTC\+1/);
      expect(result.results[2].result).toMatch(/(tomorrow )?12:30 UTC\+1/);
      expect(result.results[3].result).toMatch(/(tomorrow )?12:30 UTC-5:15/);
      expect(result.results[4].result).toMatch(/(tomorrow )?12:30 UTC-10:15/);
    });

    it("should handle parsing surrounding zoned date times", () => {
      const result = calculator.calculate(`05:00
05:00 UTC
05:00-3:30
05:00 UTC-3:30
05:00 UTC - 3:30
05:00 UTC+3:30`);
      expect(result.results[0].result).toBe("05:00");
      expect(result.results[1].result).toMatch(/(tomorrow )?05:00 UTC/);
      expect(result.results[2].result).toBe("1 h 30 min");
      expect(result.results[3].result).toMatch(/(tomorrow )?05:00 UTC-3:30/);
      expect(result.results[4].result).toMatch(
        /(-1 day -6 h -30 min|17 h 30 min)/,
      );
      expect(result.results[5].result).toMatch(/(tomorrow )?05:00 UTC\+3:30/);
    });

    it("should handle numeric date formats", () => {
      const result = calculator.calculate(`2023.01.15
2023.13.15
2023.06.32
2023.02.30
2023.00.15
2023.06.00`);
      expect(result.results[0].result).toBe("2023-01-15 Sun");
      expect(result.results[1].result).toBe("2023-12-15 Fri"); // month 13 clamps to December
      expect(result.results[2].result).toBe("2023-06-30 Fri"); // day 32 clamps to 30
      expect(result.results[3].result).toBe("2023-02-28 Tue"); // day 30 clamps to 28
      expect(result.results[4].hasError).toBe(true); // month 0 is invalid
      expect(result.results[5].hasError).toBe(true); // day 0 is invalid
    });

    it("should handle instants (relative time)", () => {
      function getDateString(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
      function getTimeString(date: Date): string {
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
      }
      function modifyNow(dateModifier: (date: Date) => void): Date {
        const modified = new Date();
        dateModifier(modified);
        return modified;
      }

      const result = calculator.calculate(`now
today
tomorrow
yesterday
2 days ago
3 days from now
5 years ago
10 hours from now`);
      const todayString = getDateString(new Date());
      const nowString = getTimeString(new Date());

      // now
      expect(result.results[0].result).toContain(todayString);
      expect(result.results[0].result).toContain(nowString);

      // today
      expect(result.results[1].result).toContain(todayString);
      expect(result.results[1].result).toContain(nowString);

      expect(result.results[0].result).toContain(result.results[1].result); // `now` and `today` should be the same

      // tomorrow
      expect(result.results[2].result).toContain(
        getDateString(modifyNow((d) => d.setDate(d.getDate() + 1))),
      );
      expect(result.results[2].result).toContain(nowString);

      // yesterday
      expect(result.results[3].result).toContain(
        getDateString(modifyNow((d) => d.setDate(d.getDate() - 1))),
      );
      expect(result.results[3].result).toContain(nowString);

      // 2 days ago
      expect(result.results[4].result).toContain(
        getDateString(modifyNow((d) => d.setDate(d.getDate() - 2))),
      );
      expect(result.results[4].result).toContain(nowString);

      // 3 days from now
      expect(result.results[5].result).toContain(
        getDateString(modifyNow((d) => d.setDate(d.getDate() + 3))),
      );
      expect(result.results[5].result).toContain(nowString);

      // 5 years ago
      expect(result.results[6].result).toContain(
        getDateString(modifyNow((d) => d.setFullYear(d.getFullYear() - 5))),
      );
      expect(result.results[6].result).toContain(nowString);

      // 10 hours from now
      const tenHoursLater = modifyNow((d) => d.setHours(d.getHours() + 10));
      expect(result.results[7].result).toContain(getDateString(tenHoursLater));
      expect(result.results[7].result).toContain(getTimeString(tenHoursLater));
    });

    it("should handle instants (Unix timestamps)", () => {
      const result = calculator.calculate(`3600 unix
3600 unix seconds
3600 unix s
3600000 unix milliseconds
3600000 unix ms`);

      // Formatted as local timezone
      expect(result.results[0].result).toBe("1969-12-31 Wed 17:00");
      expect(result.results[1].result).toBe("1969-12-31 Wed 17:00");
      expect(result.results[2].result).toBe("1969-12-31 Wed 17:00");
      expect(result.results[3].result).toBe("1969-12-31 Wed 17:00");
      expect(result.results[4].result).toBe("1969-12-31 Wed 17:00");
    });
  });
});

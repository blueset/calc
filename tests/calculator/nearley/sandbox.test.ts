import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import nearley from "nearley";
import grammar from "../../../src/calculator/nearley/grammar";
import { lexer } from "../../../src/calculator/nearley/lexer";
import { DataLoader } from "../../../src/calculator/data-loader";
import { Calculator } from "../../../src/calculator/calculator";

function lexString(input: string) {
  lexer.reset(input);
  const tokens: any[] = [];
  let token;
  while ((token = lexer.next())) {
    tokens.push(token);
  }
  return tokens;
}

function debugLexer(input: string) {
  const result = lexString(input);
  expect(result.length).toBeGreaterThan(0);
  console.log();
  console.log(JSON.stringify(input), "Parsed", result.length, "tokens");
  let line1 = "";
  let line2 = "";
  result.forEach((tok) => {
    const value = JSON.stringify(tok.value);
    const type = tok.type;
    const length = Math.max(value.length, type.length);
    line1 += `| ${type.padEnd(length)} `;
    line2 += `| ${value.padEnd(length)} `;
  });
  console.log(line1);
  console.log(line2);
}

function toString(node: any, indent: number = 0): string {
  const spaces = "  ".repeat(indent);
  const childSpaces = "  ".repeat(indent + 1);

  if (Array.isArray(node)) {
    if (node.length === 0) return "[]";
    const items = node
      .map((n) => `${childSpaces}${toString(n, indent + 1)}`)
      .join(",\n");
    if (items.length + 4 + spaces.length <= 80) {
      return `[ ${node.map((n) => toString(n, 0)).join(", ")} ]`;
    }
    return `[\n${items}\n${spaces}]`;
  }
  if (node && typeof node.type === "string") {
    const type = node.type;

    if (type === "UnitWithExponent") {
      return node.unit.matched === "identifier"
        ? `«${node.unit.name}»:${node.exponent}`
        : `"${node.unit.name}":${node.exponent}`;
    } else if (type === "Units") {
      const terms = node.terms?.map((n: any) => toString(n, 0)).join(" ");
      if (terms?.length) {
        return `[${terms}]`;
      } else {
        return ``;
      }
    } else if (type === "NumberLiteral") {
      if (String(node.base) === "10") {
        return `${node.value}`;
      } else {
        return `base${node.base}(${node.value})`;
      }
    } else if (type === "Value") {
      if (node.unit) {
        return `${toString(node.value, 0)}${toString(node.unit, 0)}`;
      } else {
        return `${toString(node.value, 0)}`;
      }
    } else if (type === "Conversion") {
      return `Convert(${toString(node.expression, 0)}, ${node.operator}, ${toString(node.target, 0)})`;
    } else if (type === "CurrencyUnit") {
      return `¤[${node.name}]`;
    } else if (type === "TimezoneName") {
      return `[${node.zoneName}]`;
    } else if (type === "UTCOffset") {
      return `[${node.baseZone}${node.offsetStr}]`;
    } else if (type === "PlainDate") {
      return `${node.year.toString().padStart(4, "0")}-${node.month.toString().padStart(2, "0")}-${node.day.toString().padStart(2, "0")}`;
    } else if (type === "PlainTime") {
      return `${node.hour.toString().padStart(2, "0")}:${node.minute.toString().padStart(2, "0")}:${node.second.toString().padStart(2, "0")}`;
    } else if (type === "PlainDateTime") {
      return `${node.date ? toString(node.date, 0) : "Today"}T${toString(node.time, 0)}`;
    } else if (type === "ZonedDateTime") {
      return `${toString(node.dateTime, 0)}${toString(node.timezone, 0)}`;
    } else if (type === "BinaryExpression") {
      return `₂${node.operator}(${toString(node.left, 0)}, ${toString(node.right, 0)})`;
    } else if (type === "UnaryExpression") {
      return `₁${node.operator}(${toString(node.argument, 0)})`;
    } else if (type === "Constant") {
      return `©${node.name}`;
    }

    const entries = Object.entries(node).filter(([key, _]) => key !== "type");
    if (entries.length === 0) return `${type}()`;
    const params = entries
      .map(
        ([key, value]) => `${childSpaces}${key}=${toString(value, indent + 1)}`,
      )
      .join(",\n");
    if (params.length + 4 + spaces.length <= 80) {
      return `${type}(${entries.map(([key, value]) => `${key}=${toString(value, 0)}`).join(", ")})`;
    }
    return `${type}(\n${params}\n${spaces})`;
  } else {
    return `${node}`;
  }
}

function debugParse(input: string) {
  debugLexer(input);
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  parser.feed(input);
  const results = parser.results;
  expect(results.length).toBeGreaterThan(0);
  console.log("### Parse results:", JSON.stringify(input));
  // console.dir(results, { depth: null });
  results.forEach((result, idx) => {
    console.log("---", idx + 1);
    console.log(toString(result));
  });
  console.log();
}

describe("Nearley Parser Sandbox Tests", () => {
  let parser: nearley.Parser;
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(() => {
    dataLoader = new DataLoader();
    dataLoader.load();
    calculator = new Calculator(dataLoader, {}); // Nearley parser
  });

  beforeEach(() => {
    parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  });

  it.skip("should debug exponentiation", () => {
    debugParse("2^3");
    debugParse("2 ^ 3");
    const result = calculator.calculate("2 ^ 3");
    console.log("\n=== Exponentiation (2 ^ 3) ===");
    console.log("Full result:", JSON.stringify(result, null, 2));
    console.log("Result 0:", result.results[0]);
    console.log("Has error:", result.results[0]?.hasError);
    console.log("Result value:", result.results[0]?.result);
  });

  it("should debug degree primes", () => {
    console.log("\n=== Degree + Prime parsing ===");
    debugParse("30° 15'");
    debugParse("45 deg 30'");
    debugParse("5'");
    debugParse("3 to ordinal");
  });

  it.skip("should parse conditionals", () => {
    // debugParse("if 5 > 3 then 10 m else 20 m");
    // debugParse("1e-100");
    // debugParse("random(a)");
    // debugParse("1.8 base 16");
    // debugParse("US$100");
    // debugParse("2023 Jan 15 14:30 UTC + 2 hours");
    // debugParse("value to m to cm to mm to m to km");
    // debugParse("123.456 to 3 sig figs");
    // debugParse("0xa.8");
    // debugParse("10 in in cm");
    // debugParse("5 km to m in cm");
    // debugParse("12:30 UTC-515");
    // debugParse("05:00 UTC-3:30 to ISO 8601");
    // debugParse("05:00 UTC-3:30 to unix");
    // debugParse("05:00 UTC-3:30 to Unix s");
    debugParse("100 hour to minute");
  });

  it.skip("should parse a simple expression", () => {
    // const input = "USD 200 to Hong kong dollar";
    // const input = "2 kg 500 g in ft in mm hong kong dollar millimeter of mercury";
    // debugLexer(input);
    const input = "1000 EUR/person to USD per foot";
    const start = performance.now();
    parser.feed(input);
    const results = parser.results;
    const end = performance.now();
    // console.log(`Parsing took ${(end - start).toFixed(2)} ms`);
    expect(results.length).toBeGreaterThan(0);
    console.log("Parse results:");
    // console.dir(results, { depth: null })
    results.forEach((result, idx) => {
      console.log("---", idx + 1);
      console.log(toString(result));
    });
  });

  it.skip("parse based numbers with underscores", () => {
    debugParse("1_0_1.1_5 base 16");
    debugParse("a_b_c.def base 16");
    debugParse("1_234_567 base 10");
    debugParse("1_2_3_4_5_6_7 base 8");
    debugParse("1a2b3.c4d5e base 16");
  });

  it.skip("parse bit expressions", () => {
    debugParse("0b1010 << 2 to binary");
    debugParse("0b1100 >> 1 to binary");
    debugParse("0b1111 & 0b1010 to binary");
    debugParse("0b1111 | 0b1010 to binary");
    debugParse("0b1111 xor 0b1010 to binary");
    debugParse("~0b1010 to binary");
  });

  it.skip("parse date time values", () => {
    debugParse("1970-01-01");
    debugParse("1970.01.01");
    debugParse("1970-1-1");
    debugParse("1970.1.1");
    debugParse("1970-12-31");
    debugParse("1970.12.31");
    debugParse("1970-1-21");
    debugParse("1970.1.21");
    debugParse("1970-12-1");
    debugParse("1970-12 -1");
    debugParse("1970.12.1");
    debugParse("1970-1-41");
  });

  it.skip("parse am/pm time values", () => {
    debugParse("1:23 AM");
    debugParse("12:34 pm");
    debugParse("11 am");
    debugParse("11.0 am");
    debugParse("13 am");
    debugParse("11am");
    debugParse("11.0am");
    debugParse("13am");
  });

  it.skip("parse zone time offsets", () => {
    debugParse("1970 Jan 1 10:00");
    debugParse("1970 Jan 1 10:00 Australian Eastern Standard Time");
    debugParse("1970 Jan 1 10:00 America/Argentina/Buenos_Aires");
    debugParse("1970 Jan 1 10:00-8:00");
    debugParse("1970 Jan 1 10:00 - 8:00");
    debugParse("1970 Jan 1 10:00 UTC");
    debugParse("1970 Jan 1 10:00 UTC-8:00");
    debugParse("1970 Jan 1 10:00 UTC - 8:00");
    debugParse("1970 Jun 01 14:00 America/New_York to offset");
    debugParse("date = 1970 Jan 15 14:30:45 UTC");
    debugParse("(14:30 to hour) + (14:30 to minute)");
    debugParse("(2023 Dec 25 to month) * 2");
    debugParse("1970 Jan 05 to week of year");
    debugParse("1970 Jan 01 14:00 UTC to month");
  });

  it.skip("parse currency expressions", () => {
    debugParse("100 USD + 200 EUR");
    debugParse("100 USD - 50 GBP");
    debugParse("1 cup");
    debugParse("1 CUP / person / day");
    debugParse("1 CUP per person per day");
  });

  it.skip("parse units", () => {
    debugParse("1000 pound force person hong kong dollar per nautical mile");
    debugParse("1000 pound force person hong kong dollar nautical mile");
    // debugParse("1 A");
    // debugParse("1 hong kong dollar");
    // debugParse("1 newton meter");
    // debugParse("1 pound mile");
    // debugParse("1 pound nautical mile");
    // debugParse("1000 EUR/person");
    // debugParse("1 pound force nautical mile");
    // debugParse("compensation = 100 USD");
    // debugParse("1000 hong kong dollar/compensation");
    // debugParse("1000 EUR/km^2/g^-3");
    // debugParse("1000 EUR per km² per g^-3");
    // debugParse("1000 EUR/km^2");
  });

  it.skip("parse primes, double primes", () => {
    debugParse("5'");
    debugParse("10″");
    debugParse("15′");
    debugParse("20″");
    debugParse("2' 20''");
    debugParse("45° 30'");
    debugParse("45°F");
    debugParse("45°C");
    debugParse("45 c");
    debugParse("45 f");
    debugParse("45°");
    debugParse("45 rad");
    debugParse("45° 30′");
    debugParse("45°30′");
  });

  it.skip("parse conversions", () => {
    debugParse("1000 EUR to USD");
    debugParse("250 g/s to kg/min");
    debugParse("5 ft 7 in to cm");
    debugParse("100 person/sq ft to person/km^2");
    debugParse("255 to binary");
    debugParse("3.75 to binary");
    debugParse("10.625 to hex");
    debugParse("1.75 to fraction");
    debugParse("10.625 to unix");
    debugParse("10.625 to unix seconds");
    debugParse("10.625 to days of year");
    debugParse("10.625 to base 39");
  });

  it.skip("parse complex expression", () => {
    // debugParse('((1000 EUR/person + 500 USD/person) / 2) to HKD per foot');
    debugParse("6 ft 3 in to cm");
    debugParse("acos(0.5) to deg");
    debugParse("255 meters to hex");
    debugParse("100 inches to base 7");
    debugParse("(1/0) to scientific");
    debugParse("100 person/sq ft to person/km^2");
    debugParse("$10 + $5");
    debugParse("100 japanese Yen");
    debugParse("100 hong kong dollars");
    debugParse("-(5 ft 6 in)");
    debugParse("-10 ft - (5 ft 6 in)");
    debugParse("45.5 degrees to ° ′");
    debugParse("phi == φ");
    debugParse("φ^2 - φ - 1");
    debugParse("φ^2 - pi - 1");
    debugParse("φ^2 - golden_ratio - 1");
    debugParse("100 * 25‰");
    debugParse("100 * 25 percent");
    debugParse("(20 ÷ 2) ÷ 5");
    debugParse("random(0, 5, 10)");
    debugParse("1 kWh");
  });
});

describe("Lexer Sandbox Tests", () => {
  it.skip("enumerate patterns for base numbers", () => {
    function insertUnderscores(s: string, fromIndex: number): string[] {
      const results: string[] = [];
      const positions: number[] = [];

      // Collect all valid positions for underscore insertion (between fromIndex and end)
      for (let i = fromIndex; i < s.length - 1; i++) {
        positions.push(i);
      }

      // Generate all subsets of positions (2^n combinations)
      const numCombinations = 1 << positions.length;
      for (let mask = 0; mask < numCombinations; mask++) {
        let result = "";
        for (let i = 0; i < s.length; i++) {
          result += s[i];
          // Check if we should insert underscore after position i
          const posIndex = positions.indexOf(i);
          if (posIndex !== -1 && mask & (1 << posIndex)) {
            result += "_";
          }
        }
        results.push(result);
      }

      return results;
    }

    const variants = new Set<string>();
    ["1", "a", "1a", "a1", "a1a", "1a1a", "a1a1", ""].forEach((num) => {
      insertUnderscores(num, 0).forEach((numWithUnderscores) => {
        ["", ".1", ".a", ".1a", ".a1", ".a1a", "1a1a", "a1a1"].forEach(
          (frac) => {
            insertUnderscores(frac, 1).forEach((fracWithUnderscores) => {
              // debugLexer(`${num}${frac} base 30`);
              // debugLexer(`${num}${frac.replaceAll('a', 'e')} base 30`);
              const variant1 = lexString(
                `${numWithUnderscores}${fracWithUnderscores} base 30`,
              );
              variants.add(
                variant1
                  .map((t) => t.type)
                  .join(" ")
                  .replaceAll("ws kw-base ws decimalDigits", ""),
              );
              const variant2 = lexString(
                `${numWithUnderscores}${fracWithUnderscores.replaceAll("a", "e")} base 30`,
              );
              variants.add(
                variant2
                  .map((t) => t.type)
                  .join(" ")
                  .replaceAll("ws kw-base ws decimalDigits", ""),
              );
            });
          },
        );
      });
    });
    console.log("Total variants for base 30 numbers:", variants.size);
    variants.forEach((variant) => {
      if (variant.trim() === "") return;
      console.log("# -", variant.trim());
    });
  });

  it.skip("lexing exponentials", () => {
    debugLexer("1e - 3");
    debugLexer("e8");
    debugLexer("1e8");
    debugLexer("1e-8");
  });

  it.skip("lexing numerical dates", () => {
    debugLexer("10 km in ft in mm");
    debugLexer("1970.01");
    debugLexer("-1970.01");
    debugLexer("1970.01.01");
    debugLexer("1970.02.31");
    debugLexer("1970-01-01");
    debugLexer("970-12-31");
    debugLexer("970.12.31");
    debugLexer("1970-13-01");
    debugLexer("1970-1-1");
    debugLexer("1970-1-21");
    debugLexer("1970-12-1");
    debugLexer("1970-13-01.2");
    debugLexer("1970-13-01.2e8");
    debugLexer("1970-12-11.2e+8");
    debugLexer("1970-13-1.2e-8");
  });

  it.skip("lexing am/pm times", () => {
    debugLexer("1:23 AM");
    debugLexer("12:34 pm");

    debugLexer("11 am");
    debugLexer("11.0 am");
    debugLexer("13 am");
    debugLexer("11am");
    debugLexer("11.0am");
    debugLexer("13am");
  });

  it.skip("lexing currencies", () => {
    debugLexer("$100");
    debugLexer("US$100");
    debugLexer("CA$100");
    debugLexer("€200.50");
    debugLexer("£75.25");
    debugLexer("¥1000");
    debugLexer("₹500.75");
    debugLexer("zł 3000");
    debugLexer("SYP 3000");
    debugLexer("Kč 3000");
    debugLexer("3000 USD");
    debugLexer("3000 Egyptian pounds");
  });

  it.skip("lexing primes, double primes", () => {
    debugLexer("5'");
    debugLexer("10″");
    debugLexer("15′");
    debugLexer("20″");
    debugLexer("45° 30'");
  });

  it.skip("lexing timezone offsets", () => {
    // debugLexer('UTC+5');
    // debugLexer('UTC+18');
    // debugLexer('UTC+800');
    // debugLexer('UTC+1830');
    // debugLexer('UTC-3:30');
    // debugLexer('UTC+00:00');
    // debugLexer('UTC-00:00');
    // debugLexer('UTC+14:00');
    // debugLexer('UTC-12:00');

    debugLexer("10:00-8:00");
    debugLexer("10:00 - 8:00");
    debugLexer("1970 Jan 1 10:00");
    debugLexer("1970 Jan 1 10:00-8:00");
    debugLexer("1970 Jan 1 10:00 - 8:00");
    debugLexer("1970 Jan 1 10:00 UTC");
    debugLexer("1970 Jan 1 10:00 UTC-8:00");
    debugLexer("1970 Jan 1 10:00 UTC - 8:00");
  });

  it.skip("lexing units", () => {
    debugLexer("1 A");
    debugLexer("1 hong kong dollar");
    debugLexer("1 newton meter");
    debugLexer("1 pound mile");
    debugLexer("1 pound nautical mile");
    debugLexer("1 pound force nautical mile");
    debugLexer("1000 EUR/person");
    debugLexer("1000 pound force person hong kong dollar per nautical mile");
    debugLexer("compenstation = 100 USD");
    debugLexer("1000 EUR/compenstation");
    debugLexer("1000 EUR/km^2/g^-3");
    debugLexer("1000 EUR per km² per g^-3");
    debugLexer("1000 EUR/km^2");
  });
});

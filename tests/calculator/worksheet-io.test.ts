import { describe, it, expect, beforeAll } from "vitest";
import { Calculator } from "../../src/calculator/calculator";
import { DataLoader } from "../../src/calculator/data-loader";
import type { LineResult } from "../../src/calculator/calculator";
import {
  RESULT_SEPARATOR,
  exportMarkdown,
  importMarkdown,
} from "../../src/lib/worksheet-io";

describe("worksheet-io", () => {
  let calculator: Calculator;
  let runCalculation: (text: string) => LineResult[] | null;

  beforeAll(() => {
    const dataLoader = new DataLoader();
    dataLoader.load();
    calculator = new Calculator(dataLoader, {});
    runCalculation = (text: string) => calculator.calculate(text).results;
  });

  describe("exportMarkdown", () => {
    it("returns the input unchanged when withResults is false", () => {
      const input = "1 + 1\n2 * 3";
      expect(exportMarkdown(input, runCalculation(input)!, false)).toBe(input);
    });

    it("appends results to plain expression lines", () => {
      const input = "1 + 1\n2 * 3";
      const output = exportMarkdown(input, runCalculation(input)!, true);
      expect(output).toBe(`1 + 1${RESULT_SEPARATOR}2\n2 * 3${RESULT_SEPARATOR}6`);
    });

    it("appends results to variable assignments", () => {
      const input = "x = 5\nx * 2";
      const output = exportMarkdown(input, runCalculation(input)!, true);
      expect(output).toBe(`x = 5${RESULT_SEPARATOR}5\nx * 2${RESULT_SEPARATOR}10`);
    });

    it("does not annotate headings, plain text, empty lines, or errors", () => {
      const input = "# Title\njust text\n\n1 +";
      const output = exportMarkdown(input, runCalculation(input)!, true);
      expect(output).toBe(input);
    });
  });

  describe("importMarkdown", () => {
    it("strips the result suffix from valid expression lines", () => {
      const md = `1 + 1${RESULT_SEPARATOR}2\n2 * 3${RESULT_SEPARATOR}6`;
      expect(importMarkdown(md, runCalculation)).toBe("1 + 1\n2 * 3");
    });

    it("round-trips an exported worksheet", () => {
      const input = "x = 5\nx * 2\n# Heading\nnote";
      const exported = exportMarkdown(input, runCalculation(input)!, true);
      expect(importMarkdown(exported, runCalculation)).toBe(input);
    });

    it("leaves lines whose prefix is not a valid expression untouched", () => {
      const md = `not an expr ${RESULT_SEPARATOR} keep me`;
      expect(importMarkdown(md, runCalculation)).toBe(md);
    });

    it("returns the text unchanged when there are no separators", () => {
      const md = "1 + 1\n2 * 3";
      expect(importMarkdown(md, runCalculation)).toBe(md);
    });
  });
});

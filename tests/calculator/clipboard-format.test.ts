import { describe, it, expect } from "vitest";
import {
  PARSABLE_MIME,
  PARSABLE_HTML_ATTR,
  buildParsableHtml,
  extractParsableFromHtml,
} from "../../src/calculator/clipboard-format";

describe("clipboard-format helpers (issue #2)", () => {
  it("uses the Chromium web custom format prefix", () => {
    expect(PARSABLE_MIME).toBe("web text/x-calc");
  });

  it("embeds the parsable string in the HTML marker attribute", () => {
    const html = buildParsableHtml("1 234 567.89", "1_234_567.89");
    expect(html).toContain(`${PARSABLE_HTML_ATTR}="1_234_567.89"`);
    expect(html).toContain("1 234 567.89");
  });

  it("round-trips the parsable string through the HTML fallback", () => {
    const parsable = "2024-01-31 15:45 America/New_York";
    const html = buildParsableHtml("2024-01-31 Wed 15:45 UTC-5", parsable);
    expect(extractParsableFromHtml(html)).toBe(parsable);
  });

  it("escapes and restores HTML-significant characters", () => {
    const parsable = `5 < 6 & "x" > 4`;
    const html = buildParsableHtml("display", parsable);
    // The raw payload must not leak unescaped markup into the attribute.
    expect(html).not.toContain(`"${parsable}"`);
    expect(extractParsableFromHtml(html)).toBe(parsable);
  });

  it("returns null when the marker is absent (foreign HTML)", () => {
    expect(
      extractParsableFromHtml("<p>copied from somewhere else</p>"),
    ).toBeNull();
  });
});

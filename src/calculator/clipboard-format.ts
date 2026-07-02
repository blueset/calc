/**
 * Shared clipboard format definitions for parsable copy/paste (issue #2).
 *
 * When a calculation result is copied, three representations are written:
 *  - `text/plain`   — the formatted display value (unchanged behavior)
 *  - {@link PARSABLE_MIME} — a raw, machine-parsable string (Chromium web custom
 *    format; requires the `web ` prefix)
 *  - `text/html`    — the formatted value wrapped in an element that carries the
 *    parsable string in {@link PARSABLE_HTML_ATTR}, as a fallback for browsers
 *    that do not support web custom formats (Firefox/Safari)
 *
 * On paste, the editor prefers {@link PARSABLE_MIME}, then the HTML marker, then
 * falls back to `text/plain` (which also covers "paste as plain text", since
 * that pathway strips both the custom format and `text/html`).
 */

/** Custom web clipboard format carrying the raw parsable string. */
export const PARSABLE_MIME = "web text/x-calc";

/** Well-known MIME used for the HTML fallback representation. */
export const HTML_MIME = "text/html";

/** Attribute on the HTML wrapper element holding the parsable string. */
export const PARSABLE_HTML_ATTR = "data-calc-parsable";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

/**
 * Build the `text/html` clipboard payload: the formatted value shown as text,
 * with the parsable string embedded in a data attribute for round-tripping.
 */
export function buildParsableHtml(formatted: string, parsable: string): string {
  return `<span ${PARSABLE_HTML_ATTR}="${escapeHtml(parsable)}">${escapeHtml(
    formatted,
  )}</span>`;
}

/**
 * Extract the embedded parsable string from a pasted `text/html` payload, or
 * `null` when the marker attribute is absent (i.e. the HTML did not originate
 * from this app).
 */
export function extractParsableFromHtml(html: string): string | null {
  const match = html.match(
    new RegExp(`${PARSABLE_HTML_ATTR}="([^"]*)"`),
  );
  return match ? unescapeHtml(match[1]) : null;
}

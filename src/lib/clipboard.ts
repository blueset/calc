import {
  PARSABLE_MIME,
  HTML_MIME,
  buildParsableHtml,
} from "@/calculator/clipboard-format";

/**
 * Copy a calculation result to the clipboard in multiple representations so it
 * round-trips when pasted back into the editor (issue #2):
 *
 *  - `text/plain`          — the formatted display value
 *  - {@link PARSABLE_MIME} — the raw parsable string (Chromium web custom format)
 *  - `text/html`           — the formatted value with the parsable string
 *    embedded, as a fallback for browsers without web custom formats
 *
 * Falls back progressively (custom format → well-known types → plain text) so a
 * partially-supported clipboard implementation still copies something useful.
 * When `parsable` is null/empty (e.g. an error result), only plain text is
 * written.
 */
export async function writeParsableClipboard(
  formatted: string,
  parsable: string | null,
): Promise<void> {
  const clip = navigator.clipboard;
  if (!clip) throw new Error("Clipboard API is unavailable");

  if (!parsable) {
    await clip.writeText(formatted);
    return;
  }

  const canWriteItems =
    typeof ClipboardItem !== "undefined" && typeof clip.write === "function";

  if (canWriteItems) {
    const plainBlob = new Blob([formatted], { type: "text/plain" });
    const htmlBlob = new Blob([buildParsableHtml(formatted, parsable)], {
      type: HTML_MIME,
    });
    const parsableBlob = new Blob([parsable], { type: "text/plain" });

    // Primary: include the Chromium web custom format.
    try {
      await clip.write([
        new ClipboardItem({
          "text/plain": plainBlob,
          [PARSABLE_MIME]: parsableBlob,
          [HTML_MIME]: htmlBlob,
        }),
      ]);
      return;
    } catch {
      // Fallback: well-known types only — the HTML marker still round-trips.
      try {
        await clip.write([
          new ClipboardItem({ "text/plain": plainBlob, [HTML_MIME]: htmlBlob }),
        ]);
        return;
      } catch {
        // Fall through to plain-text write below.
      }
    }
  }

  await clip.writeText(formatted);
}

import type { LineResult } from "@/calculator/calculator";

/** Separator inserted between an expression and its result on export. */
export const RESULT_SEPARATOR = " ⇒ ";

export type RunCalculation = (text: string) => LineResult[] | null;

/**
 * A line counts as having an exportable/strippable result when it evaluated to
 * a formatted value without error. This covers plain expressions and variable
 * assignments alike, while excluding headings, plain text, empty lines, and
 * errored lines (which all have a null formatted result or `hasError`).
 */
function hasDisplayableResult(result: LineResult | undefined): boolean {
  return result != null && !result.hasError && result.result != null;
}

function resultsByLine(results: LineResult[]): Map<number, LineResult> {
  const map = new Map<number, LineResult>();
  for (const result of results) map.set(result.line, result);
  return map;
}

/**
 * Serialize the worksheet to Markdown. When `withResults` is true, each
 * expression line gets `" ⇒ " + result` appended (skipping headings, plain
 * text, empty lines, and errored expressions).
 */
export function exportMarkdown(
  input: string,
  results: LineResult[],
  withResults: boolean,
): string {
  if (!withResults) return input;
  const byLine = resultsByLine(results);
  return input
    .split("\n")
    .map((line, index) => {
      const result = byLine.get(index + 1);
      if (hasDisplayableResult(result)) {
        return line + RESULT_SEPARATOR + result!.result;
      }
      return line;
    })
    .join("\n");
}

/**
 * Reverse of {@link exportMarkdown}. For each line, the text before the last
 * `" ⇒ "` is considered a candidate expression. The whole candidate document
 * is evaluated once (so result-annotated lines that reference earlier variables
 * are detected correctly), and a line's suffix is stripped only when its
 * candidate evaluates to a valid expression result.
 */
export function importMarkdown(
  text: string,
  runCalculation: RunCalculation,
): string {
  const lines = text.split("\n");
  const candidates = lines.map((line) => {
    const idx = line.lastIndexOf(RESULT_SEPARATOR);
    return idx === -1 ? null : line.slice(0, idx);
  });

  const hasCandidates = candidates.some((c) => c !== null);
  if (!hasCandidates) return text;

  const candidateDoc = lines
    .map((line, index) => candidates[index] ?? line)
    .join("\n");

  const results = runCalculation(candidateDoc);
  if (!results) return text;

  const byLine = resultsByLine(results);
  return lines
    .map((line, index) => {
      const prefix = candidates[index];
      if (prefix === null) return line;
      return hasDisplayableResult(byLine.get(index + 1)) ? prefix : line;
    })
    .join("\n");
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Timestamped filename like `calc-worksheet-20380119-031407.md`. */
export function makeWorksheetFilename(prefix = "calc-worksheet"): string {
  const now = new Date();
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${prefix}-${stamp}.md`;
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Open a file picker and resolve with the chosen file's text (or null). */
export function triggerFileOpen(
  accept = ".md,.markdown,.txt,text/markdown,text/plain",
): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";
    document.body.appendChild(input);

    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () =>
        finish(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => finish(null);
      reader.readAsText(file);
    });

    // No reliable "cancel" event exists; fall back to focus to clean up.
    window.addEventListener(
      "focus",
      () => {
        window.setTimeout(() => finish(null), 500);
      },
      { once: true },
    );

    input.click();
  });
}

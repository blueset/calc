import { EditorView } from "@codemirror/view";
import {
  PARSABLE_MIME,
  HTML_MIME,
  extractParsableFromHtml,
} from "@/calculator/clipboard-format";

/**
 * Pull the parsable string out of a paste event's clipboard data (issue #2).
 *
 * Order of preference:
 *  1. the Chromium web custom format ({@link PARSABLE_MIME}), when the browser
 *     exposes it on the synchronous paste event;
 *  2. the `text/html` marker (always available synchronously) that this app
 *     embeds on copy, covering browsers without web custom formats.
 *
 * Returns `null` when neither is present — including the "paste as plain text"
 * pathway, which strips both the custom format and `text/html`.
 */
function readParsable(data: DataTransfer): string | null {
  const custom =
    data.getData(PARSABLE_MIME) || data.getData("text/x-calc");
  if (custom) return custom;

  const html = data.getData(HTML_MIME);
  if (html) {
    const extracted = extractParsableFromHtml(html);
    if (extracted) return extracted;
  }

  return null;
}

/**
 * CodeMirror extension: when a copied calculation result carries a parsable
 * representation, paste that instead of the formatted `text/plain` value. Falls
 * through to the default paste (plain text) otherwise.
 */
export const parsablePasteHandler = EditorView.domEventHandlers({
  paste(event, view) {
    const data = event.clipboardData;
    if (!data) return false;

    const parsable = readParsable(data);
    if (!parsable) return false;

    event.preventDefault();
    view.dispatch(
      view.state.update(view.state.replaceSelection(parsable), {
        userEvent: "input.paste",
        scrollIntoView: true,
      }),
    );
    return true;
  },
});

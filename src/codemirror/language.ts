import { StreamLanguage, StringStream } from "@codemirror/language";
import { tags } from "@lezer/highlight";

interface CalcState {
  lineStart: boolean;
}

export const calcLanguage = StreamLanguage.define<CalcState>({
  startState() {
    return { lineStart: true };
  },

  token(stream: StringStream, state: CalcState): string | null {
    if (stream.sol()) {
      state.lineStart = true;
    }

    if (stream.eatSpace()) {
      return null;
    }

    // Heading (# at start of line)
    if (stream.sol() && stream.match(/^#+\s*/)) {
      stream.skipToEnd();
      return "heading";
    }

    state.lineStart = false;

    // Comment (# mid-line)
    if (!stream.sol() && stream.match("#")) {
      stream.skipToEnd();
      return "comment";
    }

    // Brackets
    if (stream.match(/^[()[\]]/)) return "bracket";

    // Skip everything else — handled by semantic tree
    stream.next();
    return null;
  },

  languageData: {
    commentTokens: { line: "#" },
  },

  tokenTable: {
    heading: tags.heading,
    comment: tags.comment,
    bracket: tags.bracket,
  },
});

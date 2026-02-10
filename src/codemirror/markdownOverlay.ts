import { StateField, StateEffect } from "@codemirror/state";
import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { highlightingFor } from "@codemirror/language";
import { getStyleTags } from "@lezer/highlight";
import { GFM, parser as mdParser } from "@lezer/markdown";
import type { Document } from "@/calculator/document";

const gfmParser = mdParser.configure(GFM);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Region {
  from: number;
  to: number;
}

// ---------------------------------------------------------------------------
// State effect & field
// ---------------------------------------------------------------------------

export const setMarkdownRegions = StateEffect.define<Region[]>();

export const markdownRegionsField = StateField.define<Region[]>({
  create() {
    return [];
  },
  update(regions, tr) {
    for (const e of tr.effects) {
      if (e.is(setMarkdownRegions)) return e.value;
    }
    if (tr.docChanged) return [];
    return regions;
  },
});

// ---------------------------------------------------------------------------
// Extract markdown regions from the AST
// ---------------------------------------------------------------------------

export function extractMarkdownRegions(
  ast: Document,
  docText: string,
): Region[] {
  const lines = docText.split("\n");
  const lineStarts: number[] = [0];
  for (let i = 0; i < lines.length; i++) {
    lineStarts.push(lineStarts[i] + lines[i].length + 1);
  }

  const regions: Region[] = [];

  for (let i = 0; i < ast.lines.length; i++) {
    const line = ast.lines[i];
    if (
      line?.type === "PlainText" ||
      line?.type === "EmptyLine" ||
      line?.type === "Heading"
    ) {
      const from = lineStarts[i];
      const to = lineStarts[i] + (lines[i]?.length ?? 0);
      if (to > from) {
        regions.push({ from, to });
      }
    }
  }

  return regions;
}

// ---------------------------------------------------------------------------
// ViewPlugin: builds decorations by parsing markdown in PlainText regions
// ---------------------------------------------------------------------------

export const markdownOverlayPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      const oldRegions = update.startState.field(markdownRegionsField);
      const newRegions = update.state.field(markdownRegionsField);
      if (newRegions.length > 0 && oldRegions !== newRegions) {
        this.decorations = this.buildDecorations(update.view);
      } else if (update.docChanged) {
        this.decorations = this.decorations.map(update.changes);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const regions = view.state.field(markdownRegionsField);
      if (regions.length === 0) return Decoration.none;

      const ranges: any[] = [];
      const state = view.state;
      const docText = state.doc.toString();

      for (const region of regions) {
        const text = docText.slice(region.from, region.to);
        const tree = gfmParser.parse(text);

        tree.iterate({
          enter(node) {
            if (node.type.isTop) return;
            const st = getStyleTags(node);
            if (!st) return;
            const cls = highlightingFor(state, st.tags);
            if (cls) {
              const from = region.from + node.from;
              const to = region.from + node.to;
              if (from < to) {
                ranges.push(Decoration.mark({ class: cls }).range(from, to));
              }
            }
          },
        });
      }

      // Sort by from position for DecorationSet
      ranges.sort((a: any, b: any) => a.from - b.from || a.to - b.to);
      return Decoration.set(ranges, true);
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);


import { StateField, StateEffect } from "@codemirror/state";
import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { highlightingFor } from "@codemirror/language";
import { Tree } from "@lezer/common";
import { getStyleTags } from "@lezer/highlight";
import { NodeID, semanticNodeSet } from "./semanticNodeSet";
import type { Document, ParsedLine } from "@/calculator/document";

// ---------------------------------------------------------------------------
// State effect & field
// ---------------------------------------------------------------------------

export const setSemanticTree = StateEffect.define<Tree>();

export const semanticTreeField = StateField.define<Tree>({
  create() {
    return Tree.empty;
  },
  update(tree, tr) {
    for (const e of tr.effects) {
      if (e.is(setSemanticTree)) return e.value;
    }
    if (tr.docChanged) return Tree.empty;
    return tree;
  },
});

// ---------------------------------------------------------------------------
// ViewPlugin: builds decorations from the tree + HighlightStyle
// ---------------------------------------------------------------------------

export const semanticHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      const oldTree = update.startState.field(semanticTreeField);
      const newTree = update.state.field(semanticTreeField);
      if (newTree !== Tree.empty && oldTree !== newTree) {
        // New tree arrived → rebuild from tree
        this.decorations = this.buildDecorations(update.view);
      } else if (update.docChanged) {
        // Doc changed, no new tree yet → shift existing decorations
        this.decorations = this.decorations.map(update.changes);
      } else if (themeChanged(update)) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const tree = view.state.field(semanticTreeField);
      if (tree === Tree.empty) return Decoration.none;

      const ranges: any[] = [];
      const state = view.state;

      tree.iterate({
        enter(node) {
          if (node.type.isTop) return;
          const st = getStyleTags(node);
          if (!st) return;
          const cls = highlightingFor(state, st.tags);
          if (cls) {
            ranges.push(
              Decoration.mark({ class: cls }).range(node.from, node.to),
            );
          }
        },
      });

      return Decoration.set(ranges, true);
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

function themeChanged(update: ViewUpdate): boolean {
  // Detect theme/HighlightStyle reconfiguration
  return (
    update.startState.facet(EditorView.darkTheme) !==
    update.state.facet(EditorView.darkTheme)
  );
}

// ---------------------------------------------------------------------------
// Tree builder: AST → Lezer Tree
// ---------------------------------------------------------------------------

interface Span {
  typeId: number;
  from: number;
  to: number;
}

export function buildSemanticTree(ast: Document, docText: string): Tree {
  const spans: Span[] = [];
  const lines = docText.split("\n");

  // Pre-compute line start offsets
  const lineStarts: number[] = [0];
  for (let i = 0; i < lines.length; i++) {
    lineStarts.push(lineStarts[i] + lines[i].length + 1);
  }

  function toAbsolute(line: number, column: number): number {
    if (line < 1 || line > lines.length) return -1;
    return lineStarts[line - 1] + column;
  }

  function addSpan(typeId: number, from: number, length: number) {
    if (from >= 0 && length > 0) {
      const to = from + length;
      if (to <= docText.length) {
        spans.push({ typeId, from, to });
      }
    }
  }

  function walkLine(node: ParsedLine, lineIndex: number) {
    if (!node || typeof node !== "object" || !("type" in node)) return;

    const lineNum = lineIndex + 1;
    const lineStart = lineStarts[lineIndex] ?? 0;

    switch (node.type) {
      case "Heading": {
        const from = lineStart;
        const to = lineStart + (lines[lineIndex]?.length ?? 0);
        if (from < to) spans.push({ typeId: NodeID.Heading, from, to });
        break;
      }
      case "VariableAssignment": {
        const loc: { line: number; column: number; } = (node as any).location;
        if (loc && typeof loc === "object" && "line" in loc) {
          const from = toAbsolute(loc.line, loc.column);
          if (from >= 0)
            addSpan(NodeID.VariableDefinition, from, node.name.length);
        }
        if ("value" in node && node.value) {
          walkExpression(node.value as any, lineNum);
        }
        break;
      }
      default: {
        walkExpression(node as any, lineNum);
      }
    }
  }

  function walkExpression(node: any, _lineNum: number) {
    if (!node || typeof node !== "object") return;

    const loc = node.location;
    const hasLoc = loc && typeof loc === "object" && "line" in loc;

    switch (node.type) {
      case "Variable": {
        if (hasLoc) {
          const from = toAbsolute(loc.line, loc.column);
          addSpan(NodeID.Variable, from, node.name.length);
        }
        break;
      }
      case "Constant": {
        if (hasLoc) {
          const from = toAbsolute(loc.line, loc.column);
          addSpan(NodeID.Constant, from, node.name.length);
        }
        break;
      }
      case "FunctionCall": {
        if (hasLoc) {
          const from = toAbsolute(loc.line, loc.column);
          addSpan(NodeID.FunctionCall, from, node.name.length);
        }
        if (node.arguments) {
          for (const arg of node.arguments) {
            walkExpression(arg, _lineNum);
          }
        }
        break;
      }
      case "BooleanLiteral": {
        if (hasLoc) {
          const from = toAbsolute(loc.line, loc.column);
          const text = node.value ? "true" : "false";
          addSpan(NodeID.BooleanLiteral, from, text.length);
        }
        break;
      }
      case "Value": {
        // Walk the numerical value for number highlighting
        if (node.value) walkExpression(node.value, _lineNum);
        if (node.unit) walkExpression(node.unit, _lineNum);
        break;
      }
      case "NumberLiteral": {
        if (hasLoc && node.sourceLength) {
          const from = toAbsolute(loc.line, loc.column);
          addSpan(NodeID.Number, from, node.sourceLength);
        }
        break;
      }
      case "PercentageLiteral": {
        if (hasLoc && node.sourceLength) {
          const from = toAbsolute(loc.line, loc.column);
          addSpan(NodeID.Number, from, node.sourceLength);
        }
        break;
      }
      case "Units": {
        if (node.terms) {
          for (const term of node.terms) {
            if (term.unit) walkExpression(term.unit, _lineNum);
          }
        }
        break;
      }
      case "Unit": {
        if (hasLoc) {
          const from = toAbsolute(loc.line, loc.column);
          const len = node.sourceLength ?? node.name.length;
          addSpan(NodeID.Unit, from, len);
        }
        break;
      }
      case "CurrencyUnit": {
        if (hasLoc) {
          const from = toAbsolute(loc.line, loc.column);
          addSpan(NodeID.Unit, from, node.name.length);
        }
        break;
      }
      case "PresentationFormat": {
        if (hasLoc && node.sourceLength) {
          const from = toAbsolute(loc.line, loc.column);
          addSpan(NodeID.Keyword, from, node.sourceLength);
        }
        break;
      }
      case "Conversion": {
        walkExpression(node.expression, _lineNum);
        // Operator token (to, as, in, ->)
        if (node.operatorToken) {
          const opLoc = node.operatorToken.location ?? node.operatorToken;
          if (opLoc && "line" in opLoc) {
            const from = toAbsolute(opLoc.line, opLoc.column);
            addSpan(NodeID.Keyword, from, node.operatorToken.length);
          }
        }
        if (node.target) walkExpression(node.target, _lineNum);
        break;
      }
      case "BinaryExpression": {
        walkExpression(node.left, _lineNum);
        // Operator token
        if (node.operatorToken) {
          const opLoc = node.operatorToken.location ?? node.operatorToken;
          if (opLoc && "line" in opLoc) {
            const from = toAbsolute(opLoc.line, opLoc.column);
            addSpan(NodeID.Operator, from, node.operatorToken.length);
          }
        }
        walkExpression(node.right, _lineNum);
        break;
      }
      case "UnaryExpression": {
        walkExpression(node.argument, _lineNum);
        break;
      }
      case "PostfixExpression": {
        walkExpression(node.argument, _lineNum);
        if (node.operatorToken) {
          const opLoc = node.operatorToken.location ?? node.operatorToken;
          if (opLoc && "line" in opLoc) {
            const from = toAbsolute(opLoc.line, opLoc.column);
            addSpan(NodeID.Operator, from, node.operatorToken.length);
          }
        }
        break;
      }
      case "ConditionalExpr": {
        if (node.ifToken) {
          const ifLoc = node.ifToken.location ?? node.ifToken;
          if (ifLoc && "line" in ifLoc) {
            const from = toAbsolute(ifLoc.line, ifLoc.column);
            addSpan(NodeID.Keyword, from, node.ifToken.length);
          }
        }
        walkExpression(node.condition, _lineNum);
        if (node.thenToken) {
          const thenLoc = node.thenToken.location ?? node.thenToken;
          if (thenLoc && "line" in thenLoc) {
            const from = toAbsolute(thenLoc.line, thenLoc.column);
            addSpan(NodeID.Keyword, from, node.thenToken.length);
          }
        }
        walkExpression(node.then, _lineNum);
        if (node.elseToken) {
          const elseLoc = node.elseToken.location ?? node.elseToken;
          if (elseLoc && "line" in elseLoc) {
            const from = toAbsolute(elseLoc.line, elseLoc.column);
            addSpan(NodeID.Keyword, from, node.elseToken.length);
          }
        }
        walkExpression(node.else, _lineNum);
        break;
      }
      case "CompositeValue": {
        if (node.values) {
          for (const v of node.values) walkExpression(v, _lineNum);
        }
        break;
      }
      case "PlainDate":
      case "PlainTime": {
        if (hasLoc && node.sourceLength) {
          const from = toAbsolute(loc.line, loc.column);
          addSpan(NodeID.DateTime, from, node.sourceLength);
        }
        break;
      }
      case "PlainDateTime": {
        if (hasLoc && node.sourceLength) {
          const from = toAbsolute(loc.line, loc.column);
          addSpan(NodeID.DateTime, from, node.sourceLength);
        }
        break;
      }
      case "ZonedDateTime": {
        if (hasLoc && node.sourceLength) {
          const from = toAbsolute(loc.line, loc.column);
          addSpan(NodeID.DateTime, from, node.sourceLength);
        }
        break;
      }
      case "Instant": {
        if (hasLoc && node.sourceLength) {
          const from = toAbsolute(loc.line, loc.column);
          addSpan(NodeID.DateTime, from, node.sourceLength);
        }
        break;
      }
      case "TimezoneName":
      case "UTCOffset": {
        if (hasLoc && node.sourceLength) {
          const from = toAbsolute(loc.line, loc.column);
          addSpan(NodeID.DateTime, from, node.sourceLength);
        }
        break;
      }
    }
  }

  for (let i = 0; i < ast.lines.length; i++) {
    walkLine(ast.lines[i], i);
  }

  // Sort spans by from, then by to (for deterministic order)
  spans.sort((a, b) => a.from - b.from || a.to - b.to);

  // Remove overlapping spans (keep earlier/shorter)
  const filtered: Span[] = [];
  let lastEnd = -1;
  for (const s of spans) {
    if (s.from >= lastEnd) {
      filtered.push(s);
      lastEnd = s.to;
    }
  }

  // Build postfix buffer: children first, then Document parent
  const buffer: number[] = [];
  for (const s of filtered) {
    buffer.push(s.typeId, s.from, s.to, 4);
  }
  // Document node wrapping all children
  const docLength = docText.length;
  buffer.push(NodeID.Document, 0, docLength, (filtered.length + 1) * 4);

  return Tree.build({
    buffer,
    nodeSet: semanticNodeSet,
    topID: NodeID.Document,
    length: docLength,
  });
}

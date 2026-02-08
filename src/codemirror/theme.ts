import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";

export const lightTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      backgroundColor: "#ffffff",
      color: "#1a1a1a",
    },
    ".cm-scroller": { overflow: "auto" },
    ".cm-content": {
      fontFamily: "monospace",
      fontSize: "15px",
      caretColor: "#1a1a1a",
    },
    ".cm-gutters": {
      fontFamily: "monospace",
      fontSize: "15px",
      backgroundColor: "#fafafa",
      color: "#999",
      borderRight: "1px solid #e5e5e5",
    },
    ".cm-activeLineGutter": { backgroundColor: "#f0f0f0" },
    ".cm-activeLine": { backgroundColor: "rgba(0, 0, 0, 0.03)" },
    ".cm-selectionBackground": { backgroundColor: "#d0e8ff" },
    "&.cm-focused .cm-selectionBackground": { backgroundColor: "#b3d4fc" },
    ".cm-foldGutter span": { color: "#999" },

    ".cm-calc-error": {
      textDecoration: "underline wavy #d32f2f",
      textDecorationSkipInk: "none",
    },
  },
  { dark: false },
);

const lightHighlightStyle = HighlightStyle.define([
  {
    tag: tags.heading1,
    fontWeight: "900",
    color: "#1a1a1a",
    textDecoration: "underline",
  },
  {
    tag: tags.heading2,
    fontWeight: "800",
    color: "#1a1a1a",
    textDecoration: "underline",
  },
  {
    tag: tags.heading3,
    fontWeight: "700",
    color: "#1a1a1a",
    textDecoration: "underline",
  },
  {
    tag: tags.heading4,
    fontWeight: "600",
    color: "#1a1a1a",
    textDecoration: "underline",
  },
  {
    tag: tags.heading5,
    fontWeight: "500",
    color: "#1a1a1a",
    textDecoration: "underline",
  },
  {
    tag: tags.heading6,
    fontWeight: "400",
    color: "#1a1a1a",
    textDecoration: "underline",
  },
  { tag: tags.comment, color: "#8b8b8b", fontStyle: "italic" },
  { tag: tags.number, color: "#c41a16" },
  { tag: tags.keyword, color: "#0d7377" },
  { tag: tags.operator, color: "#444" },
  { tag: tags.variableName, color: "#1a73e8" },
  { tag: tags.bracket, color: "#555" },
  { tag: tags.constant(tags.variableName), color: "#c41a16" },
  { tag: tags.function(tags.variableName), color: "#e07800" },
  { tag: tags.unit, color: "#9334e9" },
  { tag: tags.bool, color: "#c41a16" },
  { tag: tags.special(tags.string), color: "#2e7d32" },
  { tag: tags.definition(tags.variableName), color: "#1a73e8" },
  // Markdown inline styles
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.link, color: "#1a73e8", textDecoration: "underline" },
  { tag: tags.url, color: "#1a73e8" },
  {
    tag: tags.monospace,
    color: "#c41a16",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: "3px",
  },
  { tag: tags.quote, color: "#666" },
  { tag: tags.list, color: "#c41a16" },
  { tag: tags.contentSeparator, color: "#999" },
  { tag: tags.processingInstruction, color: "#999" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
]);

export const lightHighlight = syntaxHighlighting(lightHighlightStyle);

export const darkTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      backgroundColor: "#1a1a1a",
      color: "#e0e0e0",
    },
    ".cm-scroller": { overflow: "auto" },
    ".cm-content": {
      fontFamily: "monospace",
      fontSize: "15px",
      caretColor: "#e0e0e0",
    },
    ".cm-gutters": {
      fontFamily: "monospace",
      fontSize: "15px",
      backgroundColor: "#1e1e1e",
      color: "#666",
      borderRight: "1px solid #333",
    },
    ".cm-activeLineGutter": { backgroundColor: "#252525" },
    ".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.035)" },
    ".cm-selectionBackground": { backgroundColor: "#264f78" },
    "&.cm-focused .cm-selectionBackground": { backgroundColor: "#264f78" },
    ".cm-foldGutter span": { color: "#666" },

    ".cm-calc-error": {
      textDecoration: "underline wavy #ff6b6b",
      textDecorationSkipInk: "none",
    },
  },
  { dark: true },
);

const darkHighlightStyle = HighlightStyle.define([
  {
    tag: tags.heading1,
    fontWeight: "900",
    color: "#e0e0e0",
    textDecoration: "underline",
  },
  {
    tag: tags.heading2,
    fontWeight: "800",
    color: "#e0e0e0",
    textDecoration: "underline",
  },
  {
    tag: tags.heading3,
    fontWeight: "700",
    color: "#e0e0e0",
    textDecoration: "underline",
  },
  {
    tag: tags.heading4,
    fontWeight: "600",
    color: "#e0e0e0",
    textDecoration: "underline",
  },
  {
    tag: tags.heading5,
    fontWeight: "500",
    color: "#e0e0e0",
    textDecoration: "underline",
  },
  {
    tag: tags.heading6,
    fontWeight: "400",
    color: "#e0e0e0",
    textDecoration: "underline",
  },
  { tag: tags.comment, color: "#6a6a6a", fontStyle: "italic" },
  { tag: tags.number, color: "#ff7b72" },
  { tag: tags.keyword, color: "#3dbdc2" },
  { tag: tags.operator, color: "#aaa" },
  { tag: tags.variableName, color: "#6cb6ff" },
  { tag: tags.bracket, color: "#888" },
  { tag: tags.constant(tags.variableName), color: "#ff7b72" },
  { tag: tags.function(tags.variableName), color: "#f0a04b" },
  { tag: tags.unit, color: "#c084fc" },
  { tag: tags.bool, color: "#ff7b72" },
  { tag: tags.special(tags.string), color: "#56d364" },
  { tag: tags.definition(tags.variableName), color: "#6cb6ff" },
  // Markdown inline styles
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.link, color: "#6cb6ff", textDecoration: "underline" },
  { tag: tags.url, color: "#6cb6ff", textDecoration: "underline" },
  {
    tag: tags.monospace,
    color: "#ff7b72",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: "3px",
  },
  { tag: tags.quote, color: "#8b949e", fontStyle: "italic" },
  { tag: tags.list, color: "#ff7b72" },
  { tag: tags.contentSeparator, color: "#666" },
  { tag: tags.processingInstruction, color: "#666" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
]);

export const darkHighlight = syntaxHighlighting(darkHighlightStyle);

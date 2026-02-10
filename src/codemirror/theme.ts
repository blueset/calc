import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";

export const editorTheme = EditorView.theme({
  "&": {
    minHeight: "100cqh",
    backgroundColor: "var(--ed-bg)",
    color: "var(--ed-fg)",
  },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--ed-fg)" },
  ".cm-scroller": { overflow: "auto" },
  ".cm-content": {
    fontFamily: "monospace",
    fontSize: "15px",
    caretColor: "var(--ed-fg)",
  },
  ".cm-gutters": {
    fontFamily: "monospace",
    fontSize: "15px",
    backgroundColor: "var(--ed-gutter-bg)",
    color: "var(--ed-gutter-fg)",
    borderRight: "1px solid var(--ed-gutter-border)",
  },
  ".cm-activeLineGutter": { backgroundColor: "var(--ed-active-gutter)" },
  ".cm-activeLine": { backgroundColor: "var(--ed-active-line)" },
  ".cm-selectionBackground": {
    backgroundColor: "var(--ed-selection) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--ed-selection-focus)",
  },
  ".cm-foldGutter span": { color: "var(--ed-gutter-fg)" },
  ".cm-selectionMatch": { backgroundColor: "var(--ed-selection-match)" },
  ".cm-calc-error": {
    textDecoration: "underline wavy var(--ed-error)",
    textDecorationSkipInk: "none",
  },
});

const highlightStyle = HighlightStyle.define([
  {
    tag: tags.heading1,
    fontWeight: "700",
    color: "var(--ed-red)",
    textDecoration: "underline",
    textDecorationColor: "var(--ed-muted)",
    textUnderlineOffset: "15%",
    textDecorationThickness: "10%",
  },
  {
    tag: tags.heading2,
    fontWeight: "600",
    color: "var(--ed-red)",
    textDecoration: "underline",
    textDecorationColor: "var(--ed-muted)",
    textUnderlineOffset: "15%",
    textDecorationThickness: "7.5%",
  },
  {
    tag: tags.heading3,
    fontWeight: "500",
    color: "var(--ed-red)",
    textDecoration: "underline",
    textDecorationColor: "var(--ed-muted)",
    textUnderlineOffset: "15%",
    textDecorationThickness: "5%",
  },
  {
    tag: tags.heading4,
    fontWeight: "400",
    color: "var(--ed-red)",
    textDecoration: "underline",
    textDecorationColor: "var(--ed-muted)",
    textUnderlineOffset: "15%",
    textDecorationThickness: "4%",
  },
  {
    tag: tags.heading5,
    fontWeight: "300",
    color: "var(--ed-red)",
    textDecoration: "underline",
    textDecorationColor: "var(--ed-muted)",
    textUnderlineOffset: "15%",
    textDecorationThickness: "3%",
  },
  {
    tag: tags.heading6,
    fontWeight: "100",
    color: "var(--ed-red)",
    textDecoration: "underline",
    textDecorationColor: "var(--ed-muted)",
    textUnderlineOffset: "15%",
    textDecorationThickness: "2%",
  },
  { tag: tags.comment, color: "var(--ed-comment)", fontStyle: "italic" },
  { tag: tags.number, color: "var(--ed-orange)" },
  { tag: tags.keyword, color: "var(--ed-pink)" },
  { tag: tags.operator, color: "var(--ed-cyan)" },
  { tag: tags.variableName, color: "var(--ed-yellow)" },
  { tag: tags.bracket, color: "var(--ed-bracket)" },
  { tag: tags.constant(tags.variableName), color: "var(--ed-orange)" },
  { tag: tags.function(tags.variableName), color: "var(--ed-blue)" },
  { tag: tags.unit, color: "var(--ed-cyan)" },
  { tag: tags.bool, color: "var(--ed-orange)" },
  { tag: tags.special(tags.string), color: "var(--ed-green)" },
  { tag: tags.definition(tags.variableName), color: "var(--ed-red)" },
  // Markdown inline styles
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.link, color: "var(--ed-cyan)", textDecoration: "underline" },
  {
    tag: tags.url,
    color: "var(--ed-cyan)",
    textDecoration: "var(--ed-url-decoration)",
  },
  {
    tag: tags.monospace,
    color: "var(--ed-green)",
    backgroundColor: "var(--ed-mono-bg)",
    borderRadius: "3px",
  },
  { tag: tags.quote, color: "var(--ed-quote)", fontStyle: "italic" },
  { tag: tags.list, color: "var(--ed-fg)" },
  { tag: tags.contentSeparator, color: "var(--ed-muted)" },
  { tag: tags.separator, color: "var(--ed-yellow)" },
  { tag: tags.processingInstruction, color: "var(--ed-muted)" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
]);

export const editorHighlight = syntaxHighlighting(highlightStyle);

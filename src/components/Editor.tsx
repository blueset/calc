import { useRef, useEffect, useCallback, RefObject } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
} from "@codemirror/language";
import { calcLanguage } from "@/codemirror/language";
import {
  semanticTreeField,
  semanticHighlightPlugin,
  setSemanticTree,
  buildSemanticTree,
} from "@/codemirror/semanticHighlight";
import {
  errorLintField,
  setErrorDiagnostics,
  extractErrorDiagnostics,
} from "@/codemirror/errorLinting";
import { evalTooltipExtension } from "@/codemirror/evalTooltip";
import { resultAlignPlugin, type LinePosition } from "@/codemirror/resultAlign";
import { foldHeadingsService } from "@/codemirror/foldHeadings";
import {
  lightTheme,
  darkTheme,
  lightHighlight,
  darkHighlight,
} from "@/codemirror/theme";
import type { Document } from "@/calculator/document";
import type { LineResult, CalculationResult } from "@/calculator/calculator";
import { FONT_FAMILY_MAP } from "@/constants";

interface EditorProps {
  initialDoc: string;
  onChange: (value: string) => void;
  onLinePositions?: (positions: LinePosition[], contentHeight: number) => void;
  onScroll?: (scrollTop: number) => void;
  onActiveLine?: (line: number) => void;
  ast?: Document | null;
  results?: LineResult[];
  errors?: CalculationResult["errors"];
  debugMode?: boolean;
  resolvedTheme?: "light" | "dark";
  fontSize?: number;
  fontFamily?: string;
  lineWrapping?: boolean;
  editorViewRef?: RefObject<EditorView | null>;
}

export function Editor({
  initialDoc,
  onChange,
  onLinePositions,
  onScroll,
  onActiveLine,
  ast,
  results,
  errors,
  debugMode,
  resolvedTheme = "light",
  fontSize = 15,
  fontFamily = "monospace",
  lineWrapping: lineWrappingProp = false,
  editorViewRef,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onLinePositionsRef = useRef(onLinePositions);
  const onScrollRef = useRef(onScroll);
  const onActiveLineRef = useRef(onActiveLine);
  const resultsRef = useRef<LineResult[]>([]);
  const astRef = useRef<Document | null>(ast);
  const debugCompartmentRef = useRef(new Compartment());
  const themeCompartmentRef = useRef(new Compartment());
  const fontCompartmentRef = useRef(new Compartment());
  const wrapCompartmentRef = useRef(new Compartment());

  onChangeRef.current = onChange;
  onLinePositionsRef.current = onLinePositions;
  onScrollRef.current = onScroll;
  onActiveLineRef.current = onActiveLine;
  resultsRef.current = results ?? [];
  astRef.current = ast;

  const getFontTheme = useCallback((size: number, family: string) => {
    const ff = FONT_FAMILY_MAP[family] || family;
    return EditorView.theme({
      ".cm-content": {
        fontFamily: ff,
        fontSize: `${size}px`,
        lineHeight: "1.6",
      },
      ".cm-gutters": { fontFamily: ff, fontSize: `${size}px` },
    });
  }, []);

  const createView = useCallback(() => {
    if (!containerRef.current) return;

    const debugCompartment = debugCompartmentRef.current;
    const themeCompartment = themeCompartmentRef.current;
    const fontCompartment = fontCompartmentRef.current;
    const wrapCompartment = wrapCompartmentRef.current;

    const debugExtensions = debugMode
      ? [errorLintField, evalTooltipExtension(() => resultsRef.current, () => astRef.current)]
      : [];

    const currentTheme =
      resolvedTheme === "dark"
        ? [darkTheme, darkHighlight]
        : [lightTheme, lightHighlight];

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        lineNumbers(),
        drawSelection(),
        highlightActiveLine(),
        bracketMatching(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
        foldGutter(),
        foldHeadingsService,
        calcLanguage,
        semanticTreeField,
        semanticHighlightPlugin,
        debugCompartment.of(debugExtensions),
        fontCompartment.of(getFontTheme(fontSize, fontFamily)),
        wrapCompartment.of(lineWrappingProp ? EditorView.lineWrapping : []),
        themeCompartment.of(currentTheme),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
          if (update.selectionSet || update.docChanged) {
            const line = update.state.doc.lineAt(update.state.selection.main.head).number;
            onActiveLineRef.current?.(line);
          }
        }),
        resultAlignPlugin((positions, contentHeight) => {
          onLinePositionsRef.current?.(positions, contentHeight);
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    if (editorViewRef) editorViewRef.current = view;

    view.scrollDOM.addEventListener("scroll", () => {
      onScrollRef.current?.(view.scrollDOM.scrollTop);
    });

    return view;
  }, [
    initialDoc,
    editorViewRef,
    // Note: debugMode, resolvedTheme, fontSize, fontFamily are intentionally omitted.
    // These are handled dynamically via Compartments in the useEffects below.
    // Including them would cause unnecessary editor recreation.
  ]);

  useEffect(() => {
    const view = createView();
    return () => {
      view?.destroy();
    };
  }, [createView]);

  // Toggle debug extensions dynamically
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const debugExtensions = debugMode
      ? [errorLintField, evalTooltipExtension(() => resultsRef.current, () => astRef.current)]
      : [];
    view.dispatch({
      effects: debugCompartmentRef.current.reconfigure(debugExtensions),
    });
  }, [debugMode]);

  // Switch theme dynamically
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(
        resolvedTheme === "dark"
        ? [darkTheme, darkHighlight]
        : [lightTheme, lightHighlight],
      ),
    });
  }, [resolvedTheme]);

  // Switch font dynamically
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: fontCompartmentRef.current.reconfigure(
        getFontTheme(fontSize, fontFamily),
      ),
    });
  }, [fontSize, fontFamily, getFontTheme]);

  // Toggle line wrapping dynamically
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: wrapCompartmentRef.current.reconfigure(
        lineWrappingProp ? EditorView.lineWrapping : [],
      ),
    });
  }, [lineWrappingProp]);

  // Update semantic highlights when AST changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !ast) return;
    const docText = view.state.doc.toString();
    const tree = buildSemanticTree(ast, docText);
    view.dispatch({
      effects: setSemanticTree.of(tree),
    });
  }, [ast]);

  // Update error diagnostics in debug mode
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !debugMode || !errors) return;
    const diagnostics = extractErrorDiagnostics(errors);
    view.dispatch({
      effects: setErrorDiagnostics.of(diagnostics),
    });
  }, [errors, debugMode]);

  return <div key="editor-container" ref={containerRef} className="h-full" />;
}

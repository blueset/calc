import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { EditorView } from "@codemirror/view";
import { Toolbar } from "@/components/Toolbar";
import { Editor } from "@/components/Editor";
import { ResultsPanel } from "@/components/ResultsPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { DebugPanel } from "@/components/DebugPanel";
import { useCalculator } from "@/hooks/useCalculator";
import {
  SettingsContext,
  useSettingsState,
  useSettings,
} from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import {
  DEFAULT_DOCUMENT,
  DEMO_DOCUMENT,
  DOCUMENT_STORAGE_KEY,
  FONT_SIZE_MAP,
} from "@/constants";
import type { LinePosition } from "@/codemirror/resultAlign";
import { ScrollArea } from "./components/ui/scroll-area";

function loadDocument(demoMode: boolean): string {
  if (demoMode) return DEMO_DOCUMENT;
  try {
    const stored = localStorage.getItem(DOCUMENT_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_DOCUMENT;
}

function AppContent() {
  const [isInDemoMode, setIsInDemoMode] = useState(
    () => window.location.hash === "#demo",
  );
  const [input, setInput] = useState(() => loadDocument(isInDemoMode));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [linePositions, setLinePositions] = useState<LinePosition[]>([]);
  const [activeLine, setActiveLine] = useState(1);
  const editorViewRef = useRef<EditorView | null>(null);
  const initialDocRef = useRef(loadDocument(isInDemoMode));
  const [editorKey, setEditorKey] = useState(0);

  const { settings, updateSetting } = useSettings();
  const resolvedTheme = useTheme(settings.theme);

  const enterDemoMode = useCallback(() => {
    window.location.hash = "#demo";
  }, []);

  const exitDemoMode = useCallback(() => {
    history.pushState(null, "", location.pathname + location.search);
    setIsInDemoMode(false);
    const doc = loadDocument(false);
    setInput(doc);
    initialDocRef.current = doc;
    setEditorKey((k) => k + 1);
  }, []);

  // Sync demo mode state with URL hash (handles back/forward + direct URL access)
  useEffect(() => {
    const handler = () => {
      const demo = window.location.hash === "#demo";
      setIsInDemoMode(demo);
      const doc = loadDocument(demo);
      setInput(doc);
      initialDocRef.current = doc;
      setEditorKey((k) => k + 1);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const calcSettings = useMemo(() => {
    const { debugMode, debounce, ...rest } = settings;
    return rest;
  }, [settings]);

  const { results, ast, errors, isReady, exchangeRatesVersion } = useCalculator(
    input,
    calcSettings,
    settings.debounce,
  );

  // Persist document to localStorage
  useEffect(() => {
    if (isInDemoMode) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DOCUMENT_STORAGE_KEY, input);
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [input, isInDemoMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        updateSetting("debugMode", !settings.debugMode);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [settings.debugMode, updateSetting]);

  const handleLinePositions = useCallback((positions: LinePosition[]) => {
    setLinePositions(positions);
  }, []);

  const handleFocusLine = useCallback((line: number) => {
    const view = editorViewRef.current;
    if (!view) return;
    const pos = view.state.doc.line(line).from;
    view.dispatch({
      selection: { anchor: pos },
    });
  }, []);

  const handleThemeToggle = useCallback(() => {
    const next = resolvedTheme === "light" ? "dark" : "light";
    updateSetting("theme", next);
  }, [resolvedTheme, updateSetting]);

  const fontSize = FONT_SIZE_MAP[settings.fontSize];

  return (
    <div className="flex flex-col bg-background h-svh text-foreground">
      <Toolbar
        onSettingsClick={() => setSettingsOpen(true)}
        theme={resolvedTheme}
        onThemeToggle={handleThemeToggle}
        exchangeRatesVersion={exchangeRatesVersion}
        isInDemoMode={isInDemoMode}
        onEnterDemoMode={enterDemoMode}
        onExitDemoMode={exitDemoMode}
      />
      <div className="flex flex-col flex-1 mx-auto w-full max-w-4xl min-h-0">
        <ScrollArea className="flex-1 h-0 min-h-0 size-container">
          <div className="flex flex-row min-h-full">
            <div className="flex flex-col flex-1 min-w-0">
              {isReady ? (
                <Editor
                  key={editorKey}
                  initialDoc={initialDocRef.current}
                  onChange={setInput}
                  onLinePositions={handleLinePositions}
                  onActiveLine={setActiveLine}
                  ast={ast}
                  results={results}
                  errors={errors}
                  debugMode={settings.debugMode}
                  resolvedTheme={resolvedTheme}
                  fontSize={fontSize}
                  fontFamily={settings.fontFamily}
                  lineWrapping={settings.lineWrapping}
                  editorViewRef={editorViewRef}
                />
              ) : (
                <div className="flex justify-center items-center h-full text-muted-foreground">
                  Loading...
                </div>
              )}
            </div>
            <div className="border-border border-t md:border-t-0 md:border-l w-1/3 max-w-60 shrink-0">
              <ResultsPanel
                results={results}
                linePositions={linePositions}
                activeLine={activeLine}
                fontSize={fontSize}
                fontFamily={settings.fontFamily}
                onFocusLine={handleFocusLine}
              />
            </div>
          </div>
        </ScrollArea>
        {settings.debugMode && (
          // <div className="h-[250px] shrink-0">
          <DebugPanel ast={ast} errors={errors} />
          // </div>
        )}
      </div>
      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function App() {
  const settingsValue = useSettingsState();

  return (
    <SettingsContext.Provider value={settingsValue}>
      <AppContent />
    </SettingsContext.Provider>
  );
}

export default App;

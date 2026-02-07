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
import { DEFAULT_DOCUMENT, FONT_SIZE_MAP } from "@/constants";
import type { LinePosition } from "@/codemirror/resultAlign";

const DOCUMENT_STORAGE_KEY = "calc-document";

function loadDocument(): string {
  try {
    const stored = localStorage.getItem(DOCUMENT_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_DOCUMENT;
}

function AppContent() {
  const [input, setInput] = useState(loadDocument);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [linePositions, setLinePositions] = useState<LinePosition[]>([]);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [activeLine, setActiveLine] = useState(1);
  const editorViewRef = useRef<EditorView | null>(null);
  const initialDocRef = useRef(loadDocument());

  const { settings, updateSetting } = useSettings();
  const resolvedTheme = useTheme(settings.theme);

  const calcSettings = useMemo(() => {
    const { debugMode, debounce, ...rest } = settings;
    return rest;
  }, [settings]);

  const { results, ast, errors, isReady } = useCalculator(
    input,
    calcSettings,
    settings.debounce,
  );

  // Persist document to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DOCUMENT_STORAGE_KEY, input);
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [input]);

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

  const handleLinePositions = useCallback(
    (positions: LinePosition[], height: number) => {
      setLinePositions(positions);
      setContentHeight(height);
    },
    [],
  );

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
      />
      <div className="flex flex-col flex-1 mx-auto w-full max-w-4xl min-h-0">
        <div className="flex flex-row flex-1 h-0 min-h-0">
          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            {isReady ? (
              <Editor
                initialDoc={initialDocRef.current}
                onChange={setInput}
                onLinePositions={handleLinePositions}
                onScroll={setScrollTop}
                onActiveLine={setActiveLine}
                ast={ast}
                results={results}
                errors={errors}
                debugMode={settings.debugMode}
                resolvedTheme={resolvedTheme}
                fontSize={fontSize}
                fontFamily={settings.fontFamily}
                editorViewRef={editorViewRef}
              />
            ) : (
              <div className="flex justify-center items-center h-full text-muted-foreground">
                Loading...
              </div>
            )}
          </div>
          <div className="border-border border-t md:border-t-0 md:border-l w-1/3 max-w-60 h-auto shrink-0">
            <ResultsPanel
              results={results}
              linePositions={linePositions}
              contentHeight={contentHeight}
              scrollTop={scrollTop}
              activeLine={activeLine}
              fontSize={fontSize}
              fontFamily={settings.fontFamily}
            />
          </div>
        </div>
        {settings.debugMode && (
          <div className="h-[250px] shrink-0">
            <DebugPanel ast={ast} errors={errors} />
          </div>
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

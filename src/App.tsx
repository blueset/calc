import { useState, useRef, useMemo, useCallback, useEffect, useSyncExternalStore, useEffectEvent } from "react";
import { EditorView } from "@codemirror/view";
import { Toolbar } from "@/components/Toolbar";
import { Editor } from "@/components/Editor";
import { ResultsPanel } from "@/components/ResultsPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { DebugPanel } from "@/components/DebugPanel";
import { ShareDialog } from "@/components/ShareDialog";
import { ImportConflictDialog } from "@/components/ImportConflictDialog";
import { Button } from "@/components/ui/button";
import { useCalculator } from "@/hooks/useCalculator";
import {
  SettingsContext,
  useSettingsState,
  useSettings,
} from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import {
  APP_NAME,
  DEFAULT_DOCUMENT,
  DEMO_DOCUMENT,
  DOCUMENT_STORAGE_KEY,
  FONT_SIZE_MAP,
} from "@/constants";
import { routeStore } from "@/lib/route-store";
import {
  parseHash,
  decodeSharePayload,
  buildShareUrl,
  buildPreviewHash,
  DEMO_HASH,
  type AppMode,
} from "@/lib/share";
import {
  exportMarkdown,
  importMarkdown,
  downloadTextFile,
  triggerFileOpen,
  makeWorksheetFilename,
} from "@/lib/worksheet-io";
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
  const hash = useSyncExternalStore(routeStore.subscribe, routeStore.getSnapshot);
  const { mode, payload } = useMemo(() => parseHash(hash), [hash]);

  const initRef = useRef<{ mode: AppMode; doc: string } | null>(null);
  if (initRef.current === null) {
    const m = parseHash(routeStore.getSnapshot()).mode;
    initRef.current = {
      mode: m,
      doc: m === "preview" ? "" : loadDocument(m === "demo"),
    };
  }
  const initialMode = initRef.current.mode;
  const initialDoc = initRef.current.doc;

  const [input, setInput] = useState(initialDoc);
  const [docReady, setDocReady] = useState(initialMode !== "preview");
  const [invalidLink, setInvalidLink] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [linePositions, setLinePositions] = useState<LinePosition[]>([]);
  const [viewport, setViewport] = useState<{ from: number; to: number }>({ from: 1, to: 1 });
  const [activeLine, setActiveLine] = useState(1);
  const editorViewRef = useRef<EditorView | null>(null);
  const initialDocRef = useRef(initialDoc);
  const [editorKey, setEditorKey] = useState(0);

  // Routing / async-race bookkeeping.
  const loadedHashRef = useRef<string | null>(
    initialMode === "preview" ? null : routeStore.getSnapshot(),
  );
  const decodeSeqRef = useRef(0);
  const encodeSeqRef = useRef(0);

  // Share / import dialog state.
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [importConflictOpen, setImportConflictOpen] = useState(false);
  const pendingImportRef = useRef<string>("");

  const { settings, updateSetting } = useSettings();
  const resolvedTheme = useTheme(settings.theme);

  const applyDocument = useCallback((text: string) => {
    setInput(text);
    initialDocRef.current = text;
    setEditorKey((k) => k + 1);
  }, []);

  const enterDemoMode = useCallback(() => {
    routeStore.navigate(DEMO_HASH);
  }, []);

  const exitDemoMode = useCallback(() => {
    routeStore.navigate("");
  }, []);

  // Load the document whenever the route changes.
  useEffect(() => {
    if (loadedHashRef.current === hash) return;
    loadedHashRef.current = hash;

    if (mode === "preview") {
      const seq = ++decodeSeqRef.current;
      setDocReady(false);
      setInvalidLink(false);
      decodeSharePayload(payload ?? "")
        .then((text) => {
          if (decodeSeqRef.current !== seq) return;
          applyDocument(text);
          setDocReady(true);
        })
        .catch(() => {
          if (decodeSeqRef.current !== seq) return;
          setInvalidLink(true);
          setDocReady(true);
        });
      return;
    }

    // default / demo: load synchronously and invalidate any pending decode.
    decodeSeqRef.current++;
    applyDocument(loadDocument(mode === "demo"));
    setInvalidLink(false);
    setDocReady(true);
  }, [hash, mode, payload, applyDocument]);

  const calcSettings = useMemo(() => {
    const { debugMode, debounce, ...rest } = settings;
    return rest;
  }, [settings]);

  const { results, ast, errors, isReady, exchangeRatesVersion, runCalculation } =
    useCalculator(input, calcSettings, settings.debounce);

  // Persist document to localStorage (default mode only).
  useEffect(() => {
    if (mode !== "default" || !docReady) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DOCUMENT_STORAGE_KEY, input);
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [input, mode, docReady]);

  // Keep the preview share URL in sync with edits, without history entries.
  useEffect(() => {
    if (mode !== "preview" || !docReady) return;
    const seq = ++encodeSeqRef.current;
    const timer = setTimeout(() => {
      buildPreviewHash(input)
        .then((previewHash) => {
          if (encodeSeqRef.current !== seq) return;
          routeStore.replacePreviewHash(previewHash);
        })
        .catch(() => {
          /* ignore encode failures */
        });
    }, 500);
    return () => {
      clearTimeout(timer);
      encodeSeqRef.current++;
    };
  }, [input, mode, docReady]);

  const handleShare = useCallback(async () => {
    setShareUrl(null);
    setShareDialogOpen(true);
    try {
      setShareUrl(await buildShareUrl(input));
    } catch {
      setShareUrl(null);
    }
  }, [input]);

  const handleExport = useCallback(
    (withResults: boolean) => {
      const markdown = exportMarkdown(input, results, withResults);
      downloadTextFile(makeWorksheetFilename(), markdown);
    },
    [input, results],
  );

  const handleImport = useCallback(async () => {
    const fileText = await triggerFileOpen();
    if (fileText == null) return;
    const transformed = importMarkdown(fileText, runCalculation);
    if (input.trim().length > 0) {
      pendingImportRef.current = transformed;
      setImportConflictOpen(true);
    } else {
      applyDocument(transformed);
    }
  }, [input, runCalculation, applyDocument]);

  const handleImportKeep = useCallback(() => {
    pendingImportRef.current = "";
    setImportConflictOpen(false);
  }, []);

  const handleImportBackupOverwrite = useCallback(() => {
    downloadTextFile(makeWorksheetFilename("calc-worksheet-backup"), input);
    applyDocument(pendingImportRef.current);
    pendingImportRef.current = "";
    setImportConflictOpen(false);
  }, [input, applyDocument]);

  const handleImportOverwrite = useCallback(() => {
    applyDocument(pendingImportRef.current);
    pendingImportRef.current = "";
    setImportConflictOpen(false);
  }, [applyDocument]);

  // Preview popover actions.
  const handlePreviewReturn = useCallback(() => {
    routeStore.navigate("");
  }, []);

  const handlePreviewBackupOverwrite = useCallback(() => {
    try {
      const existing = localStorage.getItem(DOCUMENT_STORAGE_KEY);
      if (existing) {
        downloadTextFile(makeWorksheetFilename("calc-worksheet-backup"), existing);
      }
      localStorage.setItem(DOCUMENT_STORAGE_KEY, input);
    } catch {
      /* ignore */
    }
    routeStore.navigate("");
  }, [input]);

  const handlePreviewOverwrite = useCallback(() => {
    try {
      localStorage.setItem(DOCUMENT_STORAGE_KEY, input);
    } catch {
      /* ignore */
    }
    routeStore.navigate("");
  }, [input]);

  // Keyboard shortcuts
  const handleKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === ",") {
      e.preventDefault();
      setSettingsOpen((prev) => !prev);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "d") {
      e.preventDefault();
      updateSetting("debugMode", !settings.debugMode);
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLinePositions = useCallback((positions: LinePosition[], vp: { from: number; to: number }) => {
    setLinePositions(positions);
    setViewport(vp);
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
        mode={mode}
        onSettingsClick={() => setSettingsOpen(true)}
        theme={resolvedTheme}
        onThemeToggle={handleThemeToggle}
        exchangeRatesVersion={exchangeRatesVersion}
        onShare={handleShare}
        onImport={handleImport}
        onExport={handleExport}
        onEnterDemoMode={enterDemoMode}
        onExitDemoMode={exitDemoMode}
        onPreviewReturn={handlePreviewReturn}
        onPreviewBackupOverwrite={handlePreviewBackupOverwrite}
        onPreviewOverwrite={handlePreviewOverwrite}
      />
      <div className="flex flex-col flex-1 mx-auto w-full max-w-4xl min-h-0">
        <ScrollArea className="flex-1 h-0 min-h-0 size-container">
          <div className="flex flex-row min-h-full">
            <div className="flex flex-col flex-1 min-w-0">
              {invalidLink ? (
                <div className="flex flex-col justify-center items-center gap-4 h-full text-muted-foreground">
                  <p>This shared link is invalid or could not be opened.</p>
                  <Button variant="outline" onClick={handlePreviewReturn}>
                    Return to {APP_NAME}
                  </Button>
                </div>
              ) : isReady && docReady ? (
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
                viewport={viewport}
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
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        url={shareUrl}
      />
      <ImportConflictDialog
        open={importConflictOpen}
        onOpenChange={setImportConflictOpen}
        onKeepExisting={handleImportKeep}
        onBackupOverwrite={handleImportBackupOverwrite}
        onOverwrite={handleImportOverwrite}
      />
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

import type { LineResult } from "@/calculator/calculator";
import type { LinePosition } from "@/codemirror/resultAlign";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import { FONT_CLASS_MAP } from "@/constants";
import { ResultCard } from "./ResultCard";
import { RovingFocusGroup } from "@radix-ui/react-roving-focus";

interface ResultsPanelProps {
  results: LineResult[];
  linePositions: LinePosition[];
  activeLine?: number;
  fontSize?: number;
  fontFamily?: string;
  onFocusLine?: (line: number) => void;
}

export function ResultsPanel({
  results,
  linePositions,
  activeLine,
  fontSize = 15,
  fontFamily = "monospace",
  onFocusLine,
}: ResultsPanelProps) {
  const { debugMode } = useSettings().settings;

  const ff = FONT_CLASS_MAP[fontFamily] || fontFamily;

  return (
    <div className={cn(``, ff)} style={{ fontSize: `${fontSize}px` }}>
      <RovingFocusGroup asChild orientation="vertical" loop>
        <div className="relative">
          {linePositions.map((pos) => {
            const result = results.find((r) => r.line === pos.line);
            if (pos.height === 0) return null;
            if (!result?.result || (!debugMode && result.hasError)) {
              return (
                <div
                  key={pos.line}
                  className={cn(
                    "right-0 left-0 absolute",
                    pos.line === activeLine && "bg-accent dark:bg-accent/40",
                  )}
                  style={{
                    top: pos.top + 4,
                    height: pos.height,
                  }}
                />
              );
            }

            return (
              <ResultCard
                key={pos.line}
                result={result}
                top={pos.top}
                height={pos.height}
                isActive={pos.line === activeLine}
                fontFamily={ff}
                debugMode={debugMode}
                onFocusLine={onFocusLine}
              />
            );
          })}
        </div>
      </RovingFocusGroup>
    </div>
  );
}

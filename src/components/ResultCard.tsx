import { LineResult } from "@/calculator/calculator";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { Copy } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResultRawValue } from "./ResultRawValue";
import { ResultAst } from "./ResultAst";
import { Button } from "./ui/button";
import { RovingFocusGroupItem } from "@radix-ui/react-roving-focus";

interface ResultCardProps {
  result: LineResult;
  top: number;
  height: number;
  isActive?: boolean;
  fontFamily?: string;
  debugMode?: boolean;
  onFocusLine?: (line: number) => void;
}

export function ResultCard({
  result,
  top,
  height,
  isActive,
  fontFamily,
  debugMode,
  onFocusLine,
}: ResultCardProps) {
  const [isCopied, setIsCopied] = useState<boolean | null>(null);
  const canCopy = !!navigator.clipboard?.writeText;

  const handleCopy = useCallback((result?: string | null) => {
    if (!result) return;
    navigator.clipboard
      ?.writeText(result)
      .then(() => {
        setIsCopied(true);
      })
      .catch((ex) => {
        console.error("Failed to copy text: ", ex);
        setIsCopied(false);
      })
      .finally(() => {
        setTimeout(() => setIsCopied(null), 1500);
      });
  }, []);

  return (
    <HoverCard openDelay={100} closeDelay={debugMode ? undefined : 0}>
      <HoverCardTrigger asChild>
        <RovingFocusGroupItem
          asChild
          focusable
          tabStopId={result.line.toString()}
          active={isActive}
        >
          <button
            className={cn(
              "right-0 left-0 absolute flex justify-end items-start hover:bg-accent dark:hover:bg-accent/50 px-1 md:px-3 transition-colors",
              result.hasError
                ? "text-destructive"
                : "text-foreground dark:text-muted-foreground",
              isActive && !isCopied && "bg-secondary hover:bg-secondary",
              {
                "bg-primary hover:bg-primary/75 dark:hover:bg-primary/75 text-primary-foreground font-medium":
                  isCopied === true,
                "bg-destructive hover:bg-destructive/80 text-destructive-foreground":
                  isCopied === false,
              },
            )}
            style={{
              translate: `0 ${top + 4}px`,
              height: height,
            }}
            onFocus={() => onFocusLine?.(result.line)}
            onClick={() => handleCopy(result.result)}
          >
            <span className="truncate">
              {isCopied
                ? "Copied!"
                : isCopied === false
                  ? "Failed to copy"
                  : result.result}
            </span>
          </button>
        </RovingFocusGroupItem>
      </HoverCardTrigger>
      <HoverCardContent
        side="left"
        align="start"
        className="space-y-2 w-auto max-w-(--radix-hover-card-content-available-width)"
      >
        <ScrollArea className="[&>div]:max-h-[5lh]">
          <div
            className={cn(
              "whitespace-pre-wrap",
              result.hasError && "text-destructive",
            )}
            style={{ fontFamily }}
          >
            {result.result}
          </div>
        </ScrollArea>
        {canCopy && (
          <Button
            variant="ghost"
            size="sm"
            className="-mx-2 -mt-2 last:-mb-2"
            onClick={() => handleCopy(result.result)}
          >
            {isCopied === true ? (
              <span className="text-green-700 dark:text-green-400 text-xs">
                <Copy className="inline-block mr-1 size-[1em]" /> Copied!
              </span>
            ) : isCopied === false ? (
              <span className="text-destructive text-xs">
                <Copy className="inline-block mr-1 size-[1em]" /> Failed to copy
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">
                <Copy className="inline-block mr-1 size-[1em]" /> Click to copy
              </span>
            )}
          </Button>
        )}

        {debugMode && (
          <>
            {result.rawValue && <ResultRawValue rawValue={result.rawValue} />}
            {result.ast && <ResultAst ast={result.ast} />}
          </>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

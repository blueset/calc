import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Document } from "@/calculator/document";
import type { CalculationResult } from "@/calculator/calculator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Button } from "./ui/button";

interface DebugPanelProps {
  ast: Document | null;
  errors: CalculationResult["errors"];
}

function ErrorMessage({ message }: { message: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex items-baseline gap-0.5 text-destructive">
      <Button
        variant="ghost"
        size="icon-xs"
        className="size-[1lh]"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
      </Button>
      <span className={expanded ? "whitespace-pre-wrap" : "truncate"}>
        {message}
      </span>
    </div>
  );
}

function AstNode({ node, depth = 0 }: { node: any; depth?: number }) {
  const [expanded, setExpanded] = useState(false);

  if (node === null || node === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }

  if (typeof node !== "object") {
    return (
      <span className="text-green-600 dark:text-green-400">
        {JSON.stringify(node)}
      </span>
    );
  }

  if (Array.isArray(node)) {
    if (node.length === 0)
      return <span className="text-muted-foreground">[]</span>;
    return (
      <div className="ml-3">
        {node.map((item, i) => (
          <div key={i} className="flex items-start gap-1">
            <span className="text-muted-foreground text-xs">{i}:</span>
            <AstNode node={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  const type = node.type;
  const entries = Object.entries(node).filter(
    ([k]) => k !== "type" && k !== "location",
  );

  return (
    <div>
      <button
        className="flex items-center gap-1 hover:bg-accent -ml-1 px-1 rounded text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {entries.length > 0 ? (
          expanded ? (
            <ChevronDown className="size-3 shrink-0" />
          ) : (
            <ChevronRight className="size-3 shrink-0" />
          )
        ) : (
          <span className="w-3" />
        )}
        {type && (
          <Badge variant="outline" className="px-1 py-0 text-xs">
            {type}
          </Badge>
        )}
        {!type && <span className="text-muted-foreground">{"{"}</span>}
      </button>
      {expanded && entries.length > 0 && (
        <div className="ml-3 pl-2 border-border border-l">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-start gap-1">
              <span className="text-blue-600 dark:text-blue-400 text-xs shrink-0">
                {key}:
              </span>
              <AstNode node={value} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DebugPanel({ ast, errors }: DebugPanelProps) {
  const totalErrors =
    errors.lexer.length + errors.parser.length + errors.runtime.length;

  return (
    <Accordion defaultValue={["debug"]}>
      <div className="flex flex-col border-border border-t">
        <AccordionItem value="debug">
          {/* <div className="flex items-center gap-2 px-3 py-1.5 border-border border-b font-medium text-xs"> */}
          <AccordionTrigger className="items-center gap-2 px-3 border-border border-b font-medium text-xs hover:no-underline">
            <span>Debug</span>
            {totalErrors > 0 && (
              <Badge variant="destructive" className="px-1.5 py-0 text-xs">
                {totalErrors} error{totalErrors !== 1 ? "s" : ""}
              </Badge>
            )}
          </AccordionTrigger>
          {/* </div> */}
          <AccordionContent className="pb-0">
            <ScrollArea className="h-64 overflow-auto">
              <div className="p-3 font-mono text-xs">
                {/* Errors */}
                {totalErrors > 0 && (
                  <div className="mb-3">
                    <h4 className="mb-1 font-semibold text-destructive">
                      Errors
                    </h4>
                    {errors.parser.map((e, i) => (
                      <ErrorMessage
                        key={`p${i}`}
                        message={`Line ${e.line}: ${e.error.message}`}
                      />
                    ))}
                    {errors.runtime.map((e, i) => (
                      <ErrorMessage
                        key={`r${i}`}
                        message={`${e.location ? `Line ${e.location.line}: ` : ""}${e.message}`}
                      />
                    ))}
                  </div>
                )}

                {/* AST Tree */}
                <h4 className="mb-1 font-semibold">AST</h4>
                {ast ? (
                  <AstNode node={ast} />
                ) : (
                  <span className="text-muted-foreground">No AST</span>
                )}
              </div>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>
      </div>
    </Accordion>
  );
}

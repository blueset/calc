import { hoverTooltip } from "@codemirror/view";
import type { LineResult } from "@/calculator/calculator";
import type { Document } from "@/calculator/document";

export function abbreviateResult(result: string | null): string | null {
  if (result === null) return null;
  return result.replace(/ based on:(\n    [^\n]+)+\n?/g, "; ");
}

export function evalTooltipExtension(
  getResults: () => LineResult[],
  ast: () => Document | null | undefined,
) {
  return hoverTooltip((view, pos) => {
    const line = view.state.doc.lineAt(pos);
    const results = getResults();
    const result = results.find((r) => r.line === line.number);
    if (!result?.result) return null;

    return {
      pos: line.from,
      end: line.to,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className =
          "cm-calc-tooltip rounded border bg-popover py-1 px-2 shadow font-mono text-sm";

        const typeSpan = document.createElement("span");
        typeSpan.className = "text-muted-foreground";
        typeSpan.textContent = `[${result.type}] `;
        dom.appendChild(typeSpan);

        const valueSpan = document.createElement("span");
        valueSpan.style.whiteSpace = "pre-wrap";
        valueSpan.textContent = abbreviateResult(result.result);
        if (result.hasError) valueSpan.className = "text-destructive";
        dom.appendChild(valueSpan);

        return { dom };
      },
    };
  });
}

import { ParsedLine } from "@/calculator/document";

interface ResultAstProps {
  ast: ParsedLine;
}

export function ResultAst({ ast }: ResultAstProps) {
  return (
    <div className="pt-2 border-t">
      <div className="text-muted-foreground text-xs">AST:</div>
      <pre className="max-h-[4lh] overflow-auto text-sm whitespace-pre-wrap">
        {JSON.stringify(ast, null, 2)}
      </pre>
    </div>
  );
}

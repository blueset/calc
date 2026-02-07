import { Heading, ParsedLine, PlainText } from "@/calculator/document";
import {
  BinaryExpressionNode,
  BooleanLiteralNode,
  CompositeValueNode,
  ConditionalExprNode,
  ConstantNode,
  ConversionNode,
  CurrencyUnitNode,
  FunctionCallNode,
  InstantKeywordNode,
  InstantRelativeNode,
  Node,
  NumberLiteralNode,
  PercentageLiteralNode,
  PlainDateNode,
  PlainDateTimeNode,
  PlainTimeNode,
  PostfixExpressionNode,
  PresentationFormatNode,
  PropertyTargetNode,
  TimezoneNameNode,
  UnaryExpressionNode,
  UnitNode,
  UnitsNode,
  UnitWithExponentNode,
  UTCOffsetNode,
  ValueNode,
  VariableAssignmentNode,
  VariableNode,
  ZonedDateTimeNode,
} from "@/calculator/nearley/types";
import { Badge } from "./ui/badge";

interface ResultAstProps {
  ast: ParsedLine;
}

function AstNode({ node }: { node: Node }) {
  switch (node?.type) {
    case "Heading":
    case "EmptyLine": {
      return null;
    }
    case "PlainText": {
      const plainTextNode = node as unknown as PlainText;
      return (
        <div>
          <Badge variant="secondary">Plain Text</Badge>{" "}
          <span className="whitespace-pre-wrap">{plainTextNode.text}</span>
        </div>
      );
    }
    // --- Level 1: LineNode → VariableAssignment | ExpressionNode ---
    case "VariableAssignment": {
      const variableAssignmentNode = node as unknown as VariableAssignmentNode;
      return (
        <div className="space-y-1">
          <div className="flex flex-row flex-wrap gap-2">
            <Badge className="bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
              Variable Assignment
            </Badge>
            {variableAssignmentNode.name}{" "}
            <span className="text-muted-foreground">=</span>
          </div>
          <div className="space-y-1 pl-4 border-l border-l-border">
            <AstNode node={variableAssignmentNode.value} />
          </div>
        </div>
      );
    }
    case "ConditionalExpr": {
      const conditionalExprNode = node as unknown as ConditionalExprNode;
      return (
        <div className="space-y-1">
          <Badge className="bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
            Conditional
          </Badge>
          <span className="text-muted-foreground text-xs">(</span>
          <div className="space-y-1 pl-4 border-l border-l-border">
            <div className="text-muted-foreground text-xs">if:</div>
            <div className="space-y-1 pl-4 border-l border-l-border">
              <AstNode node={conditionalExprNode.condition} />
            </div>
            <div className="text-muted-foreground text-xs">then:</div>
            <div className="space-y-1 pl-4 border-l border-l-border">
              <AstNode node={conditionalExprNode.then} />
            </div>
            <div className="text-muted-foreground text-xs">else:</div>
            <div className="space-y-1 pl-4 border-l border-l-border">
              <AstNode node={conditionalExprNode.else} />
            </div>
          </div>
          <span className="text-muted-foreground text-xs">)</span>
        </div>
      );
    }
    case "Conversion": {
      const conversionNode = node as unknown as ConversionNode;
      return (
        <div className="space-y-1">
          <Badge className="bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300">
            Conversion
          </Badge>
          <span className="text-muted-foreground text-xs">(</span>
          <div className="space-y-1 pl-4 border-l border-l-border">
            <div className="text-muted-foreground text-xs">expression:</div>
            <div className="space-y-1 pl-4 border-l border-l-border">
              <AstNode node={conversionNode.expression} />
            </div>
            <div className="text-muted-foreground text-xs">target:</div>
            <div className="space-y-1 pl-4 border-l border-l-border">
              <AstNode node={conversionNode.target} />
            </div>
          </div>
          <span className="text-muted-foreground text-xs">)</span>
        </div>
      );
    }
    case "BinaryExpression": {
      const binaryExprNode = node as unknown as BinaryExpressionNode;
      return (
        <div className="space-y-1">
          <Badge className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
            {binaryExprNode.operator}
          </Badge>
          <span className="text-muted-foreground text-xs">(</span>
          <div className="space-y-1 pl-4 border-l border-l-border">
            <AstNode node={binaryExprNode.left} />
          </div>
          <div className="space-y-1 pl-4 border-l border-l-border">
            <AstNode node={binaryExprNode.right} />
          </div>
          <span className="text-muted-foreground text-xs">)</span>
        </div>
      );
    }
    case "UnaryExpression": {
      const unaryExprNode = node as unknown as UnaryExpressionNode;
      return (
        <div className="space-y-1">
          <Badge className="gap-0 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300">
            {unaryExprNode.operator}
            <sup>←</sup>
          </Badge>
          <span className="text-muted-foreground text-xs">(</span>
          <div className="space-y-1 pl-4 border-l border-l-border">
            <AstNode node={unaryExprNode.argument} />
          </div>
          <span className="text-muted-foreground text-xs">)</span>
        </div>
      );
    }
    case "PostfixExpression": {
      const postfixExprNode = node as unknown as PostfixExpressionNode;
      return (
        <div className="space-y-1">
          <Badge className="gap-0 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300">
            {postfixExprNode.operator}
            <sup>→</sup>
          </Badge>
          <span className="text-muted-foreground text-xs">(</span>
          <div className="space-y-1 pl-4 border-l border-l-border">
            <AstNode node={postfixExprNode.argument} />
          </div>
          <span className="text-muted-foreground text-xs">)</span>
        </div>
      );
    }
    case "Value": {
      const valueNode = node as unknown as ValueNode;
      return (
        <div className="flex flex-row flex-wrap gap-2">
          <Badge className="bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
            Value
          </Badge>
          <AstNode node={valueNode.value} />
          {!!valueNode.unit && <AstNode node={valueNode.unit} />}
        </div>
      );
    }
    case "CompositeValue": {
      const compositeNode = node as unknown as CompositeValueNode;
      return (
        <div className="space-y-1">
          <Badge className="bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300">
            Composite value
          </Badge>
          <div className="space-y-1 pl-4 border-l border-l-border">
            {compositeNode.values.map((val, index) => (
              <AstNode key={index} node={val} />
            ))}
          </div>
        </div>
      );
    }
    case "FunctionCall": {
      const funcCallNode = node as unknown as FunctionCallNode;
      return (
        <div className="space-y-1">
          <div className="flex flex-row flex-wrap gap-2">
            <Badge className="bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
              Function
            </Badge>
            <span className="font-semibold">{funcCallNode.name}</span>
          </div>
          <div className="space-y-1 pl-4 border-l border-l-border">
            {funcCallNode.arguments.map((arg, index) => (
              <div key={index} className="space-y-1">
                <div className="text-muted-foreground text-xs">
                  arg {index + 1}:
                </div>
                <div className="pl-4 border-l border-l-border">
                  <AstNode node={arg} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "BooleanLiteral": {
      const boolNode = node as unknown as BooleanLiteralNode;
      return (
        <div className="flex flex-row flex-wrap gap-2">
          <Badge className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300">
            Boolean
          </Badge>
          <Badge
            className={
              boolNode.value
                ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
            }
          >
            {boolNode.value.toString()}
          </Badge>
        </div>
      );
    }
    case "Variable": {
      const varNode = node as unknown as VariableNode;
      return (
        <div className="flex flex-row flex-wrap gap-2">
          <Badge className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
            Variable
          </Badge>
          <span>{varNode.name}</span>
        </div>
      );
    }
    case "Constant": {
      const constNode = node as unknown as ConstantNode;
      return (
        <div className="flex flex-row flex-wrap gap-2">
          <Badge className="bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
            Constant
          </Badge>
          <span>{constNode.name}</span>
        </div>
      );
    }
    // --- Level 1 (cont.): DateTimeLiteralNode variants ---
    case "ZonedDateTime": {
      const zdtNode = node as unknown as ZonedDateTimeNode;
      return (
        <div className="space-y-1">
          <div className="flex flex-row flex-wrap gap-2">
            <Badge className="bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-300">
              Zoned Date Time
            </Badge>
            <Badge className="bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300">
              {zdtNode.timezone.type === "TimezoneName"
                ? zdtNode.timezone.zoneName
                : zdtNode.timezone.offsetStr}
            </Badge>
          </div>
          <div className="space-y-1 pl-4 border-l border-l-border">
            <AstNode node={zdtNode.dateTime} />
          </div>
        </div>
      );
    }
    case "Instant": {
      const instantNode = node as unknown as
        | InstantKeywordNode
        | InstantRelativeNode;
      if ("keyword" in instantNode) {
        return (
          <div className="flex flex-row flex-wrap gap-2">
            <Badge className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
              Instant
            </Badge>
            <span>{instantNode.keyword}</span>
          </div>
        );
      }
      const relNode = instantNode as InstantRelativeNode;
      return (
        <div className="space-y-1">
          <Badge className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
            Instant
          </Badge>
          <div className="flex flex-row flex-wrap gap-2 pl-4 border-l border-l-border">
            <AstNode node={relNode.amount} />
            <Badge className="bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
              {relNode.unit}
            </Badge>
            <span className="text-muted-foreground">{relNode.direction}</span>
          </div>
        </div>
      );
    }
    case "PlainDateTime": {
      const pdtNode = node as unknown as PlainDateTimeNode;
      return (
        <div className="space-y-1">
          <Badge className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
            Plain Date Time
          </Badge>
          <div className="space-y-1 pl-4 border-l border-l-border">
            <AstNode node={pdtNode.date} />
            <AstNode node={pdtNode.time} />
          </div>
        </div>
      );
    }
    case "PlainDate": {
      const pdNode = node as unknown as PlainDateNode;
      return (
        <div className="flex flex-row flex-wrap gap-2">
          <Badge className="bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
            Plain Date
          </Badge>
          <span>
            {pdNode.year}-{pdNode.month.toString().padStart(2, "0")}-
            {pdNode.day.toString().padStart(2, "0")}
          </span>
        </div>
      );
    }
    case "PlainTime": {
      const ptNode = node as unknown as PlainTimeNode;
      return (
        <div className="flex flex-row flex-wrap gap-2">
          <Badge className="bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
            Plain Time
          </Badge>
          <span>
            {ptNode.hour.toString().padStart(2, "0")}:
            {ptNode.minute.toString().padStart(2, "0")}:
            {ptNode.second.toString().padStart(2, "0")}
          </span>
        </div>
      );
    }
    // --- Level 2: ConversionTargetNode, NumericalValueNode, CurrencyUnit ---
    case "Units": {
      const unitsNode = node as unknown as UnitsNode;
      return (
        <div className="flex flex-row flex-wrap gap-2">
          {unitsNode.terms.map((term, index) => (
            <AstNode key={index} node={term} />
          ))}
        </div>
      );
    }
    case "PresentationFormat": {
      const fmtNode = node as unknown as PresentationFormatNode;
      let formatLabel: string;
      switch (fmtNode.format) {
        case "value":
          formatLabel = "Value";
          break;
        case "base":
          formatLabel = `Base ${fmtNode.base}`;
          break;
        case "sigFigs":
          formatLabel = `${fmtNode.sigFigs} Sig Figs`;
          break;
        case "decimals":
          formatLabel = `${fmtNode.decimals} Decimals`;
          break;
        case "scientific":
          formatLabel = "Scientific";
          break;
        case "fraction":
          formatLabel = "Fraction";
          break;
        case "percentage":
          formatLabel = "Percentage";
          break;
        case "unix":
          formatLabel = `Unix (${fmtNode.unit})`;
          break;
        case "namedFormat":
          formatLabel = fmtNode.name;
          break;
        default:
          formatLabel = "Format";
      }
      return (
        <div className="flex flex-row flex-wrap gap-2">
          <Badge className="bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
            Presentation: {formatLabel}
          </Badge>
        </div>
      );
    }
    case "PropertyTarget": {
      const propNode = node as unknown as PropertyTargetNode;
      return (
        <div className="flex flex-row flex-wrap gap-2">
          <Badge className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            Property
          </Badge>
          <span>{propNode.property}</span>
        </div>
      );
    }
    case "UTCOffset": {
      const utcNode = node as unknown as UTCOffsetNode;
      return (
        <div className="flex flex-row flex-wrap gap-2">
          <Badge className="bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300">
            UTC Offset
          </Badge>
          <span>{utcNode.offsetStr}</span>
        </div>
      );
    }
    case "TimezoneName": {
      const tzNode = node as unknown as TimezoneNameNode;
      return (
        <div className="flex flex-row flex-wrap gap-2">
          <Badge className="bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300">
            Timezone
          </Badge>
          <span>{tzNode.zoneName}</span>
        </div>
      );
    }
    case "NumberLiteral": {
      const numberLiteralNode = node as unknown as NumberLiteralNode;
      return (
        <>
          <div className="flex flex-row flex-wrap gap-2">
            {numberLiteralNode.value}
            {numberLiteralNode.base !== 10 && (
              <Badge className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
                Base {numberLiteralNode.base}
              </Badge>
            )}
          </div>
        </>
      );
    }
    case "PercentageLiteral": {
      const pctNode = node as unknown as PercentageLiteralNode;
      return (
        <div className="flex flex-row flex-wrap gap-2">
          <Badge className="bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
            {pctNode.symbol === "percent" ? "Percentage" : "Permille"}
          </Badge>
          <span>
            {pctNode.value}
            {pctNode.symbol === "percent" ? "%" : "‰"}
          </span>
        </div>
      );
    }
    case "CurrencyUnit": {
      const currNode = node as unknown as CurrencyUnitNode;
      return (
        <div className="flex flex-row flex-wrap gap-2">
          <Badge className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
            Currency
          </Badge>
          <span>{currNode.name}</span>
        </div>
      );
    }
    // --- Level 3: Unit terms ---
    case "UnitWithExponent": {
      const unitWithExponentNode = node as unknown as UnitWithExponentNode;
      return (
        <Badge className="gap-0 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
          {unitWithExponentNode.unit.name}
          {unitWithExponentNode.exponent !== 1 && (
            <sup>{unitWithExponentNode.exponent}</sup>
          )}
        </Badge>
      );
    }
    // --- Level 4: Leaf unit ---
    case "Unit": {
      const unitNode = node as unknown as UnitNode;
      return (
        <Badge className="bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
          {unitNode.name}
          <span className="ml-1 text-muted-foreground text-xs">
            ({unitNode.matched})
          </span>
        </Badge>
      );
    }
  }
}

export function ResultAst({ ast }: ResultAstProps) {
  if (!ast) {
    return null;
  }

  return (
    <div className="space-y-1 pt-2 border-t">
      <div className="text-muted-foreground text-xs">AST:</div>
      <AstNode node={ast as Node} />
    </div>
  );
}

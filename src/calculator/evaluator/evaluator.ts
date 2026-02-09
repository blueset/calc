import * as NearleyAST from "../nearley/types";
import { Document, ParsedLine } from "../document";
import { DataLoader } from "../data-loader";
import { UnitConverter } from "../unit-converter";
import { DateTimeEngine } from "../date-time";
import { CurrencyConverter } from "../currency";
import { MathFunctions } from "../functions";
import type { ExchangeRatesDatabase } from "../types/types";
import type { EvaluatorDeps, ExprEvaluator } from "./eval-helpers";
import { createError } from "./eval-helpers";
import type { Value, ErrorValue, EvaluationContext, EvaluatorSettings } from "./values";
import {
  evaluateValue,
  evaluateCompositeValue,
  evaluateVariable,
  evaluateConstant,
  evaluatePlainDate,
  evaluatePlainTime,
  evaluatePlainDateTime,
  evaluateInstant,
  evaluateZonedDateTime,
} from "./literals";
import { evaluateConversion } from "./conversion";
import {
  evaluateConditional,
  evaluateBinary,
  evaluateUnary,
  evaluatePostfix,
  evaluateFunctionCall,
} from "./operations";

/**
 * Evaluator class - evaluates AST to produce values
 */
export class Evaluator {
  private deps: EvaluatorDeps;
  private boundEvalExpr: ExprEvaluator;

  constructor(
    dataLoader: DataLoader,
    settings: EvaluatorSettings = { variant: "us", angleUnit: "radian" },
  ) {
    this.deps = {
      dataLoader,
      settings,
      unitConverter: new UnitConverter(dataLoader, {
        variant: settings.variant,
      }),
      dateTimeEngine: new DateTimeEngine(dataLoader),
      currencyConverter: new CurrencyConverter(dataLoader),
      mathFunctions: new MathFunctions(),
    };
    this.boundEvalExpr = (expr, context) =>
      this.evaluateExpression(expr, context);
  }

  /**
   * Load exchange rates for currency conversion
   */
  loadExchangeRates(rates: ExchangeRatesDatabase): void {
    this.deps.currencyConverter.loadExchangeRates(rates);
  }

  /**
   * Evaluate the entire document
   */
  evaluateDocument(document: Document): Map<ParsedLine, Value | null> {
    const context: EvaluationContext = { variables: new Map() };
    const lineValues = new Map<ParsedLine, Value | null>();

    for (const line of document.lines) {
      const lineValue = this.evaluateLine(line, context);
      lineValues.set(line, lineValue);
    }

    return lineValues;
  }

  /**
   * Create a fresh evaluation context
   */
  createContext(): EvaluationContext {
    return { variables: new Map() };
  }

  /**
   * Trial-evaluate a line against a cloned context (does not mutate the input context).
   * Returns the value and any variable assignment that would result.
   */
  tryEvaluateLine(
    line: ParsedLine,
    context: EvaluationContext,
  ): {
    value: Value | null;
    assignedVariable?: { name: string; value: Value };
  } {
    // Clone the context so we don't mutate the caller's state
    const cloned: EvaluationContext = {
      variables: new Map(context.variables),
      parent: context.parent,
    };

    try {
      const value = this.evaluateLine(line, cloned);

      // Check if a variable was assigned (cloned context gained a new entry)
      let assignedVariable: { name: string; value: Value } | undefined;
      if (
        line !== null &&
        typeof line === "object" &&
        "type" in line &&
        line.type === "VariableAssignment"
      ) {
        const varName = (line as NearleyAST.VariableAssignmentNode).name;
        const varValue = cloned.variables.get(varName);
        if (varValue !== undefined) {
          assignedVariable = { name: varName, value: varValue };
        }
      }

      return { value, assignedVariable };
    } catch (e) {
      const message = e instanceof Error ? e.message : `${e}`;
      return {
        value: {
          kind: "error",
          error: {
            type: "RuntimeError",
            message: `Evaluation failed: ${message}`,
          },
        } as ErrorValue,
      };
    }
  }

  /**
   * Apply a variable assignment to a context
   */
  commitAssignment(
    context: EvaluationContext,
    name: string,
    value: Value,
  ): void {
    context.variables.set(name, value);
  }

  /**
   * Evaluate a single line (ParsedLine union: Nearley AST | Heading | EmptyLine | PlainText)
   */
  private evaluateLine(
    line: ParsedLine,
    context: EvaluationContext,
  ): Value | null {
    if (line === null) return null;

    // Handle document-level wrapper types
    if (
      line.type === "Heading" ||
      line.type === "PlainText" ||
      line.type === "EmptyLine"
    ) {
      return null;
    }

    // Handle VariableAssignment (Nearley AST)
    if (line.type === "VariableAssignment") {
      const value = this.evaluateExpression(
        line.value as NearleyAST.ExpressionNode,
        context,
      );
      context.variables.set(line.name, value);
      return value;
    }

    // Everything else is an ExpressionNode - evaluate directly
    return this.evaluateExpression(line as NearleyAST.ExpressionNode, context);
  }

  /**
   * Evaluate an expression (Nearley AST ExpressionNode)
   */
  private evaluateExpression(
    expr: NearleyAST.ExpressionNode,
    context: EvaluationContext,
  ): Value {
    switch (expr.type) {
      case "ConditionalExpr":
        return evaluateConditional(
          this.deps,
          this.boundEvalExpr,
          expr as NearleyAST.ConditionalExprNode,
          context,
        );

      case "Conversion":
        return evaluateConversion(
          this.deps,
          this.boundEvalExpr,
          expr as NearleyAST.ConversionNode,
          context,
        );

      case "BinaryExpression":
        return evaluateBinary(
          this.deps,
          this.boundEvalExpr,
          expr as NearleyAST.BinaryExpressionNode,
          context,
        );

      case "UnaryExpression":
        return evaluateUnary(
          this.deps,
          this.boundEvalExpr,
          expr as NearleyAST.UnaryExpressionNode,
          context,
        );

      case "PostfixExpression":
        return evaluatePostfix(
          this.deps,
          this.boundEvalExpr,
          expr as NearleyAST.PostfixExpressionNode,
          context,
        );

      case "FunctionCall":
        return evaluateFunctionCall(
          this.deps,
          this.boundEvalExpr,
          expr as NearleyAST.FunctionCallNode,
          context,
        );

      case "Variable":
        return evaluateVariable(this.deps, expr as NearleyAST.VariableNode, context);

      case "Constant":
        return evaluateConstant(expr as NearleyAST.ConstantNode);

      case "Value":
        return evaluateValue(this.deps, expr as NearleyAST.ValueNode);

      case "CompositeValue":
        return evaluateCompositeValue(
          this.deps,
          expr as NearleyAST.CompositeValueNode,
        );

      case "BooleanLiteral":
        return {
          kind: "boolean",
          value: (expr as NearleyAST.BooleanLiteralNode).value,
        };

      case "PlainDate":
        return evaluatePlainDate(expr as NearleyAST.PlainDateNode);

      case "PlainTime":
        return evaluatePlainTime(expr as NearleyAST.PlainTimeNode);

      case "PlainDateTime":
        return evaluatePlainDateTime(expr as NearleyAST.PlainDateTimeNode);

      case "Instant":
        return evaluateInstant(this.deps, expr as NearleyAST.InstantNode);

      case "ZonedDateTime":
        return evaluateZonedDateTime(this.deps, expr as NearleyAST.ZonedDateTimeNode);

      default:
        return createError(
          `Unknown expression type: ${(expr as any).type}`,
        );
    }
  }
}

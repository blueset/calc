/**
 * Nearley Parser Wrapper
 *
 * Main integration point for Nearley parser into the calculator.
 * Handles:
 * - Line preprocessing (comments, headings, empty lines)
 * - Nearley parser instantiation per line
 * - Parse tree pruning and selection
 * - Trial evaluation for disambiguation (evaluate-then-pick pipeline)
 * - Location enrichment (adding line numbers to Nearley AST)
 * - Error collection and conversion
 */

import * as nearley from "nearley";
import grammar from "./grammar";
import { DataLoader } from "../data-loader";
import { preprocessDocument, PreprocessedLine } from "./preprocessor";
import { pruneInvalidCandidates, PruningContext } from "./pruner";
import { selectBestCandidate } from "./selector";
import {
  Document,
  ParsedLine,
  createDocument,
  createHeading,
  createEmptyLine,
  createPlainText,
} from "../document";
import { LineError, ParserError, DocumentResult } from "../error-handling";
import { SourceLocation } from "../document";
import * as NearleyAST from "./types";
import { Evaluator, EvaluationContext, Value } from "../evaluator";

/**
 * Nearley Parser - matches old Parser interface
 */
export class NearleyParser {
  private dataLoader: DataLoader;
  private definedVariables: Set<string> = new Set();
  private parseCache = new Map<string, { candidates: NearleyAST.LineNode[]; parseError: string | null }>();

  constructor(dataLoader: DataLoader) {
    this.dataLoader = dataLoader;
  }

  /**
   * Parse a complete document
   * When evaluator is provided, uses evaluate-then-pick pipeline for disambiguation.
   * Returns AST, collected errors, and optionally pre-computed evaluated values.
   */
  parseDocument(input: string, evaluator?: Evaluator): DocumentResult {
    // Reset per-document state (parser is now persistent across calls)
    this.definedVariables = new Set();
    const accessedCacheKeys = new Set<string>();

    // Preprocess input into classified lines
    const preprocessedLines = preprocessDocument(input);

    const lines: ParsedLine[] = [];
    const errors: LineError[] = [];
    const evaluatedValues = evaluator
      ? new Map<ParsedLine, Value | null>()
      : undefined;
    const evalContext = evaluator ? evaluator.createContext() : undefined;

    // Parse each line
    for (const preprocessed of preprocessedLines) {
      const { line, error, value } = this.parseLine(
        preprocessed,
        evaluator,
        evalContext,
        accessedCacheKeys,
      );
      lines.push(line);

      if (error) {
        errors.push(error);
      }

      // Track variable definitions for pruning context
      if (
        line !== null &&
        typeof line === "object" &&
        "type" in line &&
        line.type === "VariableAssignment"
      ) {
        this.definedVariables.add(line.name);
      }

      // Store pre-computed value if using evaluate-then-pick
      if (evaluatedValues) {
        evaluatedValues.set(line, value ?? null);
      }
    }

    // Evict stale cache entries no longer in the document
    for (const key of this.parseCache.keys()) {
      if (!accessedCacheKeys.has(key)) this.parseCache.delete(key);
    }

    // Create document node
    const ast = createDocument(lines);

    return { ast, errors, evaluatedValues };
  }

  /**
   * Parse a single preprocessed line
   * When evaluator/evalContext are provided, uses trial evaluation for disambiguation.
   */
  private parseLine(
    preprocessed: PreprocessedLine,
    evaluator?: Evaluator,
    evalContext?: EvaluationContext,
    accessedCacheKeys?: Set<string>,
  ): {
    line: ParsedLine;
    error: LineError | null;
    value?: Value | null;
  } {
    const { type, content, lineNumber, originalText, contentOffset } =
      preprocessed;

    // Handle empty lines
    if (type === "empty") {
      const loc: SourceLocation = { line: lineNumber, column: 0, offset: 0 };
      return {
        line: createEmptyLine(loc),
        error: null,
        value: null,
      };
    }

    // Handle headings
    if (type === "heading") {
      const loc: SourceLocation = { line: lineNumber, column: 0, offset: 0 };
      return {
        line: createHeading(preprocessed.level || 1, content, loc),
        error: null,
        value: null,
      };
    }

    // Handle expression lines
    try {
      const parseResult = this.parseExpression(content, lineNumber, accessedCacheKeys);
      const candidates = parseResult.candidates;

      if (candidates.length === 0) {
        // No valid parse - return as plain text with error
        const loc: SourceLocation = { line: lineNumber, column: 0, offset: 0 };
        const errorMessage =
          parseResult.parseError ||
          "Unable to parse expression, unexpected end of input.";
        return {
          line: createPlainText(originalText, loc),
          error: {
            line: lineNumber,
            error: new ParserError(errorMessage, loc),
            rawText: originalText,
          },
          value: null,
        };
      }

      // Prune invalid candidates (scope-only)
      const context: PruningContext = {
        dataLoader: this.dataLoader,
        definedVariables: this.definedVariables,
        lineNumber,
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);

      if (validCandidates.length === 0) {
        // All candidates invalid - return as plain text with error
        const loc: SourceLocation = { line: lineNumber, column: 0, offset: 0 };

        // Try to determine why candidates were rejected
        const errorMessage = this.diagnoseRejectionReason(
          candidates,
          context,
          originalText,
        );

        return {
          line: createPlainText(originalText, loc),
          error: {
            line: lineNumber,
            error: new ParserError(errorMessage, loc),
            rawText: originalText,
          },
          value: null,
        };
      }

      // Evaluate-then-pick pipeline when evaluator is available
      if (evaluator && evalContext) {
        return this.evaluateThenPick(
          validCandidates,
          context,
          evaluator,
          evalContext,
          lineNumber,
          contentOffset,
          originalText,
        );
      }

      // Fallback: structural selection only (no evaluator)
      const bestCandidate = selectBestCandidate(validCandidates, context);

      // Enrich Nearley AST with full location information
      const enrichedLine = this.enrichLineWithLocations(
        bestCandidate,
        lineNumber,
        contentOffset,
      );

      return {
        line: enrichedLine,
        error: null,
      };
    } catch (error) {
      // Parse failed - return as plain text with error
      const loc: SourceLocation = { line: lineNumber, column: 0, offset: 0 };
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        line: createPlainText(originalText, loc),
        error: {
          line: lineNumber,
          error: new ParserError(errorMessage, loc),
          rawText: originalText,
        },
        value: null,
      };
    }
  }

  /**
   * Evaluate-then-pick: trial-evaluate all candidates, pick from successes.
   * Enriches candidates with locations before evaluation, then selects the best.
   */
  private evaluateThenPick(
    candidates: NearleyAST.LineNode[],
    pruningContext: PruningContext,
    evaluator: Evaluator,
    evalContext: EvaluationContext,
    lineNumber: number,
    contentOffset: number,
    originalText: string,
  ): {
    line: ParsedLine;
    error: LineError | null;
    value?: Value | null;
  } {
    // Enrich and trial-evaluate each candidate
    const results: Array<{
      candidate: NearleyAST.LineNode;
      enriched: NearleyAST.LineNode;
      value: Value | null;
      assignedVariable?: { name: string; value: Value };
      isSuccess: boolean;
    }> = [];

    for (const candidate of candidates) {
      const enriched = this.enrichLineWithLocations(
        candidate,
        lineNumber,
        contentOffset,
      );

      const trialResult = evaluator.tryEvaluateLine(enriched, evalContext);
      const isSuccess =
        trialResult.value === null || trialResult.value.kind !== "error";

      results.push({
        candidate,
        enriched,
        value: trialResult.value,
        assignedVariable: trialResult.assignedVariable,
        isSuccess,
      });
    }

    // Partition into successes and failures
    const successes = results.filter((r) => r.isSuccess);
    const pool = successes.length > 0 ? successes : results;

    // Select best from the pool using structural scoring
    const poolCandidates = pool.map((r) => r.candidate);
    const bestRawCandidate = selectBestCandidate(
      poolCandidates,
      pruningContext,
    );

    // Find the matching result
    const bestResult = pool.find((r) => r.candidate === bestRawCandidate)!;

    // Commit variable assignment if present
    if (bestResult.assignedVariable) {
      evaluator.commitAssignment(
        evalContext,
        bestResult.assignedVariable.name,
        bestResult.assignedVariable.value,
      );
    }

    // If the best result is a failure, return error
    if (!bestResult.isSuccess && bestResult.value?.kind === "error") {
      const errorValue = bestResult.value as {
        kind: "error";
        error: { message: string };
      };
      return {
        line: bestResult.enriched,
        error: null, // Runtime error, not parser error - will be surfaced through the value
        value: bestResult.value,
      };
    }

    return {
      line: bestResult.enriched,
      error: null,
      value: bestResult.value,
    };
  }

  /**
   * Parse an expression line using Nearley
   * Returns all candidate parses and any parse error
   */
  private parseExpression(
    content: string,
    lineNumber: number,
    accessedCacheKeys?: Set<string>,
  ): {
    candidates: NearleyAST.LineNode[];
    parseError: string | null;
  } {
    accessedCacheKeys?.add(content);

    const cached = this.parseCache.get(content);
    if (cached) return cached;

    // Create a new parser instance for this line
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

    try {
      parser.feed(content);

      // Get all parse results (may have multiple due to ambiguity)
      const results = parser.results as NearleyAST.LineNode[];

      const result = { candidates: results, parseError: null };
      this.parseCache.set(content, result);
      return result;
    } catch (error) {
      // Parse error - return empty array with error message
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const result = { candidates: [] as NearleyAST.LineNode[], parseError: errorMessage };
      this.parseCache.set(content, result);
      return result;
    }
  }

  /**
   * Enrich Nearley AST with full source locations
   * Converts offset to full SourceLocation objects with line numbers
   */
  private enrichLineWithLocations(
    node: NearleyAST.LineNode,
    lineNumber: number,
    contentOffset: number,
  ): NearleyAST.LineNode {
    return this.enrichNode(
      node,
      lineNumber,
      contentOffset,
    ) as NearleyAST.LineNode;
  }

  /**
   * Recursively enrich all nodes with full source location information
   */
  private enrichNode(
    node: any,
    lineNumber: number,
    contentOffset: number,
  ): any {
    if (!node || typeof node !== "object") {
      return node;
    }

    // Handle arrays
    if (Array.isArray(node)) {
      return node.map((item) =>
        this.enrichNode(item, lineNumber, contentOffset),
      );
    }

    // Create a new object with enriched location
    const enriched: any = {};

    for (const key in node) {
      if (key === "offset" && typeof node.offset === "number") {
        // Convert raw char offset to full SourceLocation, storing as 'location'
        enriched.location = {
          line: lineNumber,
          column: node.offset + contentOffset,
          offset: node.offset + contentOffset,
        };
      } else {
        // Recursively enrich child nodes
        enriched[key] = this.enrichNode(node[key], lineNumber, contentOffset);
      }
    }

    return enriched;
  }

  /**
   * Diagnose why all candidates were rejected during pruning
   * Returns a helpful error message
   */
  private diagnoseRejectionReason(
    candidates: NearleyAST.LineNode[],
    context: PruningContext,
    originalText: string,
  ): string {
    // Check for undefined variables across all candidates
    const allUndefinedVars = new Set<string>();

    if (candidates.filter(Boolean).length === 0) {
      return "Unexpected end of input.";
    }

    for (const candidate of candidates) {
      if (!candidate) continue;

      // Collect variables from this candidate
      const vars = this.collectVariablesFromNode(candidate);
      for (const varName of vars) {
        if (!context.definedVariables.has(varName)) {
          allUndefinedVars.add(varName);
        }
      }
    }

    // If we found undefined variables, that's likely the issue
    if (allUndefinedVars.size > 0) {
      const varList = Array.from(allUndefinedVars).join(", ");
      if (allUndefinedVars.size === 1) {
        return `Undefined variable: ${varList}`;
      } else {
        return `Undefined variables: ${varList}`;
      }
    }

    // Generic fallback message
    return `Unable to parse expression: ${originalText}`;
  }

  /**
   * Collect all variable names from a node
   */
  private collectVariablesFromNode(node: any): Set<string> {
    const variables = new Set<string>();

    const traverse = (n: any) => {
      if (!n || typeof n !== "object") return;

      // Check if this is a Variable node
      if (n.type === "Variable" && n.name) {
        variables.add(n.name);
      }

      // Traverse all properties
      for (const key in n) {
        if (key === "type" || key === "offset") continue;
        const value = n[key];

        if (Array.isArray(value)) {
          value.forEach((item) => traverse(item));
        } else if (typeof value === "object" && value !== null) {
          traverse(value);
        }
      }
    };

    traverse(node);
    return variables;
  }
}

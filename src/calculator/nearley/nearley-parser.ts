/**
 * Nearley Parser Wrapper
 *
 * Main integration point for Nearley parser into the calculator.
 * Handles:
 * - Line preprocessing (comments, headings, empty lines)
 * - Nearley parser instantiation per line
 * - Parse tree pruning and selection
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

/**
 * Nearley Parser - matches old Parser interface
 */
export class NearleyParser {
  private dataLoader: DataLoader;
  private definedVariables: Set<string> = new Set();

  constructor(dataLoader: DataLoader) {
    this.dataLoader = dataLoader;
  }

  /**
   * Parse a complete document
   * Returns AST and collected errors
   */
  parseDocument(input: string): DocumentResult {
    // Preprocess input into classified lines
    const preprocessedLines = preprocessDocument(input);

    const lines: ParsedLine[] = [];
    const errors: LineError[] = [];

    // Parse each line
    for (const preprocessed of preprocessedLines) {
      const { line, error } = this.parseLine(preprocessed);
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
    }

    // Create document node
    const ast = createDocument(lines);

    return { ast, errors };
  }

  /**
   * Parse a single preprocessed line
   */
  private parseLine(preprocessed: PreprocessedLine): {
    line: ParsedLine;
    error: LineError | null;
  } {
    const { type, content, lineNumber, originalText, contentOffset } =
      preprocessed;

    // Handle empty lines
    if (type === "empty") {
      const loc: SourceLocation = { line: lineNumber, column: 0, offset: 0 };
      return {
        line: createEmptyLine(loc),
        error: null,
      };
    }

    // Handle headings
    if (type === "heading") {
      const loc: SourceLocation = { line: lineNumber, column: 0, offset: 0 };
      return {
        line: createHeading(preprocessed.level || 1, content, loc),
        error: null,
      };
    }

    // Handle expression lines
    try {
      const parseResult = this.parseExpression(content, lineNumber);
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
        };
      }

      // Prune invalid candidates
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
        };
      }

      // Select best candidate
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
      };
    }
  }

  /**
   * Parse an expression line using Nearley
   * Returns all candidate parses and any parse error
   */
  private parseExpression(
    content: string,
    lineNumber: number,
  ): {
    candidates: NearleyAST.LineNode[];
    parseError: string | null;
  } {
    // Create a new parser instance for this line
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

    try {
      parser.feed(content);

      // Get all parse results (may have multiple due to ambiguity)
      const results = parser.results as NearleyAST.LineNode[];

      return { candidates: results, parseError: null };
    } catch (error) {
      // Parse error - return empty array with error message
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { candidates: [], parseError: errorMessage };
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

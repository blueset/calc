/**
 * Nearley Parser Wrapper
 *
 * Main integration point for Nearley parser into the calculator.
 * Handles:
 * - Line preprocessing (comments, headings, empty lines)
 * - Nearley parser instantiation per line
 * - Parse tree pruning and selection
 * - AST adaptation to old format
 * - Error collection and conversion
 */

import * as nearley from 'nearley';
import grammar from './grammar';
import { DataLoader } from '../data-loader';
import { preprocessDocument, PreprocessedLine } from './preprocessor';
import { pruneInvalidCandidates, PruningContext } from './pruner';
import { selectBestCandidate } from './selector';
import { adaptLine, setDataLoader } from './ast-adapter';
import { Document, Line, createDocument, createHeading, createEmptyLine, createPlainText } from '../ast';
import { LineError, ParserError, DocumentResult } from '../error-handling';
import { SourceLocation } from '../tokens';
import * as NearleyAST from './types';

/**
 * Nearley Parser - matches old Parser interface
 */
export class NearleyParser {
  private dataLoader: DataLoader;
  private definedVariables: Set<string> = new Set();

  constructor(dataLoader: DataLoader) {
    this.dataLoader = dataLoader;
    // Set global DataLoader for AST adapter
    setDataLoader(dataLoader);
  }

  /**
   * Parse a complete document
   * Returns AST and collected errors
   */
  parseDocument(input: string): DocumentResult {
    // Preprocess input into classified lines
    const preprocessedLines = preprocessDocument(input);

    const lines: Line[] = [];
    const errors: LineError[] = [];

    // Parse each line
    for (const preprocessed of preprocessedLines) {
      const { line, error } = this.parseLine(preprocessed);
      lines.push(line);

      if (error) {
        errors.push(error);
      }

      // Track variable definitions for pruning context
      if (line.type === 'VariableDefinition') {
        this.definedVariables.add(line.name);
      }
    }

    // Create document node
    const start: SourceLocation = { line: 1, column: 0, offset: 0 };
    const end: SourceLocation = {
      line: preprocessedLines.length,
      column: preprocessedLines[preprocessedLines.length - 1]?.originalText.length || 0,
      offset: input.length
    };

    const ast = createDocument(lines, start, end);

    return { ast, errors };
  }

  /**
   * Parse a single preprocessed line
   */
  private parseLine(preprocessed: PreprocessedLine): { line: Line; error: LineError | null } {
    const { type, content, lineNumber, originalText } = preprocessed;

    // Handle empty lines
    if (type === 'empty') {
      const loc = this.createSourceLocation(lineNumber, 0, originalText.length);
      return {
        line: createEmptyLine(loc.start, loc.end),
        error: null
      };
    }

    // Handle headings
    if (type === 'heading') {
      const loc = this.createSourceLocation(lineNumber, 0, originalText.length);
      return {
        line: createHeading(preprocessed.level || 1, content, loc.start, loc.end),
        error: null
      };
    }

    // Handle expression lines
    try {
      const parseResult = this.parseExpression(content, lineNumber);
      const candidates = parseResult.candidates;

      if (candidates.length === 0) {
        // No valid parse - return as plain text with error
        const loc = this.createSourceLocation(lineNumber, 0, originalText.length);
        const errorMessage = parseResult.parseError || 'Unable to parse expression';
        return {
          line: createPlainText(originalText, loc.start, loc.end),
          error: {
            line: lineNumber,
            error: new ParserError(errorMessage, loc.start, loc.end),
            rawText: originalText
          }
        };
      }

      // Prune invalid candidates
      const context: PruningContext = {
        dataLoader: this.dataLoader,
        definedVariables: this.definedVariables,
        lineNumber
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);

      if (validCandidates.length === 0) {
        // All candidates invalid - return as plain text with error
        const loc = this.createSourceLocation(lineNumber, 0, originalText.length);

        // Try to determine why candidates were rejected
        const errorMessage = this.diagnoseRejectionReason(candidates, context, originalText);

        return {
          line: createPlainText(originalText, loc.start, loc.end),
          error: {
            line: lineNumber,
            error: new ParserError(errorMessage, loc.start, loc.end),
            rawText: originalText
          }
        };
      }

      // Select best candidate
      const bestCandidate = selectBestCandidate(validCandidates, context);

      // Adapt to old AST format
      const line = adaptLine(bestCandidate, lineNumber, content);

      // Update line location with actual line number
      const updatedLine = this.updateLineLocation(line, lineNumber, originalText.length);

      return {
        line: updatedLine,
        error: null
      };
    } catch (error) {
      // Parse failed - return as plain text with error
      const loc = this.createSourceLocation(lineNumber, 0, originalText.length);
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        line: createPlainText(originalText, loc.start, loc.end),
        error: {
          line: lineNumber,
          error: new ParserError(errorMessage, loc.start, loc.end),
          rawText: originalText
        }
      };
    }
  }

  /**
   * Parse an expression line using Nearley
   * Returns all candidate parses and any parse error
   */
  private parseExpression(content: string, lineNumber: number): {
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { candidates: [], parseError: errorMessage };
    }
  }

  /**
   * Create SourceLocation for a line
   */
  private createSourceLocation(
    line: number,
    columnStart: number,
    length: number
  ): { start: SourceLocation; end: SourceLocation } {
    return {
      start: { line, column: columnStart, offset: 0 },
      end: { line, column: columnStart + length, offset: length }
    };
  }

  /**
   * Update line AST node with correct source location
   */
  private updateLineLocation(line: Line, lineNumber: number, length: number): Line {
    const loc = this.createSourceLocation(lineNumber, 0, length);

    // Create a new line object with updated location
    return {
      ...line,
      start: loc.start,
      end: loc.end
    };
  }

  /**
   * Diagnose why all candidates were rejected during pruning
   * Returns a helpful error message
   */
  private diagnoseRejectionReason(
    candidates: NearleyAST.LineNode[],
    context: PruningContext,
    originalText: string
  ): string {
    // Check for undefined variables across all candidates
    const allUndefinedVars = new Set<string>();

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
      const varList = Array.from(allUndefinedVars).join(', ');
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
      if (!n || typeof n !== 'object') return;

      // Check if this is a Variable node
      if (n.type === 'Variable' && n.name) {
        variables.add(n.name);
      }

      // Traverse all properties
      for (const key in n) {
        if (key === 'type' || key === 'location') continue;
        const value = n[key];

        if (Array.isArray(value)) {
          value.forEach(item => traverse(item));
        } else if (typeof value === 'object' && value !== null) {
          traverse(value);
        }
      }
    };

    traverse(node);
    return variables;
  }
}

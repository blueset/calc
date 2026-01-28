import { Lexer } from './lexer';
import { Parser } from './parser';
import { DataLoader } from './data-loader';
import { LexerError, ParserError, RuntimeError, LineError } from './error-handling';
import { Document, Line } from './ast';

/**
 * Result of a single line calculation
 */
export interface LineResult {
  line: number;
  type: 'ExpressionLine' | 'VariableDefinition' | 'PlainText' | 'Heading' | 'EmptyLine';
  result: string | null;  // Formatted result, or null for non-expressions
  hasError: boolean;      // True if this line had an error
}

/**
 * Complete calculation result with all errors
 */
export interface CalculationResult {
  results: LineResult[];
  errors: {
    lexer: LexerError[];
    parser: LineError[];
    runtime: RuntimeError[];
  };
}

/**
 * Calculator orchestrator
 * Coordinates lexer, parser, and evaluator with comprehensive error collection
 */
export class Calculator {
  private dataLoader: DataLoader;

  constructor(dataLoader: DataLoader) {
    this.dataLoader = dataLoader;
  }

  /**
   * Calculate the input string
   * Returns results for all lines and collects all errors
   */
  calculate(input: string): CalculationResult {
    // Phase 1: Lex
    const lexer = new Lexer(input, this.dataLoader);
    const { tokens, errors: lexerErrors } = lexer.tokenize();

    // Phase 2: Parse
    const parser = new Parser(tokens, this.dataLoader, input);
    const { ast, errors: parserErrors } = parser.parseDocument();

    // Phase 3: Evaluate
    // TODO (Phase 7): Wire up evaluator.evaluateDocument() and format results
    const results: LineResult[] = [];
    const runtimeErrors: RuntimeError[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i];
      const lineNumber = i + 1;

      results.push({
        line: lineNumber,
        type: line.type as any,
        result: null,  // TODO: Call evaluator and formatter (Phase 7)
        hasError: false
      });
    }

    return {
      results,
      errors: {
        lexer: lexerErrors,
        parser: parserErrors,
        runtime: runtimeErrors
      }
    };
  }

  /**
   * Parse only (no evaluation)
   * Useful for syntax checking and error detection
   */
  parse(input: string): {
    ast: Document;
    errors: {
      lexer: LexerError[];
      parser: LineError[];
    };
  } {
    const lexer = new Lexer(input, this.dataLoader);
    const { tokens, errors: lexerErrors } = lexer.tokenize();

    const parser = new Parser(tokens, this.dataLoader, input);
    const { ast, errors: parserErrors } = parser.parseDocument();

    return {
      ast,
      errors: {
        lexer: lexerErrors,
        parser: parserErrors
      }
    };
  }
}

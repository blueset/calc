import { Lexer } from './lexer';
import { Parser } from './parser';
import { DataLoader } from './data-loader';
import { LexerError, ParserError, RuntimeError, LineError } from './error-handling';
import { Document, Line } from './ast';
import { Evaluator, Value, ErrorValue } from './evaluator';
import { Formatter } from './formatter';
import { Settings, createSettings, defaultSettings } from './settings';

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
 * Coordinates lexer, parser, evaluator, and formatter with comprehensive error collection
 */
export class Calculator {
  private dataLoader: DataLoader;
  private evaluator: Evaluator;
  private formatter: Formatter;

  constructor(dataLoader: DataLoader, settings: Partial<Settings> = {}) {
    this.dataLoader = dataLoader;
    const mergedSettings: Settings = createSettings(settings);
    this.evaluator = new Evaluator(dataLoader, {
      variant: mergedSettings.imperialUnits,
      angleUnit: mergedSettings.angleUnit
    });
    this.formatter = new Formatter(mergedSettings, dataLoader);
  }

  /**
   * Load exchange rates for currency conversion
   */
  loadExchangeRates(rates: any): void {
    this.evaluator.loadExchangeRates(rates);
  }

  /**
   * Set user region for locale-specific parsing/formatting
   */
  setUserLocale(region: string): void {
    this.dataLoader.setUserLocale(region);
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
    const results: LineResult[] = [];
    const runtimeErrors: RuntimeError[] = [];
    let lineValues: Map<Line, Value | null> | null = null;

    try {
      lineValues = this.evaluator.evaluateDocument(ast);
    } catch (error) {
      // Catch any unexpected thrown errors during evaluation
      // Mark all lines as having errors
      for (let i = 0; i < ast.lines.length; i++) {
        const line = ast.lines[i];
        const lineNumber = i + 1;

        results.push({
          line: lineNumber,
          type: line.type as any,
          result: null,
          hasError: true
        });

        // Create a runtime error for the first line
        if (i === 0) {
          runtimeErrors.push(
            new RuntimeError(
              error instanceof Error ? error.message : String(error),
              line.start,
              line.end
            )
          );
        }
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

    // Phase 4: Format results
    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i];
      const lineNumber = i + 1;
      const value = lineValues.get(line);

      let result: string | null = null;
      let hasError = false;

      // Check if this line has lexer or parser errors
      const hasLexerError = lexerErrors.some(e => e.start.line === lineNumber);
      const hasParserError = parserErrors.some(e => e.line === lineNumber);
      if (hasLexerError || hasParserError) {
        hasError = true;
      }

      // Check if the value is an error
      if (value && value.kind === 'error') {
        hasError = true;
        const errorValue = value as ErrorValue;
        runtimeErrors.push(
          new RuntimeError(
            errorValue.error.message,
            line.start,
            line.end
          )
        );
        // Format the error for display
        result = `Error: ${errorValue.error.message}`;
      } else if (value !== null && value !== undefined) {
        // Format the value
        try {
          result = this.formatter.format(value);
        } catch (error) {
          hasError = true;
          const errorMessage = error instanceof Error ? error.message : String(error);
          runtimeErrors.push(
            new RuntimeError(
              `Formatting error: ${errorMessage}`,
              line.start,
              line.end
            )
          );
          result = `Error: ${errorMessage}`;
        }
      }

      results.push({
        line: lineNumber,
        type: line.type as any,
        result,
        hasError
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

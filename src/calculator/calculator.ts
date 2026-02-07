import { NearleyParser } from './nearley/nearley-parser';
import { DataLoader } from './data-loader';
import { LexerError, ParserError, RuntimeError, LineError } from './error-handling';
import { Document, ParsedLine } from './document';
import { Evaluator, Value, ErrorValue } from './evaluator';
import { Formatter } from './formatter';
import { Settings, createSettings, defaultSettings } from './settings';
import { SourceLocation } from './document';

/**
 * Result of a single line calculation
 */
export interface LineResult {
  line: number;
  type: string;
  result: string | null;  // Formatted result, or null for non-expressions
  hasError: boolean;      // True if this line had an error
  rawValue?: Value | null; // The raw evaluated value (for tooltips/debugging), optional
  ast?: ParsedLine | null; // The AST node for this line, optional
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
 * Extract location from a ParsedLine (handles both Nearley AST and document wrapper types)
 */
function getLineLocation(line: ParsedLine): SourceLocation {
  if (line === null) return { line: 0, column: 0, offset: 0 };
  if ('location' in line && line.location) {
    const loc = line.location;
    // Enriched SourceLocation (from parser wrapper)
    if (typeof loc === 'object' && 'line' in loc) {
      return loc as SourceLocation;
    }
    // Raw Nearley offset (number) - convert to SourceLocation
    return { line: 0, column: loc as number, offset: loc as number };
  }
  return { line: 0, column: 0, offset: 0 };
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
    const nearleyParser = new NearleyParser(this.dataLoader);
    const result = nearleyParser.parseDocument(input);
    const ast = result.ast as any as Document;
    const parserErrors = result.errors;

    // Evaluate
    const results: LineResult[] = [];
    const runtimeErrors: RuntimeError[] = [];
    let lineValues: Map<ParsedLine, Value | null> | null = null;

    try {
      lineValues = this.evaluator.evaluateDocument(ast);
    } catch (error) {
      // Catch any unexpected thrown errors during evaluation
      for (let i = 0; i < ast.lines.length; i++) {
        const line = ast.lines[i];
        const lineNumber = i + 1;

        results.push({
          line: lineNumber,
          type: line !== null && typeof line === 'object' && 'type' in line ? (line as any).type : 'unknown',
          result: null,
          hasError: true,
          ast: line
        });

        if (i === 0) {
          runtimeErrors.push(
            new RuntimeError(
              error instanceof Error ? error.message : String(error),
              getLineLocation(line)
            )
          );
        }
      }

      return {
        results,
        errors: {
          lexer: [],
          parser: parserErrors,
          runtime: runtimeErrors
        }
      };
    }

    // Format results
    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i];
      const lineNumber = i + 1;
      const value = lineValues.get(line);

      let lineResult: string | null = null;
      let hasError = false;

      // Check if this line has parser errors
      const parserError = parserErrors.find(e => e.line === lineNumber);
      if (parserError) {
        hasError = true;
        lineResult = `Parsing Error: ${parserError.error.message}`;
      }

      // Check if the value is an error
      if (value && value.kind === 'error') {
        hasError = true;
        const errorValue = value as ErrorValue;
        runtimeErrors.push(
          new RuntimeError(
            errorValue.error.message,
            getLineLocation(line)
          )
        );
        lineResult = `Error: ${errorValue.error.message}`;
      } else if (value !== null && value !== undefined) {
        try {
          lineResult = this.formatter.format(value);
        } catch (error) {
          hasError = true;
          const errorMessage = error instanceof Error ? error.message : String(error);
          runtimeErrors.push(
            new RuntimeError(
              `Formatting error: ${errorMessage}`,
              getLineLocation(line)
            )
          );
          lineResult = `Formatting Error: ${errorMessage}`;
        }
      }

      results.push({
        line: lineNumber,
        type: line !== null && typeof line === 'object' && 'type' in line ? (line as any).type : 'unknown',
        result: lineResult,
        rawValue: value,
        ast: line,
        hasError
      });
    }

    return {
      results,
      errors: {
        lexer: [],
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
    const nearleyParser = new NearleyParser(this.dataLoader);
    const result = nearleyParser.parseDocument(input);
    return {
      ast: result.ast as any as Document,
      errors: {
        lexer: [],
        parser: result.errors
      }
    };
  }
}

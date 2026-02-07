import type { SourceLocation, Document, ParsedLine } from './document';
import type { Value } from './evaluator';

/**
 * Base error class for all language errors
 */
export abstract class LanguageError extends Error {
  constructor(
    message: string,
    public readonly location: SourceLocation,
    public readonly errorType: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  /**
   * Format error with location information
   */
  format(): string {
    return `${this.errorType} at line ${this.location.line}, column ${this.location.column}: ${this.message}`;
  }
}

/**
 * Lexer errors - problems during tokenization
 */
export class LexerError extends LanguageError {
  constructor(message: string, location: SourceLocation) {
    super(message, location, 'Lexer Error');
  }
}

/**
 * Parser errors - problems during syntactic analysis
 */
export class ParserError extends LanguageError {
  constructor(message: string, location: SourceLocation) {
    super(message, location, 'Parser Error');
  }
}

/**
 * Runtime errors - problems during evaluation
 */
export class RuntimeError extends LanguageError {
  constructor(message: string, location: SourceLocation) {
    super(message, location, 'Runtime Error');
  }
}

/**
 * Line error information for error recording
 */
export interface LineError {
  line: number;           // Which line (1-indexed)
  error: LanguageError;   // The error details
  rawText: string;        // Original text of the line
}

/**
 * Result of parsing with collected errors
 */
export interface DocumentResult {
  ast: Document;
  errors: LineError[];
  evaluatedValues?: Map<ParsedLine, Value | null>;
}

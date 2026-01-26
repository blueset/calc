import { SourceLocation } from './tokens';

/**
 * Base error class for all language errors
 */
export abstract class LanguageError extends Error {
  constructor(
    message: string,
    public readonly start: SourceLocation,
    public readonly end: SourceLocation,
    public readonly errorType: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  /**
   * Format error with location information
   */
  format(): string {
    return `${this.errorType} at line ${this.start.line}, column ${this.start.column}: ${this.message}`;
  }
}

/**
 * Lexer errors - problems during tokenization
 */
export class LexerError extends LanguageError {
  constructor(message: string, start: SourceLocation, end: SourceLocation) {
    super(message, start, end, 'Lexer Error');
  }
}

/**
 * Parser errors - problems during syntactic analysis
 */
export class ParserError extends LanguageError {
  constructor(message: string, start: SourceLocation, end: SourceLocation) {
    super(message, start, end, 'Parser Error');
  }
}

/**
 * Type errors - problems during semantic analysis
 */
export class TypeError extends LanguageError {
  constructor(message: string, start: SourceLocation, end: SourceLocation) {
    super(message, start, end, 'Type Error');
  }
}

/**
 * Runtime errors - problems during evaluation
 */
export class RuntimeError extends LanguageError {
  constructor(message: string, start: SourceLocation, end: SourceLocation) {
    super(message, start, end, 'Runtime Error');
  }
}

/**
 * Error result wrapper for expressions that fail type checking or evaluation
 */
export interface ErrorResult {
  type: 'error';
  error: LanguageError;
}

/**
 * Check if a value is an error result
 */
export function isErrorResult(value: any): value is ErrorResult {
  return value && typeof value === 'object' && value.type === 'error';
}

/**
 * Create an error result
 */
export function createErrorResult(error: LanguageError): ErrorResult {
  return { type: 'error', error };
}

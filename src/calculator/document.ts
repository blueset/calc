/**
 * Document Types for Nearley AST
 *
 * Defines the document structure that uses Nearley AST for parsed lines
 * while keeping simple wrappers for non-expression lines (headings, empty, plain text)
 */

import * as NearleyAST from './nearley/types';

/**
 * Source location for error reporting
 */
export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

/**
 * Parsed line types - union of Nearley AST lines and simple wrapper types
 */
export type ParsedLine =
  | NearleyAST.LineNode  // VariableAssignment or ExpressionNode (from Nearley)
  | Heading              // Markdown heading
  | EmptyLine            // Blank line
  | PlainText;           // Parse failure or unparseable line

/**
 * Document - contains all parsed lines
 */
export interface Document {
  type: 'Document';
  lines: ParsedLine[];
  location: SourceLocation;  // Location of start of document
}

/**
 * Heading line (markdown-style)
 */
export interface Heading {
  type: 'Heading';
  level: number;
  text: string;
  location: SourceLocation;
}

/**
 * Empty line
 */
export interface EmptyLine {
  type: 'EmptyLine';
  location: SourceLocation;
}

/**
 * Plain text line (unparseable or parse failure)
 */
export interface PlainText {
  type: 'PlainText';
  text: string;
  location: SourceLocation;
}

/**
 * Factory functions for creating document elements
 */

export function createDocument(lines: ParsedLine[]): Document {
  return {
    type: 'Document',
    lines,
    location: { line: 0, column: 0, offset: 0 }
  };
}

export function createHeading(level: number, text: string, location: SourceLocation): Heading {
  return {
    type: 'Heading',
    level,
    text,
    location
  };
}

export function createEmptyLine(location: SourceLocation): EmptyLine {
  return {
    type: 'EmptyLine',
    location
  };
}

export function createPlainText(text: string, location: SourceLocation): PlainText {
  return {
    type: 'PlainText',
    text,
    location
  };
}

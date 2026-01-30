/**
 * Token types for the Notepad Calculator Language lexer
 */

export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  UNIT = 'UNIT',
  BOOLEAN = 'BOOLEAN',
  DATETIME = 'DATETIME',

  // Identifiers and keywords
  IDENTIFIER = 'IDENTIFIER',
  KEYWORD = 'KEYWORD',

  // Operators
  PLUS = 'PLUS',              // +
  MINUS = 'MINUS',            // -
  STAR = 'STAR',              // *
  SLASH = 'SLASH',            // /
  PERCENT = 'PERCENT',        // %
  CARET = 'CARET',            // ^
  BANG = 'BANG',              // !
  TILDE = 'TILDE',            // ~
  AMPERSAND = 'AMPERSAND',    // &
  PIPE = 'PIPE',              // |

  // Comparison operators
  LT = 'LT',                  // <
  LTE = 'LTE',                // <=
  GT = 'GT',                  // >
  GTE = 'GTE',                // >=
  EQ = 'EQ',                  // ==
  NEQ = 'NEQ',                // !=

  // Logical operators
  AND = 'AND',                // &&
  OR = 'OR',                  // ||

  // Bit shift operators
  LSHIFT = 'LSHIFT',          // <<
  RSHIFT = 'RSHIFT',          // >>

  // Assignment
  ASSIGN = 'ASSIGN',          // =

  // Conversion operators
  TO = 'TO',                  // to
  IN = 'IN',                  // in
  AS = 'AS',                  // as
  ARROW = 'ARROW',            // →

  // Keywords
  IF = 'IF',                  // if
  THEN = 'THEN',              // then
  ELSE = 'ELSE',              // else
  PER = 'PER',                // per
  MOD = 'MOD',                // mod
  XOR = 'XOR',                // xor
  BASE = 'BASE',              // base
  SQUARE = 'SQUARE',          // square
  CUBIC = 'CUBIC',            // cubic
  SQUARED = 'SQUARED',        // squared
  CUBED = 'CUBED',            // cubed

  // Punctuation
  LPAREN = 'LPAREN',          // (
  RPAREN = 'RPAREN',          // )
  COMMA = 'COMMA',            // ,
  DOT = 'DOT',                // .

  // Structural
  NEWLINE = 'NEWLINE',        // \n
  COMMENT = 'COMMENT',        // # ...
  EOF = 'EOF',                // End of file

  // Special
  HEADING = 'HEADING',        // # Heading (at start of line)
}

/**
 * Source location for error reporting
 */
export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

/**
 * Token with type, value, and location information
 */
export interface Token {
  type: TokenType;
  value: string;
  start: SourceLocation;
  end: SourceLocation;
}

/**
 * Keywords that are reserved
 */
export const KEYWORDS = new Set([
  'if',
  'then',
  'else',
  'to',
  'in',
  'as',
  'per',
  'mod',
  'xor',
  'base',
  'square',
  'cubic',
  'squared',
  'cubed',
  'true',
  'false'
]);

/**
 * Check if a string is a keyword
 */
export function isKeyword(str: string): boolean {
  return KEYWORDS.has(str.toLowerCase());
}

/**
 * Get token type for a keyword
 */
export function getKeywordType(keyword: string): TokenType {
  switch (keyword.toLowerCase()) {
    case 'if': return TokenType.IF;
    case 'then': return TokenType.THEN;
    case 'else': return TokenType.ELSE;
    case 'to': return TokenType.TO;
    case 'in': return TokenType.IN;
    case 'as': return TokenType.AS;
    case 'per': return TokenType.PER;
    case 'mod': return TokenType.MOD;
    case 'xor': return TokenType.XOR;
    case 'base': return TokenType.BASE;
    case 'square': return TokenType.SQUARE;
    case 'cubic': return TokenType.CUBIC;
    case 'squared': return TokenType.SQUARED;
    case 'cubed': return TokenType.CUBED;
    case 'true':
    case 'false':
      return TokenType.BOOLEAN;
    default:
      return TokenType.KEYWORD;
  }
}

/**
 * Check if a token is a binary operator
 */
export function isBinaryOperator(type: TokenType): boolean {
  return [
    TokenType.PLUS,
    TokenType.MINUS,
    TokenType.STAR,
    TokenType.SLASH,
    TokenType.PERCENT,
    TokenType.CARET,
    TokenType.AMPERSAND,
    TokenType.PIPE,
    TokenType.LT,
    TokenType.LTE,
    TokenType.GT,
    TokenType.GTE,
    TokenType.EQ,
    TokenType.NEQ,
    TokenType.AND,
    TokenType.OR,
    TokenType.LSHIFT,
    TokenType.RSHIFT,
    TokenType.PER,
    TokenType.MOD,
    TokenType.XOR
  ].includes(type);
}

/**
 * Check if a token is a unary operator
 */
export function isUnaryOperator(type: TokenType): boolean {
  return [
    TokenType.MINUS,
    TokenType.BANG,
    TokenType.TILDE
  ].includes(type);
}

/**
 * Check if a token is a conversion operator
 */
export function isConversionOperator(type: TokenType): boolean {
  return [
    TokenType.TO,
    TokenType.IN,
    TokenType.AS,
    TokenType.ARROW
  ].includes(type);
}

/**
 * Get operator precedence (higher number = tighter binding)
 * Based on GRAMMAR.md operator precedence table
 *
 * In operator precedence climbing: operators with higher precedence values
 * bind more tightly (are parsed deeper in the tree).
 */
export function getOperatorPrecedence(type: TokenType): number {
  switch (type) {
    case TokenType.ASSIGN:
      return 1;
    case TokenType.TO:
    case TokenType.IN:
    case TokenType.AS:
    case TokenType.ARROW:
      return 2;
    case TokenType.OR:
      return 3;
    case TokenType.AND:
      return 4;
    case TokenType.PIPE:
      return 5;
    case TokenType.XOR:
      return 6;
    case TokenType.AMPERSAND:
      return 7;
    case TokenType.LT:
    case TokenType.LTE:
    case TokenType.GT:
    case TokenType.GTE:
    case TokenType.EQ:
    case TokenType.NEQ:
      return 8;
    case TokenType.LSHIFT:
    case TokenType.RSHIFT:
      return 9;
    case TokenType.PLUS:
    case TokenType.MINUS:
      return 10;
    case TokenType.STAR:
    case TokenType.SLASH:
    case TokenType.PERCENT:
    case TokenType.MOD:
    case TokenType.PER:
      return 11;
    case TokenType.CARET:
      return 13;
    default:
      return 0; // Very low precedence for unknown operators
  }
}

/**
 * Check if operator is right-associative
 */
export function isRightAssociative(type: TokenType): boolean {
  return type === TokenType.CARET || type === TokenType.ASSIGN;
}

/**
 * Create a token
 */
export function createToken(
  type: TokenType,
  value: string,
  start: SourceLocation,
  end: SourceLocation
): Token {
  return { type, value, start, end };
}

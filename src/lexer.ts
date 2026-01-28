import {
  Token,
  TokenType,
  SourceLocation,
  createToken,
  isKeyword,
  getKeywordType
} from './tokens';
import { DataLoader } from './data-loader';
import { isConstant } from './constants';
import { LexerError } from './error-handling';

/**
 * Context-sensitive lexer for the Notepad Calculator Language
 *
 * Key features:
 * - Scientific notation priority (2e3 → 2000, not 2*e*3)
 * - Longest unit match after numbers using trie
 * - Multi-word unit detection
 * - Date/time pattern recognition
 * - Case-sensitive/insensitive handling
 */
export class Lexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private dataLoader: DataLoader;
  private lastToken: Token | null = null;

  constructor(input: string, dataLoader: DataLoader) {
    this.input = input;
    this.dataLoader = dataLoader;
  }

  /**
   * Tokenize the entire input
   */
  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (!this.isAtEnd()) {
      const token = this.nextToken();
      if (token) {
        tokens.push(token);
        this.lastToken = token;
      }
    }

    // Add EOF token
    tokens.push(this.createToken(TokenType.EOF, '', this.currentLocation(), this.currentLocation()));

    return tokens;
  }

  /**
   * Get the next token
   */
  private nextToken(): Token | null {
    this.skipWhitespace();

    if (this.isAtEnd()) {
      return null;
    }

    const start = this.currentLocation();

    // Newline
    if (this.peek() === '\n') {
      this.advance();
      return this.createToken(TokenType.NEWLINE, '\n', start, this.currentLocation());
    }

    // Comment or heading
    if (this.peek() === '#') {
      // Check if this is at the start of a line (heading)
      if (this.column === 1) {
        return this.scanHeading(start);
      } else {
        return this.scanComment(start);
      }
    }

    // Numbers (including scientific notation)
    if (this.isDigit(this.peek())) {
      return this.scanNumber(start);
    }

    // Operators (multi-character first)
    const twoChar = this.input.substring(this.position, this.position + 2);
    switch (twoChar) {
      case '==':
        this.advance();
        this.advance();
        return this.createToken(TokenType.EQ, '==', start, this.currentLocation());
      case '!=':
        this.advance();
        this.advance();
        return this.createToken(TokenType.NEQ, '!=', start, this.currentLocation());
      case '<=':
        this.advance();
        this.advance();
        return this.createToken(TokenType.LTE, '<=', start, this.currentLocation());
      case '>=':
        this.advance();
        this.advance();
        return this.createToken(TokenType.GTE, '>=', start, this.currentLocation());
      case '<<':
        this.advance();
        this.advance();
        return this.createToken(TokenType.LSHIFT, '<<', start, this.currentLocation());
      case '>>':
        this.advance();
        this.advance();
        return this.createToken(TokenType.RSHIFT, '>>', start, this.currentLocation());
      case '&&':
        this.advance();
        this.advance();
        return this.createToken(TokenType.AND, '&&', start, this.currentLocation());
      case '||':
        this.advance();
        this.advance();
        return this.createToken(TokenType.OR, '||', start, this.currentLocation());
    }

    // Single character operators
    const char = this.peek();
    switch (char) {
      case '+':
        this.advance();
        return this.createToken(TokenType.PLUS, '+', start, this.currentLocation());
      case '-':
        this.advance();
        return this.createToken(TokenType.MINUS, '-', start, this.currentLocation());
      case '*':
        this.advance();
        return this.createToken(TokenType.STAR, '*', start, this.currentLocation());
      case '/':
        this.advance();
        return this.createToken(TokenType.SLASH, '/', start, this.currentLocation());
      case '%':
        this.advance();
        return this.createToken(TokenType.PERCENT, '%', start, this.currentLocation());
      case '^':
        this.advance();
        return this.createToken(TokenType.CARET, '^', start, this.currentLocation());
      case '!':
        this.advance();
        return this.createToken(TokenType.BANG, '!', start, this.currentLocation());
      case '~':
        this.advance();
        return this.createToken(TokenType.TILDE, '~', start, this.currentLocation());
      case '&':
        this.advance();
        return this.createToken(TokenType.AMPERSAND, '&', start, this.currentLocation());
      case '|':
        this.advance();
        return this.createToken(TokenType.PIPE, '|', start, this.currentLocation());
      case '<':
        this.advance();
        return this.createToken(TokenType.LT, '<', start, this.currentLocation());
      case '>':
        this.advance();
        return this.createToken(TokenType.GT, '>', start, this.currentLocation());
      case '=':
        this.advance();
        return this.createToken(TokenType.ASSIGN, '=', start, this.currentLocation());
      case '(':
        this.advance();
        return this.createToken(TokenType.LPAREN, '(', start, this.currentLocation());
      case ')':
        this.advance();
        return this.createToken(TokenType.RPAREN, ')', start, this.currentLocation());
      case ',':
        this.advance();
        return this.createToken(TokenType.COMMA, ',', start, this.currentLocation());
      case '→':
        this.advance();
        return this.createToken(TokenType.ARROW, '→', start, this.currentLocation());
    }

    // Identifiers, keywords, or date/time literals
    if (this.isAlpha(char) || char === '_') {
      return this.scanIdentifierOrDateTime(start);
    }

    // Unknown character - throw error instead of silently skipping
    const end = this.currentLocation();
    throw new LexerError(
      `Unexpected character '${char}'`,
      start,
      end
    );
  }

  /**
   * Scan a number literal (integer, decimal, scientific notation, or special bases)
   * Also handles time literals (H:MM, H:MM:SS)
   */
  private scanNumber(start: SourceLocation): Token {
    let value = '';

    // Check for binary (0b), octal (0o), or hex (0x)
    if (this.peek() === '0' && this.position + 1 < this.input.length) {
      const next = this.input[this.position + 1].toLowerCase();
      if (next === 'b' || next === 'o' || next === 'x') {
        value += this.advance(); // '0'
        value += this.advance(); // 'b', 'o', or 'x'

        // Scan digits for the specific base
        while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
          value += this.advance();
        }

        return this.createToken(TokenType.NUMBER, value, start, this.currentLocation());
      }
    }

    // Regular number
    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Check for time literal pattern (H:MM or H:MM:SS)
    // Must check BEFORE decimal point to avoid confusion with decimal numbers
    if (this.peek() === ':' && this.isDigit(this.peekNext())) {
      // This looks like a time literal
      value += this.advance(); // ':'

      // Scan minutes (should be exactly 2 digits, but we'll validate in parser)
      if (this.isDigit(this.peek())) {
        value += this.advance();
      }
      if (this.isDigit(this.peek())) {
        value += this.advance();
      }

      // Check for seconds (optional :SS)
      if (this.peek() === ':' && this.isDigit(this.peekNext())) {
        value += this.advance(); // ':'

        // Scan seconds (should be exactly 2 digits, but we'll validate in parser)
        if (this.isDigit(this.peek())) {
          value += this.advance();
        }
        if (this.isDigit(this.peek())) {
          value += this.advance();
        }
      }

      // Return DATETIME token for time literal
      return this.createToken(TokenType.DATETIME, value, start, this.currentLocation());
    }

    // Decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // '.'
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    // Scientific notation (e or E)
    // Priority: 2e3 should be 2000, not 2*e*3
    if ((this.peek() === 'e' || this.peek() === 'E')) {
      const next = this.peekNext();
      // Check if it's scientific notation (e followed by digit or sign+digit)
      if (this.isDigit(next) || ((next === '+' || next === '-') && this.isDigit(this.input[this.position + 2]))) {
        value += this.advance(); // 'e' or 'E'
        if (this.peek() === '+' || this.peek() === '-') {
          value += this.advance();
        }
        while (!this.isAtEnd() && this.isDigit(this.peek())) {
          value += this.advance();
        }
      }
    }

    // Return the NUMBER token (units will be handled separately in next token)
    return this.createToken(TokenType.NUMBER, value, start, this.currentLocation());
  }

  /**
   * Scan an identifier, keyword, unit, boolean, or date/time literal
   */
  private scanIdentifierOrDateTime(start: SourceLocation): Token {
    let value = '';

    // Scan alphanumeric characters, underscores, and Unicode superscripts
    while (!this.isAtEnd() && (this.isAlphaNumeric(this.peek()) || this.peek() === '_' || this.isSuperscript(this.peek()))) {
      value += this.advance();
    }

    // Check if it's a keyword (highest priority)
    if (isKeyword(value)) {
      const type = getKeywordType(value);
      return this.createToken(type, value, start, this.currentLocation());
    }

    // Check for AM/PM disambiguation (before general date/time check)
    // am/pm/AM/PM can be either time indicators OR units (attometers/picometers/petameters)
    if (value === 'am' || value === 'pm' || value === 'AM' || value === 'PM') {
      const tokenType = this.disambiguateAmPm(value);
      return this.createToken(tokenType, value, start, this.currentLocation());
    }

    // Check for date/time patterns early (before units)
    // This is a simplified check - full date/time parsing happens in the parser
    if (this.looksLikeDateTime(value)) {
      return this.createToken(TokenType.DATETIME, value, start, this.currentLocation());
    }

    // Check if it's a constant
    if (isConstant(value)) {
      return this.createToken(TokenType.IDENTIFIER, value, start, this.currentLocation());
    }

    // Check if it's a unit
    // Try case-sensitive first, then case-insensitive
    const unitCaseSensitive = this.dataLoader.getUnitByName(value);
    if (unitCaseSensitive) {
      return this.createToken(TokenType.UNIT, value, start, this.currentLocation());
    }

    const unitsCaseInsensitive = this.dataLoader.getUnitsByCaseInsensitiveName(value);
    if (unitsCaseInsensitive.length > 0) {
      return this.createToken(TokenType.UNIT, value, start, this.currentLocation());
    }

    // Check if it contains superscripts - if so, check if base is a unit
    // This handles derived units like "m²", "s⁻¹", "m²s³" which should be UNIT tokens
    if (this.containsSuperscript(value)) {
      const baseUnitName = this.extractBaseBeforeSuperscript(value);
      const baseUnit = this.dataLoader.getUnitByName(baseUnitName);
      if (baseUnit) {
        return this.createToken(TokenType.UNIT, value, start, this.currentLocation());
      }
      const baseUnits = this.dataLoader.getUnitsByCaseInsensitiveName(baseUnitName);
      if (baseUnits.length > 0) {
        return this.createToken(TokenType.UNIT, value, start, this.currentLocation());
      }
    }

    // Check if it's a currency
    const currency = this.dataLoader.getCurrencyByCode(value);
    if (currency) {
      return this.createToken(TokenType.UNIT, value, start, this.currentLocation());
    }

    const currencies = this.dataLoader.getCurrenciesByName(value);
    if (currencies.length > 0) {
      return this.createToken(TokenType.UNIT, value, start, this.currentLocation());
    }

    // Check if it could be a timezone name
    const timezone = this.dataLoader.resolveTimezone(value);
    if (timezone) {
      return this.createToken(TokenType.IDENTIFIER, value, start, this.currentLocation());
    }

    return this.createToken(TokenType.IDENTIFIER, value, start, this.currentLocation());
  }

  /**
   * Disambiguate am/pm/AM/PM between time indicators and units
   *
   * Rule: am/pm/AM/PM after NUMBER or DATETIME token
   * - If previous NUMBER matches /^(0?[1-9]|1[0-2])$/ → DATETIME (time indicator)
   * - If previous DATETIME is time literal (H:MM pattern) → DATETIME (time indicator)
   * - Otherwise → UNIT (attometers/picometers/petameters)
   *
   * Examples:
   * - "10 am" → DATETIME (10:00:00)
   * - "10:30 am" → DATETIME (10:30:00)
   * - "10.0 am" → 10.0 UNIT(attometers)
   * - "13 am" → 13 UNIT(attometers)
   */
  private disambiguateAmPm(value: string): TokenType {
    // Check if previous token was a NUMBER
    if (this.lastToken && this.lastToken.type === TokenType.NUMBER) {
      const numberString = this.lastToken.value;

      // Only these exact string values are time indicators:
      // '1'-'9', '01'-'09', '10', '11', '12'
      // Regex: /^(0?[1-9]|1[0-2])$/
      const timeHourPattern = /^(0?[1-9]|1[0-2])$/;

      if (timeHourPattern.test(numberString)) {
        return TokenType.DATETIME;  // Time indicator
      }
    }

    // Check if previous token was a DATETIME (time literal like "10:30")
    if (this.lastToken && this.lastToken.type === TokenType.DATETIME) {
      // Check if it's a time pattern (H:MM or H:MM:SS)
      const timePattern = /^\d{1,2}:\d{1,2}(:\d{1,2})?$/;
      if (timePattern.test(this.lastToken.value)) {
        return TokenType.DATETIME;  // Time indicator for time literal
      }
    }

    // Not preceded by valid time hour or time literal, treat as unit
    return TokenType.UNIT;  // attometers/picometers/petameters
  }

  /**
   * Check if a value looks like a date/time component
   */
  private looksLikeDateTime(value: string): boolean {
    // Month names
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
                    'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

    // Day names
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
                  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    // Time indicators
    const timeIndicators = ['am', 'pm'];

    const lower = value.toLowerCase();

    return months.includes(lower) || days.includes(lower) || timeIndicators.includes(lower);
  }

  /**
   * Scan a comment (# to end of line, not at start of line)
   */
  private scanComment(start: SourceLocation): Token {
    let value = '';

    // Skip the '#'
    this.advance();

    // Read until end of line
    while (!this.isAtEnd() && this.peek() !== '\n') {
      value += this.advance();
    }

    return this.createToken(TokenType.COMMENT, value.trim(), start, this.currentLocation());
  }

  /**
   * Scan a heading (# at start of line)
   */
  private scanHeading(start: SourceLocation): Token {
    let value = '';

    // Count the number of '#' characters
    let level = 0;
    while (!this.isAtEnd() && this.peek() === '#') {
      level++;
      this.advance();
    }

    // Skip whitespace after '#'
    while (!this.isAtEnd() && (this.peek() === ' ' || this.peek() === '\t')) {
      this.advance();
    }

    // Read the heading text until end of line
    while (!this.isAtEnd() && this.peek() !== '\n') {
      value += this.advance();
    }

    // Encode level by prepending it to the value (format: "LEVEL:text")
    const headingValue = `${level}:${value.trim()}`;

    return this.createToken(TokenType.HEADING, headingValue, start, this.currentLocation());
  }

  /**
   * Skip whitespace (but not newlines)
   */
  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else {
        break;
      }
    }
  }

  /**
   * Check if at end of input
   */
  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  /**
   * Peek at current character
   */
  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.input[this.position];
  }

  /**
   * Peek at next character
   */
  private peekNext(): string {
    if (this.position + 1 >= this.input.length) return '\0';
    return this.input[this.position + 1];
  }

  /**
   * Advance to next character
   */
  private advance(): string {
    const char = this.input[this.position];
    this.position++;

    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }

    return char;
  }

  /**
   * Get current source location
   */
  private currentLocation(): SourceLocation {
    return {
      line: this.line,
      column: this.column,
      offset: this.position
    };
  }

  /**
   * Create a token with location information
   */
  private createToken(type: TokenType, value: string, start: SourceLocation, end: SourceLocation): Token {
    return createToken(type, value, start, end);
  }

  /**
   * Check if character is a digit
   */
  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  /**
   * Check if character is alphabetic
   */
  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  /**
   * Check if character is alphanumeric
   */
  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  /**
   * Check if character is a Unicode superscript
   */
  private isSuperscript(char: string): boolean {
    return '⁰¹²³⁴⁵⁶⁷⁸⁹⁻'.includes(char);
  }

  /**
   * Check if a string contains any Unicode superscripts
   */
  private containsSuperscript(str: string): boolean {
    for (const char of str) {
      if (this.isSuperscript(char)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Extract the base unit name before the first superscript
   * For "m²s³" returns "m", for "kg⁻¹" returns "kg"
   */
  private extractBaseBeforeSuperscript(str: string): string {
    for (let i = 0; i < str.length; i++) {
      if (this.isSuperscript(str[i])) {
        return str.substring(0, i);
      }
    }
    return str; // No superscript found
  }
}

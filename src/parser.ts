import {
  Token,
  TokenType,
  SourceLocation,
  getOperatorPrecedence,
  isRightAssociative,
  isBinaryOperator,
  isUnaryOperator,
  isConversionOperator
} from './tokens';
import {
  ASTNode,
  Document,
  Line,
  Expression,
  BinaryOperator,
  UnaryOperator,
  ConversionTarget,
  UnitExpression,
  SimpleUnit,
  DerivedUnit,
  UnitTerm,
  createDocument,
  createHeading,
  createExpressionLine,
  createVariableDefinition,
  createPlainText,
  createEmptyLine,
  createBinaryExpression,
  createUnaryExpression,
  createPostfixExpression,
  createNumberLiteral,
  createNumberWithUnit,
  createIdentifier,
  createBooleanLiteral,
  createConstantLiteral,
  createFunctionCall,
  createGroupedExpression,
  createConditionalExpression,
  createConversionExpression,
  createSimpleUnit,
  createDerivedUnit,
  createUnitTarget,
  createCompositeUnitTarget,
  createPlainDateLiteral,
  createPlainTimeLiteral,
  createPlainDateTimeLiteral,
  createZonedDateTimeLiteral,
  createInstantLiteral,
  PlainDateLiteral,
  PlainTimeLiteral,
  CompositeUnitLiteral,
  PresentationTarget,
  PropertyTarget,
  TimezoneTarget,
  DateTimeProperty,
  PresentationFormat
} from './ast';
import { DataLoader } from './data-loader';
import { isConstant, getConstantValue } from './constants';

/**
 * Parser for the Notepad Calculator Language
 *
 * Implements recursive descent parsing with operator precedence climbing
 * Key features:
 * - Error recovery (fallback to PlainText for unparseable lines)
 * - Composite unit detection
 * - "per" operator disambiguation
 * - City/timezone lookup with territory
 * - Conversion chaining (left-associative)
 */
export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private dataLoader: DataLoader;
  private errorRecoveryMode: boolean = false;

  constructor(tokens: Token[], dataLoader: DataLoader) {
    this.tokens = tokens;
    this.dataLoader = dataLoader;
  }

  /**
   * Parse the entire document
   */
  parseDocument(): Document {
    const start = this.currentToken().start;
    const lines: Line[] = [];

    while (!this.isAtEnd()) {
      // Skip newlines
      while (this.match(TokenType.NEWLINE)) {
        // Just consume
      }

      if (this.isAtEnd()) break;

      const line = this.parseLine();
      lines.push(line);

      // Expect newline or EOF after each line
      if (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
        // Error: missing newline, but continue
        this.advance();
      }
    }

    const end = this.previous().end;
    return createDocument(lines, start, end);
  }

  /**
   * Parse a single line
   *
   * Line types:
   * - Heading: # Text
   * - Empty: just whitespace/newline
   * - Variable definition: name = expression
   * - Expression: any expression
   * - PlainText: fallback for unparseable content
   */
  private parseLine(): Line {
    const start = this.currentToken().start;

    // Empty line
    if (this.check(TokenType.NEWLINE) || this.isAtEnd()) {
      const end = this.isAtEnd() ? this.previous().end : this.currentToken().end;
      return createEmptyLine(start, end);
    }

    // Heading
    if (this.match(TokenType.HEADING)) {
      const headingToken = this.previous();
      // Value format: "LEVEL:text"
      const colonIndex = headingToken.value.indexOf(':');
      const level = parseInt(headingToken.value.substring(0, colonIndex), 10);
      const text = headingToken.value.substring(colonIndex + 1);
      return createHeading(level, text, start, headingToken.end);
    }

    // Try to parse as expression or variable definition
    try {
      this.errorRecoveryMode = false;
      const lineStart = this.current;

      // Try to parse as variable definition: IDENTIFIER = Expression
      if (this.check(TokenType.IDENTIFIER)) {
        const identifierToken = this.peek();
        const nextToken = this.peekAhead(1);

        if (nextToken && nextToken.type === TokenType.ASSIGN) {
          // It's a variable definition
          this.advance(); // consume identifier
          const name = identifierToken.value;
          this.advance(); // consume =
          const value = this.parseExpression();
          const end = this.previous().end;
          return createVariableDefinition(name, value, start, end);
        }
      }

      // Otherwise, parse as expression
      const expression = this.parseExpression();
      const end = this.previous().end;
      return createExpressionLine(expression, start, end);

    } catch (error) {
      // Error recovery: consume tokens until newline and create PlainText
      this.errorRecoveryMode = true;
      const textTokens: string[] = [];

      while (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
        textTokens.push(this.currentToken().value);
        this.advance();
      }

      const text = textTokens.join(' ');
      const end = this.previous().end;
      return createPlainText(text, start, end);
    }
  }

  /**
   * Parse an expression using operator precedence climbing
   *
   * This is the top-level expression parser that handles all operators
   * with their precedence and associativity.
   */
  private parseExpression(minPrecedence: number = 0): Expression {
    // Parse primary expression (left side)
    let left = this.parsePrimary();

    // Operator precedence climbing
    while (true) {
      const operatorToken = this.currentToken();

      // Check if we have an operator
      if (this.isAtEnd() || this.check(TokenType.NEWLINE) || this.check(TokenType.EOF)) {
        break;
      }

      // Check for binary operators, conversions, conditionals
      let precedence = 0;
      let isOperator = false;

      // Binary operators
      if (isBinaryOperator(operatorToken.type)) {
        precedence = getOperatorPrecedence(operatorToken.type);
        isOperator = true;
      }
      // Conversion operators (to, in, as, →)
      else if (isConversionOperator(operatorToken.type)) {
        precedence = getOperatorPrecedence(operatorToken.type);
        isOperator = true;
      }
      // Assignment
      else if (operatorToken.type === TokenType.ASSIGN) {
        precedence = getOperatorPrecedence(TokenType.ASSIGN);
        isOperator = true;
      }
      // Postfix factorial
      else if (operatorToken.type === TokenType.BANG) {
        // Check if this is postfix (not unary prefix)
        // Postfix factorial has very high precedence (level 2 in grammar = very tight binding)
        precedence = 14;
        isOperator = true;
      }

      if (!isOperator || precedence < minPrecedence) {
        break;
      }

      // Handle the operator
      this.advance();

      // Special handling for different operators
      if (isConversionOperator(operatorToken.type)) {
        // Conversion: expression to/in/as/→ target
        left = this.parseConversion(left, operatorToken);
      }
      else if (operatorToken.type === TokenType.BANG && precedence === 14) {
        // Postfix factorial
        const end = this.previous().end;
        left = createPostfixExpression('!', left, left.start, end);
      }
      else if (operatorToken.type === TokenType.PER) {
        // "per" operator disambiguation (PARSER_PLAN.md lines 510-512)
        // - If next token is single unit → derived unit formation ("km per h" → "km/h")
        // - If next token is expression → division operator ("60 km per 2 h" → "30 km/h")
        const nextToken = this.currentToken();

        // Check if next is a single unit (UNIT or IDENTIFIER that could be a unit)
        const isSingleUnit = (nextToken.type === TokenType.UNIT || nextToken.type === TokenType.IDENTIFIER) &&
                            this.peekAhead(1)?.type !== TokenType.CARET; // Not followed by exponent

        if (isSingleUnit) {
          // Treat as derived unit - this would need special handling in unit parsing
          // For now, treat as division to keep consistent with spec
          const operator = 'per';
          const nextMinPrecedence = isRightAssociative(operatorToken.type)
            ? precedence
            : precedence + 1;
          const right = this.parseExpression(nextMinPrecedence);
          const end = this.previous().end;
          left = createBinaryExpression(operator, left, right, left.start, end);
        } else {
          // Treat as division operator
          const operator = 'per';
          const nextMinPrecedence = isRightAssociative(operatorToken.type)
            ? precedence
            : precedence + 1;
          const right = this.parseExpression(nextMinPrecedence);
          const end = this.previous().end;
          left = createBinaryExpression(operator, left, right, left.start, end);
        }
      }
      else {
        // Binary operator
        const operator = this.tokenToBinaryOperator(operatorToken);
        const nextMinPrecedence = isRightAssociative(operatorToken.type)
          ? precedence
          : precedence + 1;

        const right = this.parseExpression(nextMinPrecedence);
        const end = this.previous().end;
        left = createBinaryExpression(operator, left, right, left.start, end);
      }
    }

    return left;
  }

  /**
   * Parse a primary expression
   *
   * Primary expressions include:
   * - Literals (numbers, booleans, dates/times)
   * - Identifiers (variables, constants)
   * - Function calls
   * - Grouped expressions (parentheses)
   * - Unary operators
   */
  private parsePrimary(): Expression {
    const start = this.currentToken().start;

    // Unary operators
    if (this.match(TokenType.MINUS, TokenType.BANG, TokenType.TILDE)) {
      const operatorToken = this.previous();
      const operator = this.tokenToUnaryOperator(operatorToken);
      const operand = this.parsePrimary();
      const end = this.previous().end;
      return createUnaryExpression(operator, operand, start, end);
    }

    // Grouped expression
    if (this.match(TokenType.LPAREN)) {
      const expression = this.parseExpression();
      this.consume(TokenType.RPAREN, "Expected ')' after expression");
      const end = this.previous().end;
      return createGroupedExpression(expression, start, end);
    }

    // Boolean literal
    if (this.match(TokenType.BOOLEAN)) {
      const value = this.previous().value.toLowerCase() === 'true';
      return createBooleanLiteral(value, start, this.previous().end);
    }

    // Number (potentially with unit or composite unit)
    if (this.match(TokenType.NUMBER)) {
      return this.parseNumberWithOptionalUnit(this.previous());
    }

    // Date/Time literal
    if (this.match(TokenType.DATETIME)) {
      // For Phase 3, handle basic date/time cases
      // Full date/time parsing will be refined in later phases
      const token = this.previous();
      return this.parseDateTimeLiteral(token);
    }

    // Conditional expression (if-then-else)
    if (this.match(TokenType.IF)) {
      // Format: if condition then thenBranch else elseBranch
      const condition = this.parseExpression();
      this.consume(TokenType.THEN, "Expected 'then' in conditional expression");
      const thenBranch = this.parseExpression();
      this.consume(TokenType.ELSE, "Expected 'else' in conditional expression");
      const elseBranch = this.parseExpression();
      const end = this.previous().end;
      return createConditionalExpression(condition, thenBranch, elseBranch, start, end);
    }

    // Identifier (variable, constant, or function call)
    if (this.match(TokenType.IDENTIFIER)) {
      const identifierToken = this.previous();
      const name = identifierToken.value;

      // Check if it's a function call
      if (this.check(TokenType.LPAREN)) {
        return this.parseFunctionCall(name, start);
      }

      // Check if it's a constant
      if (isConstant(name)) {
        return createConstantLiteral(name, start, identifierToken.end);
      }

      // It's a variable
      return createIdentifier(name, start, identifierToken.end);
    }

    // UNIT tokens without numbers (e.g., "h" in "5 km per h")
    // Treat as identifier/variable reference
    if (this.match(TokenType.UNIT)) {
      const unitToken = this.previous();
      return createIdentifier(unitToken.value, start, unitToken.end);
    }

    // If we get here, we have an unexpected token
    throw new Error(`Unexpected token: ${this.currentToken().type} at ${this.currentToken().start.line}:${this.currentToken().start.column}`);
  }

  /**
   * Parse a number with optional unit
   *
   * Handles:
   * - Plain number: 42
   * - Number with unit: 5 km
   * - Composite unit: 5 ft 3 in
   */
  private parseNumberWithOptionalUnit(numberToken: Token): Expression {
    const value = parseFloat(numberToken.value);
    const start = numberToken.start;

    // Check for date pattern: YYYY MONTH D (e.g., "2024 Jan 15")
    if (this.check(TokenType.DATETIME)) {
      const monthToken = this.currentToken();
      const monthNum = this.parseMonthName(monthToken.value.toLowerCase());
      if (monthNum !== null) {
        // This looks like a date pattern
        this.advance(); // consume month token

        // Check for day number
        if (this.check(TokenType.NUMBER)) {
          const dayToken = this.currentToken();
          this.advance();
          const year = parseInt(numberToken.value);
          const day = parseInt(dayToken.value);
          const end = this.previous().end;
          return createPlainDateLiteral(year, monthNum, day, start, end);
        }

        // No day, backtrack
        this.current--;
      }
    }

    // Check for unit after number
    if (this.check(TokenType.UNIT)) {
      // Check if this might be a composite unit (multiple value-unit pairs)
      const units: Array<{ value: number; unit: UnitExpression }> = [];

      // First value-unit pair
      const firstUnit = this.parseUnit();
      units.push({ value, unit: firstUnit });

      // Check for additional value-unit pairs (composite unit)
      // Pattern: NUMBER UNIT NUMBER UNIT ...
      // Special case: IN keyword can be "inches" in composite unit context
      while (this.check(TokenType.NUMBER)) {
        const nextNumberToken = this.currentToken();
        this.advance();
        const nextValue = parseFloat(nextNumberToken.value);

        // Check if next is UNIT or IN (which could be "inches" in this context)
        if (this.check(TokenType.UNIT) || this.check(TokenType.IN)) {
          const nextUnit = this.parseUnit();
          units.push({ value: nextValue, unit: nextUnit });
        } else {
          // Not a composite unit, backtrack
          this.current--;
          break;
        }
      }

      // If we have multiple units, it's a composite unit
      if (units.length > 1) {
        const end = this.previous().end;
        const composite: CompositeUnitLiteral = {
          type: 'CompositeUnitLiteral',
          components: units,
          start,
          end
        };
        return composite;
      }

      // Single unit
      const end = this.previous().end;
      return createNumberWithUnit(value, firstUnit, numberToken.value, start, end);
    }

    // Plain number (no unit)
    return createNumberLiteral(value, numberToken.value, start, numberToken.end);
  }

  /**
   * Parse a unit expression
   *
   * Handles:
   * - Simple units: km, meter, hour
   * - Derived units: m/s, kg m/s², W/m²
   * - Units with exponents: m^2, km²
   */
  private parseUnit(): UnitExpression {
    const start = this.currentToken().start;

    // Simple case: single unit token
    if (this.match(TokenType.UNIT)) {
      const unitToken = this.previous();
      const unitData = this.dataLoader.getUnitByName(unitToken.value);

      // Use the unit ID if found, otherwise use the name as-is (user-defined)
      const unitId = unitData ? unitData.id : unitToken.value;
      return createSimpleUnit(unitId, unitToken.value, start, unitToken.end);
    }

    // Special case: IN keyword can be "inches" in unit context (GRAMMAR.md line 649-652)
    // Context: After NUMBER in composite unit pattern, "in" = inches
    if (this.match(TokenType.IN)) {
      const unitToken = this.previous();
      // Treat "in" as the unit "inches" (inch)
      const unitData = this.dataLoader.getUnitByName('in') || this.dataLoader.getUnitByName('inch');
      const unitId = unitData ? unitData.id : 'inch';
      return createSimpleUnit(unitId, 'in', start, unitToken.end);
    }

    // Identifier as user-defined unit
    if (this.match(TokenType.IDENTIFIER)) {
      const unitToken = this.previous();
      // User-defined units use the name as the ID
      return createSimpleUnit(unitToken.value, unitToken.value, start, unitToken.end);
    }

    throw new Error(`Expected unit at ${start.line}:${start.column}`);
  }

  /**
   * Parse a function call
   *
   * Format: name(arg1, arg2, ...)
   */
  private parseFunctionCall(name: string, start: SourceLocation): Expression {
    this.consume(TokenType.LPAREN, "Expected '(' after function name");

    const args: Expression[] = [];

    // Parse arguments
    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RPAREN, "Expected ')' after function arguments");
    const end = this.previous().end;

    return createFunctionCall(name, args, start, end);
  }

  /**
   * Parse a conversion expression
   *
   * Format: expression to/in/as/→ target
   *
   * Targets can be:
   * - Unit: to meters, in km
   * - Composite unit: to ft in
   * - Presentation: to binary, to hex
   * - Property: to year, to month
   * - Timezone: to EST, to America/New_York
   */
  private parseConversion(expression: Expression, operatorToken: Token): Expression {
    const start = expression.start;
    const operator = operatorToken.value as 'to' | 'in' | 'as' | '→';

    // Parse conversion target
    const target = this.parseConversionTarget();

    const end = this.previous().end;
    return createConversionExpression(expression, operator, target, start, end);
  }

  /**
   * Parse a conversion target
   */
  private parseConversionTarget(): ConversionTarget {
    const start = this.currentToken().start;

    // Check for presentation formats
    if (this.check(TokenType.IDENTIFIER)) {
      const name = this.currentToken().value.toLowerCase();
      const presentationFormats = ['binary', 'octal', 'hex', 'fraction', 'scientific', 'ordinal'];

      if (presentationFormats.includes(name)) {
        this.advance();
        const format = name as PresentationFormat;
        const target: PresentationTarget = {
          type: 'PresentationTarget',
          format,
          start,
          end: this.previous().end
        };
        return target;
      }

      // Check for date/time properties
      const properties = ['year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'dayOfWeek', 'dayOfYear', 'weekOfYear'];
      if (properties.includes(name)) {
        this.advance();
        const property = name as DateTimeProperty;
        const target: PropertyTarget = {
          type: 'PropertyTarget',
          property,
          start,
          end: this.previous().end
        };
        return target;
      }

      // Check for timezone
      // TODO: Implement timezone lookup with territory resolution
    }

    // Otherwise, parse as unit target (single or composite)
    const firstUnit = this.parseUnit();

    // Check if there are more units (for composite unit like "ft in")
    const units: UnitExpression[] = [firstUnit];

    while (this.check(TokenType.UNIT) || this.check(TokenType.IN) || this.check(TokenType.IDENTIFIER)) {
      // Stop if we hit a keyword or operator
      if (this.check(TokenType.IDENTIFIER)) {
        const name = this.currentToken().value.toLowerCase();
        // Check if this is a presentation format or property (not a unit)
        const presentationFormats = ['binary', 'octal', 'hex', 'fraction', 'scientific', 'ordinal'];
        const properties = ['year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'dayOfWeek', 'dayOfYear', 'weekOfYear'];
        if (presentationFormats.includes(name) || properties.includes(name)) {
          break;
        }
      }

      units.push(this.parseUnit());
    }

    const end = this.previous().end;

    // If we have multiple units, create a composite target
    if (units.length > 1) {
      return createCompositeUnitTarget(units, start, end);
    }

    // Otherwise, single unit target
    return createUnitTarget(firstUnit, start, end);
  }

  /**
   * Convert a token to a binary operator
   */
  private tokenToBinaryOperator(token: Token): BinaryOperator {
    switch (token.type) {
      case TokenType.PLUS: return '+';
      case TokenType.MINUS: return '-';
      case TokenType.STAR: return '*';
      case TokenType.SLASH: return '/';
      case TokenType.PERCENT: return '%';
      case TokenType.MOD: return 'mod';
      case TokenType.PER: return 'per';
      case TokenType.CARET: return '^';
      case TokenType.AMPERSAND: return '&';
      case TokenType.PIPE: return '|';
      case TokenType.XOR: return 'xor';
      case TokenType.AND: return '&&';
      case TokenType.OR: return '||';
      case TokenType.EQ: return '==';
      case TokenType.NEQ: return '!=';
      case TokenType.LT: return '<';
      case TokenType.LTE: return '<=';
      case TokenType.GT: return '>';
      case TokenType.GTE: return '>=';
      case TokenType.LSHIFT: return '<<';
      case TokenType.RSHIFT: return '>>';
      default:
        throw new Error(`Not a binary operator: ${token.type}`);
    }
  }

  /**
   * Convert a token to a unary operator
   */
  private tokenToUnaryOperator(token: Token): UnaryOperator {
    switch (token.type) {
      case TokenType.MINUS: return '-';
      case TokenType.BANG: return '!';
      case TokenType.TILDE: return '~';
      default:
        throw new Error(`Not a unary operator: ${token.type}`);
    }
  }

  /**
   * Parse a date/time literal
   *
   * For Phase 3, this is a simplified implementation.
   * The lexer marks month names, day names, am/pm as DATETIME tokens.
   * Full date/time parsing will be implemented in later phases.
   */
  private parseDateTimeLiteral(token: Token): Expression {
    const start = token.start;
    const value = token.value.toLowerCase();

    // Try to parse as time (H AM/PM pattern or H:MM pattern)
    const timeResult = this.tryParseTime(token);
    if (timeResult) {
      return timeResult;
    }

    // Try to parse as date (month name, day name, etc.)
    const dateResult = this.tryParseDate(token);
    if (dateResult) {
      return dateResult;
    }

    // Fallback: treat as identifier for relative dates (today, yesterday, etc.)
    return createIdentifier(token.value, start, token.end);
  }

  /**
   * Try to parse time patterns:
   * - H AM/PM: "10 am", "3 pm"
   * - H:MM: "10:30"
   * - H:MM:SS: "10:30:45"
   * - H:MM AM/PM: "10:30 am"
   */
  private tryParseTime(token: Token): Expression | null {
    const start = token.start;
    const value = token.value.toLowerCase();

    // Check for AM/PM
    if (value === 'am' || value === 'pm') {
      // Previous token should be a number (hour) or time (H:MM)
      // For now, this is handled by looking back at numbers
      // This case handles standalone "am"/"pm" which shouldn't happen
      return null;
    }

    // Check for time with colon (H:MM or H:MM:SS)
    // This would need to be tokenized as a single DATETIME token
    // For now, we handle simple cases
    return null;
  }

  /**
   * Try to parse date patterns:
   * - MONTH_NAME: "Jan", "January"
   * - YYYY MONTH D: "2024 Jan 15"
   * - D MONTH YYYY: "15 Jan 2024"
   * - MONTH D YYYY: "Jan 15 2024"
   */
  private tryParseDate(token: Token): Expression | null {
    const start = token.start;
    const value = token.value.toLowerCase();

    // Check if this is a month name
    const monthNum = this.parseMonthName(value);
    if (monthNum !== null) {
      // Look ahead for date pattern
      // Pattern: MONTH D YYYY or just MONTH (partial)
      return this.parseDateWithMonth(monthNum, start);
    }

    return null;
  }

  /**
   * Parse a date starting with a month name
   * Handles: MONTH D YYYY pattern
   */
  private parseDateWithMonth(month: number, start: SourceLocation): Expression | null {
    // Check if next token is a number (day)
    if (!this.check(TokenType.NUMBER)) {
      // Just a month name, treat as identifier
      return null;
    }

    const dayToken = this.currentToken();
    this.advance();
    const day = parseInt(dayToken.value);

    // Check if next token is a number (year)
    if (!this.check(TokenType.NUMBER)) {
      // No year, backtrack
      this.current--;
      return null;
    }

    const yearToken = this.currentToken();
    this.advance();
    const year = parseInt(yearToken.value);

    const end = this.previous().end;
    return createPlainDateLiteral(year, month, day, start, end);
  }

  /**
   * Parse month name to month number (1-12)
   * Returns null if not a valid month name
   */
  private parseMonthName(name: string): number | null {
    const months: { [key: string]: number } = {
      'jan': 1, 'january': 1,
      'feb': 2, 'february': 2,
      'mar': 3, 'march': 3,
      'apr': 4, 'april': 4,
      'may': 5,
      'jun': 6, 'june': 6,
      'jul': 7, 'july': 7,
      'aug': 8, 'august': 8,
      'sep': 9, 'september': 9,
      'oct': 10, 'october': 10,
      'nov': 11, 'november': 11,
      'dec': 12, 'december': 12
    };

    return months[name] ?? null;
  }

  /**
   * Helper methods for token navigation
   */

  private currentToken(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private peekAhead(n: number): Token | null {
    const index = this.current + n;
    if (index >= this.tokens.length) return null;
    return this.tokens[index];
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.currentToken().type === TokenType.EOF;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.currentToken().type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`${message} at ${this.currentToken().start.line}:${this.currentToken().start.column}`);
  }
}

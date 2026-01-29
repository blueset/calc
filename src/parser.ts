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
  NumberLiteral,
  PresentationTarget,
  PropertyTarget,
  TimezoneTarget,
  DateTimeProperty,
  PresentationFormat
} from './ast';
import { DataLoader } from './data-loader';
import { isConstant, getConstant } from './constants';
import { ParserError, LineError, DocumentResult } from './error-handling';

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
  private lineErrors: Map<number, ParserError> = new Map();  // Track errors by line
  private inputLines: string[] = [];  // Store raw input lines for error reporting
  private definedVariables: Set<string> = new Set();  // Track defined variable names for context-aware parsing

  // Unicode superscript to number mapping
  private static readonly SUPERSCRIPTS: Record<string, string> = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    '⁻': '-'
  };

  constructor(tokens: Token[], dataLoader: DataLoader, input?: string) {
    this.tokens = tokens;
    this.dataLoader = dataLoader;
    // Split input into lines for error reporting
    if (input) {
      this.inputLines = input.split('\n');
    }
  }

  /**
   * Extract Unicode superscript exponent from unit name
   * Returns [baseUnit, exponent] where exponent is null if no superscript found
   *
   * Examples:
   *   "m²" → ["m", 2]
   *   "m³" → ["m", 3]
   *   "m" → ["m", null]
   *   "m⁻¹" → ["m", -1]
   */
  private extractSuperscript(unitName: string): [string, number | null] {
    // Find the position where superscripts start
    let baseEnd = unitName.length;
    for (let i = 0; i < unitName.length; i++) {
      if (unitName[i] in Parser.SUPERSCRIPTS) {
        baseEnd = i;
        break;
      }
    }

    // No superscript found
    if (baseEnd === unitName.length) {
      return [unitName, null];
    }

    // Extract base unit and superscript
    const baseUnit = unitName.substring(0, baseEnd);
    const superscriptStr = unitName.substring(baseEnd);

    // Convert superscript to ASCII digits
    let asciiExponent = '';
    for (const char of superscriptStr) {
      if (char in Parser.SUPERSCRIPTS) {
        asciiExponent += Parser.SUPERSCRIPTS[char];
      } else {
        // Invalid superscript character, treat as no superscript
        return [unitName, null];
      }
    }

    const exponent = parseFloat(asciiExponent);
    return [baseUnit, isNaN(exponent) ? null : exponent];
  }

  /**
   * Parse the entire document
   * Returns both AST and collected errors
   */
  parseDocument(): DocumentResult {
    const start = this.currentToken().start;
    const lines: Line[] = [];
    this.lineErrors.clear();  // Reset errors for each parse

    while (!this.isAtEnd()) {
      // Skip newlines
      while (this.match(TokenType.NEWLINE)) {
        // Just consume
      }

      if (this.isAtEnd()) break;

      const lineNumber = this.currentToken().start.line;
      const line = this.parseLine();
      lines.push(line);

      // Expect newline or EOF after each line
      if (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
        // Error: missing newline, but continue
        this.advance();
      }
    }

    // Handle empty document case
    const end = this.current > 0 ? this.previous().end : start;
    const ast = createDocument(lines, start, end);

    // Convert lineErrors map to LineError array
    const errors: LineError[] = Array.from(this.lineErrors.entries()).map(([line, error]) => ({
      line,
      error,
      rawText: this.getRawLineText(line)
    }));

    return {
      ast,
      errors
    };
  }

  /**
   * Get the raw text for a given line number (1-indexed)
   */
  private getRawLineText(lineNumber: number): string {
    if (lineNumber > 0 && lineNumber <= this.inputLines.length) {
      return this.inputLines[lineNumber - 1];
    }
    return '';
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
      // Note: Also accept UNIT tokens as identifiers (handles single-letter names like "a", "b")
      if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.UNIT)) {
        const identifierToken = this.peek();
        const nextToken = this.peekAhead(1);

        if (nextToken && nextToken.type === TokenType.ASSIGN) {
          // It's a variable definition
          this.advance(); // consume identifier/unit token
          const name = identifierToken.value;
          this.advance(); // consume =
          const value = this.parseExpression();
          const end = this.previous().end;

          // Track this variable for context-aware derived unit parsing
          this.definedVariables.add(name);

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
      const lineNumber = start.line;
      const textTokens: string[] = [];

      while (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
        textTokens.push(this.currentToken().value);
        this.advance();
      }

      const text = textTokens.join(' ');
      const end = this.previous().end;

      // Record the error if it's a ParserError
      if (error instanceof ParserError) {
        this.lineErrors.set(lineNumber, error);
      } else if (error instanceof Error) {
        // Convert generic Error to ParserError
        const parserError = new ParserError(error.message, start, end);
        this.lineErrors.set(lineNumber, parserError);
      }

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

    // Currency-before-number pattern (USD 100, EUR 50)
    // Check if current token is a UNIT that represents a currency
    if (this.check(TokenType.UNIT)) {
      const unitToken = this.currentToken();
      // Look ahead for NUMBER token
      if (this.peekAhead(1)?.type === TokenType.NUMBER) {
        // Check if this unit is actually a currency code
        const currency = this.dataLoader.getCurrencyByCode(unitToken.value);
        if (currency) {
          // This is a currency-before-number pattern
          this.advance(); // consume UNIT (currency)
          const numberToken = this.currentToken();
          this.advance(); // consume NUMBER

          const value = parseFloat(numberToken.value);
          const currencyUnit = createSimpleUnit(
            currency.code,
            unitToken.value,
            unitToken.start,
            unitToken.end
          );
          const end = numberToken.end;

          // Return as NumberWithUnit (number after currency)
          return createNumberWithUnit(value, currencyUnit, numberToken.value, start, end);
        }
      }
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

      // Check for base notation with identifier: ABC base 36
      if (this.check(TokenType.BASE)) {
        return this.parseBaseNotation(name, identifierToken.start, start);
      }

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
   * - Base notation: 1010 base 2, ABC base 36, 1A2b base 36
   */
  private parseNumberWithOptionalUnit(numberToken: Token): Expression {
    const start = numberToken.start;

    // Check for base notation: NUMBER [IDENTIFIER] base NUMBER
    // e.g., "1010 base 2", "ABC base 36", or "1A2b base 36"
    // The last case happens when digits are followed by letters, which the lexer splits
    if (this.check(TokenType.IDENTIFIER)) {
      const identifierToken = this.currentToken();
      // Look ahead for BASE keyword
      const nextToken = this.peekAhead(1);
      if (nextToken && nextToken.type === TokenType.BASE) {
        // This is: NUMBER IDENTIFIER base NUMBER
        // Combine the number and identifier (e.g., "1" + "A2b" = "1A2b")
        this.advance(); // consume identifier
        const digits = numberToken.value + identifierToken.value;
        return this.parseBaseNotation(digits, numberToken.start, start);
      }
    }

    // Check for base notation: NUMBER base NUMBER (without identifier)
    // e.g., "1010 base 2"
    if (this.check(TokenType.BASE)) {
      return this.parseBaseNotation(numberToken.value, numberToken.start, start);
    }

    const value = parseFloat(numberToken.value);

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

    // Check for named square/cubic units (prefix pattern: "square meter", "cubic meter")
    let namedExponent: number | null = null;
    if (this.check(TokenType.SQUARE) || this.check(TokenType.CUBIC)) {
      const exponentKeyword = this.currentToken();
      this.advance();
      namedExponent = exponentKeyword.type === TokenType.SQUARE ? 2 : 3;
    }

    // Check for unit after number (or identifier that might be part of a multi-word unit/currency)
    if (this.check(TokenType.UNIT) || this.check(TokenType.IDENTIFIER) || namedExponent !== null) {
      // Try multi-word unit/currency parsing first for identifiers
      if (this.check(TokenType.IDENTIFIER)) {
        const multiWord = this.tryParseMultiWordUnit();
        if (multiWord) {
          // Check if this is part of a derived unit expression (e.g., "1 sq ft/person")
          if (this.isDerivedUnitExpression()) {
            const derivedUnit = this.parseDerivedUnitExpression(multiWord, multiWord.name, start);

            // If the derived unit has only 1 term, we didn't parse any operators
            // (stopped early due to variable). Treat as simple unit.
            if (derivedUnit.terms.length === 1) {
              // Fall through to return just the multi-word unit
            } else {
              const end = this.previous().end;
              return createNumberWithUnit(value, derivedUnit, numberToken.value, start, end);
            }
          }

          // Just a single multi-word unit
          const end = this.previous().end;
          return createNumberWithUnit(value, multiWord, numberToken.value, start, end);
        }
        // If no multi-word match and it's not a UNIT token, it's a plain number
        // followed by an identifier (which will be parsed as a separate expression)
        return createNumberLiteral(value, numberToken.value, start, numberToken.end);
      }

      // Check if this might be a composite unit (multiple value-unit pairs)
      const units: Array<{ value: number; unit: UnitExpression }> = [];

      // First value-unit pair
      // Extract Unicode superscripts at parse time for consistency
      // This treats m² and lb³ uniformly (both become [meter:2] and [pound:3])
      const unitToken = this.currentToken();
      const unitOriginalValue = unitToken.value;
      const [, unicodeExponent] = this.extractSuperscript(unitOriginalValue);

      // Parse unit with extraction enabled (strips superscript from name)
      let firstUnit: UnitExpression = this.parseUnit(true);

      // Handle prefix pattern (square/cubic was already consumed above)
      if (namedExponent !== null) {
        const derivedUnit = createDerivedUnit(
          [{ unit: firstUnit as SimpleUnit, exponent: namedExponent }],
          firstUnit.start,
          this.previous().end
        );
        firstUnit = derivedUnit;
        namedExponent = null; // Reset after use
      }

      // Handle Unicode superscript exponent (e.g., "m²" → [meter:2], "lb³" → [pound:3])
      // IMPORTANT: Only handle single-unit Unicode exponents here. If there are more units after
      // (e.g., "1 N² m³"), let parseDerivedUnitExpression() handle the entire multi-unit expression.
      const hasMoreUnitsAfterUnicode = this.check(TokenType.UNIT) || this.check(TokenType.IDENTIFIER);
      if (unicodeExponent !== null && firstUnit.type === 'SimpleUnit' && !hasMoreUnitsAfterUnicode) {
        const derivedUnit = createDerivedUnit(
          [{ unit: firstUnit as SimpleUnit, exponent: unicodeExponent }],
          firstUnit.start,
          this.previous().end
        );
        firstUnit = derivedUnit;
      }

      // Check for ASCII exponent notation (e.g., "m^2" should parse like "m²")
      // This makes "16 m^2" parse as NumberWithUnit(16, DerivedUnit([{unit: m, exponent: 2}]))
      // instead of as operation (16 m)^2
      // IMPORTANT: Only handle single-unit exponents here. If there are more units after the exponent
      // (e.g., "1 N^2 m"), let parseDerivedUnitExpression() handle the entire multi-unit expression.
      let hasMoreUnitsAfterExponent = false;
      if (this.check(TokenType.CARET)) {
        // Look ahead past the exponent to see if there are more units
        const savedPos = this.current;
        this.advance(); // skip ^
        if (this.check(TokenType.MINUS)) this.advance(); // skip optional minus
        if (this.check(TokenType.NUMBER)) this.advance(); // skip exponent number
        // Check if there are more units after the exponent
        hasMoreUnitsAfterExponent = this.check(TokenType.UNIT) || this.check(TokenType.IDENTIFIER);
        this.current = savedPos; // restore position
      }

      if (this.check(TokenType.CARET) && !hasMoreUnitsAfterExponent) {
        this.advance(); // consume CARET

        // Handle negative exponents (e.g., s^-1)
        let isNegative = false;
        if (this.check(TokenType.MINUS)) {
          isNegative = true;
          this.advance(); // consume MINUS
        }

        if (!this.check(TokenType.NUMBER)) {
          throw new Error(`Expected number after ^ in unit exponent at ${this.currentToken().start.line}:${this.currentToken().start.column}`);
        }
        const exponentToken = this.currentToken();
        this.advance();
        let exponent = parseFloat(exponentToken.value);
        if (isNegative) {
          exponent = -exponent;
        }

        // Wrap the SimpleUnit in a DerivedUnit with the exponent
        const derivedUnit = createDerivedUnit(
          [{ unit: firstUnit as SimpleUnit, exponent: exponent }],
          firstUnit.start,
          exponentToken.end
        );
        firstUnit = derivedUnit;
      }

      // Check for named square/cubic units (postfix pattern: "meter squared", "meter cubed")
      if (this.check(TokenType.SQUARED) || this.check(TokenType.CUBED)) {
        const exponentKeyword = this.currentToken();
        this.advance();
        const exponent = exponentKeyword.type === TokenType.SQUARED ? 2 : 3;

        // Wrap the SimpleUnit in a DerivedUnit with the exponent
        const derivedUnit = createDerivedUnit(
          [{ unit: firstUnit as SimpleUnit, exponent: exponent }],
          firstUnit.start,
          exponentKeyword.end
        );
        firstUnit = derivedUnit;
      }

      // Check if this is a derived unit expression with operators (*, /, implicit multiplication)
      // Examples: "100 m/s", "100 kg m/s^2", "100 fl oz/kg"
      const hasFirstUnitSuperscript = unicodeExponent !== null;
      if (hasFirstUnitSuperscript || this.isDerivedUnitExpression()) {
        // Parse as derived unit expression
        const derivedUnit = this.parseDerivedUnitExpression(firstUnit as SimpleUnit, unitOriginalValue, start);

        // If the derived unit has only 1 term, it means we didn't actually parse any operators
        // (e.g., we stopped early because we hit a variable). Return the single unit normally.
        if (derivedUnit.terms.length === 1) {
          const end = this.previous().end;
          return createNumberWithUnit(value, firstUnit, numberToken.value, start, end);
        } else {
          const end = this.previous().end;
          return createNumberWithUnit(value, derivedUnit, numberToken.value, start, end);
        }
      }

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
   * Parse a unit, optionally extracting Unicode superscripts in conversion contexts
   * @param extractSuperscript If true, extract superscripts from unit names (used in conversion targets)
   */
  private parseUnit(extractSuperscript: boolean = false): SimpleUnit {
    const start = this.currentToken().start;

    // Try multi-word unit parsing first (e.g., "fl oz", "sq m", "millimeter of mercury")
    // This works correctly even in derived units like "fl oz/kg" because tryParseMultiWordUnit()
    // only collects UNIT/IDENTIFIER tokens and stops at operators (/, *, ^)
    const multiWord = this.tryParseMultiWordUnit();
    if (multiWord) {
      return multiWord;
    }

    // Simple case: single unit token
    if (this.match(TokenType.UNIT)) {
      const unitToken = this.previous();
      let unitName = unitToken.value;

      // In conversion target context, extract superscripts to create derived units
      // Example: "m²" → base="m", use that for lookup
      if (extractSuperscript) {
        const [baseName, _] = this.extractSuperscript(unitName);
        unitName = baseName;
      }

      const unitData = this.dataLoader.getUnitByName(unitName);

      // Use the unit ID if found, otherwise use the name as-is (user-defined)
      const unitId = unitData ? unitData.id : unitName;
      return createSimpleUnit(unitId, unitName, start, unitToken.end);
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
      let unitName = unitToken.value;

      // In conversion target context, extract superscripts
      if (extractSuperscript) {
        const [baseName, _] = this.extractSuperscript(unitName);
        unitName = baseName;
      }

      // User-defined units use the name as the ID
      return createSimpleUnit(unitName, unitName, start, unitToken.end);
    }

    throw new Error(`Expected unit at ${start.line}:${start.column}`);
  }

  /**
   * Try to parse multi-word units like "fl oz", "sq m", "millimeter of mercury", "US dollars"
   *
   * Algorithm:
   * 1. Collect up to 4 tokens (UNIT or IDENTIFIER)
   * 2. Try longest match first, then progressively shorter
   * 3. Check both unit database and currency database
   * 4. If match found, consume tokens and return SimpleUnit
   * 5. If no match, return null (no tokens consumed)
   *
   * @returns SimpleUnit if multi-word unit found, null otherwise
   */
  private tryParseMultiWordUnit(): SimpleUnit | null {
    const start = this.currentToken().start;
    const savedPosition = this.current;

    // Collect potential tokens (up to 4 words)
    const tokens: Token[] = [];
    const maxTokens = 4;

    for (let i = 0; i < maxTokens && !this.isAtEnd(); i++) {
      const currentToken = this.currentToken();

      // Only collect UNIT or IDENTIFIER tokens
      if (currentToken.type === TokenType.UNIT ||
          currentToken.type === TokenType.IDENTIFIER) {
        tokens.push(currentToken);
        this.advance();
      } else {
        break;
      }
    }

    // If we collected less than 2 tokens, this isn't a multi-word unit
    if (tokens.length < 2) {
      this.current = savedPosition;
      return null;
    }

    // Try longest match first, then progressively shorter
    for (let len = tokens.length; len >= 2; len--) {
      const candidateTokens = tokens.slice(0, len);
      const combinedName = candidateTokens.map(t => t.value).join(' ');

      // Check unit database (case-insensitive)
      const unitMatches = this.dataLoader.getUnitsByCaseInsensitiveName(combinedName);
      if (unitMatches.length > 0) {
        // Found a match! Use first match
        const unit = unitMatches[0];
        const end = candidateTokens[candidateTokens.length - 1].end;

        // Backtrack to consume only the matched tokens
        this.current = savedPosition + len;

        return createSimpleUnit(unit.id, combinedName, start, end);
      }

      // Check currency database (case-insensitive)
      const currencyMatches = this.dataLoader.getCurrenciesByName(combinedName);
      if (currencyMatches.length > 0) {
        // Found a currency match! Use first match
        const currency = currencyMatches[0];
        const end = candidateTokens[candidateTokens.length - 1].end;

        // Backtrack to consume only the matched tokens
        this.current = savedPosition + len;

        // Return as a SimpleUnit with currency code as unit ID
        return createSimpleUnit(currency.code, combinedName, start, end);
      }
    }

    // No match found, backtrack completely
    this.current = savedPosition;
    return null;
  }

  /**
   * Parse base notation: digits base N
   *
   * Expects current token to be BASE keyword
   * Consumes BASE and the following NUMBER token
   *
   * @param digits - The digit string to parse in the given base
   * @param digitsStart - Source location of the digits (for error messages)
   * @param start - Start location of the entire expression
   * @returns NumberLiteral with parsed value
   */
  private parseBaseNotation(digits: string, digitsStart: SourceLocation, start: SourceLocation): NumberLiteral {
    this.advance(); // consume 'base' keyword

    if (!this.check(TokenType.NUMBER)) {
      throw new Error(`Expected base number after 'base' keyword at ${this.currentToken().start.line}:${this.currentToken().start.column}`);
    }

    const baseToken = this.currentToken();
    this.advance(); // consume base number
    const base = parseInt(baseToken.value);

    // Validate base (2-36 are standard)
    if (base < 2 || base > 36) {
      throw new Error(`Invalid base ${base}. Base must be between 2 and 36 at ${baseToken.start.line}:${baseToken.start.column}`);
    }

    // Parse the digits in the given base
    let decimalValue: number;

    try {
      decimalValue = parseInt(digits, base);
      if (isNaN(decimalValue)) {
        throw new Error(`Invalid digits for base ${base}`);
      }
    } catch (error) {
      throw new Error(`Failed to parse '${digits}' as base ${base} number at ${digitsStart.line}:${digitsStart.column}`);
    }

    const end = this.previous().end;
    const raw = `${digits} base ${base}`;
    return createNumberLiteral(decimalValue, raw, start, end);
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

      // Check for timezone (use DataLoader to resolve timezone names)
      const resolvedTimezone = this.dataLoader.resolveTimezone(name);
      if (resolvedTimezone) {
        this.advance();
        const target: TimezoneTarget = {
          type: 'TimezoneTarget',
          timezone: resolvedTimezone,  // Use resolved IANA timezone
          start,
          end: this.previous().end
        };
        return target;
      }
    }

    // Parse the first unit (extract superscripts in conversion target context)
    const firstUnitToken = this.currentToken();
    const firstUnitOriginalValue = firstUnitToken.value;
    const firstUnit = this.parseUnit(true);  // extractSuperscript=true

    // Check if the first unit token had a Unicode superscript (e.g., "m²")
    const [, firstUnitSuperscript] = this.extractSuperscript(firstUnitOriginalValue);
    const hasFirstUnitSuperscript = firstUnitSuperscript !== null;

    // Check if this is a derived unit expression by looking ahead
    // Derived units have operators: *, /, ^, Unicode superscripts, or implicit multiplication followed by /
    // Examples: "m/s", "m²", "kg m/s²" (implicit * between kg and m)
    if (hasFirstUnitSuperscript || this.isDerivedUnitExpression()) {
      // Parse as derived unit expression
      const derivedUnit = this.parseDerivedUnitExpression(firstUnit, firstUnitOriginalValue, start);
      return createUnitTarget(derivedUnit, start, derivedUnit.end);
    }

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
   * Check if the current position indicates a derived unit expression
   * Derived units have explicit operators (*, /, ^), Unicode superscripts,
   * or implicit multiplication followed by division/exponentiation
   *
   * Examples:
   *   "m/s" - explicit division
   *   "m²" or "m^2" - explicit exponentiation
   *   "kg m/s²" - implicit multiplication (no operator between kg and m) followed by division
   */
  private isDerivedUnitExpression(): boolean {
    // Check for explicit operators immediately after the first unit
    if (this.check(TokenType.STAR) || this.check(TokenType.SLASH) || this.check(TokenType.CARET)) {
      // Look ahead to see what follows the operator
      const savedPosition = this.current;
      const operator = this.currentToken().type;
      this.advance(); // skip operator

      // If followed by NUMBER:
      // - For CARET: "m^2" or "100 m^2" is always a unit exponent (derived unit)
      // - For STAR/SLASH: "km / 2" or "km * 2" is always binary arithmetic
      if (this.check(TokenType.NUMBER)) {
        if (operator === TokenType.CARET) {
          // "^" followed by NUMBER is always a unit exponent in derived unit context
          this.current = savedPosition;
          return true;
        }
        // For STAR/SLASH followed by NUMBER, it's binary arithmetic
        this.current = savedPosition;
        return false;
      }

      // If followed by a defined variable, this is binary division, not derived unit
      if (this.check(TokenType.IDENTIFIER)) {
        const identifierName = this.currentToken().value;
        if (this.definedVariables.has(identifierName)) {
          // It's a variable - this is binary division, not derived unit
          this.current = savedPosition;
          return false;
        }
      }

      this.current = savedPosition;
      return true;
    }

    // Check for implicit multiplication: unit followed by another unit
    // This handles cases like "kg m/s²", "kg fl oz/day", or "N m" where units are implicitly multiplied
    if (this.check(TokenType.UNIT) || this.check(TokenType.IDENTIFIER)) {
      const savedPosition = this.current;
      let scannedAtLeastOneUnit = false;

      // Scan through consecutive UNIT/IDENTIFIER tokens looking for operators or superscripts
      while (this.check(TokenType.UNIT) || this.check(TokenType.IDENTIFIER)) {
        const token = this.currentToken();
        const [, unicodeExponent] = this.extractSuperscript(token.value);

        // Check for Unicode superscript in the unit itself
        if (unicodeExponent !== null) {
          this.current = savedPosition;
          return true;
        }

        scannedAtLeastOneUnit = true;
        this.advance(); // Move past this UNIT/IDENTIFIER

        // Check for explicit operators after this unit
        if (this.check(TokenType.CARET) || this.check(TokenType.STAR) || this.check(TokenType.SLASH)) {
          this.current = savedPosition;
          return true;
        }
      }

      // If we scanned at least one additional unit token, treat as derived unit with implicit multiplication
      // This allows "1 N m" to parse as derived unit, not just "1 kg m/s" with explicit operator
      this.current = savedPosition;
      return scannedAtLeastOneUnit;
    }

    return false;
  }

  /**
   * Parse a derived unit expression (e.g., "m/s", "kg m/s²", "m²")
   *
   * Grammar:
   *   derived_unit = unit_term (('*' | '/' | implicit_multiply) unit_term)*
   *   unit_term = simple_unit ('^' number)?
   *   implicit_multiply = no operator between units
   *
   * Examples - "m/s" becomes [{m, 1}, {s, -1}]
   *            "kg m/s²" becomes [{kg, 1}, {m, 1}, {s, -2}]
   *            "m²/s" becomes [{m, 2}, {s, -1}]
   *            "m²" becomes [{m, 2}]
   *
   * @param firstUnit The first unit that was already parsed (with superscripts extracted)
   * @param firstUnitOriginalValue The original token value before extraction (to check for Unicode superscripts)
   * @param start The start location
   */
  private parseDerivedUnitExpression(firstUnit: SimpleUnit, firstUnitOriginalValue: string, start: SourceLocation): DerivedUnit {
    const terms: UnitTerm[] = [];

    // Parse first unit's optional exponent (ASCII "^2" or Unicode "²")
    let firstExponent = 1;

    // Check for Unicode superscript in the original token value
    const [, unicodeExponent] = this.extractSuperscript(firstUnitOriginalValue);
    if (unicodeExponent !== null) {
      firstExponent = unicodeExponent;
    } else if (this.match(TokenType.CARET)) {
      // ASCII notation "^2"
      this.consume(TokenType.NUMBER, "Expected number after '^' in unit exponent");
      const exponentToken = this.previous();
      firstExponent = parseFloat(exponentToken.value);
    }

    terms.push({ unit: firstUnit, exponent: firstExponent });

    // Parse remaining terms with explicit (*,/) or implicit multiplication
    while (this.check(TokenType.STAR) || this.check(TokenType.SLASH) || this.check(TokenType.UNIT) || this.check(TokenType.IDENTIFIER)) {
      // Determine the operator
      let isMultiply = true; // Default for implicit multiplication

      if (this.check(TokenType.STAR) || this.check(TokenType.SLASH)) {
        const operator = this.advance();
        isMultiply = operator.type === TokenType.STAR;
      }
      // else: implicit multiplication (no operator consumed)

      // Check if this is actually a unit or an identifier that's a unit
      if (!this.check(TokenType.UNIT) && !this.check(TokenType.IDENTIFIER)) {
        break; // Not a unit, stop parsing
      }

      // For identifiers, check if it's actually a unit (not a keyword, presentation format, or defined variable)
      if (this.check(TokenType.IDENTIFIER)) {
        const name = this.currentToken().value;
        const nameLower = name.toLowerCase();
        const presentationFormats = ['binary', 'octal', 'hex', 'fraction', 'scientific', 'ordinal'];
        const properties = ['year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond', 'dayOfWeek', 'dayOfYear', 'weekOfYear'];

        // Check if this identifier is a defined variable - if so, stop parsing the derived unit
        // This allows: "foo = 1 kg; 100 fl oz/foo" → (100 fl oz) / foo, not 100 [fl_oz:1, foo:-1]
        if (this.definedVariables.has(name)) {
          break; // It's a variable, not a unit - stop parsing derived unit
        }

        if (presentationFormats.includes(nameLower) || properties.includes(nameLower)) {
          break; // Not a unit, stop parsing
        }
      }

      // Parse the unit (extract superscripts)
      const unitToken = this.currentToken();
      let unit = this.parseUnit(true);  // extractSuperscript=true

      // Parse optional exponent (ASCII "^2" or Unicode "²")
      let exponent = 1;

      // Check for Unicode superscript in the original unit token
      const [, unicodeExponent2] = this.extractSuperscript(unitToken.value);
      if (unicodeExponent2 !== null) {
        exponent = unicodeExponent2;
      } else if (this.match(TokenType.CARET)) {
        // ASCII notation "^2"
        this.consume(TokenType.NUMBER, "Expected number after '^' in unit exponent");
        const exponentToken = this.previous();
        exponent = parseFloat(exponentToken.value);
      }

      // Apply division by negating exponent
      if (!isMultiply) {
        exponent = -exponent;
      }

      terms.push({ unit, exponent });
    }

    const end = this.previous().end;
    return createDerivedUnit(terms, start, end);
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
   * - H AM/PM: "10 am", "3 pm" (H must be 1-12)
   * - H:MM: "10:30" (H: 0-23, MM: 0-59)
   * - H:MM:SS: "10:30:45" (H: 0-23, MM: 0-59, SS: 0-59)
   * - H:MM AM/PM: "10:30 am" (H must be 1-12)
   *
   * 12-hour format (with AM/PM):
   * - Hour range: 1-12 (inclusive)
   * - 0 is NOT valid (midnight is "12 AM", not "0 AM")
   * - Rejects "13:00 am", "00:15 am", "14:20 pm", etc.
   *
   * 24-hour format (without AM/PM):
   * - Hour range: 0-23 (inclusive)
   * - "0:00" is valid (midnight)
   */
  private tryParseTime(token: Token): Expression | null {
    const start = token.start;
    const value = token.value.toLowerCase();

    // Check for AM/PM time indicators (handled by lexer's AM/PM disambiguation)
    if (value === 'am' || value === 'pm') {
      // Previous token should be a number (hour) or time (H:MM)
      // This is already handled by the lexer's disambiguateAmPm logic
      // If we reach here, it's a standalone "am"/"pm" which is invalid
      return null;
    }

    // Check for time with colon (H:MM or H:MM:SS)
    // Lexer now tokenizes these as single DATETIME tokens
    const colonMatch = value.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (colonMatch) {
      const hour = parseInt(colonMatch[1], 10);
      const minute = parseInt(colonMatch[2], 10);
      const second = colonMatch[3] ? parseInt(colonMatch[3], 10) : 0;

      // Validate ranges (0-23 for hour, 0-59 for minute/second)
      if (hour < 0 || hour > 23) {
        // Invalid hour - let this fall through to parser error
        return null;
      }
      if (minute < 0 || minute > 59) {
        // Invalid minute
        return null;
      }
      if (second < 0 || second > 59) {
        // Invalid second
        return null;
      }

      // Check if next token is AM/PM (for 12-hour format)
      let finalHour = hour;
      const end = token.end;

      if (this.check(TokenType.DATETIME)) {
        const nextToken = this.currentToken();
        const nextValue = nextToken.value.toLowerCase();

        if (nextValue === 'am' || nextValue === 'pm') {
          // With AM/PM, enforce 12-hour format: hour must be 1-12 (inclusive)
          // 0 is NOT valid (midnight is "12 AM", not "0 AM")
          if (hour < 1 || hour > 12) {
            // Reject: invalid 12-hour format (e.g., "13:00 am", "00:15 am")
            return null;
          }

          this.advance(); // consume AM/PM token

          // Convert 12-hour to 24-hour
          if (nextValue === 'pm' && hour !== 12) {
            finalHour = hour + 12;
          } else if (nextValue === 'am' && hour === 12) {
            finalHour = 0;
          }

          return createPlainTimeLiteral(finalHour, minute, second, 0, start, nextToken.end);
        }
      }

      // 24-hour format (no AM/PM)
      return createPlainTimeLiteral(finalHour, minute, second, 0, start, end);
    }

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

# Phase 8 Integration Test Gaps Analysis

This document analyzes all 41 skipped tests from `tests/integration.test.ts` and determines which phases should implement these features.

## Summary by Phase

| Phase | Feature Category | Count | Complexity |
|-------|-----------------|-------|------------|
| Phase 2 (Lexer) | Number formats & binary literals | 6 | Medium |
| Phase 2 (Lexer) | Currency symbol lexing | 2 | Medium |
| Phase 3 (Parser) | Derived units in binary ops | ~10 | High ✅ |
| Phase 3 (Parser) | Caret notation & named units | 3 | Medium |
| Phase 3 (Parser) | Multi-word unit/currency parsing | 3 | Medium |
| Phase 3 (Parser) | Complex relative date/time expressions | 1 (partial) | Medium |
| Phase 3 (Parser) | Plain date time parsing | 3 | Medium |
| Phase 5 (Evaluator) | Currency resolution & conversion | 1 | Medium |
| Phase 5 (Evaluator) | User-defined units support | 5 | Medium-High ✅ |
| Phase 5 (Evaluator) | Unit cancellation in arithmetic | 3 | Medium-High ✅ |
| Phase 5 (Evaluator) | Dimensionless conversion & operations | 2 | Medium ✅ |
| Phase 5 (Evaluator) | Date/time arithmetic & relative instants | 4 | Easy-Medium ✅ |
| Phase 5 (Evaluator) | Functions & binary operations | 8 | Easy-Medium |
| Phase 6 (Formatter) | Presentation conversions | 8 | Medium-Hard |
| Phase 6 (Formatter) | Display & precision issues | 6 | Easy |
| Multiple Phases | Edge cases & integration | 1 | Easy |

**NOTE:** ✅ indicates completed features. Phase 3 parser bug for derived units in binary ops has been FIXED.

---

## Phase 2: Lexical Analysis (6 tests)

### Feature: Number Underscore Separators
- **Test**: `should handle numbers with underscore separator`
- **Example**: `1_000` → `1000`
- **Work Required**:
  - Modify `Lexer.scanNumber()` to allow underscores as digit separators
  - Parse pattern: `[0-9](_?[0-9])*`
  - Strip underscores before converting to number
- **Effort**: Low (2-3 hours)
- **File**: `src/lexer.ts` (lines 300-400 in scanNumber method)

### Feature: Binary Number Parsing (0b prefix)
- **Test**: `should handle binary numbers with 0b prefix`
- **Example**: `0b1010` → `10`
- **Work Required**:
  - Fix `Lexer.scanNumber()` to properly parse `0b` prefix
  - Currently stops at 'b' and treats it as separate token
  - Need to check for `0b` pattern and parse binary digits
- **Effort**: Low (1-2 hours)
- **File**: `src/lexer.ts` (lines 300-400 in scanNumber method)

### Feature: Octal Number Parsing (0o prefix)
- **Test**: `should handle octal numbers with 0o prefix`
- **Example**: `0o12` → `10`
- **Work Required**:
  - Fix `Lexer.scanNumber()` to properly parse `0o` prefix
  - Currently stops at 'o' and treats it as separate token
  - Need to check for `0o` pattern and parse octal digits
- **Effort**: Low (1-2 hours)
- **File**: `src/lexer.ts` (lines 300-400 in scanNumber method)

### Feature: Hexadecimal Number Parsing (0x prefix)
- **Test**: `should handle hexadecimal numbers with 0x prefix`
- **Example**: `0xA` → `10`
- **Work Required**:
  - Fix `Lexer.scanNumber()` to properly parse `0x` prefix
  - Currently stops at 'x' and treats it as separate token
  - Need to check for `0x` pattern and parse hex digits
- **Effort**: Low (1-2 hours)
- **File**: `src/lexer.ts` (lines 300-400 in scanNumber method)

### Feature: Base Keyword Parsing
- **Tests**:
  - `should handle binary numbers with base keyword`
  - `should handle arbitrary bases`
- **Examples**:
  - `1010 base 2` → `10`
  - `ABC base 36` → `13368`
  - `1a2b base 36` → `59700`
- **Work Required**:
  - Add `base` as keyword in lexer
  - Parse pattern: `NUMBER KEYWORD(base) NUMBER`
  - Convert value from specified base to decimal
- **Effort**: Medium (3-4 hours)
- **Files**:
  - `src/tokens.ts` (add BASE keyword)
  - `src/lexer.ts` (recognize 'base' keyword)
  - `src/parser.ts` (parse base expression)
  - `src/evaluator.ts` (convert from base)

### Feature: Adjacent Currency Symbols
- **Tests**:
  - `should handle unambiguous currency symbols` (partial - adjacent symbols)
- **Examples**:
  - `US$100` → `100 USD`
  - `€100` → `100 EUR`
  - `CA$100` → `100 CAD`
  - `₹100` → `100 INR`
- **Work Required**:
  - Add currency symbol detection **before** number scanning
  - Scan multi-character symbols (US$, CA$, HK$) and single-character symbols (€, £, ₹)
  - Lookup in `currencies.json` → `symbolAdjacent` array
  - Return UNIT token with currency code (USD, EUR, etc.)
  - **Ambiguous symbol handling**: For ambiguous symbols ($, £, ¥), track as dimension-like type for error reporting
- **Currency Data Structure**:
  ```json
  "symbolAdjacent": ["US$", "€", "CA$"]  // No space between symbol and number
  ```
- **Effort**: Medium (2-3 hours)
- **Files**:
  - `src/lexer.ts` (add `tryScanCurrencySymbol()` method before number scanning)
  - `src/data-loader.ts` (add `getCurrencyByAdjacentSymbol()` and build lookup map)

### Feature: Spaced Currency Symbols
- **Tests**:
  - `should handle currency ISO codes` (partial - spaced symbols like "USD 100")
- **Examples**:
  - `USD 100` → `100 USD`
  - `EUR 50` → `50 EUR`
  - `$U 1000` → `1000 UYU`
- **Work Required**:
  - Enhance identifier scanning to check if token is a spaced currency symbol
  - Lookup in `currencies.json` → `symbolSpaced` array
  - Return UNIT token with currency code
  - **Ambiguous symbol handling**: Not applicable (ISO codes are unambiguous)
- **Currency Data Structure**:
  ```json
  "symbolSpaced": ["USD", "$U", "F\u202FCFA", "Kč"]  // Space between symbol and number (or before)
  ```
- **Effort**: Low (1-2 hours)
- **Files**:
  - `src/lexer.ts` (modify `scanIdentifierOrDateTime()` to check spaced symbols)
  - `src/data-loader.ts` (add `getCurrencyBySpacedSymbol()` and build lookup map)

---

## Phase 3: Syntactic Analysis

### Derived Units in Binary Operations

**Status:** ✅ **FIXED** (Phase 3 completed)

**The Problem (RESOLVED):**
The parser was incorrectly treating expressions containing derived units in binary operations as **multiple separate lines** instead of a single expression.

**Examples of Failure:**
- **Input:** `3 kg/m² * 2 m²`
- **Expected:** Single BinaryExpression (multiplication)
- **Actual:** TWO separate ExpressionLine results:
  - Line 1: `3 kg/m²` → outputs `3 kg/m²`
  - Line 2: `2 m²` → outputs `1 m²` (wrong, should be `2 m²`)

**More Examples:**
- `10 USD/person * 3 person` → splits into 2 lines, second errors with "Undefined variable: person"
- `60 kg/cm² / 2 h/m²` → splits into 2 lines
- `500 click/person / 5 USD/person` → splits into 2 lines

**Example That WORKS (proving the pattern):**
- `1000 USD / 5 person / 2 day` → **WORKS!** ✅ Single expression, correct result
- Why? Because `USD` is a simple unit (no `/`), so the division operators are parsed correctly

**Root Cause (IDENTIFIED AND FIXED):**
The `/` character in derived units (like `kg/m²`) was being interpreted as an **end-of-expression marker** when followed by binary operators (`*` or `/`). The `parseDerivedUnitExpression()` method was consuming operators without verifying a unit followed.

**Impact (RESOLVED):**
- ✅ Unblocked user-defined units with derived units (5 tests)
- ✅ Unblocked unit cancellation arithmetic (3+ tests)
- ✅ Fixed ~80% of deferred test failures
- ✅ Expressions like `kg/m² * m²` now evaluate correctly

**Work Completed:**

1. ✅ **Located the bug** in `src/parser.ts` line 1221-1228:
   - `parseDerivedUnitExpression()` was consuming operators without verifying a unit followed
   - This caused operators to be lost when breaking from the parsing loop

2. ✅ **Implemented the fix**:
   - Added lookahead before consuming STAR/SLASH operators
   - Checks if next token is UNIT or IDENTIFIER before advancing
   - Breaks WITHOUT consuming operator if next token is not a unit
   ```typescript
   if (this.check(TokenType.STAR) || this.check(TokenType.SLASH)) {
     const nextToken = this.peekAhead(1);
     if (!nextToken || (nextToken.type !== TokenType.UNIT && nextToken.type !== TokenType.IDENTIFIER)) {
       break; // Don't consume operator
     }
     const operator = this.advance();
     isMultiply = operator.type === TokenType.STAR;
   }
   ```

3. ✅ **Verified all test cases pass**:
   ```
   3 kg/m² * 2 m²              → "6 kg" ✅
   10 USD/person * 3 person    → "30 USD" ✅
   60 kg/cm² / 2 h/m²          → "300 000 kg/h" ✅
   500 click/person / 5 USD    → "100 click/USD" ✅
   1000 USD / 5 person / 2 day → "100 USD/(person day)" ✅
   ```

**Files Modified:**
- `src/parser.ts` - Added lookahead in `parseDerivedUnitExpression()` (lines 1225-1233)
- `tests/integration.test.ts` - Re-enabled 7 tests (lines 624-680)

**Time Spent:** ~2 hours (estimate was 4-6 hours)

**Tests Re-enabled and Passing:**
- Lines 624-636: Derived unit multiplication ✅
- Lines 638-646: User-defined derived unit multiplication ✅
- Lines 653-667: Derived unit division ✅
- Lines 669-680: User-defined derived unit division ✅

**Test Results:**
- Before: 835 passing, 36 skipped
- After: 842 passing, 29 skipped
- **Impact: +7 tests enabled, all passing**

**Unblocked Features:**
- ✅ User-defined units with derived units (arithmetic now works)
- ✅ Unit cancellation in arithmetic (simplification works correctly)
- ✅ Multi-word unit parsing verified ("sq ft" → "ft²" works)

---

## Phase 3: Syntactic Analysis - Other Features (6 tests)

### Feature: Caret Notation for Exponents
- **Tests**:
  - `should handle square units with caret`
  - `should handle cubic units with caret`
- **Examples**:
  - `1 m^2` → `1 m²`
  - `1 m^3` → `1 m³`
- **Work Required**:
  - Currently only supports Unicode superscripts (m², m³)
  - Need to parse caret syntax: `unit ^ number`
  - Convert to derived unit with exponent
  - May conflict with power operator `^` in expressions
  - Requires lookahead to distinguish `m^2` (unit) from `x^2` (expression)
- **Effort**: Medium (4-5 hours)
- **Files**:
  - `src/parser.ts` (modify tryParseDerivedUnit to handle caret)
  - Need disambiguation logic for unit^exponent vs expression^exponent

### Feature: Named Square/Cubic Units
- **Test**: `should handle named square units`
- **Examples**:
  - `1 square meter` → `1 m²`
  - `1 cubic meter` → `1 m³`
- **Work Required**:
  - Parse patterns: `square UNIT`, `cubic UNIT`, `UNIT squared`, `UNIT cubed`
  - Add keywords: `square`, `cubic`, `squared`, `cubed`
  - Convert to derived unit with appropriate exponent
- **Effort**: Medium (3-4 hours)
- **Files**:
  - `src/tokens.ts` (add keywords)
  - `src/lexer.ts` (recognize keywords)
  - `src/parser.ts` (parse named exponent syntax)

### Feature: Multi-Word Unit Names
- **Tests**:
  - `should handle named multi-word units` (partial - "sq m", "sq ft")
  - `should handle multi-word units` (partial - "fl oz", "fluid ounces")
  - `should handle mmHg` (partial - "millimeter of mercury")
- **Examples**:
  - `1 sq m` → `1 m²`
  - `1 sq ft` → `1 ft²`
  - `1 fl oz` → `1 fl oz`
  - `10 fluid ounces` → `10 fl oz`
  - `1 millimeter of mercury` → `1 mmHg`
- **Work Required**:
  - After NUMBER token, implement lookahead to collect multi-word unit names
  - Try longest-match: collect up to 4 tokens (UNIT or IDENTIFIER)
  - Check if combined string (joined with spaces) matches a unit in database
  - If match found, consume all tokens and create SimpleUnit
  - If no match, backtrack and try single-token unit
  - Examples from database: "fl oz", "sq m", "sq mi", "millimeter of mercury"
- **Effort**: Medium (3-4 hours)
- **Files**:
  - `src/parser.ts` (add `tryParseMultiWordUnit()` method in `parseNumberWithOptionalUnit()`)
  - Requires backtracking mechanism to restore parser state if no match

### Feature: Multi-Word Currency Names
- **Tests**:
  - `should handle currency names` (partial - "US dollars", "hong kong dollars")
- **Examples**:
  - `100 US dollars` → `100 USD`
  - `100 euros` → `100 EUR`
  - `100 japanese Yen` → `100 JPY`
  - `100 hong kong dollars` → `100 HKD`
- **Work Required**:
  - Same multi-word parsing logic as units above
  - After collecting tokens, check both unit database AND currency names
  - Lookup in `currencies.json` → `names` array (case-insensitive)
  - Return SimpleUnit with currency code as unitId
- **Currency Data Structure**:
  ```json
  "names": ["US Dollar", "US dollars"]  // Goes after number with space
  ```
- **Effort**: Low (1-2 hours, shares logic with multi-word units)
- **Files**:
  - `src/parser.ts` (enhance `tryParseMultiWordUnit()` to also check currencies)
  - `src/data-loader.ts` (add `getCurrenciesByName()` if not exists)

### Feature: Currency-Before-Number Pattern
- **Tests**:
  - `should handle currency ISO codes` (partial - "USD 100" pattern)
- **Examples**:
  - `USD 100` → `100 USD`
  - `EUR 50` → `50 EUR`
- **Work Required**:
  - In `parsePrimary()`, check if current token is UNIT(currency)
  - Look ahead for NUMBER token
  - If found, consume both and create NumberWithUnit (swap order)
  - This handles the "currency before number" pattern
- **Effort**: Low (1 hour)
- **Files**:
  - `src/parser.ts` (add check in `parsePrimary()` method)

### Feature: Complex Relative Date/Time Expressions
- **Tests**:
  - `should handle instants (relative time)` (partial - complex expressions)
- **Status**: ✅ **PARTIALLY IMPLEMENTED**
  - ✅ Simple keywords working: `now`, `today`, `tomorrow`, `yesterday`
  - ❌ Complex expressions need parser support
- **Examples**:
  - `2 days ago` → (current date - 2 days with current time)
  - `3 days from now` → (current date + 3 days with current time)
  - `5 years ago` → (current date - 5 years with current time)
  - `10 hours from now` → (current date and time + 10 hours)
- **Work Required**:
  - Parse patterns: `NUMBER UNIT ago` and `NUMBER UNIT from now`
  - Add `ago` and `from` as contextual keywords in lexer
  - Modify parser to recognize these patterns in `parsePrimary()` or as postfix expressions
  - Create AST nodes for relative date/time expressions (e.g., `RelativeInstantExpression`)
  - **Parsing Approach**:
    ```typescript
    // In parsePrimary() or parsePostfix():
    // After parsing NUMBER + UNIT, check for "ago" or "from now"
    if (hasNumberWithUnit && this.check(TokenType.IDENTIFIER)) {
      const keyword = this.peek().value.toLowerCase();
      if (keyword === 'ago') {
        // Create RelativeInstantExpression with negative duration
      } else if (keyword === 'from' && this.peekAhead(1)?.value.toLowerCase() === 'now') {
        // Create RelativeInstantExpression with positive duration
      }
    }
    ```
  - Evaluator already handles the computation via existing date/time arithmetic
- **Effort**: Medium (3-4 hours)
- **Files**:
  - `src/tokens.ts` (may need to add AGO, FROM keywords)
  - `src/lexer.ts` (recognize keywords contextually)
  - `src/ast.ts` (add RelativeInstantExpression node type)
  - `src/parser.ts` (parse relative instant patterns)
  - `src/evaluator.ts` (evaluate relative instant expressions - convert to duration + add to now)

### Feature: Plain Date Time Parsing
- **Tests**:
  - `should handle plain date times`
  - `should handle add duration to date time`
  - `should handle add composite duration to date time`
- **Status**: ✅ **COMPLETED**
- **Examples**:
  - ✅ `1970 Jan 01 14:30` → PlainDateTime literal (working)
  - ✅ `14:30 1970 Jan 01` → PlainDateTime literal (time before date - working)
  - ✅ `1970 Jan 1 12:00 + 2 hours` → date-time arithmetic (working)
  - ✅ `1970 Jan 1 12:00 + 1 month 2 hours` → date-time arithmetic with composite duration (working)
- **Implementation Completed**:
  - ✅ Parser now combines date and time tokens into PlainDateTimeLiteral
  - ✅ Handles both orderings: date→time and time→date
  - ✅ Handles AM/PM time indicators
  - ✅ Added evaluator support for plainDateTime + duration arithmetic
- **Files Modified**:
  - ✅ `src/parser.ts` - Modified `parseNumberWithOptionalUnit()` and `tryParseTime()`
  - ✅ `src/evaluator.ts` - Added plainDateTime + duration arithmetic support
  - ✅ `tests/parser.test.ts` - Added 5 new tests for plain date time literals
  - ✅ `tests/integration.test.ts` - Re-enabled 3 tests
- **Original Requirements**:
  1. **Modify `parseDateWithMonth()`** (parser.ts:1476-1500):
     - After creating `PlainDateLiteral`, check if next token is a time
     - If time found, consume it and create `PlainDateTimeLiteral` instead
     ```typescript
     const dateLiteral = createPlainDateLiteral(year, month, day, start, end);

     // Check if next token is a time
     if (this.check(TokenType.DATETIME)) {
       const timeResult = this.tryParseTime(this.currentToken());
       if (timeResult && timeResult.type === 'PlainTimeLiteral') {
         this.advance(); // consume time tokens
         return createPlainDateTimeLiteral(
           dateLiteral,
           timeResult,
           start,
           this.previous().end
         );
       }
     }

     return dateLiteral;
     ```

  2. **Modify `tryParseTime()`** (parser.ts:1380-1448):
     - After creating `PlainTimeLiteral`, check if next token is a date
     - If date found, parse it and create `PlainDateTimeLiteral` instead
     ```typescript
     const timeLiteral = createPlainTimeLiteral(finalHour, minute, second, 0, start, end);

     // Check if next token is a date (month name)
     if (this.check(TokenType.DATETIME)) {
       const nextValue = this.peek().value.toLowerCase();
       const monthNum = this.parseMonthName(nextValue);
       if (monthNum !== null) {
         this.advance(); // consume month token
         const dateResult = this.parseDateWithMonth(monthNum, this.previous().start);
         if (dateResult && dateResult.type === 'PlainDateLiteral') {
           return createPlainDateTimeLiteral(
             dateResult,
             timeLiteral,
             start,
             this.previous().end
           );
         }
       }
     }

     return timeLiteral;
     ```

  3. **Handle both orderings**:
     - Date then time: "1970 Jan 01 14:30"
     - Time then date: "14:30 1970 Jan 01"

  4. **Be careful with token consumption**:
     - Need proper lookahead to avoid consuming tokens that aren't part of date-time
     - May need backtracking if pattern doesn't match
- **According to SPECS.md** (line 120-123):
  - Support input format `{plain date} {plain time}` and `{plain time} {plain date}`
  - Examples: "1970 Jan 01 14:30", "14:30 1970 Jan 01"
- **Effort**: Medium (2-3 hours) - ✅ **COMPLETED**
- **Actual Time**: ~2 hours (including tests and evaluator support)
- **Tests Re-enabled and Passing**: ✅ All 3 tests
  - Line 712: `should handle plain date times` ✅
  - Line 839: `should handle add duration to date time` ✅
  - Line 860: `should handle add composite duration to date time` ✅

### Feature: Numeric Date Format (YYYY.MM.DD)
- **Tests**:
  - `should handle zoned date times` (partial - line 723: `2023.06.15 09:00 London`)
- **Status**: ❌ **NOT IMPLEMENTED**
- **Examples**:
  - ❌ `2023.06.15` → PlainDate literal (not working)
  - ❌ `2023.06.15 09:00` → PlainDateTime literal (not working)
  - ❌ `2023.06.15 09:00 London` → ZonedDateTime literal (not working - test failing)
- **Current Behavior**:
  - `2023.06.15 09:00 London` is parsed as arithmetic: `2023.06` (decimal) then something with `.15`
  - Output: `"2 023.06"` (completely wrong)
- **Work Required**:
  - Add parsing support for YYYY.MM.DD date format (dot-separated numeric dates)
  - This is separate from the YYYY MONTH D format (space-separated with month names)
  - Need to detect pattern: NUMBER(YYYY) DOT NUMBER(MM) DOT NUMBER(DD)
  - Must distinguish from decimal arithmetic (2023.06 as a decimal number)
  - **Parsing approach**:
    1. After parsing a NUMBER token, check if it's followed by DOT + NUMBER + DOT + NUMBER
    2. Validate that the values represent a valid date (year, month, day)
    3. Create PlainDateLiteral
    4. Check for following time token (DATETIME) to create PlainDateTimeLiteral
    5. Check for following timezone to create ZonedDateTimeLiteral
  - **Disambiguation from decimals**:
    - `2023.06` alone → decimal number
    - `2023.06.15` → date (three dot-separated numbers)
    - `2023.06.15 09:00` → date + time
- **Files to Modify**:
  - `src/parser.ts` - Add `tryParseNumericDate()` method in `parseNumberWithOptionalUnit()`
  - After NUMBER token, check for DOT pattern
  - May need to handle backtracking if pattern doesn't match
- **Effort**: Medium (3-4 hours)
- **Priority**: Medium - Required by SPECS.md (line 567), currently blocks 1 test
- **Blocked By**: None (independent feature)
- **According to SPECS.md** (line 567):
  - Example: `2023.06.15 09:00 London` → `2023-06-15 Thu 09:00 UTC+1`

### Feature: Timezone Parsing
- **Tests**:
  - `should handle zoned date times` (lines 719-724, 6 test cases)
- **Status**: ✅ **MOSTLY COMPLETED** (5 of 6 test cases passing, 97.7% overall pass rate)
- **Examples**:
  - ✅ `12:30 UTC` → ZonedDateTime (working)
  - ✅ `8:25 Japan` → ZonedDateTime (working)
  - ✅ `2023 Jan 01 14:00 America/New_York` → ZonedDateTime (working)
  - ✅ `2023 Jan 01 14:00 New York` → ZonedDateTime (working)
  - ❌ `2023.06.15 09:00 London` → ZonedDateTime (blocked by YYYY.MM.DD parsing)
  - ✅ `1970 Jan 01 23:59 UTC+8` → ZonedDateTime (working)
- **Implementation Completed**:
  - ✅ Formatter displays UTC offsets correctly
  - ✅ Formatter shows time-only for "today", date+time for other dates
  - ✅ Parser attaches timezones to time/date/datetime literals
  - ✅ Greedy matching for multi-word/multi-slash timezone names
  - ✅ Offset pattern parsing (UTC+9, UTC-330, etc.)
  - ✅ Fixed token type bug (SLASH not DIV)
  - ✅ Fixed DataLoader to index IANA identifiers as searchable names
  - ✅ Added `attachTimezone` parameter to `tryParseTime()` to prevent premature attachment
- **Files Modified**:
  - ✅ `src/formatter.ts` - Updated formatZonedDateTime() method
  - ✅ `src/parser.ts` - Added tryAttachTimezone(), parseTimezoneOffset(), attachTimezoneToTime(), attachTimezoneToDateTime()
  - ✅ `src/parser.ts` - Updated tryParseTime() with attachTimezone parameter
  - ✅ `src/parser.ts` - Updated parseNumberWithOptionalUnit() and parseDateWithMonth() with timezone attachment
  - ✅ `src/data-loader.ts` - Fixed timezone indexing to include IANA identifiers
  - ✅ `tests/parser.test.ts` - Added 7 timezone tests
- **Test Results**:
  - Total: 888 passing / 909 tests (97.7%)
  - Integration: 1 failing (blocked by YYYY.MM.DD format)
  - Parser: All 7 timezone tests passing
- **Effort**: Medium-High (6-8 hours) - ✅ **COMPLETED**
- **Actual Time**: ~6 hours (including debugging and fixes)

---

## Phase 5: Evaluation Engine (18 tests)

### Feature: Currency Unit Resolution
- **Tests**:
  - `should handle currency ISO codes` (evaluation part)
  - `should handle currency names` (evaluation part)
  - `should handle unambiguous currency symbols` (evaluation part)
- **Examples**:
  - `100 USD` → evaluates successfully
  - `100 US dollars` → evaluates successfully
  - `US$100` → evaluates successfully
- **Work Required**:
  - Evaluator's `resolveUnit()` currently only checks unit database
  - Add fallback to check currency database when unit lookup fails
  - Convert currency to Unit format for evaluation (use currency as dimension)
  - **Ambiguous currency handling**:
    - For unambiguous currencies: use currency code as dimension (e.g., "USD")
    - For ambiguous symbols ($, £, ¥): use special dimension from `ambiguous.symbolAdjacent` entry
    - Example: `$` has `dimension: "currency_symbol_0024"` (hex for U+0024)
    - Operations between different ambiguous dimensions should error
    - Operations between same ambiguous dimension are allowed (e.g., `$10 + $5`)
    - Conversions between ambiguous currencies should error with helpful message
- **Ambiguous Currency Data Structure**:
  ```json
  "ambiguous": {
    "symbolAdjacent": [
      {"symbol": "$", "dimension": "currency_symbol_0024"},
      {"symbol": "£", "dimension": "currency_symbol_00A3"},
      {"symbol": "¥", "dimension": "currency_symbol_00A5"}
    ],
    "symbolSpaced": []  // Typically empty; ISO codes are unambiguous
  }
  ```
- **Effort**: Medium (2-3 hours)
- **Files**:
  - `src/evaluator.ts` (enhance `resolveUnit()` to check currencies, handle ambiguous dimensions)
  - `src/data-loader.ts` (add methods for ambiguous currency lookup)
  - `src/type-checker.ts` (may need updates for ambiguous currency dimension checking)

### Feature: Dimensionless Unit Conversion (3 tests)

**Status**: ✅ **COMPLETED** (all 3 tests passing + 3 additional tests)

- **Tests**:
  - ✅ `should handle English number units converting to dimensionless` - PASSING
  - ✅ `should handle percentages converting to dimensionless` (word form) - PASSING
  - ✅ `should handle percent symbol converting to dimensionless` (% symbol) - PASSING
  - ✅ `should handle modulo operator` - PASSING (new test)
  - ✅ `should distinguish percent from modulo` - PASSING (new test)
- **Examples**:
  - ✅ `5 dozen` → `60` (working)
  - ✅ `100 percent` → `1` (working)
  - ✅ `50%` → `0.5` (working)
  - ✅ `10 % 3` → `1` (modulo operator working)
- **Implementation Completed**:
  - ✅ Auto-conversion of dimensionless units in evaluator (lines 273-287)
  - ✅ Percent/modulo disambiguation in lexer (lines 564-615)
  - ✅ Whitespace tracking for context-sensitive tokenization
  - ✅ Lookahead for modulo operator detection
- **Disambiguation Strategy**:
  - Adjacent to number (no space): `50%` → UNIT (percent)
  - Separated with operand: `50 % 3` → PERCENT (modulo)
  - Separated without operand: `50 %` → UNIT (percent)
  - Not after number: `x % y` → PERCENT (modulo)
- **Files Modified**:
  - ✅ `src/evaluator.ts` (lines 273-287)
  - ✅ `src/lexer.ts` (added `hadWhitespaceBeforeCurrentToken` field, `disambiguatePercent()` method, modified `%` tokenization)
- **Tests Added**:
  - ✅ `tests/lexer.test.ts` (13 new tests for percent/modulo disambiguation)
  - ✅ `tests/integration.test.ts` (re-enabled 1 test, added 3 new tests)

### Feature: Composite Unit Operations (3 tests)

**Status**: ✅ **PARTIALLY COMPLETED** (2 of 3 tests passing)

- **Tests**:
  - ✅ `should handle negated composite units` - PASSING
  - ✅ `should convert from composite units to single unit` - PASSING
  - ❌ `should handle derived units with space multiplication` - SKIPPED
- **Examples**:
  - ✅ `-(5 m 20 cm)` → `-5 m -20 cm` (working)
  - ✅ `6 ft 3 in to cm` → `190.5 cm` (working)
  - ❌ `1 N m` → `1 N m` (space multiplication disambiguation needed)
- **Completed Work**:
  1. ✅ **Negation**: Unary negation for composite units implemented
     - Added composite case in `evaluateUnary()` (lines 850-873 in evaluator.ts)
     - Negates each component value while preserving units
  2. ✅ **Conversion**: Composite to single unit conversion implemented
     - Enhanced `convertToUnit()` to handle composite sources (lines 994-1048 in evaluator.ts)
     - Converts all components to base unit, sums, then converts to target
- **Remaining Work**:
  - ❌ **Space multiplication**: Distinguish `N m` (composite) from `N·m` (derived unit product)
    - Requires parser disambiguation based on context
    - Low priority (edge case)
- **Files Modified**:
  - ✅ `src/evaluator.ts` (lines 850-873, 994-1048)
- **Files Needing Work**:
  - ❌ `src/parser.ts` (space multiplication disambiguation)

### Feature: Function Enhancements (3 tests)

**Status**: ✅ **PARTIALLY COMPLETED** (2 of 3 tests passing)

- **Tests**:
  - ❌ `should handle inverse trig functions` (formatting) - SKIPPED
  - ✅ `should handle log with base` - PASSING
  - ✅ `should handle round with units` - PASSING
- **Examples**:
  - ❌ `asin(0.5)` → `30 deg` (unit display issue)
  - ✅ `log(2, 32)` → `5` (working)
  - ✅ `round(18.9 kg)` → `19 kg` (working)
- **Completed Work**:
  1. ✅ **log with base**: Two-argument `log(base, value)` function implemented
     - Added special case in `executeLog()` method (lines 194-244 in functions.ts)
     - Uses change of base formula: log_b(x) = ln(x) / ln(b)
  2. ✅ **round with units**: round(), floor(), ceil(), abs(), trunc(), frac() preserve units
     - Modified `evaluateFunctionCall()` to preserve first argument's unit (lines 913-963 in evaluator.ts)
- **Remaining Work**:
  - ❌ **Inverse trig**: Formatting display of angle units (Phase 6 issue)
- **Files Modified**:
  - ✅ `src/functions.ts` (lines 194-244)
  - ✅ `src/evaluator.ts` (lines 913-963)
- **Files Needing Work**:
  - ❌ `src/formatter.ts` (angle unit display for inverse trig)

### Feature: Binary Operations (6 tests)
- **Tests**:
  - `should handle bitwise AND`
  - `should handle bitwise OR`
  - `should handle bitwise XOR`
  - `should handle bitwise NOT`
  - `should handle left shift`
  - `should handle right shift`
- **Examples**:
  - `0b1010 & 0b1100 to binary` → `0b1000`
  - `0b1010 | 0b1100 to binary` → `0b1110`
  - `0b1010 xor 0b1100 to binary` → `0b110`
  - `~0b1010 to binary` → `0b-1011`
  - `0b1010 << 2 to binary` → `0b101000`
  - `0b1010 >> 1 to binary` → `0b101`
- **Work Required**:
  - Binary operations likely already work in evaluator (bitwise AND, OR, XOR, NOT, shifts)
  - **Main issues**:
    1. Binary prefix parsing (0b) not working - see Phase 2 fixes needed first
    2. Presentation conversion "to binary" not implemented - see Phase 6
  - Once Phase 2 and Phase 6 are complete, these tests should pass
  - The bitwise operations themselves are already implemented in evaluator
- **Effort**: Depends on Phase 2 and Phase 6 (no additional work if those are done)
- **Files**:
  - Requires Phase 2: `src/lexer.ts` (parse 0b prefix)
  - Requires Phase 6: `src/parser.ts`, `src/evaluator.ts`, `src/formatter.ts` (presentation conversions)

### Feature: Date/Time Arithmetic & Relative Instants

**Status**: ✅ **COMPLETED** (4 tests passing)

#### Completed Work:

1. **Relative Instant Keywords** (4 tests) - ✅ **DONE**
   - **Tests**: `should handle instants (relative time)` (partial - simple keywords)
   - **Examples**:
     - `now` → current date and time
     - `today` → current date and time
     - `tomorrow` → tomorrow's date with current time
     - `yesterday` → yesterday's date with current time
   - **Implementation**:
     - Added `evaluateRelativeInstantKeyword()` in evaluator.ts
     - Added `getCurrentPlainDate()` and `getCurrentZonedDateTime()` in date-time.ts
     - Simple keywords recognized before variable lookup
     - All return zonedDateTime for consistency
   - **Files Modified**:
     - `src/evaluator.ts` (lines 1018-1080)
     - `src/date-time.ts` (lines 75-106)

2. **Composite Duration Arithmetic** (2 tests) - ✅ **DONE**
   - **Tests**:
     - `should handle add composite duration to plain time`
     - `should handle add composite duration to date`
   - **Examples**:
     - `10:25 + 2 hours 40 min` → `13:05`
     - `1970 Jan 1 + 1 month 2 days` → `1970-02-03`
   - **Implementation**:
     - Modified `evaluateArithmetic()` to detect composite units with all time-dimensioned components
     - Added `convertCompositeTimeToDuration()` method to convert composite units to durations
     - Automatic conversion before date/time arithmetic
   - **Files Modified**:
     - `src/evaluator.ts` (lines 549-579, 1595-1634)

3. **Single Duration to Date Arithmetic** (2 tests) - ✅ **ALREADY WORKING**
   - **Tests**:
     - `should add duration to date`
     - `should handle month addition with clamping`
   - **Examples**:
     - `2023 Jan 1 + 10 days` → `2023-01-11 Wed`
     - `1970 Jan 31 + 1 month` → `1970-02-28`
   - **Status**: These were already implemented in Phase 5

#### Remaining Work:

**Complex Relative Date/Time Expressions** - ❌ **BLOCKED (needs Phase 3 parser work)**
- See Phase 3 section above for details
- Examples: `2 days ago`, `3 days from now`, `5 years ago`, `10 hours from now`
- Requires parser support for `NUMBER UNIT ago` and `NUMBER UNIT from now` patterns

**Test Results:**
- Before: 850 passing, 29 skipped
- After: 854 passing, 23 skipped
- **Impact: +4 tests passing, -6 skipped**

### Feature: Date/Time Arithmetic (2 tests) - DEPRECATED

**NOTE:** This section is now covered by the "Date/Time Arithmetic & Relative Instants" section above. Keeping for reference.
- **Tests**:
  - `should add duration to date`
  - `should handle month addition with clamping`
- **Examples**:
  - `2023 Jan 1 + 10 days` → `2023-01-11 Wed`
  - `1970 Jan 31 + 1 month` → `1970-02-28`
- **Work Required**:
  - Functionality likely works (evaluator has date arithmetic)
  - **Main issue**: Date formatting inconsistency
  - Result format varies from expectations
- **Effort**: Easy (1-2 hours)
- **Files**:
  - `src/formatter.ts` (standardize date output format)

### Feature: User-Defined Units Support (5 tests)

**✅ STATUS: COMPLETED**
- ✅ Full implementation complete (parser, type-checker, evaluator, formatter)
- ✅ All cases working after Phase 3 parser bug fix
- ✅ Simple cases: `1 person`, `3 trips + 2 trips`, `1000 USD / 5 person / 2 day`
- ✅ Derived unit cases: `10 USD/person * 3 person` → `30 USD` (cancellation works)

- **Tests**:
  - `should handle user-defined units`
  - `should handle derived units with user-defined units`
  - `should convert derived units with user-defined units`
  - `should add compatible user-defined units`
  - `should create derived units from multiplication with user-defined units`
  - `should create derived units from division with user-defined units`
- **Examples**:
  - `1 person` → `1 person`
  - `1 kg / person` → `1 kg/person`
  - `3 trips + 2 trips` → `5 trips`
  - `1 USD/person/day` → `1 USD/person/day`
  - `100 person/sq ft to person/km^2` → `1 076 391 041.67 person/km²`
  - `10 USD/person * 3 person` → `30 USD` (person cancels)
  - `1000 USD / 5 person / 2 day` → `100 USD/person/day`
- **Work Required**:

  **Phase 3 (Parser) - Minor Changes**:
  - Allow unknown identifiers after numbers to be treated as user-defined units
  - Create `SimpleUnit` nodes with unknown unitIds
  - Files: `src/parser.ts` (parseNumberWithOptionalUnit)
  - Effort: 1-2 hours

  **Phase 4 (Type Checker) - Moderate Changes**:
  - Accept user-defined units as valid dimensions
  - Treat each user-defined unit as its own unique dimension
  - Allow dimension-compatible operations (e.g., `person + person` ✓, `person + meter` ✗)
  - Files: `src/type-checker.ts`
  - Effort: 2-3 hours

  **Phase 5 (Evaluator) - Major Changes**:
  - Enhance `resolveUnit()` to create pseudo-dimensions for user-defined units on-the-fly
  - Store user-defined units with identity conversion (factor: 1.0, offset: 0)
  - Handle arithmetic: `3 trips + 2 trips` → `5 trips`
  - Support in derived units: `1 kg/person`, `1 USD/person/day`
  - Track user-defined units separately to avoid conflicts with known units
  - **Implementation details**:
    ```typescript
    // When resolving unknown unit:
    if (!unit) {
      // Create pseudo-unit for user-defined unit
      return {
        unitId: identifier,
        dimension: `user_defined_${identifier}`, // Unique dimension per unit
        conversionToBase: { factor: 1.0, offset: 0 },
        displayName: { symbol: identifier }
      };
    }
    ```
  - Files: `src/evaluator.ts` (resolveUnit, unit arithmetic operations)
  - Effort: 4-6 hours

  **Phase 6 (Formatter) - Minor Changes**:
  - Display user-defined unit names as-is (no lookup needed)
  - Files: `src/formatter.ts`
  - Effort: 1 hour

- **Total Effort**: 8-12 hours
- **Re-enable Tests**: After implementation, re-enable 5 skipped tests in `integration.test.ts` (lines 388, 393, 503, 608, 633, 659)

### Feature: Unit Cancellation in Arithmetic Operations (3 tests)

**✅ STATUS: COMPLETED**
- ✅ Implementation complete: `simplifyTerms()` method with dimension grouping and conversion
- ✅ Integrated into `multiplyValues()` and `divideValues()` operations
- ✅ All test cases working after Phase 3 parser bug fix
- ✅ Proven working: `3 kg/m² * 2 m²` → `6 kg` (cancellation works correctly)

- **Tests**:
  - `should create derived units from multiplication` (second part)
  - `should create derived units from division`
  - `should create derived units from multiplication with user-defined units` (second part)
  - `should create derived units from division with user-defined units` (second part)
- **Examples**:
  - `5 N * 2 m` → `10 N·m` (compute 5*2=10)
  - `3 kg/m^2 * 2 m^2` → `6 kg` (compute 3*2=6, cancel m² with m⁻²)
  - `60 km / 2 h` → `30 km/h` (compute 60/2=30)
  - `60 kg/cm^2 / 2 h/m^2` → `300 000 kg/h` (compute 60/2 × 10000 = 300000)
  - `10 USD/person * 3 person` → `30 USD` (compute 10*3=30, cancel person)
  - `500 click/person / 5 USD/person` → `100 click/USD` (compute 500/5=100, cancel person)
- **Work Required**:

  **Phase 5 (Evaluator) - Major Enhancement**: ✅ **COMPLETED**
  - ~~Current state: Phase 5.5 shows derived unit creation is implemented, but unit algebra is incomplete~~
  - ✅ DONE: All requirements have been implemented:
    1. ✅ Cancel opposing exponents (m² × m⁻² → 1, dimensionless) - `simplifyTerms()` method
    2. ✅ Compute numeric results during operations - integrated into multiply/divide
    3. ✅ Simplify results after cancellation - automatic in `simplifyTerms()`
    4. ✅ Convert units during simplification (cm² to m²) - conversion factors applied

  - **Implementation Requirements**:

    1. **Multiplication**: Combine units by adding exponents, compute numeric product
       ```typescript
       // (3 kg/m²) * (2 m²)
       // Numeric: 3 * 2 = 6
       // Units: [kg:1, m:-2] + [m:2] = [kg:1, m:0]
       // Result: 6 kg
       ```

    2. **Division**: Flip divisor exponents, combine units, compute numeric quotient
       ```typescript
       // (60 kg/cm²) / (2 h/m²)
       // Numeric: 60 / 2 = 30
       // Units: [kg:1, cm:-2] + [h:-1, m:2] = [kg:1, cm:-2, h:-1, m:2]
       // Simplify: Convert cm² to m² (factor: 10000)
       // Result: 30 × 10000 kg/h = 300000 kg/h
       ```

    3. **Simplification**:
       - Remove terms with exponent 0 (they cancel to dimensionless)
       - Convert compatible units when possible (cm² → m², km → m, etc.)
       - Apply conversion factors to numeric value

    4. **Unit conversion during simplification**:
       - When m² and cm² both appear, convert to common unit
       - Example: m²/cm² → (1 m² / 10000 cm²) = 10000 dimensionless

  - **Detailed Algorithm**:
    ```typescript
    function multiplyQuantities(left: Quantity, right: Quantity): Quantity {
      // 1. Compute numeric result
      const value = left.value * right.value;

      // 2. Combine units by adding exponents
      const terms = combineTerms(left.unit.terms, right.unit.terms);

      // 3. Simplify: remove terms with exponent 0, convert compatible units
      const { simplified, factor } = simplifyTerms(terms);

      // 4. Apply conversion factor to value
      const finalValue = value * factor;

      // 5. Return result with simplified units
      return { value: finalValue, unit: createDerivedUnit(simplified) };
    }

    function combineTerms(left: UnitTerm[], right: UnitTerm[]): UnitTerm[] {
      const termMap = new Map<string, number>();

      // Add exponents from left
      for (const term of left) {
        termMap.set(term.unit.unitId, (termMap.get(term.unit.unitId) || 0) + term.exponent);
      }

      // Add exponents from right
      for (const term of right) {
        termMap.set(term.unit.unitId, (termMap.get(term.unit.unitId) || 0) + term.exponent);
      }

      // Filter out zero exponents
      return Array.from(termMap.entries())
        .filter(([_, exp]) => exp !== 0)
        .map(([unitId, exp]) => ({ unit: resolveUnit(unitId), exponent: exp }));
    }

    function simplifyTerms(terms: UnitTerm[]): { simplified: UnitTerm[], factor: number } {
      // Group terms by dimension
      const byDimension = groupBy(terms, t => t.unit.dimension);

      let factor = 1.0;
      const simplified: UnitTerm[] = [];

      // For each dimension, check if units can be converted
      for (const [dimension, dimTerms] of byDimension) {
        if (dimTerms.length === 1) {
          // Single unit, keep as-is
          simplified.push(dimTerms[0]);
        } else {
          // Multiple units of same dimension - convert to common base
          for (const term of dimTerms) {
            const conversionFactor = Math.pow(term.unit.conversionToBase.factor, term.exponent);
            factor *= conversionFactor;
          }
          // After conversion, exponents cancel if they sum to 0
          const totalExponent = dimTerms.reduce((sum, t) => sum + t.exponent, 0);
          if (totalExponent !== 0) {
            // Keep one representative unit with total exponent
            simplified.push({ unit: dimTerms[0].unit, exponent: totalExponent });
          }
        }
      }

      return { simplified, factor };
    }
    ```

  - Files: `src/evaluator.ts` (binary multiplication, division, and term combination/simplification)

- **Remaining Work**: Fix Phase 3 parser bug to unblock testing
- **Re-enable Tests**: After parser bug is fixed, re-enable 3 skipped tests in `integration.test.ts` (lines 623, 647, and parts of 633, 659)

---

## Phase 6: Result Formatting (14 tests)

### Feature: Presentation Conversions (5 tests)
- **Tests**:
  - `should convert to binary`
  - `should convert to octal`
  - `should convert to hexadecimal`
  - `should convert to fraction`
  - `should convert to scientific notation`
- **Examples**:
  - `255 to binary` → `0b11111111`
  - `255 to octal` → `0o377`
  - `255 to hexadecimal` → `0xFF`
  - `0.75 to fraction` → `3/4`
  - `5000 to scientific` → `5e3`
- **Work Required**:
  - Add presentation conversion target types to AST
  - Parse conversion keywords: `binary`, `octal`, `hex`, `fraction`, `scientific`
  - Implement formatters for each presentation style
  - Fraction: Use continued fractions or simple GCD algorithm
  - Scientific: Already have, just need explicit conversion
- **Effort**: Medium-Hard (6-8 hours)
- **Files**:
  - `src/ast.ts` (add PresentationTarget types)
  - `src/parser.ts` (parse presentation conversion targets)
  - `src/evaluator.ts` (handle presentation conversions)
  - `src/formatter.ts` (implement formatters: binary, octal, hex, fraction, scientific)

### Feature: Formatting Issues (9 tests)
- **Tests**:
  - `should handle nautical mile unit symbol`
  - `should handle temperature units with degree symbol`
  - `should handle plain date times`
  - `should handle mixed calculations`
- **Work Required**:
  - Most are minor formatting inconsistencies
  - Unit display variations (nmi vs full name)
  - Precision differences
  - Date/time format variations
  - Infinity display
- **Effort**: Easy (3-4 hours total)
- **Files**:
  - `src/formatter.ts` (adjust unit display, number precision, date formats, Infinity handling)

---

## Multiple Phases: Edge Cases (1 test)

### Feature: Error handling
- **Test**: `should fail on invalid expressions gracefully`
- **Example**: `This is just text` → (fail gracefully)
- **Work Required**:
  - Currently, invalid syntax parses as identifiers (ExpressionLine with undefined variables)
  - Plain text like "This is just text" gets tokenized as separate identifiers
  - Parser creates ExpressionLine nodes for these identifier sequences
  - Evaluator attempts to evaluate undefined variables, may show errors or "undefined"
  - Invalid lines should faild gracefully, and be skipped as a whole, essentially treated as plain text
- **Effort**: Medium (3-4 hours)
- **Phases**: Phase 3 (Parser) for detection, Phase 5 (Evaluator) for graceful error handling
- **Files**:
  - `src/parser.ts`
  - `src/evaluator.ts`
  - `src/ast.ts`

---

## Implementation Priority Recommendations

### ✅ Completed Features
1. ~~**Parser Bug: Derived Units in Binary Operations** (Phase 3)~~ - ✅ FIXED (Phase 3 completed)
2. ~~**User-Defined Units Support** (Phase 5)~~ - ✅ DONE (all tests passing)
3. ~~**Unit Cancellation in Arithmetic** (Phase 5)~~ - ✅ DONE (all tests passing)
4. ~~**Dimensionless Unit Conversion** (Phase 5)~~ - ✅ COMPLETED (all tests passing, percent/modulo disambiguation working)
5. ~~**Date/Time Arithmetic** (Phase 5)~~ - ✅ DONE (composite durations working)
6. ~~**Relative Instant Keywords** (Phase 5)~~ - ✅ DONE (now, today, tomorrow, yesterday)
7. ~~**Composite Unit Operations** (Phase 5)~~ - ✅ MOSTLY DONE (2/3 tests, space multiplication skipped)
8. ~~**Function Enhancements** (Phase 5)~~ - ✅ MOSTLY DONE (2/3 tests, inverse trig formatting skipped)
9. ~~**Percent/Modulo Disambiguation** (Phase 2)~~ - ✅ DONE (lexer correctly distinguishes % as percent vs modulo)
10. ~~**Plain Date Time Parsing** (Phase 3)~~ - ✅ COMPLETED (all 3 tests passing, evaluator support added)
11. ~~**Timezone Parsing** (Phase 3/5/6)~~ - ✅ MOSTLY COMPLETED (5 of 6 test cases, 97.7% pass rate, blocked by YYYY.MM.DD format)

### High Priority (Most User Impact)
1. **Binary/Octal/Hex Parsing** (Phase 2) - Common in programming contexts
1. **Presentation Conversions** (Phase 6) - Core feature from SPECS.md
1. **Numeric Date Format (YYYY.MM.DD)** (Phase 3) - Blocks last timezone test case
1. **Complex Relative Date/Time Expressions** (Phase 3) - "2 days ago", "3 days from now"
1. **Multi-Word Unit Parsing** (Phase 3) - "sq ft" case not working

### Medium Priority
1. **Base Keyword** (Phase 2) - Useful for arbitrary base conversions
1. **Composite Unit Operations** (Phase 5) - Expected to work
1. **Named Square/Cubic Units** (Phase 3) - Alternative syntax
1. **Binary Operation Formatting** (Phase 6) - Complete bitwise support

### Low Priority (Polish)
1. **Number Underscore Separators** (Phase 2) - Nice to have
1. **Function Enhancements** (Phase 5) - Minor improvements
1. **Formatting Tweaks** (Phase 6) - Minor display issues
1. **Plain Text Detection** (Multiple) - Edge case handling

---

## Effort Summary

| Phase | Total Effort | Features | Status |
|-------|--------------|----------|--------|
| Phase 2 (Lexer) | 10-16 hours | 7 features (6 number formats + 1 currency symbol) | Pending |
| Phase 3 (Parser) | 3-4 hours | 1 feature (complex relative date/time) | Pending |
| Phase 5 (Evaluator) | 2-3 hours | 1 feature (currency resolution) | Pending |
| Phase 6 (Formatter) | 9-12 hours | 8 features | Pending |
| Multiple | 3-4 hours | 1 feature | Pending |
| **COMPLETED** | **~35 hours** | **10 major features** | ✅ **DONE** |
| TOTAL REMAINING | 27-39 hours | 18 remaining features | |

**Completed Features** (estimated ~35 hours of work):
- ✅ Parser bug: Derived units in binary operations (4-6 hours) - **FIXED**
- ✅ User-defined units support (8-12 hours) - **COMPLETED**
- ✅ Unit cancellation in arithmetic (6-8 hours) - **COMPLETED**
- ✅ Dimensionless unit conversion (3 hours) - **COMPLETED** (all tests passing)
- ✅ Percent/modulo disambiguation (3 hours) - **COMPLETED** (lexer disambiguation working)
- ✅ Date/time arithmetic (2 hours) - **COMPLETED**
- ✅ Relative instant keywords (2 hours) - **COMPLETED**
- ✅ Composite unit operations (3 hours) - **MOSTLY DONE** (2/3 tests)
- ✅ Function enhancements (2 hours) - **MOSTLY DONE** (2/3 tests)
- ✅ Plain date time parsing (2-3 hours) - **COMPLETED** (all 3 tests passing)
- ✅ Timezone parsing (6 hours) - **MOSTLY COMPLETED** (5 of 6 test cases, 97.7% pass rate)

**Test Results:**
- Before dimensionless completion: 856 passing, 24 skipped
- After percent/modulo: 873 passing, 23 skipped
- After plain date time parsing: 881 passing, 20 skipped
- After timezone parsing: 888 passing, 1 failed, 20 skipped (909 total)
- **Impact: +32 tests passing total (+7 from timezone: added 7 parser tests, fixed DataLoader/formatter)**

**Note**: Some features span multiple phases (e.g., base keyword requires lexer, parser, and evaluator changes, user-defined units require parser + type checker + evaluator + formatter).

---

## Testing Strategy

For each feature implementation:
1. Unskip the corresponding test in `integration.test.ts`
2. Fix any additional issues revealed
3. Add unit tests in the relevant test file (lexer.test.ts, parser.test.ts, etc.)
4. Verify end-to-end functionality

The skipped tests serve as acceptance criteria - implementation is complete when all tests pass.

**Current Status**:
- **Total tests**: 888 passing, 1 failed, 20 skipped (909 total)
- **Pass rate**: 97.7% (888/909)
- **Integration tests**: 132 passing, 1 failed (out of 153 total), 20 skipped
  - Failing test: `should handle zoned date times` (1 of 6 test cases - `2023.06.15 09:00 London`)
  - Root cause: YYYY.MM.DD date format not implemented
- **Parser tests**: 155 passing (includes 5 plain date time tests + 7 timezone tests)
- **Lexer tests**: 124 passing (includes 13 new percent/modulo disambiguation tests)
- **Original baseline**: 105 passing, 36 skipped
- **Progress**: +783 tests added and passing, -16 skipped tests resolved

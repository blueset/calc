# Phase 8 Integration Test Gaps Analysis

This document analyzes all 41 skipped tests from `tests/integration.test.ts` and determines which phases should implement these features.

## Summary by Phase

| Phase | Feature Category | Count | Complexity |
|-------|-----------------|-------|------------|
| Phase 2 (Lexer) | Number formats & binary literals | 6 | Medium |
| Phase 2 (Lexer) | Currency symbol lexing | 2 | Medium |
| Phase 3 (Parser) | Derived units in binary ops | ~10 | High |
| Phase 3 (Parser) | Caret notation & named units | 3 | Medium |
| Phase 3 (Parser) | Multi-word unit/currency parsing | 3 | Medium |
| Phase 5 (Evaluator) | Currency resolution & conversion | 1 | Medium |
| Phase 5 (Evaluator) | User-defined units support (BLOCKED) | 5 | Medium-High |
| Phase 5 (Evaluator) | Unit cancellation in arithmetic (BLOCKED) | 3 | Medium-High |
| Phase 5 (Evaluator) | Dimensionless conversion & operations | 9 | Medium |
| Phase 5 (Evaluator) | Functions & binary operations | 8 | Easy-Medium |
| Phase 6 (Formatter) | Presentation conversions | 8 | Medium-Hard |
| Phase 6 (Formatter) | Display & precision issues | 6 | Easy |
| Multiple Phases | Edge cases & integration | 1 | Easy |

**NOTE:** The Phase 3 parser bug blocks ~80% of failures. User-defined units and unit cancellation are IMPLEMENTED but blocked by this bug.

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

**Status:** Newly discovered root cause blocking 80% of deferred test failures

**The Problem:**
The parser incorrectly treats expressions containing derived units in binary operations as **multiple separate lines** instead of a single expression.

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

**Root Cause:**
The `/` character in derived units (like `kg/m²`) is being interpreted as an **end-of-expression marker** or line separator when the parser encounters it followed by binary operators (`*` or `/`).

**Impact:**
- Blocks user-defined units with derived units (5 tests)
- Blocks unit cancellation arithmetic (3+ tests)
- Affects ~80% of deferred test failures
- Makes expressions like `kg/m² * m²` impossible to evaluate correctly

**Work Required:**

1. **Locate the parsing bug** (src/parser.ts):
   - Find where binary operations (multiplication/division) are parsed
   - Identify where derived unit expressions are constructed
   - Determine why `/` in a derived unit causes premature expression termination

2. **Fix the expression parsing logic**:
   - Track parser state: "inside unit expression" vs "inside binary operation"
   - When parsing a number-with-unit literal that contains derived units:
     - Complete the entire derived unit expression first
     - Return to binary operation parsing afterward
   - Don't treat `/` as a line/expression separator when it's part of a unit

3. **Specific parser methods to investigate**:
   - `parsePrimary()` - where NumberWithUnit literals are created
   - `parseNumberWithOptionalUnit()` - where derived units are detected
   - `isDerivedUnitExpression()` - context detection for derived units
   - `parseBinaryExpression()` or operator precedence climbing logic
   - Line/expression boundary detection logic

4. **Debugging approach**:
   ```typescript
   // Add debug logging to track parser state:
   // When does parser think expression is complete?
   // How does it handle '/' in "kg/m²" vs '/' as division operator?
   // Why does "3 kg/m² * 2" get split?
   ```

5. **Test cases to verify fix**:
   ```
   3 kg/m² * 2 m²              → single BinaryExpression, result: "6 kg"
   10 USD/person * 3 person    → single BinaryExpression, result: "30 USD"
   60 kg/cm² / 2 h/m²         → single BinaryExpression, result: "300000 kg·m²/(cm²·h)"
   500 click/person / 5 USD    → single BinaryExpression
   ```

**Files to Modify:**
- `src/parser.ts` - Expression parsing logic for binary operations and derived units

**Effort:** 4-6 hours (critical path)

**Priority:** 🔥 **CRITICAL** - Must fix before user-defined units and unit cancellation can be validated

**Tests Affected:**
- Lines 630-635: Derived unit multiplication (commented out, waiting for fix)
- Lines 638-643: User-defined derived unit multiplication (skipped)
- Lines 659-666: Derived unit division (commented out)
- Lines 669-679: User-defined derived unit division (skipped)

**Relationship to Other Gaps:**
- **Blocks:** User-defined units with derived units (PHASE_8_GAPS.md lines 365-424)
- **Blocks:** Unit cancellation in arithmetic (PHASE_8_GAPS.md lines 426-550)
- **Independent:** Multi-word unit parsing (can be fixed separately)

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
- **Tests**:
  - `should handle English number units converting to dimensionless`
  - `should handle percentages converting to dimensionless`
  - `should handle percentages as units`
- **Examples**:
  - `5 dozen` → `60` (not `5 doz`)
  - `100 percent` → `1` (not `100 %`)
  - `50%` → `0.5` (not `0.5 %`)
- **Work Required**:
  - Currently dimensionless units (dozen, percent, etc.) are kept as units
  - Need to auto-convert dimensionless units to pure numbers after evaluation
  - Modify evaluator to strip dimensionless units from results
  - Alternative: Add "dimensionless" flag to unit data and handle in formatter
- **Effort**: Medium (3-4 hours)
- **Files**:
  - `data/units.json` (add dimensionless flag if needed)
  - `src/evaluator.ts` (strip dimensionless units)
  - OR `src/formatter.ts` (hide dimensionless units in output)

### Feature: Composite Unit Operations (3 tests)
- **Tests**:
  - `should handle negated composite units`
  - `should convert from composite units to single unit`
  - `should handle derived units with space multiplication`
- **Examples**:
  - `-(5 m 20 cm)` → `-5 m -20 cm`
  - `6 ft 3 in to cm` → `190.5 cm`
  - `1 N m` → `1 N m` (derived unit)
- **Work Required**:
  1. **Negation**: Add unary negation support for CompositeUnit in evaluator
  2. **Conversion**: Convert composite to single unit by summing in base, then convert to target
  3. **Space multiplication**: Distinguish `N m` (composite) from `N m` (derived unit product)
- **Effort**: Medium (4-5 hours total)
- **Files**:
  - `src/evaluator.ts` (handle unary negation of composite, composite→unit conversion)
  - `src/parser.ts` (may need to disambiguate space multiplication context)

### Feature: Function Enhancements (3 tests)
- **Tests**:
  - `should handle inverse trig functions` (formatting)
  - `should handle log with base`
  - `should handle round with units`
- **Examples**:
  - `asin(0.5)` → `30 deg` (unit display)
  - `log(2, 32)` → `5` (log base 2 of 32)
  - `round(18.9 kg)` → `19 kg`
- **Work Required**:
  1. **Inverse trig**: Already works, just formatting display of angle units
  2. **log with base**: Add two-argument `log(base, value)` function
  3. **round with units**: Make round() preserve units on result
- **Effort**: Easy-Medium (3-4 hours total)
- **Files**:
  - `src/formatter.ts` (angle unit display for inverse trig)
  - `src/functions.ts` (add log with base, fix round to preserve units)

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

### Feature: Date/Time Arithmetic (2 tests)
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

**🔴 STATUS: IMPLEMENTED BUT BLOCKED BY PHASE 3 PARSER BUG**
- ✅ Basic implementation complete (parser, type-checker, evaluator, formatter)
- ✅ Simple cases work: `1 person`, `3 trips + 2 trips`, `1000 USD / 5 person / 2 day`
- ❌ Derived unit cases blocked by parser bug (see Phase 3 critical bug above)
- ⚠️ Cannot fully validate until parser bug is fixed

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

**🔴 STATUS: IMPLEMENTED BUT BLOCKED BY PHASE 3 PARSER BUG**
- ✅ Implementation complete: `simplifyTerms()` method with dimension grouping and conversion
- ✅ Integrated into `multiplyValues()` and `divideValues()` operations
- ✅ Proof it works: `1000 USD / 5 person / 2 day` → `100 USD/(person day)` ✅
- ❌ Cannot test derived unit cases due to parser splitting expressions into multiple lines
- ⚠️ Blocked by Phase 3 parser bug - fix that first to validate this feature

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

### 🔥 CRITICAL PRIORITY (Fix First - Unblocks Everything)
1. **Parser Bug: Derived Units in Binary Operations** (Phase 3) - 4-6 hours
   - Blocks 80% of test failures
   - Prevents validation of user-defined units and unit cancellation
   - Root cause must be fixed before proceeding with other work

### ✅ Already Complete (Waiting for Parser Bug Fix)
2. ~~**User-Defined Units Support** (Phase 5)~~ - ✅ DONE, just needs validation
3. ~~**Unit Cancellation in Arithmetic** (Phase 5)~~ - ✅ DONE, just needs validation

### High Priority (Most User Impact)
4. **Binary/Octal/Hex Parsing** (Phase 2) - Common in programming contexts
5. **Presentation Conversions** (Phase 6) - Core feature from SPECS.md
6. **Dimensionless Unit Conversion** (Phase 5) - User expectation (5 dozen = 60)
7. **Multi-Word Unit Parsing** (Phase 3) - "sq ft" case not working

### Medium Priority
7. **Base Keyword** (Phase 2) - Useful for arbitrary base conversions
8. **Composite Unit Operations** (Phase 5) - Expected to work
9. **Named Square/Cubic Units** (Phase 3) - Alternative syntax
10. **Binary Operation Formatting** (Phase 6) - Complete bitwise support

### Low Priority (Polish)
11. **Number Underscore Separators** (Phase 2) - Nice to have
12. **Function Enhancements** (Phase 5) - Minor improvements
13. **Formatting Tweaks** (Phase 6) - Minor display issues
14. **Plain Text Detection** (Multiple) - Edge case handling

---

## Effort Summary

| Phase | Total Effort | Features | Status |
|-------|--------------|----------|--------|
| Phase 2 (Lexer) | 13-19 hours | 8 features (6 number formats + 2 currency symbols) | Pending |
| Phase 3 (Parser) | 16-22 hours | 7 features (1 CRITICAL BUG + 3 unit syntax + 3 multi-word) | CRITICAL |
| Phase 5 (Evaluator) | 15-26 hours | 10 features (1 currency + 9 existing) | Pending |
| Phase 6 (Formatter) | 9-12 hours | 8 features | Pending |
| Multiple | 3-4 hours | 1 feature | Pending |
| TOTAL | 56-83 hours | 34 distinct features | |

Phase 3 Breakdown:
- 🔥 CRITICAL BUG: Derived units in binary operations (4-6 hours) - **BLOCKS 80% OF FAILURES**
- Other parser features: 12-16 hours (unit syntax + multi-word parsing)

**Completed Features** (not counted in totals above):
- ✅ User-defined units support (8-12 hours) - **IMPLEMENTED, blocked by Phase 3 bug**
- ✅ Unit cancellation in arithmetic (6-8 hours) - **IMPLEMENTED, blocked by Phase 3 bug**

**Note**: Some features span multiple phases (e.g., base keyword requires lexer, parser, and evaluator changes, user-defined units require parser + type checker + evaluator + formatter).

**Critical Path**: Fix Phase 3 parser bug first (4-6 hours) → unlocks user-defined units and unit cancellation validation → clears ~10 tests immediately.

---

## Testing Strategy

For each feature implementation:
1. Unskip the corresponding test in `integration.test.ts`
2. Fix any additional issues revealed
3. Add unit tests in the relevant test file (lexer.test.ts, parser.test.ts, etc.)
4. Verify end-to-end functionality

The skipped tests serve as acceptance criteria - implementation is complete when all tests pass.

**Current Status**: 105 tests passing, 36 skipped.

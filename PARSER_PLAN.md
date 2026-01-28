# Parser Implementation Plan for Notepad Calculator Language

## Progress Tracking

**Instructions**: As you complete tasks, update the checkboxes below by changing `[ ]` to `[x]`. Update this section regularly to track implementation progress.

### Phase 1: Data Loading Foundation (Days 1-2)
- [x] Create `data-loader.ts` with DataLoader class
- [x] Implement unit lookup maps (case-sensitive + case-insensitive)
- [x] Implement timezone lookup with territory support
- [x] Build unit trie for longest-match tokenization
- [x] Implement case-sensitive unit matching algorithm
- [x] Create `constants.ts` with mathematical constants
- [x] Write unit tests for data-loader

### Phase 2: Lexical Analysis (Days 3-4)
- [x] Create `tokens.ts` with token type definitions
- [x] Implement `lexer.ts` with Lexer class
- [x] Implement number literal tokenization (all bases)
- [x] Implement scientific notation priority rule
- [x] Implement longest unit match after numbers
- [x] Implement multi-word unit detection (handled in parser)
- [x] Implement date/time pattern recognition
- [x] Implement AM/PM disambiguation rule (attometers/picometers/petameters vs. time)
- [x] Implement keyword vs identifier distinction
- [x] Add source location tracking
- [x] Write unit tests for lexer (84 tests passing - includes Phase 2.5 time literal tests)

### Phase 2.5: Time Literal Tokenization (Optional Enhancement)
**Status**: ✅ COMPLETED

- [x] Enhance lexer to recognize colon patterns (H:MM, H:MM:SS)
- [x] Tokenize time literals as single DATETIME tokens
- [x] Update parser's `tryParseTime()` to handle tokenized time literals
- [x] Add tests for time literal parsing

### Phase 2.6: Unicode Superscript Support (Enhancement)
**Status**: ✅ COMPLETED

- [x] Add `isSuperscript()` method to recognize Unicode superscripts (⁰¹²³⁴⁵⁶⁷⁸⁹⁻)
- [x] Extend `scanIdentifierOrDateTime()` to include superscripts in token values
- [x] Add `containsSuperscript()` and `extractBaseBeforeSuperscript()` helpers
- [x] Modify unit detection to check base unit name when superscripts present
- [x] Replace silent unknown character skipping with LexerError throwing
- [x] Add lexer tests for Unicode superscripts (5 tests)
- [x] Add lexer tests for unknown character rejection (3 tests)
- [x] Add parser tests for Unicode superscript derived units (4 tests)
- [x] Update error recovery tests to expect LexerError

### Phase 2.7: Error Recording Architecture (Major Enhancement)
**Status**: ✅ COMPLETED

- [x] Add error container interfaces (LineError, TokenizeResult, DocumentResult) to error-handling.ts
- [x] Modify lexer to record errors instead of throwing
- [x] Add skipToNextLine() method to lexer for error recovery
- [x] Update parser to record errors and continue processing
- [x] Create Calculator orchestrator with comprehensive error collection
- [x] Update lexer tests for error recording model (92 tests)
- [x] Update parser tests for error recording model (99 tests)
- [x] Update evaluator tests for new API (79 tests)
- [x] Update type-checker tests for new API (78 tests)
- [x] Add integration tests for error recording (14 tests)

### Phase 3: Syntactic Analysis (Days 5-7)
- [x] Create `ast.ts` with all AST node types
- [x] Implement `parser.ts` with Parser class
- [x] Implement recursive descent parsing structure
- [x] Implement operator precedence climbing (15 levels)
- [x] Implement composite unit detection
- [x] Implement "per" operator disambiguation
- [x] Implement "in" keyword ambiguity handling for composite units
- [x] Implement error recovery (fallback to PlainText)
- [x] Write unit tests for parser (80 tests passing - includes Phase 2.5 time literal parsing tests)
- [x] Parse derived unit expressions in conversion targets (deferred from Phase 5.5)
  - **Note**: Both ASCII notation (m^2) and Unicode superscripts (m²) are fully supported in conversion targets (Unicode added in Phase 2.6)

### Phase 4: Semantic Analysis (Days 8-9)
- [x] Create `type-checker.ts` with type system definitions
- [x] Implement Duration type (semantic, not syntactic - see section 8)
- [x] Implement TypeChecker class
- [x] Implement dimension compatibility checking
- [x] Implement conversion validation
- [x] Implement composite unit validation
- [x] Implement variable scoping
- [x] Create `error-handling.ts` with error types
- [x] Write unit tests for type-checker (75 tests passing, 3 skipped for date literals)

### Phase 5: Evaluation Engine (Days 10-14)
- [x] Add composite unit conversion target support to parser (for "171 cm to ft in")
- [x] Implement date/time literal parsing in parser (DATETIME tokens → AST nodes)
- [x] Re-enable 3 skipped tests in type-checker.test.ts (date arithmetic tests)
- [x] Create `unit-converter.ts` with conversion logic (19 tests passing)
- [x] Implement linear/affine/variant conversions
- [x] Implement composite unit conversion
- [x] Create `date-time.ts` with Temporal-spec arithmetic (37 tests passing)
- [x] Implement month addition with clamping
- [x] Implement timezone name resolution with territory (via DataLoader)
- [x] Implement Duration representation
- [x] Create `currency.ts` with exchange rate handling (29 tests passing)
- [x] Create `functions.ts` with all math functions (50 tests passing)
- [x] Create `evaluator.ts` with Evaluator class
- [x] Implement binary operations with unit handling
- [x] Implement conversions (unit/date/currency)
- [x] Implement variable assignments and lookups
- [x] Write unit tests for all evaluation components (95/95 tests passing - 100%)
- [x] Fix single-letter variable name issue (parser now accepts UNIT tokens as identifiers in assignment context)
- [x] Implement derived unit conversions (completed)
- [x] Implement exponentiation of units and derived units (completed)

### Phase 5.5: Derived Unit Support
**Status**: ✅ **COMPLETED**

**Tasks**:
- [x] Refactored architecture to use signed exponents instead of numerator/denominator
- [x] Update evaluator binary multiplication to create derived units
- [x] Update evaluator binary division to create derived units
- [x] Implement comprehensive term combination logic
- [x] Document resolveUnit limitation

### Phase 6: Result Formatting (Days 15-16)
- [x] Create `settings.ts` with Settings interface
- [x] Create `formatter.ts` with Formatter class
- [x] Implement number formatting (precision, separators, grouping)
- [x] Implement unit formatting (display names for simple units)
- [x] Implement derived unit formatting (e.g., "km/h", "m²", "kg m/s²")
- [x] Implement date/time formatting
- [x] Implement composite unit formatting
- [x] Implement presentation target formatting (binary, hex, etc.)
- [x] Write unit tests for formatter (52 tests passing)

**Status**: ✅ **COMPLETED** (Updated to match SPECS.md lines 1074-1090)

**Implementation Details**:
- **Settings Interface** (aligned with SPECS.md, uses actual characters):
  - UI settings: theme (light/dark/system), fontSize (small/medium/large), fontFamily (monospace/sans-serif/serif)
  - Number formatting: precision, angleUnit (degree/radian), decimalSeparator ('.' | ','), digitGroupingSeparator ('' | ' ' | ',' | '.' | '′'), digitGroupingSize ('3' | '2-3' | '4' | 'off')
  - Date/time: dateFormat with MMM (month name) and DDD (day of week) support, timeFormat ('h12' | 'h23'), dateTimeFormat ('{date} {time}' | '{time} {date}')
  - Units: imperialUnits ('us' | 'uk'), unitDisplayStyle ('symbol' | 'name')
  - All defaults match SPECS.md specifications
- **Number Formatting**: Support for custom precision, dot/comma decimal separators, 5 grouping separators (none/space/comma/dot/prime), 4 grouping sizes (3/2-3/4/off), auto-precision for scientific notation
- **Unit Formatting**: Display names from database (symbol or full name), proper handling of simple units
- **Derived Unit Formatting**: Unicode superscripts for exponents (m², m³, s⁻¹), proper "/" notation (km/h, m/s²), parentheses for multiple denominator terms
- **Composite Unit Formatting**: Multiple value-unit pairs (5 ft 7.32 in, 2 h 30 min)
- **Date/Time Formatting**:
  - Customizable date format with YYYY, MM, DD, MMM (month name), DDD (day of week) tokens
  - Examples: 'YYYY-MM-DD DDD' → '2024-01-31 Wed', 'DDD DD MMM YYYY' → 'Wed 31 Jan 2024'
  - 12h/24h time format, AM/PM handling
  - Date/time order configurable: '{date} {time}' or '{time} {date}'
  - ISO 8601 for instants, duration with all components
- **Presentation Formats**: Binary (0b...), octal (0o...), hex (0x...), fraction (with mixed numbers), scientific notation, ordinal (1st, 2nd, 3rd, etc.) using Intl.PluralRules
- **Boolean/Error Formatting**: Simple "true"/"false" and "Error: message" formatting
- **Test Coverage**: 59 comprehensive tests covering all settings variations

**Note**: Requires Phase 5.5 completion - formatter must handle DerivedUnit values ✅

### Phase 6.5: Temporal API Integration
**Status**: ✅ **COMPLETED**

- [x] Add `@js-temporal/polyfill` dependency
- [x] Implement timezone offset-aware conversions in `date-time.ts`
- [x] Implement timezone conversion targets in parser
- [x] Review date/time/datetime/duration related logic across parser/lexer/type-checker/date-time/evaluator/formatter (and other relevant modules) and seek improvements based on Temporal API support newly introduced.
- [x] Update tests for timezone-aware behavior

**Implementation Details**:
- **Temporal Polyfill**: Added `@js-temporal/polyfill` v0.4.4 as dependency
- **Timezone-Aware Conversions**:
  - `toInstant()` now properly accounts for timezone offsets and DST transitions using Temporal API
  - `toZonedDateTime()` now correctly converts Instant to local time in any IANA timezone
  - Plain values (PlainTime, PlainDateTime) are interpreted as being in system's local timezone
  - PlainTime conversion uses today's date in system local timezone
- **Parser Integration**:
  - Implemented timezone conversion targets (e.g., `to EST`, `to America/New_York`)
  - Uses DataLoader's timezone resolution for territory-based disambiguation
- **Evaluator Integration**:
  - `convertToTimezone()` method handles PlainTime, PlainDateTime, Instant, and ZonedDateTime conversions
  - Properly handles system timezone detection and conversion flows
- **Test Coverage**: 8 comprehensive tests covering timezone conversions, DST transitions, and multi-timezone scenarios (44 total tests passing in date-time.test.ts)

**Previous limitation resolved**: Timezones are now fully functional with proper offset calculations and DST support via Temporal API.

### Phase 7: Integration & Main Orchestrator (Day 17)
- [x] Create `calculator.ts` with Calculator class (completed in Phase 2.7)
- [x] Implement error handling across pipeline (completed in Phase 2.7 - error recording architecture)
- [x] Implement multi-line input processing (completed in Phase 2.7 - parser handles documents)
- [x] Write integration tests for error recording (completed in Phase 2.7 - 14 tests)
- [x] Implement `Calculator.parse()` method for syntax checking (completed in Phase 2.7)
- [x] Integrate Evaluator into `Calculator.calculate()` method
  - Wire up evaluator.evaluateDocument() in calculate()
  - Extract line results from evaluator's Map return value
  - Catch and record runtime errors in RuntimeError array
  - Mark lines with errors in LineResult.hasError
- [x] Integrate Formatter into `Calculator.calculate()` method (requires Phase 6 completion)
  - Format evaluation results as strings for LineResult.result
  - Apply user settings for number/unit/date formatting
- [x] Add integration tests for full calculation pipeline
  - Test end-to-end calculation with mixed valid/invalid lines
  - Test runtime error collection
  - Test formatted output

**Status**: ✅ **COMPLETED**

**Implementation Details**:
- **Evaluator Integration** (calculator.ts:68-104):
  - Evaluator and Formatter created in constructor with Settings mapping
  - evaluateDocument() called with try-catch for unexpected errors
  - Line-by-line error detection for lexer/parser errors
  - ErrorValue results converted to RuntimeError instances
  - Formatting errors caught and recorded as RuntimeError
- **Formatter Integration** (calculator.ts:106-159):
  - Results formatted using Formatter.format() with user settings
  - Proper error handling for formatting failures
  - Line result tracking with hasError flag
- **Integration Tests** (calculator.test.ts:203-416):
  - 13 comprehensive integration tests covering full pipeline
  - Basic arithmetic, units, variables, mixed valid/invalid lines
  - Runtime error handling and recovery
  - Non-expression lines (headings, plain text)
  - Custom settings (precision, unit display style)
  - Complex calculations (derived units, composite units, date arithmetic)
- **Auto-Precision Enhancement**:
  - Implemented toPrecision(10) for consistent significant figures
  - Wider exponential ranges (>= 1e10, < 1e-6)
  - Trailing zero stripping using parseFloat approach
  - Cleaner output: "5" instead of "5.0000", "123.456789" instead of "123.46"
- **Test Coverage**: All 673 tests passing

### Phase 8: Testing & Validation (Days 18-20)
- [x] Create test directory structure
- [x] Ensure test exists for `tests/lexer.test.ts` (92 tests)
- [x] Ensure test exists for `tests/parser.test.ts` (105 tests)
- [x] Ensure test exists for `tests/type-checker.test.ts` (78 tests)
- [x] Ensure test exists for `tests/evaluator.test.ts` (95 tests)
- [x] Ensure test exists for `tests/unit-converter.test.ts` (19 tests)
- [x] Ensure test exists for `tests/date-time.test.ts` (50 tests)
- [x] Ensure test exists for `tests/calculator.test.ts` (27 integration tests covering error recording and full calculation pipeline)
- [x] Ensure test exists for `tests/formatter.test.ts` (59 tests)
- [x] Ensure test exists for `tests/constants.test.ts` (28 tests)
- [x] Ensure test exists for `tests/currency.test.ts` (30 tests)
- [x] Ensure test exists for `tests/data-loader.test.ts` (40 tests)
- [x] Ensure test exists for `tests/functions.test.ts` (50 tests)
- [ ] Verify all 200+ examples from SPECS.md
- [ ] End-to-end verification testing

**Status**: ✅ **MOSTLY COMPLETED**

**Test Coverage Summary**:
- **Total Tests**: 673 tests passing
- **Lexer**: 92 tests (all token types, disambiguation rules, error recording)
- **Parser**: 105 tests (AST generation, operator precedence, composite units, error recovery)
- **Type Checker**: 78 tests (dimension compatibility, conversion validation, variable scoping)
- **Evaluator**: 95 tests (binary operations, conversions, functions, date arithmetic)
- **Unit Converter**: 19 tests (linear, affine, variant, composite conversions)
- **Date/Time**: 50 tests (date arithmetic, timezone conversions, duration handling)
- **Calculator**: 27 tests (full pipeline integration, error recording, formatting)
- **Formatter**: 59 tests (number/unit/date formatting, all settings variations)
- **Constants**: 28 tests (mathematical constants)
- **Currency**: 30 tests (exchange rates, conversions)
- **Data Loader**: 40 tests (unit lookup, timezone resolution, trie operations)
- **Functions**: 50 tests (all math functions)

**Disambiguation Rules Coverage** (tested across lexer/parser tests):
- ✅ Scientific notation priority (lexer.test.ts)
- ✅ Longest unit match (lexer.test.ts, data-loader.test.ts)
- ✅ Case-sensitive unit matching (lexer.test.ts, data-loader.test.ts)
- ✅ Multi-word units (lexer.test.ts)
- ✅ Composite vs derived units (parser.test.ts)
- ✅ "per" operator context (parser.test.ts)
- ✅ Left-associative conversions (parser.test.ts, evaluator.test.ts)
- ✅ AM/PM time vs units (lexer.test.ts)
- ✅ Timezone territory resolution (data-loader.test.ts, date-time.test.ts)

**Remaining Tasks**:
- Verification of all SPECS.md examples
- Additional end-to-end tests

### Phase 9: Enhancements
**Status**: Optional quality-of-life improvements

#### Type System Enhancements
- [ ] Unit-aware function type checking (e.g., `sqrt(4 m²)` → `2 m` type)
- [ ] Function signature database with input/output dimension rules
- [ ] Better error messages for dimension mismatches in function calls

**Current limitation**: All math functions return `dimensionless` type. Evaluation handles units correctly, but type checker doesn't validate function dimensions.

**Reason for deferral**: Non-critical enhancement. Core evaluation works. Type checking is already functional, this just improves error messages.

#### Formatter Enhancements
- [ ] Implement proper unit name pluralization based on numeric value
  - Use `unit.displayName.plural` when value is not 1 or -1
  - Fall back to `unit.displayName.singular` if plural not available
  - Examples: "1 meter" vs "2 meters", "1 foot" vs "5 feet"
  - Consider edge cases: derived units (m/s), composite units, fractional values

**Current limitation**: When `unitDisplayStyle` is set to `'name'`, formatter always uses singular form (e.g., "2 meter" instead of "2 meters"). See formatter.ts:278.

**Reason for deferral**: Non-critical enhancement. Most use cases use symbols (m, ft, kg) where pluralization doesn't apply. Singular form is still understandable even if grammatically imperfect. Implementation requires passing numeric value through call chain and handling edge cases.

---

## Overview

Build a complete parser for the Notepad Calculator Language as specified in GRAMMAR.md. The parser will use hand-written recursive descent with operator precedence climbing, implementing a context-sensitive grammar that supports:
- Unit-aware arithmetic with automatic conversions
- Date/time expressions and arithmetic
- Currency conversions
- Boolean and bitwise operations
- Variables and functions
- Conditional expressions

**Current state**: Data files (units.json, currencies.json, timezones.json) are complete. No parser code exists yet.

**Target**: Complete lexer → parser → type checker → evaluator → formatter pipeline.

---

## File Structure

All files will be created at `./src`:

### Core Parser Components
- **`tokens.ts`** - Token type definitions and utilities
- **`lexer.ts`** - Context-sensitive tokenizer with longest-match unit lookup
- **`ast.ts`** - AST node type definitions
- **`parser.ts`** - Recursive descent parser with operator precedence climbing
- **`type-checker.ts`** - Semantic validation and type system
- **`evaluator.ts`** - Expression evaluation engine

### Supporting Components
- **`data-loader.ts`** - Load and index JSON data files (units, currencies, timezones)
- **`unit-converter.ts`** - Unit conversion logic (linear, affine, variant)
- **`date-time.ts`** - Date/time arithmetic following Temporal spec
- **`currency.ts`** - Currency conversion with exchange rates
- **`functions.ts`** - Math function implementations (sin, cos, sqrt, etc.)
- **`constants.ts`** - Mathematical constants (pi, e, golden ratio, etc.)
- **`formatter.ts`** - Result formatting with settings support
- **`error-handling.ts`** - Error types and reporting
- **`calculator.ts`** - Main orchestrator that ties all components together

### Testing
- **`tests/`** directory with unit and integration tests

---

## Implementation Phases

### Phase 1: Data Loading Foundation (Days 1-2)

**Files to create**: `data-loader.ts`, `constants.ts`

**Tasks**:
1. Create `DataLoader` class that loads units.json, currencies.json, timezones.json
2. Build fast lookup structures:
   - **Unit lookup maps** (case-sensitive and case-insensitive):
     - Primary: `Map<string, Unit>` for exact case-sensitive matches
     - Fallback: `Map<string, Unit[]>` for case-insensitive matches (may have multiple)
   - `Map<string, Currency>` for currency code/name → currency object
   - **Timezone lookup with territory support**:
     - `Map<string, TimezoneMatch[]>` where each match includes IANA timezone and territory
     - Resolver function that takes browser/system locale to disambiguate
     - Territory priority: user country code > "001" (universal) > undefined
     - Tie-breaking: use first match at same priority level
   - `Map<string, Dimension>` for dimension ID → dimension object
3. Implement **unit trie with case-sensitive matching**:
   - After consuming a number token, find longest matching unit name
   - **Matching algorithm**:
     1. Try case-sensitive match first (highest priority)
     2. If no match, try case-insensitive match
     3. If multiple case-insensitive matches, pick the one with most matching case characters
     4. If tie on matching case count, use first match in database
     5. Example: "mL" → milliliter (exact case), "ML" → megaliter (exact case), "ml" → count chars, tie → first in database
   - Example: "5km" should match "km" (kilometer), not "k" + "m"
4. Create constant definitions (pi, e, golden_ratio, NaN, Infinity)

**Key algorithms**:
- Trie-based longest match: O(n) lookup where n = length of potential unit name
- Case-sensitive matching with case-insensitive fallback and tie-breaking
- Timezone resolution based on user locale/territory
- Pre-compute all unit name variations during load

**Critical path**: Everything else depends on this being complete first.

---

### Phase 2: Lexical Analysis (Days 3-4)

**Files to create**: `tokens.ts`, `lexer.ts`

**Tasks**:
1. Define token types: NUMBER, UNIT, IDENTIFIER, KEYWORD, OPERATOR, BOOLEAN, DATETIME, COMMENT, NEWLINE, EOF, LPAREN, RPAREN, COMMA
2. Implement `Lexer` class with context-aware tokenization:
   - Number literals (integer, decimal, scientific, binary/octal/hex)
   - **Scientific notation priority**: `2e3` → NUMBER(2000), not `2 * e * 3`
   - **Longest unit match**: After NUMBER, use trie to find longest unit
   - Multi-word units ("cubic meter", "US dollars", "New York")
   - Date/time patterns (various formats from GRAMMAR.md)
   - Keywords vs identifiers
   - Operators and punctuation
   - Comments (# to end of line)
3. Track source locations (line, column) for error reporting
4. Handle whitespace significance for composite units

**Disambiguation rules to implement**:
- Scientific notation takes precedence (GRAMMAR.md:689-699)
- Longest unit match (GRAMMAR.md:656-683)
- Multi-word unit detection (GRAMMAR.md:845-852)

**Testing**: Verify all token types from GRAMMAR.md examples

---

### Phase 3: Syntactic Analysis (Days 5-7)

**Files to create**: `ast.ts`, `parser.ts`

**Tasks**:
1. Define AST node types in `ast.ts`:
   - Document structure: Document, Line types (Heading, Expression, VariableDefinition, PlainText, Empty)
   - Expressions: Conditional, Conversion, Binary, Unary, Postfix, FunctionCall, Literal, Identifier, Grouped
   - Literals: Number, NumberWithUnit, CompositeUnit, DateTime variants, Boolean, Constant
   - Units: SimpleUnit, DerivedUnit, UnitTerm
   - Conversion targets: Unit, CompositeUnit, Presentation, Property, Timezone

2. Implement `Parser` class using recursive descent:
   - Top-level: `parseDocument()` → `parseLine()` for each line
   - Expression parsing following operator precedence (GRAMMAR.md:523-549):
     - Level 15: Assignment (=)
     - Level 14: Conditional (if-then-else)
     - Level 13: Conversion (to, in, as, →)
     - Level 12: Logical OR (||)
     - Level 11: Logical AND (&&)
     - Level 10: Bitwise OR (|)
     - Level 9: Bitwise XOR (xor)
     - Level 8: Bitwise AND (&)
     - Level 7: Comparison (<, <=, >, >=, ==, !=)
     - Level 6: Bit shift (<<, >>)
     - Level 5: Addition/Subtraction (+, -)
     - Level 4: Multiplication/Division (*, /, %, mod, per)
     - Level 3: Unary (-, !, ~)
     - Level 2: Power (^) - right-associative
     - Level 1: Postfix (factorial !)
   - Primary expressions: literals, identifiers, function calls, grouped expressions

3. Special parsing cases:
   - **Composite units**: Detect `NUMBER UNIT [NUMBER UNIT]+` pattern
   - **"per" disambiguation**: Single unit → derived unit; expression → division operator
   - **City/timezone lookup with territory**: After TIME_VALUE + IDENTIFIER, lookup in timezone database
     - Use browser/system locale to resolve territory field
     - Example: "EST" → "America/New_York" (territory: US) vs "Australia/Sydney" (territory: AU)
     - Disambiguate based on user's locale/region
   - **Conversion chaining**: Left-associative `5 km to m in cm` = `((5 km) to m) in cm`

4. Error recovery: On parse error, consume tokens until newline and return PlainText

**Testing**: Parse all examples from GRAMMAR.md, verify AST structure

---

### Phase 4: Semantic Analysis (Days 8-9)

**Files to create**: `type-checker.ts`, `error-handling.ts`

**Tasks**:
1. Define value type system:
   - Physical types: Dimensionless, Physical (with dimension), Derived
   - CompositeUnit type
   - DateTime types: PlainDate, PlainTime, PlainDateTime, Instant, ZonedDateTime
   - **Duration type** (semantic, not syntactic):
     - Single `Duration` type with optional components:
       - Date components: year, month, week, day
       - Time components: hour, minute, second, millisecond
     - A duration is "date duration" if it only has date components
     - A duration is "time duration" if it only has time components
     - A duration is "date-time duration" if it has both
   - Boolean type
   - Error type

2. Implement `TypeChecker` class:
   - Walk AST and compute type for each expression
   - Validate binary operations:
     - Addition/subtraction: require same dimension
     - Multiplication/division: derive new dimension (exponent arithmetic)
     - Comparisons: require same dimension, return Boolean
   - Validate conversions:
     - Unit conversions: require same dimension
     - Presentation conversions: always valid
     - Property extractions: require date/time types
   - Validate composite units: all components must have same dimension
   - Variable scoping: track symbol table, check variable definitions

3. Implement dimension compatibility checking:
   - Same dimension check for +, -, comparisons
   - Dimension derivation for *, / (multiply/divide exponents)
   - Special handling for dimensionless values

4. Create error types: LexerError, ParserError, TypeError, RuntimeError

**Testing**: Validate type checking for all operations, verify error messages

---

### Phase 5: Evaluation Engine (Days 10-14)

**Files to create**: `evaluator.ts`, `unit-converter.ts`, `date-time.ts`, `currency.ts`, `functions.ts`

**Tasks**:

#### `unit-converter.ts`:
1. Implement conversion to/from base units:
   - Linear: `baseValue = value * factor`
   - Affine: `baseValue = (value + offset) * factor` (for temperature)
   - Variant: Handle US vs UK variants (gallons, etc.)
2. Convert between units: `value → base → target`
3. Composite unit conversion (GRAMMAR.md:961-992):
   - Convert all components to base unit (sum)
   - Distribute to target units (largest to smallest)
   - Integer parts for all except last unit

#### `date-time.ts`:
1. Implement date/time arithmetic following Temporal spec:
   - PlainDate + Duration → PlainDate/PlainDateTime
   - PlainDate - PlainDate → Duration (with date components)
   - Month addition with day clamping (GRAMMAR.md:1012-1033)
   - Handle fractional vs integer durations differently
2. Implement `{overflow: 'constrain'}` behavior:
   - Jan 31 + 1 month → Feb 28/29 (clamp to last day)
3. **Timezone conversions with territory resolution**:
   - Use user's locale/region to disambiguate timezone names
   - Handle territory field from timezones.json
4. Property extraction (year, month, day, hour, etc.)
5. **Duration representation**:
   - Duration type with optional date/time components
   - Combine durations intelligently (date + time = date-time)

#### `currency.ts`:
1. Load exchange rates (stub for now, real API later)
2. Convert between unambiguous currencies only
3. Error on ambiguous currency conversions
4. Round to appropriate minor units (decimals)

#### `functions.ts`:
1. Implement all functions from GRAMMAR.md:
   - Trig: sin, cos, tan, asin, acos, atan, sinh, cosh, tanh
   - Log/exp: sqrt, cbrt, log, ln, exp, log10
   - Number: abs, round, floor, ceil, trunc, frac
   - Random: random(0-4 args)
   - Combinatorics: perm, comb

#### `evaluator.ts`:
1. Create `Value` type representing evaluated results:
   - Number with optional unit
   - CompositeUnit
   - DateTime variants
   - Boolean
   - Error
2. Implement `Evaluator` class:
   - Walk AST and evaluate each expression
   - Binary operations: add, subtract, multiply, divide (with unit handling)
   - Conversions: delegate to unit-converter, date-time, currency
   - Variable assignments and lookups
   - Function calls
   - Conditionals (if-then-else)
3. Handle unit arithmetic:
   - Same dimension: convert to common unit, operate, keep unit
   - Different dimensions: multiplication/division creates derived units
4. Error handling: propagate errors through evaluation

**Testing**: Verify all examples from GRAMMAR.md produce correct results

---

### Phase 6: Result Formatting (Days 15-16)

**Files to create**: `formatter.ts`, `settings.ts`

**Tasks**:
1. Define `Settings` interface:
   - precision: number
   - angleUnit: 'degree' | 'radian'
   - decimalSeparator: '.' | ','
   - digitGrouping: 'none' | 'thousands' | 'indian'
   - dateFormat: string
   - timeFormat: '12h' | '24h'
   - imperialUnits: boolean

2. Implement `Formatter` class:
   - Format numbers: apply precision, decimal separator, digit grouping
   - Format units: use display names (symbols or full names)
   - Format dates: apply date/time format settings
   - Format composite units: "5 ft 7.32 in"
   - Format presentation targets: binary (0b...), hex (0x...), fraction, etc.

3. Handle special cases:
   - Currency formatting with minor units
   - Angle formatting (degrees vs radians based on settings)
   - Scientific notation when needed

**Testing**: Verify formatting matches examples from SPECS.md

---

### Phase 7: Integration & Main Orchestrator (Day 17)

**Files to create**: `calculator.ts`

**Tasks**:
1. Create `Calculator` class that orchestrates all components:
   - Initialize DataLoader and load JSON files
   - Create Lexer, Parser, TypeChecker, Evaluator, Formatter instances
   - Expose main API: `calculate(input: string): CalculationResult[]`

2. Implement full pipeline:
   ```typescript
   calculate(input: string) {
     1. tokens = lexer.tokenize(input)
     2. ast = parser.parseDocument(tokens)
     3. typedAst = typeChecker.checkDocument(ast)
     4. values = evaluator.evaluate(typedAst)
     5. formatted = formatter.format(values)
     return formatted
   }
   ```

3. Handle errors gracefully:
   - Continue processing on errors (don't stop at first error)
   - Return both successful results and errors
   - Provide helpful error messages with line/column info

4. Optimize for multi-line input:
   - Process line by line
   - Maintain variable scope across lines
   - Return array of results (one per line)

**Testing**: Run full integration tests from SPECS.md

---

### Phase 8: Testing & Validation (Days 18-20)

**Create test files**:
- `tests/lexer.test.ts` - Tokenization edge cases
- `tests/parser.test.ts` - AST generation for all expression types
- `tests/type-checker.test.ts` - Type validation and errors
- `tests/evaluator.test.ts` - Evaluation correctness
- `tests/unit-converter.test.ts` - Unit conversions (linear, affine, variant, composite)
- `tests/date-time.test.ts` - Date arithmetic with clamping
- `tests/integration.test.ts` - All examples from GRAMMAR.md and SPECS.md (~200 examples)
- `tests/disambiguation.test.ts` - All disambiguation rules from GRAMMAR.md

**Testing approach**:
1. Unit tests for each component in isolation
2. Integration tests for full pipeline
3. Edge case tests for disambiguation rules
4. Error handling tests

**Test framework**: Use Node.js built-in test runner or Jest

---

## Critical Files & Dependencies

### Dependency Order:
```
1. types.ts (exists) + data-loader.ts + constants.ts
   ↓
2. tokens.ts + lexer.ts
   ↓
3. ast.ts + parser.ts
   ↓
4. type-checker.ts + error-handling.ts
   ↓
5. unit-converter.ts + date-time.ts + currency.ts + functions.ts
   ↓
6. evaluator.ts
   ↓
7. formatter.ts + settings.ts
   ↓
8. calculator.ts
```

### Most Critical Files (implement in this order):
1. **`data-loader.ts`** - Foundation for all lookups; builds unit trie
2. **`lexer.ts`** - Context-sensitive tokenization with all disambiguation rules
3. **`parser.ts`** - Recursive descent with operator precedence; entire syntactic grammar
4. **`type-checker.ts`** - Dimension compatibility, conversion validation, variable scoping
5. **`evaluator.ts`** - Core evaluation; orchestrates unit/date/currency operations

---

## Key Algorithms & Disambiguation Rules

### 1. Unit Lookup with Case Sensitivity
After tokenizing NUMBER, find matching unit with case-sensitive priority:
1. **Case-sensitive match** (highest priority): "mL" → milliliter, "ML" → megaliter
2. **Case-insensitive match** (fallback): "ml" or "Ml" → check both milliliter and megaliter
3. **Tie-breaking** for multiple case-insensitive matches:
   - Count matching case characters for each candidate
   - "ml" vs milliliter: 1 matching char ('m'); vs megaliter: 1 matching char ('M')
   - If counts are equal, **use first match in database** (deterministic, simple)
4. **Longest match**: "5km" → "km" (kilometer), not "k" + "m"
5. **Multi-word units**: "5mL" → "mL" (milliliter), not "m" + "L"

### 2. Scientific Notation Priority (GRAMMAR.md:689-699)
Lexer pattern: `[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?`
- "2e3" → NUMBER(2000), not "2 * e * 3"
- "e^2" → constant e to power 2

### 3. Composite vs Derived Units (GRAMMAR.md:722-731)
- "5 m 20 cm" → CompositeUnit (value-unit pairs)
- "m/s" → DerivedUnit (unit expression only)

### 4. "per" Operator Context (GRAMMAR.md:750-773)
- Next token is single unit → derived unit formation ("km per h" → "km/h")
- Next token is expression → division operator ("60 km per 2 h" → "30 km/h")

### 5. Left-Associative Conversions (GRAMMAR.md:634-645)
"5 km to m in cm" = "((5 km) to m) in cm" = 500000 cm

### 6. Month Addition Clamping (GRAMMAR.md:1012-1033)
- Jan 31 + 1 month → Feb 28/29 (clamp to last day)
- Follows Temporal spec with `{overflow: 'constrain'}`

### 7. Timezone Territory Resolution
When parsing timezone names (after TIME_VALUE):
1. Lookup timezone name in database → may return multiple IANA timezones with different territories
2. Extract user's country code from browser/system locale (e.g., "en-US" → "US")
3. **Priority-based matching** (territory values can be: two-letter country code, "001", or undefined):
   - **Priority 1**: Match entries where territory equals user's country code
   - **Priority 2**: Match entries where territory is "001" (universal/world)
   - **Priority 3**: Match entries where territory is undefined
   - **Tie-breaking**: If multiple matches at same priority level, use first match
4. Example: "EST" with locale "en-US":
   - Finds: [America/New_York (territory: US), Australia/Sydney (territory: AU)]
   - Returns: "America/New_York" (matches US)
5. Example: "UTC" with any locale:
   - Finds: [UTC (territory: "001")]
   - Returns: "UTC" (universal)

### 8. Duration Type (Semantic, Not Syntactic)

**IMPORTANT**: Durations are NOT a separate syntactic construct. They are a semantic interpretation:
- **Parsing**: "3 days" → `NumberWithUnit` (time dimension), "5 ft 3 in" → `CompositeUnitLiteral` (length dimension)
- **Semantic**: Time-dimensioned values can be implicitly converted to/from `DurationLiteral` as needed
- **Evaluation**: Conversion happens during evaluation when needed for date/time arithmetic

Duration components (when materialized):
- **Date components**: year, month, week, day (any combination)
- **Time components**: hour, minute, second, millisecond (any combination)
- **Classification**:
  - Has only date components → "date duration"
  - Has only time components → "time duration"
  - Has both → "date-time duration"

**Conversion rules**:
- `DurationLiteral` (1 component) ↔ `NumberWithUnit` (time dimension)
- `DurationLiteral` (multiple components) ↔ `CompositeUnitLiteral` (time dimension)
- `NumberWithUnit`/`CompositeUnitLiteral` → `DurationComponents`:
  - Try field-by-field conversion to Temporal.Duration
  - If fails (doesn't satisfy Temporal.Duration), reduce to integer nanoseconds (no fraction), then convert
- **Arithmetic**: Durations can be combined; date + time = date-time duration

### 9. AM/PM Time Indicator vs. Unit Disambiguation
**Problem**: am/pm/AM/PM conflict with attometers (am), picometers (pm), and petameters (PM)

**Rule**: After NUMBER token, check if next token is am/pm/AM/PM:
1. If number is integer in range 1-12 → treat as time indicator (DATETIME)
2. If number has decimal part OR is outside 1-12 → treat as unit (UNIT)

**Examples**:
- `10 am` → DATETIME (time: 10:00:00)
- `10.0 am` → 10.0 UNIT(attometers)
- `13 am` → 13 UNIT(attometers)
- `10 pm` → DATETIME (time: 22:00:00)
- `22 pm` → 22 UNIT(picometers)
- `10 PM` → DATETIME (time: 22:00:00)
- `33 PM` → 33 UNIT(petameters)

---

## Architectural Decisions

### Multi-Pass Architecture
- **Pass 1**: Lexing (tokens)
- **Pass 2**: Parsing (AST)
- **Pass 3**: Type checking (typed AST)
- **Pass 4**: Evaluation (values)
- **Pass 5**: Formatting (strings)

**Rationale**: Clear separation, better errors, easier debugging

### Immutable AST
AST nodes are immutable for easier reasoning and testing

### Error Recovery
Parser continues on errors, falls back to PlainText for unparseable lines

### Precision
Use JavaScript `number` (IEEE 754 double) initially; can upgrade to decimal.js later if needed

---

## Verification & Testing

### Manual Testing
Run examples from GRAMMAR.md:
```
2 + 2                           → 4
5 m + 20 cm                     → 5.2 m
5 km to m                       → 5000 m
171 cm to ft in                 → 5 ft 7.32 in
(5 ft 3 in) * 2                 → 10 ft 6 in
1970 Jan 31 + 1 month           → 1970-02-28
100 USD to EUR                  → 85.8 EUR (with exchange rate)
```

### Automated Testing
1. Run lexer tests: verify all token types
2. Run parser tests: verify AST structure for all expression types
3. Run type checker tests: verify dimension compatibility
4. Run evaluator tests: verify all examples from GRAMMAR.md (~92 examples)
5. Run integration tests: verify examples from SPECS.md (~200 examples)
6. Run disambiguation tests: verify all 9 disambiguation rules

### End-to-End Verification

Use unit test to verify full calculation pipeline.

---

## Future Enhancements (Post-MVP)

1. **Incremental parsing** - Only re-parse changed lines
2. **Auto-completion** - Use unit trie for suggestions
3. **Syntax highlighting** - Use token stream
4. **Exchange rate API** - Live currency conversions
5. **Arbitrary precision** - Upgrade to decimal.js
6. **Performance optimization** - Token pooling, AST caching

---

## Implementation Timeline

- **Week 1** (Days 1-5): Foundation + Lexer + Parser
- **Week 2** (Days 6-10): Type Checker + Evaluator core
- **Week 3** (Days 11-15): Evaluation engines (units, dates, currencies) + Formatter
- **Week 4** (Days 16-20): Integration + Testing + Documentation

**Total estimated effort**: 20 days for complete implementation

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

**Implementation summary**:
- Extended `scanNumber()` to detect `:` after number and continue scanning for time pattern
- Time literals (H:MM, H:MM:SS) now tokenized as single DATETIME tokens
- Updated `disambiguateAmPm()` to recognize AM/PM after time literals
- Parser's `tryParseTime()` validates hour/minute/second ranges and converts 12-hour to 24-hour format
- Added 32 comprehensive tests (lexer + parser) covering all time formats and edge cases
- All 454 tests passing

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

**Implementation summary**:
- Lexer now preserves Unicode superscripts in token values (e.g., `m²`, `s⁻¹`, `m²s³`)
- Tokens with superscripts recognized as UNIT if base matches unit database
- Parser's existing `extractSuperscript()` infrastructure now fully functional
- Unknown characters throw LexerError instead of being silently skipped
- Both ASCII (`m^2`) and Unicode (`m²`) notations fully supported
- Added 12 new tests (92 lexer tests, 99 parser tests)
- All 552 tests passing

**Why now**:
- User explicitly requested Unicode superscript support
- Parser infrastructure was already in place, only lexer needed updates
- Small, focused fix in correct architectural layer
- Fresh context from Phase 3 derived unit work

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

**Implementation summary**:
- **Lexer** now returns `TokenizeResult` containing both tokens and errors array
- When lexer encounters unknown character, it records error and skips to next line
- **Parser** now returns `DocumentResult` containing both AST and errors array
- Parser records errors per line and creates PlainText fallback for invalid syntax
- **Calculator** orchestrates lexer, parser, and evaluator with full error collection
- Errors are available for UI display but don't stop document processing
- All 566 tests passing

**Architecture changes**:
```typescript
// Before: Lexer threw errors
tokenize(): Token[]

// After: Lexer records errors
tokenize(): TokenizeResult {
  tokens: Token[];
  errors: LexerError[];
}

// Before: Parser threw errors or created AST
parseDocument(): Document

// After: Parser records errors and creates AST
parseDocument(): DocumentResult {
  ast: Document;
  errors: LineError[];
}
```

**Benefits**:
- Resilient: Entire document processed despite errors
- Non-intrusive: Errors don't interrupt user workflow
- Informative: Errors available when user needs them
- Flexible UI: UI can decide how/when to present errors
- Batch processing: All valid calculations execute
- Better UX: User sees results immediately, can investigate errors later

**Why now**:
- User requested error recording for notepad calculator use case
- Allows mixed content (calculations and plain text notes) to coexist
- Provides better user experience than stopping at first error
- Enables UI to show errors on demand (hover, debug mode, etc.)
- Foundational for production calculator application

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
  - Recognize unit expressions like "m/s", "kg m/s²" in conversion targets
  - Create DerivedUnit AST nodes instead of requiring runtime creation
  - Update resolveUnit() in evaluator to handle DerivedUnit AST nodes
  - Prerequisite for derived unit conversions
  - **Note**: Both ASCII notation (m^2) and Unicode superscripts (m²) are fully supported (Unicode added in Phase 2.6)

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
- [x] Write unit tests for all evaluation components (71/71 tests passing - 100%)
- [x] Fix single-letter variable name issue (parser now accepts UNIT tokens as identifiers in assignment context)
- [ ] Implement derived unit conversions (deferred from Phase 5.5)
  - Requires Phase 3 task (parser DerivedUnit AST nodes) as prerequisite
  - Calculate conversion factors between derived dimensions
  - Example: `100 km/h to m/s` → convert km→m (×1000), h→s (÷3600) → `27.78 m/s`
  - Update unit-converter.ts to handle DerivedUnitValue conversions
  - Add tests for derived unit conversions
- [ ] Implement exponentiation of units and derived units (deferred from Phase 5.5)
  - Update power operator (^) in evaluator to handle units
  - Multiply term exponents: `(5 m)^2` → `25 m²` (exponent 1 → 2)
  - Handle derived units: `(3 m/s)^2` → `9 m²/s²` (m: 1→2, s: -1→-2)
  - Support fractional powers: `(4 m²)^0.5` → `2 m`
  - Add tests for unit exponentiation

**Known Issues**:
- Derived unit arithmetic simplified
  - Multiplying/dividing different units keeps left unit instead of creating derived units
  - Example: `5 m * 3 s` returns `15 m` instead of expected `15 m s`
  - Full derived unit support moved to Phase 5.5

**Note**: Timezone offset conversions (not just name resolution) deferred to Phase 6.5 - requires Temporal polyfill

### Phase 5.5: Derived Unit Support
**Status**: ✅ **COMPLETED**

Derived units are essential for common calculations like speed (km/h), acceleration (m/s²), force (N = kg⋅m/s²), energy (J = kg⋅m²/s²), density (kg/m³), etc. The parser and type checker already support derived units; this phase completes the implementation in the evaluator.

**Why now instead of later**:
- Formatter (Phase 6) not yet implemented - can design it correctly from the start
- No code depends on simplified behavior yet - no refactoring needed
- Fresh context - full understanding of evaluator, type system, AST
- Lower engineering risk than retrofitting later

**Tasks**:
- [x] Refactored architecture to use signed exponents instead of numerator/denominator
  - Updated types/types.ts, src/ast.ts, src/type-checker.ts, src/evaluator.ts
  - Regenerated units.json with new dimension structure
  - All 526 tests passing after refactor
- [x] Update evaluator binary multiplication to create derived units
  - Handles all 9 combinations: number/unit/derived × number/unit/derived
  - Example: `5 m * 3 s` → `15 m s` (DerivedUnitValue with terms: [{unit: m, exponent: 1}, {unit: s, exponent: 1}])
  - Dimensionless × unit → keep unit (not derived)
  - Unit × same unit → exponentiate (e.g., `m * m` → `m²`)
  - Removed TODO comments
- [x] Update evaluator binary division to create derived units
  - Handles all 9 combinations: number/unit/derived / number/unit/derived
  - Example: `100 km / 2 h` → `50 km/h` (DerivedUnitValue with terms: [{unit: km, exponent: 1}, {unit: h, exponent: -1}])
  - Dimensionless / unit → reciprocal unit (e.g., `1 / s` → `s⁻¹`)
  - Unit / same unit → dimensionless (e.g., `m / m` → 1)
  - Removed TODO comments
- [x] Implement comprehensive term combination logic
  - extractTerms(), combineTerms(), createValueFromTerms()
  - Handles chained operations: `10 kg * 5 m / 2 s` creates combined derived unit
  - Simplifies terms with same unit (combines exponents)
- [x] Document resolveUnit limitation
  - Parser doesn't create DerivedUnit AST nodes yet (only created during evaluation)
  - Updated comment explaining deferral reason
- [x] Add comprehensive tests for derived unit creation (8 new tests, 534 total passing)
  - Multiplication creating derived units (different units, same units)
  - Division creating derived units (different units, same units, reciprocals)
  - Simplification (m²,  m / m → dimensionless)
  - Mixed operations (kg * m / s)
  - Dimensionless multiplier/divisor handling

**Deferred** (moved to appropriate phases):
- Derived unit conversions → Added to Phase 5 (requires Phase 3 prerequisite)
- Exponentiation of units/derived units → Added to Phase 5 (independent task)
- Parser creation of DerivedUnit AST nodes → Added to Phase 3 (prerequisite for conversions)

**Dependencies**:
- Parser with DerivedUnit AST nodes (✅ complete in Phase 3)
- Type checker with dimension derivation (✅ complete in Phase 4)
- Unit converter (✅ complete in Phase 5)

**Blocks**:
- Phase 6 (Formatter) - should be designed with derived unit support

### Phase 6: Result Formatting (Days 15-16)
- [ ] Create `settings.ts` with Settings interface
- [ ] Create `formatter.ts` with Formatter class
- [ ] Implement number formatting (precision, separators, grouping)
- [ ] Implement unit formatting (display names for simple units)
- [ ] Implement derived unit formatting (e.g., "km/h", "m²", "kg m/s²")
- [ ] Implement date/time formatting
- [ ] Implement composite unit formatting
- [ ] Implement presentation target formatting (binary, hex, etc.)
- [ ] Write unit tests for formatter

**Note**: Requires Phase 5.5 completion - formatter must handle DerivedUnit values

### Phase 6.5: Temporal API Integration (Optional Enhancement)
**Status**: Deferred - requires external dependency

- [ ] Add `@js-temporal/polyfill` dependency
- [ ] Implement timezone offset-aware conversions in `date-time.ts`
- [ ] Implement timezone conversion targets in parser
- [ ] Update tests for timezone-aware behavior

**Current limitation**: All timezones treated as UTC. Timezone names are resolved (EST→America/New_York) but offset calculations not performed.

### Phase 7: Integration & Main Orchestrator (Day 17)
- [x] Create `calculator.ts` with Calculator class (completed in Phase 2.7)
- [x] Implement error handling across pipeline (completed in Phase 2.7 - error recording architecture)
- [x] Implement multi-line input processing (completed in Phase 2.7 - parser handles documents)
- [x] Write integration tests for error recording (completed in Phase 2.7 - 14 tests)
- [x] Implement `Calculator.parse()` method for syntax checking (completed in Phase 2.7)
- [ ] Integrate Evaluator into `Calculator.calculate()` method
  - Wire up evaluator.evaluateDocument() in calculate()
  - Extract line results from evaluator's Map return value
  - Catch and record runtime errors in RuntimeError array
  - Mark lines with errors in LineResult.hasError
- [ ] Integrate Formatter into `Calculator.calculate()` method (requires Phase 6 completion)
  - Format evaluation results as strings for LineResult.result
  - Apply user settings for number/unit/date formatting
- [ ] Add integration tests for full calculation pipeline
  - Test end-to-end calculation with mixed valid/invalid lines
  - Test runtime error collection
  - Test formatted output

### Phase 8: Testing & Validation (Days 18-20)
- [ ] Create test directory structure
- [ ] Ensure test exists for `tests/lexer.test.ts`
- [ ] Ensure test exists for `tests/parser.test.ts`
- [ ] Ensure test exists for `tests/type-checker.test.ts`
- [ ] Ensure test exists for `tests/evaluator.test.ts`
- [ ] Ensure test exists for `tests/unit-converter.test.ts`
- [ ] Ensure test exists for `tests/date-time.test.ts`
- [ ] Ensure test exists for `tests/integration.test.ts` (all GRAMMAR.md examples)
- [ ] Ensure test exists for `tests/disambiguation.test.ts`
- [ ] Verify all 200+ examples from SPECS.md
- [ ] End-to-end verification testing

### Post-MVP Enhancements
**Status**: Optional quality-of-life improvements

#### Type System Enhancements
- [ ] Unit-aware function type checking (e.g., `sqrt(4 m²)` → `2 m` type)
- [ ] Function signature database with input/output dimension rules
- [ ] Better error messages for dimension mismatches in function calls

**Current limitation**: All math functions return `dimensionless` type. Evaluation handles units correctly, but type checker doesn't validate function dimensions.

**Reason for deferral**: Non-critical enhancement. Core evaluation works. Type checking is already functional, this just improves error messages.

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

All files will be created at project root (flat structure):

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

**Implementation**:
```typescript
// In lexer, after scanning "am", "pm", "AM", or "PM":
function disambiguateAmPm(previousToken: Token, currentText: string): TokenType {
  if (previousToken.type === TokenType.NUMBER) {
    const numberString = previousToken.value;  // Original string from input (whitespace trimmed)

    // Only accept these exact string values: '1'-'9', '01'-'09', '10', '11', '12'
    // Regex: /^(0?[1-9]|1[0-2])$/
    const timeHourPattern = /^(0?[1-9]|1[0-2])$/;
    const isTimeHour = timeHourPattern.test(numberString);

    if (isTimeHour) {
      return TokenType.DATETIME;  // Time indicator
    }
  }
  return TokenType.UNIT;  // attometers/picometers/petameters
}
```

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
```bash
# Create simple test script
node -e "
  const Calculator = require('./calculator.ts');
  const calc = new Calculator();
  await calc.initialize();

  const results = calc.calculate(`
    5 km to m
    (5 ft 3 in) * 2
    100 USD to EUR
  `);

  console.log(results);
"
```

Expected output:
```
[
  { line: 1, result: '5000 m', error: null },
  { line: 2, result: '10 ft 6 in', error: null },
  { line: 3, result: '85.8 EUR', error: null }
]
```

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

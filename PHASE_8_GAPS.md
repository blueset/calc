# Phase 8 Integration Test Gaps Analysis

This document analyzes all 41 skipped tests from `tests/integration.test.ts` and determines which phases should implement these features.

## Summary by Phase

| Phase | Feature Category | Count | Complexity |
|-------|-----------------|-------|------------|
| Phase 2 (Lexer) | Number formats & binary literals | 6 | Medium |
| Phase 3 (Parser) | Caret notation & named units | 3 | Medium |
| Phase 5 (Evaluator) | Dimensionless conversion & operations | 9 | Medium |
| Phase 5 (Evaluator) | Functions & binary operations | 8 | Easy-Medium |
| Phase 6 (Formatter) | Presentation conversions | 8 | Medium-Hard |
| Phase 6 (Formatter) | Display & precision issues | 6 | Easy |
| Multiple Phases | Edge cases & integration | 1 | Easy |

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

---

## Phase 3: Syntactic Analysis (3 tests)

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

---

## Phase 5: Evaluation Engine (17 tests)

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

### High Priority (Most User Impact)
1. **Binary/Octal/Hex Parsing** (Phase 2) - Common in programming contexts
2. **Presentation Conversions** (Phase 6) - Core feature from SPECS.md
3. **Dimensionless Unit Conversion** (Phase 5) - User expectation (5 dozen = 60)
4. **Caret Notation** (Phase 3) - More intuitive than Unicode superscripts

### Medium Priority
5. **Base Keyword** (Phase 2) - Useful for arbitrary base conversions
6. **Composite Unit Operations** (Phase 5) - Expected to work
7. **Named Square/Cubic Units** (Phase 3) - Alternative syntax
8. **Binary Operation Formatting** (Phase 6) - Complete bitwise support

### Low Priority (Polish)
9. **Number Underscore Separators** (Phase 2) - Nice to have
10. **Function Enhancements** (Phase 5) - Minor improvements
11. **Formatting Tweaks** (Phase 6) - Minor display issues
12. **Plain Text Detection** (Multiple) - Edge case handling

---

## Effort Summary

| Phase | Total Effort | Features |
|-------|--------------|----------|
| Phase 2 (Lexer) | 10-14 hours | 6 features |
| Phase 3 (Parser) | 7-9 hours | 3 features |
| Phase 5 (Evaluator) | 13-17 hours | 9 features |
| Phase 6 (Formatter) | 9-12 hours | 8 features |
| Multiple | 3-4 hours | 1 feature |
| **TOTAL** | **42-56 hours** | **27 distinct features** |

**Note**: Some features span multiple phases (e.g., base keyword requires lexer, parser, and evaluator changes).

---

## Testing Strategy

For each feature implementation:
1. Unskip the corresponding test in `integration.test.ts`
2. Fix any additional issues revealed
3. Add unit tests in the relevant test file (lexer.test.ts, parser.test.ts, etc.)
4. Verify end-to-end functionality

The skipped tests serve as acceptance criteria - implementation is complete when all 41 tests pass.

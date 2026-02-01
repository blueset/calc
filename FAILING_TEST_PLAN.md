# Comprehensive Plan to Fix 156 Failing Tests

## Overview

**Initial Status**: 1354 passing / 156 failing tests (89.7% pass rate)
**Current Status**: 1486 passing / 24 failing tests (98.4% pass rate)
**Target**: 1510 passing tests (100% pass rate)

**Progress: 132 tests fixed (84.6% of total failures)**

The 156 failing tests have been categorized into 11 distinct root causes. This plan provides a systematic, phased approach to fix all failures while maintaining stability.

## Implementation Summary

### ✅ Completed Phases

**Phase 1: Lexer & Simple Fixes (18/39 tests)**
- Added Unicode operators (×, ·, ÷) to lexer
- Implemented sign() function
- Made constants case-insensitive (pi/PI/Pi, nan/NaN/NAN, etc.)
- Fixed currency symbol recognition by adding exchange rates to tests

**Phase 2: Function Enhancements (31/35 tests)**
- Enhanced random() to accept 0-3 parameters (max, min/max, min/max/step)
- Added optional "nearest" parameter to round/floor/ceil/trunc
- Fixed hyperbolic functions by removing incorrect angle conversions

**Phase 3: Date/Time Features (31/33 tests) - COMPLETE**
- Implemented property extraction for date/time values (year, month, day, hour, minute, second, etc.)
- Added support for multi-word properties (day of year, week of year)
- Implemented offset extraction returning duration values
- Fixed timezone offset colon format parsing (UTC-3:30)
- Fixed duration formatting for zero values
- Implemented date/time presentation format conversions:
  - ISO 8601 format (with Z for UTC, offset format for others)
  - RFC 9557 format (Temporal's native toString with timezone annotations)
  - RFC 2822 format (email date format with implicit conversion from all date/time types)
- Implemented Unix timestamp conversions (seconds and milliseconds since epoch)
- Added implicit timezone and time defaults for RFC 2822 format
- Implemented Unix timestamp input parsing (3600 unix, 3600000 unix milliseconds)

**Phase 4: Composite Units (15/10 tests) - COMPLETE**
- Added PRIME (′, ') and DOUBLE_PRIME (″, ", '') token types
- Lexer recognizes prime symbols with special handling for degree-digit sequences
- Parser context tracking: after ° = arcminutes/arcseconds, otherwise = feet/inches
- Composite angle parsing: 45°30′15″ works correctly
- Composite unit arithmetic: 10 ft - (5 ft 6 in) → 4.5 ft
- Conversion to composite format: 45.5 degrees to ° ′ → 45 ° 30 ′
- Evaluator converts composite units to single units before arithmetic
- Parser recognizes composite unit conversion targets (to ° ′, to ft in)

**Phase 5: Output Formatting & Unit Definitions (8/8 tests) - COMPLETE**
- Added pixel (px) unit definition to printing dimension (no SI prefixes)
- Added voltage dimension with volt (V) base unit and full SI prefixes (mV, kV, MV, etc.)
- Added resistance dimension with ohm (Ω) base unit and full SI prefixes (mΩ, kΩ, MΩ, etc.)
- Generated 462 total units across 25 dimensions
- Fixed scientific notation to respect precision settings (4 sig figs default)
- Implemented "to N decimals" conversion target (pi to 2 decimals → 3.14)
- Implemented "to N sig figs" / "to N significant figures" conversion target (123.456 to 3 sig figs → 123)
- Precision conversions work with unit conversions (1 km to m to 0 decimals → 1 000 m)

**Phase 6: Edge Cases (3/6 tests) - COMPLETE**
- Fixed cooking unit test by adding CUP (Cuban Peso) exchange rate
- Added 'decimal' and 'hexadecimal' presentation format aliases
- Implemented AM/PM time parsing disambiguation (integer 1-12 + am/pm → time, decimal + am/pm → units)
- Type error checking tests were already passing (no work needed)

**Additional Improvements (15 tests)**
- Random negative step handling
- Updated unit tests for new function signatures
- Case-insensitive constant variant support throughout

### 📋 Files Modified

**Core Implementation:**
1. `src/lexer.ts` - Unicode operators (×, ·, ÷), prime symbols (PRIME, DOUBLE_PRIME tokens), special handling for °+digit sequences, AM/PM disambiguation (disambiguateAmPm method)
2. `src/functions.ts` - sign(), random(0-3 args), nearest parameter
3. `src/constants.ts` - Case-insensitive constant matching
4. `src/evaluator.ts` - Fixed hyperbolic function angle conversion bug, property extraction for date/time, Unix timestamp conversion, date/time presentation format handling, composite unit to single unit conversion for arithmetic, precision target handling (applyPrecision method), unit conversion for function "nearest" parameter
5. `src/parser.ts` - Multi-word property parsing (day of year, week of year), multi-word format parsing (ISO 8601, RFC 9557, RFC 2822, Unix seconds/milliseconds), Unix timestamp input parsing (3600 unix, 3600000 unix ms), context-sensitive prime symbol interpretation (angle vs length), composite unit conversion targets (to ° ′), precision target parsing (N decimals, N sig figs), AM/PM time parsing (integer 1-12 + am/pm → time)
6. `src/formatter.ts` - Duration formatting for zero values with appropriate units, date/time presentation formatting (ISO 8601, RFC 9557, RFC 2822), conditional unit spacing (no space before symbols), precision formatting (formatNumberWithPrecision), scientific notation with precision, convert sig fig scientific notation to regular notation with grouping
7. `src/ast.ts` - Added 'offset' to DateTimeProperty type, added date/time formats to PresentationFormat type, added PrecisionTarget type (decimals/sigfigs), added short format aliases (bin, oct, dec)
8. `src/date-time.ts` - Added helper functions to convert internal date/time structures to Temporal API objects (toTemporalZonedDateTime, toTemporalPlainDateTime, etc.)
9. `src/tokens.ts` - Added PRIME and DOUBLE_PRIME token types

**Test Updates:**
8. `tests/greek-and-symbols.integration.test.ts` - Added exchange rates
9. `tests/constants.test.ts` - Updated for case-insensitive behavior
10. `tests/functions.test.ts` - Updated for new function signatures

**Data Generation:**
11. `data/generate-units.ts` - Added voltage and resistance dimensions, pixel/volt/ohm unit definitions
12. `data/units.json` - Regenerated with 462 units across 25 dimensions (added pixel, volt with SI prefixes, ohm with SI prefixes)

### 🎯 Remaining Work (24 tests)

Major features still needed:
- **Conversion Edge Cases** (4 tests) - Composite units, expression conversions
- **Timezone Conversions** (16 tests) - Timezone conversion features
- **Date/Time Edge Cases** (2 tests) - Date/time arithmetic
- **Other** (2 tests) - Parser edge cases

## Progress

Please mark the checkboxes (from `[ ]` to `[x]`) as tasks are completed.

- [x] Phase 1: Lexer & Simple Fixes (18 tests fixed)
  - [x] Task 1.1: Alternative Operators ✓ Priority: HIGH - **9 tests fixed**
  - [x] Task 1.2: Sign Function ✓ Priority: LOW - **1 test fixed**
  - [x] Task 1.3: Case-Insensitive Constants ✓ Priority: MEDIUM - **5 tests fixed**
  - [x] Task 1.4: Currency Symbols Recognition ⚠ Priority: MEDIUM - **3 tests fixed** (added exchange rates to tests)
- [x] Phase 2: Function Enhancements (31 tests fixed)
  - [x] Task 2.1: Random Function Parameters ✓ Priority: HIGH - **13 tests fixed**
  - [x] Task 2.2: Function "Nearest" Parameter ✓ Priority: MEDIUM - **6 tests fixed**
  - [x] Task 2.3: Debug Hyperbolic Functions ⚠ Priority: HIGH - **12 tests fixed** (removed angle conversion)
- [x] Phase 3: Date/Time Features (31 tests fixed - COMPLETE!)
  - [x] Task 3.1: Property Extraction ✓ Priority: HIGH - **12 tests fixed** (all property extraction tests passing!)
  - [x] Task 3.2: Presentation Format Conversions ✓ Priority: HIGH - **18 tests fixed** (ISO 8601, RFC 9557, RFC 2822, Unix timestamps)
  - [x] Task 3.3: Unix Timestamp Input Parsing ✓ Priority: LOW - **1 test fixed** (3600 unix, 3600000 unix ms)
- [x] Phase 4: Composite Units (15 tests fixed - COMPLETE!)
  - [x] Task 4.1: Composite Angle Units ✓ Priority: MEDIUM - **13 tests fixed** (45°30′15″, conversions, arithmetic)
  - [x] Task 4.2: Prime Symbols for Feet/Inches ✓ Priority: LOW - **2 tests fixed** (5′ → 5 ft, 10″ → 10 in)
- [x] Phase 5: Output Formatting & Unit Definitions (8 tests fixed - COMPLETE!)
  - [x] Task 5.1: Unit Definitions (Volt, Ohm, Pixel) ✓ Priority: MEDIUM - **3 tests fixed** (added voltage/resistance dimensions, volt/ohm with SI prefixes, pixel unit)
  - [x] Task 5.2: Scientific Notation Precision ✓ Priority: LOW - **1 test fixed** (apply precision to scientific notation mantissa)
  - [x] Task 5.3: Decimal/Sig Fig Conversions ✓ Priority: MEDIUM - **4 tests fixed** (to N decimals, to N sig figs, combined with unit conversions)
- [x] Phase 6: Edge Cases (3 tests fixed - COMPLETE!)
  - [x] Task 6.1: Pixel Unit Definition ✓ Priority: LOW - **MERGED INTO TASK 5.1**
  - [x] Task 6.2: Verify Cooking Units ✓ Priority: LOW - **1 test fixed** (added CUP exchange rate)
  - [x] Task 6.3: AM/PM Time Parsing ⚠ Priority: MEDIUM - **1 test fixed** (lexer tokenizes as DATETIME, parser converts to time)
  - [x] Task 6.4: Base Conversion Edge Cases ⚠ Priority: MEDIUM - **1 test fixed** (added 'decimal'/'hexadecimal' formats)
  - [x] Task 6.5: Type Error Checking ✓ Priority: LOW - **0 tests fixed** (tests already passing)
- [ ] Phase 7: Remaining Edge Cases (0 tests fixed - not started)

**Additional fixes (15 tests):**
- Case-insensitive constant variants (NaN/nan, Infinity/infinity) - **8 tests**
- Random negative step handling - **1 test**
- Updated unit tests for new behavior - **6 tests**

---

## Root Cause Analysis

### 1. Alternative Operators (×, ·, ÷) - 29 Failures
**Root Cause**: Lexer only tokenizes `*` and `/`, not their Unicode alternatives
**Files**: `arithmetic.integration.test.ts` (5), `greek-and-symbols.integration.test.ts` (24)
**Evidence**: Only `case '*':` exists at lexer.ts:181, no cases for `×` (U+00D7), `·` (U+00B7), or `÷` (U+00F7)

### 2. Property Extraction (to year/month/day) - 14 Failures
**Root Cause**: Date/time property extraction conversion targets not implemented
**Files**: `date-time-property-extraction.integration.test.ts` (14)
**Example**: `1970 Jan 01 to year` should return `1970`

### 3. Date/Time Presentation Formats - 18 Failures
**Root Cause**: ISO 8601, RFC format conversions not implemented
**Files**: `date-time-presentation.integration.test.ts` (18)
**Example**: `1970 Jan 01 01:00 UTC to ISO 8601` should return `1970-01-01T01:00:00Z`

### 4. Random Function Parameters - 13 Failures
**Root Cause**: `random()` only accepts 0 arguments, needs 0-3 parameter overloads
**Files**: `random-functions.integration.test.ts` (13)
**Evidence**: functions.ts:313-318 returns error for any non-zero argument count

### 5. Hyperbolic Functions - 13 Failures
**Root Cause**: Functions implemented (Math.sinh exists) but tests show `hasError=true`
**Files**: `hyperbolic-functions.integration.test.ts` (13)
**Investigation Needed**: Type system or evaluator issue causing errors

### 6. Function "Nearest" Parameter - 9 Failures
**Root Cause**: `round/floor/ceil/trunc` only accept 1 arg, need optional 2nd for "nearest"
**Files**: `functions.integration.test.ts` (9)
**Example**: `round(3.7, 2)` should round to nearest 2 = `4`

### 7. Composite Angle Units - 8 Failures
**Root Cause**: Degree-arcminute-arcsecond notation not parsed (45° 30' 15")
**Files**: `composite-units-edge-cases.integration.test.ts` (8), `units-specialized.integration.test.ts` (4)

### 8. Sign Function - 1 Failure
**Root Cause**: `sign()` not in numberFunctions list (functions.ts:102)
**Files**: `functions.integration.test.ts` (1)

### 9. Case-Insensitive Constants - 5 Failures
**Root Cause**: PI, NaN, Infinity only work lowercase
**Files**: `numbers-and-bases.integration.test.ts` (5)

### 10. Missing Currency Symbols - 4 Failures
**Root Cause**: Some currency symbols (€, ₹, ₽, ฿) not in data
**Files**: `greek-and-symbols.integration.test.ts` (4)
**Evidence**: `tryScanAdjacentCurrencySymbol()` exists but missing some symbols

### 11. Miscellaneous Edge Cases - 42 Failures
- Unit definitions (pixel, volt, ohm) - 3 tests
- AM/PM time parsing - 1 test
- Prime symbols for feet/inches - 2 tests
- Scientific notation precision - 1 test
- Decimal/sig fig conversions - 4 tests
- Base conversion edge cases - 3 tests
- Type error checking - 2 tests
- Other edge cases - 26 tests

---

## Implementation Plan: Phased Approach

### Phase 1: Lexer & Simple Fixes (39 tests)

#### Task 1.1: Alternative Operators ✓ Priority: HIGH
**File**: `src/lexer.ts` around line 181-186
**Change**: Add cases for Unicode multiplication and division operators
```typescript
// After case '*':
case '*':
case '×':  // U+00D7 MULTIPLICATION SIGN
case '·':  // U+00B7 MIDDLE DOT
  this.advance();
  return this.createToken(TokenType.STAR, this.currentChar, start, this.currentLocation());

// After case '/':
case '/':
case '÷':  // U+00F7 DIVISION SIGN
  this.advance();
  return this.createToken(TokenType.SLASH, this.currentChar, start, this.currentLocation());
```
**Tests Fixed**: 29

#### Task 1.2: Sign Function ✓ Priority: LOW
**File**: `src/functions.ts`
**Line 102**: Add `'sign'` to numberFunctions array
**Line 299**: Add case for sign:
```typescript
case 'sign':
  result = Math.sign(x);
  break;
```
**Tests Fixed**: 1

#### Task 1.3: Case-Insensitive Constants ✓ Priority: MEDIUM
**File**: `src/parser.ts`
**Change**: Convert identifier to lowercase before checking if it's a constant
**Investigation**: Find where `isConstant()` is called, apply `.toLowerCase()` to identifier
**Tests Fixed**: 5

#### Task 1.4: Currency Symbols Recognition ⚠ Priority: MEDIUM
**File**: `src/lexer.ts`
**Status**: €, ₹, ₽, ฿ are VERIFIED to exist in `currencies.json` `.unambiguous[].symbolAdjacent[]`
**Investigation Required**: Since symbols are in data but tests fail, the issue must be in lexer tokenization
- Check if lexer's `tryScanAdjacentCurrencySymbol()` correctly handles these Unicode symbols
- Verify character encoding and matching logic
- May need to add explicit cases or improve Unicode handling
**Tests Fixed**: 4

**Phase 1 Total**: 39 tests fixed

---

### Phase 2: Function Enhancements (35 tests)

#### Task 2.1: Random Function Parameters ✓ Priority: HIGH
**File**: `src/functions.ts` lines 313-318
**Change**: Support 0-3 arguments
```typescript
private random(args: number[]): FunctionResult {
  if (args.length === 0) {
    return { value: Math.random() }; // [0, 1)
  }
  if (args.length === 1) {
    const max = Math.floor(args[0]);
    return { value: Math.floor(Math.random() * max) }; // [0, max)
  }
  if (args.length === 2) {
    const min = Math.floor(args[0]);
    const max = Math.floor(args[1]);
    return { value: Math.floor(Math.random() * (max - min)) + min }; // [min, max)
  }
  if (args.length === 3) {
    const min = args[0];
    const max = args[1];
    const step = args[2];
    const steps = Math.floor((max - min) / step);
    return { value: min + Math.floor(Math.random() * steps) * step };
  }
  return { value: 0, error: `random requires 0-3 arguments, got ${args.length}` };
}
```
**Tests Fixed**: 13

#### Task 2.2: Function "Nearest" Parameter ✓ Priority: MEDIUM
**File**: `src/functions.ts` lines 270-308
**Change**: Accept optional 2nd parameter for rounding functions
```typescript
private executeNumber(name: string, args: number[]): FunctionResult {
  if (args.length < 1 || args.length > 2) {
    return { value: 0, error: `${name} requires 1 or 2 arguments, got ${args.length}` };
  }
  const x = args[0];
  const nearest = args.length === 2 ? args[1] : 1;

  switch (name) {
    case 'round':
      result = Math.round(x / nearest) * nearest;
      break;
    case 'floor':
      result = Math.floor(x / nearest) * nearest;
      break;
    case 'ceil':
      result = Math.ceil(x / nearest) * nearest;
      break;
    case 'trunc':
      result = Math.trunc(x / nearest) * nearest;
      break;
    // ... rest unchanged
  }
}
```
**Tests Fixed**: 9

#### Task 2.3: Debug Hyperbolic Functions ⚠ Priority: HIGH
**Files**: `src/functions.ts`, `src/evaluator.ts`, `src/type-checker.ts`
**Investigation Required**:
- Run single hyperbolic test with debugging
- Check if type-checker is rejecting dimensionless inputs
- Check if evaluator is setting hasError incorrectly
- Verify function registration in MathFunctions class

**Hypothesis**: Type system rejecting valid inputs or evaluator error propagation issue
**Tests Fixed**: 13

**Phase 2 Total**: 35 tests fixed

---

### Phase 3: Date/Time Features (33 tests)

#### Task 3.1: Property Extraction ✓ Priority: HIGH
**File**: `src/date-time.ts`
**Change**: Implement property extraction conversions
- Add support for: `year`, `month`, `day`, `weekday`, `hour`, `minute`, `second`, `millisecond`
- Add support for: `"day of year"`, `"week of year"`, `offset`
- Use Temporal API methods: `.year`, `.month`, `.day`, `.dayOfWeek`, etc.

**File**: `src/evaluator.ts`
**Change**: Handle PropertyTarget in conversion evaluation
**Tests Fixed**: 14

#### Task 3.2: Presentation Format Conversions ✓ Priority: HIGH
**File**: `src/date-time.ts`
**Change**: Implement format conversions
- `"RFC 9557"`: Use `Temporal.*CorrespondingTypeClass*.prototype.toString()` directly
- `"ISO 8601"`: For ZonedDateTime, drop `[IANA Timezone Name or UTC Offset]` from RFC 9557 output and convert `+00:00` to `Z` for UTC; for other types, same as RFC 9557
- `"RFC 2822"`: Custom formatting per RFC spec
- `"unix"`, `"unix second"`, `"unix seconds"`, `"unix s"`: Convert to seconds since epoch
- `"unix millisecond"`, `"unix milliseconds"`, `"unix ms"`: Convert to milliseconds since epoch

**File**: `src/formatter.ts`
**Change**: Format PresentationValue with date/time format targets
**Tests Fixed**: 18

#### Task 3.3: Unix Timestamp Input Parsing ✓ Priority: LOW
**File**: `src/parser.ts` and potentially `src/lexer.ts`
**Change**: Parse Unix timestamp input syntax:
- `3600 unix`, `3600 unix second`, `3600 unix seconds`, `3600 unix s` → seconds since epoch
- `3600000 unix millisecond`, `3600000 unix milliseconds`, `3600000 unix ms` → milliseconds since epoch
- This mirrors the output format conversions (unix epoch)
- Implementation: Treat "unix" as a special unit that triggers instant creation from numeric value

**Tests Fixed**: 1

**Phase 3 Total**: 33 tests fixed

---

### Phase 4: Composite Units (10 tests)

#### Task 4.1: Composite Angle Units ⚠ Priority: MEDIUM
**Files**: `src/lexer.ts`, `src/parser.ts`, `src/ast.ts`
**Change**: Context-aware parsing for angles
- Track state: after `°` token, treat `'` as arcminute and `"` as arcsecond
- Without `°` context, treat `'` as feet and `"` as inches
- Create composite angle representation in AST
- Implement arithmetic and conversions for composite angles

**Complexity**: HIGH (requires lexer state tracking)
**Tests Fixed**: 8

#### Task 4.2: Prime Symbols for Feet/Inches ✓ Priority: LOW
**File**: `src/lexer.ts`
**Change**: Handle `'` and `"` as feet/inches in non-angle context
**Tests Fixed**: 2

**Phase 4 Total**: 10 tests fixed

---

### Phase 5: Output Formatting & Unit Definitions (8 tests)

#### Task 5.1: Unit Definitions (Volt, Ohm) ✓ Priority: MEDIUM
**File**: `generate_units.ts`
**Change**: Add volt, ohm unit definitions with SI prefixes
- Volt (V) - electric potential
- Ohm (Ω) - electrical resistance
- Include standard SI prefixes (mV, kV, MV, mΩ, kΩ, MΩ, etc.)

**File**: `src/formatter.ts` (if needed)
**Change**: Ensure proper symbol display (`V`, `Ω`)
**Tests Fixed**: 2

#### Task 5.2: Scientific Notation Precision ✓ Priority: LOW
**File**: `src/formatter.ts`
**Change**: Apply precision setting to scientific notation mantissa
**Tests Fixed**: 1

#### Task 5.3: Decimal/Sig Fig Conversions ✓ Priority: MEDIUM
**File**: `src/evaluator.ts`, `src/formatter.ts`
**Change**: Implement `"to 2 decimals"` and `"to 3 significant figures"` conversion targets
**Tests Fixed**: 4

**Phase 5 Total**: 8 tests fixed

---

### Phase 6: Edge Cases (6 tests)

#### Task 6.1: Pixel Unit Definition ✓ Priority: LOW
**File**: `generate_units.ts`
**Change**: Add pixel (px) unit definition WITHOUT SI prefixes
- Pixel (px) - screen resolution unit
- Do NOT include SI prefixes (no kpx, Mpx, etc.)
- Single unit definition only

**Tests Fixed**: 1

#### Task 6.2: Verify Cooking Units ✓ Priority: LOW
**File**: `generate_units.ts` and `data/units.json`
**Change**: Verify tablespoon and teaspoon are already properly defined (they should already exist)
**Investigation**: If tests still fail, check if there's an issue with recognition or conversion
**Tests Fixed**: 0 (already defined, may be a different issue)

#### Task 6.3: AM/PM Time Parsing ⚠ Priority: MEDIUM
**File**: `src/parser.ts`
**Change**: When parsing "12 am", prioritize time over attometer unit
**Tests Fixed**: 1

#### Task 6.4: Base Conversion Edge Cases ⚠ Priority: MEDIUM
**File**: `src/evaluator.ts` (base conversion logic)
**Change**: Fix fractional base conversion handling
**Investigation Required**: Run failing tests to identify specific issues
**Tests Fixed**: 3

#### Task 6.5: Type Error Checking ✓ Priority: LOW
**File**: `src/evaluator.ts`
**Change**: Add type validation for invalid operand types
**Tests Fixed**: 2

**Phase 6 Total**: 6 tests fixed

---

### Phase 7: Remaining Edge Cases (26 tests)

**Approach**: Individual investigation required
1. Run each failing test in isolation
2. Identify root cause through debugging
3. Implement targeted fix
4. Verify no regressions

**Tests Fixed**: 26

---

## Critical Files to Modify

### High Impact Files
1. **src/lexer.ts** (Tasks 1.1, 3.3, 4.1, 4.2) - Tokenization foundation
2. **src/functions.ts** (Tasks 1.2, 2.1, 2.2, 2.3) - Function implementations
3. **src/date-time.ts** (Tasks 3.1, 3.2) - Date/time operations
4. **src/evaluator.ts** (Tasks 3.1, 3.3, 5.3, 6.4, 6.5) - Core evaluation logic
5. **src/parser.ts** (Tasks 1.3, 3.3, 4.1, 6.3) - Syntax analysis

### Medium Impact Files
6. **src/formatter.ts** (Tasks 3.2, 5.1, 5.2, 5.3) - Output formatting
7. **generate_units.ts** (Tasks 5.1, 6.1) - Unit definitions generator
8. **data/currencies.json** (Task 1.4) - Currency definitions

### Low Impact Files
9. **src/ast.ts** (Task 4.1) - AST node types for composite angles
10. **data/units.json** (Task 6.2) - Verify existing units

---

## Testing Strategy

### Incremental Verification
After each phase:
1. Run full test suite: `npm run test`
2. Confirm expected tests now pass
3. Verify no regressions in previously passing tests (maintain 1354+ passing)
4. Document any unexpected behaviors

### Phase-Specific Testing
- **Phase 1**: Run `arithmetic.integration.test.ts`, `greek-and-symbols.integration.test.ts`, `numbers-and-bases.integration.test.ts`
- **Phase 2**: Run `functions.integration.test.ts`, `random-functions.integration.test.ts`, `hyperbolic-functions.integration.test.ts`
- **Phase 3**: Run `date-time-property-extraction.integration.test.ts`, `date-time-presentation.integration.test.ts`
- **Phase 4**: Run `composite-units-edge-cases.integration.test.ts`, `units-specialized.integration.test.ts`
- **Phase 5**: Run `output-formatting.integration.test.ts`
- **Phase 6**: Run `conversion-edge-cases.integration.test.ts`, `error-handling.integration.test.ts`

### Regression Prevention
- Baseline: 1354 passing tests must be maintained
- If passing count decreases, halt and fix regression immediately
- Run all 1510 tests before final commit

---

## Risk Assessment

### High Risk Changes
⚠ **Lexer modifications** (Phase 1, 3, 4) - Affects all tokenization
**Mitigation**: Existing 169 parser tests must all pass

⚠ **Parser changes** (Phase 1, 4, 6) - Affects syntax analysis
**Mitigation**: Add test cases for new syntax before implementing

⚠ **Evaluator changes** (Phase 3, 5, 6) - Affects core evaluation
**Mitigation**: All 95 evaluator tests must pass

### Medium Risk Changes
⚠ **Function signature changes** (Phase 2) - Could break existing calls
**Mitigation**: Make parameters optional (backward compatible)

⚠ **Date/time changes** (Phase 3) - Complex subsystem
**Mitigation**: All 87 date/time tests must pass

### Low Risk Changes
✓ **Function additions** (Phase 1, 2) - New functionality only
✓ **Data file changes** (Phase 1, 6) - Adding definitions
✓ **Formatter changes** (Phase 5) - Output presentation only

---

## Success Criteria

- [ ] All 1510 tests pass (100% pass rate)
- [ ] No regressions in previously passing tests
- [ ] All phases completed in order
- [ ] Code follows existing patterns and conventions
- [ ] Changes are well-documented with comments

---

## Expected Outcomes by Phase

| Phase | Tests Fixed (Expected) | Tests Fixed (Actual) | Cumulative Passing | Pass Rate |
|-------|----------------------|---------------------|-------------------|-----------|
| Baseline | - | - | 1354 | 89.7% |
| Phase 1 | 39 | 18 | 1372 | 90.9% |
| Phase 2 | 35 | 31 | 1403 | 92.9% |
| Phase 3 | 33 | 31 | 1434 | 95.0% |
| Phase 4 | 10 | 15 | 1449 | 96.0% |
| Additional | - | +18 | 1467 | 97.2% |
| Phase 5.1 | 3 | 3 | 1470 | 97.4% |
| Phase 2.2 (late) | - | 4 | 1474 | 97.6% |
| Formatter spacing | - | 5 | 1479 | 97.9% |
| Phase 5.2 & 5.3 | 5 | 5 | 1484 | 98.3% |
| Test expectation | - | -1 | 1483 | 98.2% |
| Phase 6.2 & 6.4 | 2 | 2 | 1485 | 98.3% |
| Phase 6.3 | 1 | 1 | 1486 | 98.4% |
| **Current** | - | - | **1486** | **98.4%** |
| Phase 7 | 24 | 0 | 1486 | 98.4% |
| **Target** | **156** | **132** | **1510** | **100.0%** |

**Note**: Additional 18 tests were fixed through case-insensitive constant variants, random negative step handling, code refactoring improvements (Unix timestamp parsing helper), unit test updates, and user fixes to test expectations. Formatter spacing change fixed 5 more tests. Phase 2.2 "nearest parameter" completed late (4 tests).

---

## Notes

- Each phase builds on previous phases - order matters
- Some tasks marked ⚠ require investigation before implementation
- Task 2.3 (Hyperbolic functions) may uncover broader issues
- Phase 7 is a catch-all for uncategorized edge cases
- Estimated complexity: **High** due to 156 scattered failures across 11 root causes

## Implementation Learnings

### Phase 1 & 2 Insights

1. **Currency Symbols**: The symbols (€, ₹, ₽, ฿) were correctly tokenized by the lexer, but tests failed because exchange rates weren't loaded. Solution was to add mock exchange rates in test setup, not modify the lexer.

2. **Hyperbolic Functions**: The bug was subtle - hyperbolic functions (sinh, cosh, tanh) were incorrectly included in the `isTrigFunction()` check, causing the evaluator to apply degree/radian conversions. Hyperbolic functions work with dimensionless real numbers, not angles.

3. **Case-Insensitive Constants**: Required building lowercase versions into the CONSTANT_LOOKUP map at initialization, not just checking `.toLowerCase()` on lookup (which would miss entries).

4. **Random Function**: Negative step values needed special handling - swap min/max and negate step to maintain correct behavior.

5. **Unit Test Updates**: When changing function signatures or behavior, corresponding unit tests must be updated to match the new expected behavior.

### Phase 3 Insights

1. **Property Extraction**: Implemented extraction of year, month, day, hour, minute, second, weekday, dayOfYear, weekOfYear, and offset from date/time values. Parser needed to handle both IDENTIFIER and UNIT token types since date/time units like "day" are tokenized as UNIT.

2. **Multi-Word Properties**: "day of year" and "week of year" required special parser logic to check for multi-word patterns BEFORE single-word properties, otherwise "day" would be consumed early.

3. **Offset as Duration**: Offset extraction returns a duration value using `Temporal.Duration.from({minutes: offset}).round({largestUnit: 'hour', smallestUnit: 'minute'})`. For zero offsets, return a number with minute unit to avoid formatting issues.

4. **Timezone Offset Colon Format**: The parser only supported compact offset formats (UTC-330) but tests used colon format (UTC-3:30). Fixed by detecting and consuming the colon and minutes tokens, then converting to compact format for parsing.

5. **Duration Formatting**: Temporal.Duration always sets all fields to 0, causing formatDuration to pick the wrong unit for zero values. Solution: check which fields are explicitly defined (not undefined) and use the smallest one for formatting.

6. **Date/Time Presentation Formats**: Implemented ISO 8601, RFC 9557, RFC 2822, and Unix timestamp conversions. Key decisions:
   - ISO 8601: Remove timezone annotations and convert +00:00 to Z for UTC
   - RFC 9557: Use Temporal's native toString() which includes timezone annotations
   - RFC 2822: Allow implicit conversion from all date/time types (add missing timezone, time, or date with sensible defaults)
   - Unix timestamps: Convert to numeric values (seconds or milliseconds since epoch) rather than presentation format strings

7. **Multi-Word Format Parsing**: Parser needed to recognize multi-word format names like "ISO 8601", "RFC 9557", "RFC 2822", "Unix seconds", "Unix milliseconds". Implemented lookahead logic to check for number tokens after "ISO"/"RFC" and identifier tokens after "Unix".

8. **Value Structure Understanding**: Internal date/time values have custom structures (PlainDate, PlainTime, PlainDateTime, ZonedDateTime) that differ from Temporal API objects. Must convert to Temporal types when needed using Temporal.*.from().

9. **Unix Timestamp Input Parsing**: Implemented parsing of expressions like `3600 unix`, `3600 unix seconds`, `3600000 unix milliseconds` as input values. Added special handling in `parseNumberWithOptionalUnit()` to check if "unix" follows a number, then optionally parse "seconds/s" or "milliseconds/ms". Default unit is seconds (multiply by 1000 to get milliseconds). Returns an InstantLiteral with the timestamp value.

10. **Code Refactoring - Unix Timestamp Parsing**: Extracted duplicate Unix timestamp unit parsing logic (parsing "seconds/s" or "milliseconds/ms" specifiers) into a shared helper method `tryParseUnixTimeUnit()`. This eliminated duplication between input parsing (line 698) and output format parsing (line 1292). The refactoring improved code maintainability and actually fixed 1 additional test through improved consistency.

11. **Context-Sensitive Prime Symbol Parsing**: Implemented context-aware interpretation where `′`/`'` and `″`/`"`/`''` have different meanings based on context. After `°` (degree symbol), they represent arcminutes/arcseconds; otherwise they represent feet/inches. Key implementation details:
   - Added PRIME and DOUBLE_PRIME token types to tokens.ts
   - Lexer handles both Unicode (′, ″) and ASCII (', ", '') variants
   - Lexer special case: When `°` is followed by digits (e.g., `°30`), only tokenize `°` to allow proper composite parsing
   - Parser tracks "angle context" by checking if first unit is degree
   - Parser interprets prime symbols based on context in both value parsing and conversion target parsing

12. **Composite Unit Arithmetic**: Implemented arithmetic operations between single units and composite units (e.g., `10 ft - (5 ft 6 in)`). Solution: Before arithmetic, convert composite units to single units by summing all components converted to the first component's unit. Added `convertCompositeToSingleUnit()` method in evaluator.

13. **Composite Unit Conversion Targets**: Extended conversion target parsing to recognize composite unit patterns (e.g., `to ° ′`, `to ft in`). Parser loop now checks for PRIME/DOUBLE_PRIME tokens and applies context-sensitive interpretation based on the first unit.

### Phase 5 Insights

1. **Unit Generation System**: The codebase uses a sophisticated unit generation system (`data/generate-units.ts`) that:
   - Defines dimensions with base units
   - Automatically generates SI-prefixed variants using `generateSIPrefixedUnits()`
   - Supports static unit definitions for units without SI prefixes
   - Regenerates `data/units.json` with all unit definitions (462 units across 25 dimensions)

2. **Adding New Dimensions**: To add electrical units (volt, ohm), needed to:
   - Add dimension definitions to the `dimensions` array (voltage, resistance)
   - Use `generateSIPrefixedUnits()` to create all SI-prefixed variants (mV, kV, MV, mΩ, kΩ, MΩ, etc.)
   - Pixel required no SI prefixes, so added directly to `staticUnits` array under "printing" dimension

3. **Symbol Display**: The unit definition structure uses `displayName.symbol` as the preferred output representation. Tests verify that:
   - Pixel displays as "px" not "pixel"
   - Volt displays as "V" not "volt"
   - Ohm displays as "Ω" not "ohm"
   - The formatter automatically uses the symbol when available

### Phase 5.2 & 5.3 Insights

1. **Precision Conversion Targets**: Implemented new AST type `PrecisionTarget` with two modes:
   - `decimals`: Rounds to N decimal places using `toFixed(N)`
   - `sigfigs`: Rounds to N significant figures using `toPrecision(N)`

2. **Parser Precision Recognition**: Added parsing logic to recognize patterns:
   - `N decimals` / `N decimal` → PrecisionTarget with mode 'decimals'
   - `N sig figs` / `N sig` / `N significant figures` → PrecisionTarget with mode 'sigfigs'
   - Pattern matching is position-independent (works before or after unit conversions)

3. **Scientific Notation with Fixed Precision**: Updated `formatNumber` to check if number needs scientific notation even when using fixed precision setting:
   - If `|num| >= 1e10` or `|num| < 1e-6`, use `toExponential(precision)` instead of `toFixed(precision)`
   - This ensures `1.23456789 * 10^30` with precision=3 formats as `1.235e+30` not `1.23456789e+30`

4. **Sig Fig Scientific Notation Conversion**: When `toPrecision(N)` produces scientific notation, convert back to regular notation with digit grouping:
   - `toPrecision(3)` on 1234567 gives `"1.23e+6"`
   - Parse and convert to `"1230000"` then apply digit grouping → `"1 230 000"`
   - This matches user expectations for explicit precision conversions

5. **Precision Metadata Storage**: NumberValue now includes optional `precision` field to store precision settings:
   - Allows formatter to apply specific precision regardless of global settings
   - Precision is preserved through unit conversions

6. **Digit Grouping for Precision Conversions**: All explicit precision conversions apply digit grouping (when enabled in settings):
   - `1 km to m to 0 decimals` → `"1 000 m"` (with grouping)
   - `1234567 to 3 sig figs` → `"1 230 000"` (with grouping)
   - Consistent behavior across all precision modes

### Phase 6 Insights

1. **Decimal/Hexadecimal Presentation Formats**: Extended presentation format support to include 'decimal' and 'hexadecimal':
   - Added 'decimal' and 'hexadecimal' to PresentationFormat type union in ast.ts
   - Updated parser to recognize these keywords in presentationFormats lists (2 locations)
   - Formatter handles 'decimal' by applying normal decimal formatting with digit grouping
   - Formatter treats 'hexadecimal' as alias for 'hex' format
   - Enables expressions like "HELLO base 36 to decimal" → "29 234 652"

2. **Cooking Units & Currency Disambiguation**: Verified cooking units (teaspoon, tablespoon, cup) are properly defined:
   - Units already exist in units.json with correct definitions
   - Test failure was due to missing exchange rate for Cuban Peso (CUP)
   - Added CUP exchange rate in test setup to allow "1 CUP" (uppercase) to parse as currency
   - Case sensitivity correctly prioritizes: "cup" (lowercase) → volume unit, "CUP" (uppercase) → currency

3. **AM/PM Time Parsing**: Implemented disambiguation between time and units:
   - Lexer already had `disambiguateAmPm()` method checking if previous token is valid hour (1-12)
   - If valid hour, lexer tokenizes "am"/"pm" as TokenType.DATETIME; otherwise as TokenType.UNIT
   - Parser needed to handle DATETIME token after NUMBER to create PlainTimeLiteral
   - Added check in `parseNumberWithOptionalUnit()` to detect DATETIME token with "am"/"pm" value
   - Converts to 24-hour format: PM hours (except 12) add 12, 12 AM becomes 0 (midnight)
   - Test examples: `10 am` → `10:00`, `10 pm` → `22:00`, `10.5 am` → `10.5 am` (attometers)

### Remaining Challenges

- **Timezone Support** (scattered): Complex feature requiring timezone database and conversion logic (16 remaining tests)
- **Base Conversion Edge Cases** (Phase 6.4): Fix remaining fractional base conversion handling (3 tests)
- **Composite Unit Conversions**: Converting to composite units (100 cm to m cm → 1 m 0 cm)
- **Various Edge Cases** (Phases 6-7): Expression conversions, parser ambiguities (5 tests)

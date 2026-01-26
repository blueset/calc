# Notepad Calculator Language - Grammar Specification

**Version**: 1.0
**Date**: 2024-01-24
**Status**: Engineering Specification

---

## Table of Contents

1. [Overview](#overview)
2. [Lexical Grammar](#lexical-grammar)
3. [Syntactic Grammar](#syntactic-grammar)
4. [Type System](#type-system)
5. [Disambiguation Rules](#disambiguation-rules)
6. [Semantic Validation](#semantic-validation)
7. [Evaluation Rules](#evaluation-rules)
8. [Examples](#examples)

---

## Overview

### Language Characteristics

- **Paradigm**: Expression-based calculator with unit-aware arithmetic
- **Grammar Type**: Context-sensitive (primarily in lexical analysis)
- **Parser Strategy**: Hand-written recursive descent with operator precedence climbing
- **Evaluation**: Line-by-line with variable scoping

### Design Principles

1. **Human readability** over parsing simplicity
2. **Left-to-right** evaluation for conversions and operators
3. **Deferred validation**: Parse structurally, validate semantically
4. **First-class composite units**: `5 ft 3 in` treated as a value
5. **No implicit multiplication**: `2e` is invalid, must write `2 * e`

---

## Lexical Grammar

### Notation

```
UPPER_CASE = token type
lower_case = terminal literal
[x] = optional
{x} = zero or more
(x | y) = alternatives
```

### Token Types

```
NUMBER          Numeric literal (integer, decimal, scientific, with base)
UNIT            Physical unit (meter, kilogram, second, etc.)
IDENTIFIER      Variable name or constant
KEYWORD         Language keywords (if, then, else, to, in, as, etc.)
OPERATOR        Arithmetic/logical operators (+, -, *, /, etc.)
BOOLEAN         true | false
DATETIME        Date/time literal
STRING          Text content (for plain text lines)
COMMENT         # followed by text
NEWLINE         Line terminator
WHITESPACE      Spaces and tabs (significant in some contexts)
```

### Number Literals

#### Pattern

```regex
NUMBER ::= [-]? (INTEGER_PART [. FRAC_PART]? | . FRAC_PART) [SCI_SUFFIX]? [BASE_SPEC]?
         | BINARY_NUMBER
         | OCTAL_NUMBER
         | HEX_NUMBER

INTEGER_PART ::= DIGIT (DIGIT | _)*
FRAC_PART    ::= DIGIT (DIGIT | _)*
SCI_SUFFIX   ::= [eE] [+-]? DIGIT+

BINARY_NUMBER ::= 0b [01](_*[01])*
OCTAL_NUMBER  ::= 0o [0-7](_*[0-7])*
HEX_NUMBER    ::= 0x [0-9A-Fa-f](_*[0-9A-Fa-f])*

BASE_SPEC ::= (base INTEGER)
            | (bin | binary)
            | (oct | octal)
            | (hex | hexadecimal)
            | (dec | decimal)
```

#### Constraints

1. **Scientific notation takes precedence**: `2e3` → NUMBER(2000), not `2 * e * 3`
2. **No mixed base specifications**: `0b1010 hex` is INVALID
3. **Underscore only between digits**: `_123` and `123_` are invalid

#### Examples

```
42              → NUMBER(42, base=10)
3.14159         → NUMBER(3.14159, base=10)
0.5             → NUMBER(0.5, base=10)
.5              → NUMBER(0.5, base=10)  - leading zero optional
1_000_000       → NUMBER(1000000, base=10)
2.5e3           → NUMBER(2500, base=10)
4.8E-2          → NUMBER(0.048, base=10)
-5              → NUMBER(-5, base=10)
0b1010          → NUMBER(10, base=2)
0xABCD          → NUMBER(43981, base=16)
255 hex         → NUMBER(255, base=16) - interprets 255 in hex
ABC base 36     → NUMBER(13368, base=36)
```

### Unit Tokens

#### Classification

Units are classified into dimensions:
- Dimensionless (SI prefixes, percentages, ratios)
- Length (meter, foot, inch, etc.)
- Mass (gram, kilogram, pound, etc.)
- Time (second, minute, hour, day, etc.)
- Temperature (Celsius, Fahrenheit, Kelvin)
- Energy, Power, Speed, Pressure, Force, Angle, Currency, etc.
- User-defined (any identifier used as unit)

#### SI Prefix Rules

**Treatment**: SI-prefixed units are treated as single unit tokens (not parsed as prefix + base unit).

**Lexer strategy**:
```
# Unit database contains all valid combinations:
#   m, mm, cm, km, meter, millimeter, centimeter, kilometer
#   g, mg, kg, gram, milligram, kilogram
#   L, mL, liter, milliliter
# Each is stored as a separate unit token

# Lexer performs longest match:
5km             → 5 UNIT(kilometer)
5 km            → 5 UNIT(kilometer)
5mL             → 5 UNIT(milliliter)
5 m             → 5 UNIT(meter)
```

**Valid unit forms**:
```
Abbreviated with prefix:     km, mg, mL
Abbreviated without prefix:  m, g, L
Full name with prefix:       kilometer, milligram, milliliter
Full name without prefix:    meter, gram, liter
```

**Invalid unit forms** (not in unit database):
```
kilom           → INVALID (mixed abbreviation/full name)
kmeter          → INVALID (mixed abbreviation/full name)
```

**Note**: The distinction between "m" as meter vs "m" as milli-prefix is resolved by context (longest match in unit database).

#### Month Units

Month abbreviations do NOT include "m":
```
VALID:   month, months, mo, mth, mos, mths
INVALID: m (reserved for meter)
```

#### Currency Units

**Currency Symbol Tokens**:
```
CURRENCY_PREFIX ::= Unicode Sc category character NOT in unambiguous set
                  | Unambiguous currency symbols (€, £, ₹, US$, C$, A$, ...)

# Ambiguous prefix symbols ($, ¢, ¥, ¤) are from Unicode Sc minus unambiguous set
# Ambiguous suffix names (dollars, cents, pesos, francs, rupees, pennies)
# are treated as user-defined units (no special tokenization needed)
```

**Unambiguous currencies** (ISO 4217, convertible):
```
USD, EUR, JPY, GBP, CNY, ...    # ISO codes
US$, €, £, ₹, C$, A$, ...       # Unambiguous symbols (prefixes)
US dollars, euros, yuan, yen    # Unambiguous names (suffixes)
```

**Ambiguous currencies** (treated as user-defined units, non-convertible):
```
$, ¢, ¥, ¤                      # Ambiguous prefix symbols
dollars, cents, pesos, francs, rupees, pennies  # Ambiguous suffix names
```

**Source**: External JSON database (currencies.json)

### Date/Time Literals

#### Plain Date

```
PLAIN_DATE ::= YYYY . M . D
             | YYYY MONTH_NAME D
             | D MONTH_NAME YYYY
             | MONTH_NAME D YYYY
             | YYYY LONG_MONTH D
             | D LONG_MONTH YYYY
             | LONG_MONTH D YYYY

YYYY ::= [0-9]{4}
M    ::= [0-9]{1,2}   # 1-12, leading zero optional
D    ::= [0-9]{1,2}   # 1-31, leading zero optional

MONTH_NAME ::= Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec
LONG_MONTH ::= January | February | March | April | May | June | July | August | September | October | November | December
```

**NOT supported**: `YYYY-MM-DD` (conflicts with subtraction operator)

#### Plain Time

```
PLAIN_TIME ::= H : MM [: SS] [WHITESPACE AM_PM]
             | H WHITESPACE AM_PM

AM_PM ::= AM | PM | am | pm
```

#### Plain DateTime

```
PLAIN_DATETIME ::= PLAIN_DATE [WHITESPACE] PLAIN_TIME
                 | PLAIN_TIME [WHITESPACE] PLAIN_DATE
```

#### Relative Date/Time

```
RELATIVE_DATE ::= today | yesterday | tomorrow
                | NUMBER TIME_UNIT (ago | from now)

RELATIVE_TIME ::= now
                | NUMBER TIME_UNIT (ago | from now)
```

#### Unix Time

```
UNIX_TIME ::= NUMBER unix [seconds | milliseconds | s | ms]
```

#### Zoned DateTime

```
ZONED_DATETIME ::= (PLAIN_DATETIME | PLAIN_TIME) WHITESPACE TIMEZONE

TIMEZONE ::= UTC | Z | GMT
           | (UTC | GMT) [+-] OFFSET
           | IANA_TIMEZONE        # e.g., America/New_York
           | TIMEZONE_ABBREV      # e.g., EST, PST, JST (unambiguous only)
           | CITY_NAME            # e.g., New York, London, Tokyo (major cities)

OFFSET ::= H [: MM] | HMM
```

**City/timezone lookup**: Build-time constant table from IANA + GeoNames (500+ cities)

### Keywords

```
CONDITIONAL:    if, then, else
CONVERSION:     to, in, as, ->, →
BOOLEAN:        true, false, and, or, not
LOGICAL_OPS:    &&, ||, !
TEMPORAL:       ago, from, now, today, yesterday, tomorrow
OPERATORS:      per, mod, base, bin, binary, oct, octal, hex, hexadecimal, dec, decimal
```

### Operators

```
ARITHMETIC:     +, -, *, ×, ·, /, ÷, ^, %, mod, per
COMPARISON:     <, <=, >, >=, ==, !=
LOGICAL:        &&, ||, !
BITWISE:        &, |, xor, ~, <<, >>
UNARY:          -, !, ~
POSTFIX:        ! (factorial)
GROUPING:       (, )
ASSIGNMENT:     =
```

### Constants

```
CONSTANT ::= NaN | nan
           | Infinity | infinity | inf
           | pi | π | PI
           | e | E                    # Euler's number (context-dependent)
           | golden_ratio | phi | φ
```

**Note**: `e` as constant only when NOT part of scientific notation pattern.

### Identifiers

```
IDENTIFIER ::= IDENTIFIER_START IDENTIFIER_CONTINUE*

IDENTIFIER_START    ::= Unicode XID_Start
IDENTIFIER_CONTINUE ::= Unicode XID_Continue
```

Variables can use any Unicode identifier following UAX #31.

---

## Syntactic Grammar

### EBNF Notation

```
::=     defined as
|       alternative
[x]     optional
{x}     zero or more repetitions
(x)     grouping
```

### Top-Level Structure

```ebnf
Document ::= Line { NEWLINE Line }

Line ::= Heading
       | VariableDefinition
       | Expression [ InlineComment ]
       | PlainText
       | EmptyLine

Heading ::= "#" { "#" } WHITESPACE Text

InlineComment ::= "#" Text

VariableDefinition ::= IDENTIFIER "=" Expression
                       /* Must appear at beginning of line */

PlainText ::= /* Any text that doesn't parse as valid expression */

EmptyLine ::= /* Empty or whitespace-only line */
```

### Expressions

```ebnf
Expression ::= ConditionalExpr

ConditionalExpr ::= "if" BooleanExpr "then" Expression "else" Expression
                  | Conversion

Conversion ::= LogicalOrExpr [ ConversionOp ConversionTarget ]

ConversionOp ::= "to" | "in" | "as" | "->" | "→"

/* Conversions are LEFT-ASSOCIATIVE:
   "5 km to m in cm" means "((5 km) to m) in cm"
   Use parentheses for nested: "5 km to (m in cm)" */
```

### Conversion Targets

```ebnf
ConversionTarget ::= UnitTarget
                   | CompositeUnitTarget
                   | PresentationTarget
                   | PropertyTarget
                   | TimezoneTarget

UnitTarget ::= Unit

CompositeUnitTarget ::= Unit WHITESPACE Unit { WHITESPACE Unit }

PresentationTarget ::= "value"
                     | "fraction"
                     | "binary" | "bin"
                     | "octal" | "oct"
                     | "hexadecimal" | "hex"
                     | "decimal" | "dec"
                     | "base" INTEGER
                     | INTEGER ("decimals" | "decimal")
                     | INTEGER "sig" "figs"
                     | "scientific"
                     | "ISO" "8601"
                     | "RFC" "2822"
                     | "Unix" [ "seconds" | "milliseconds" | "s" | "ms" ]

PropertyTarget ::= "year" | "month" | "day" | "weekday"
                 | "day" "of" "year"
                 | "week" "of" "year"
                 | "hour" | "minute" | "second" | "millisecond"
                 | "offset"

TimezoneTarget ::= Timezone
```

### Boolean and Comparison Expressions

```ebnf
LogicalOrExpr ::= LogicalAndExpr { "||" LogicalAndExpr }

LogicalAndExpr ::= BitwiseOrExpr { "&&" BitwiseOrExpr }

BitwiseOrExpr ::= BitwiseXorExpr { "|" BitwiseXorExpr }

BitwiseXorExpr ::= BitwiseAndExpr { "xor" BitwiseAndExpr }

BitwiseAndExpr ::= ComparisonExpr { "&" ComparisonExpr }

ComparisonExpr ::= BitShiftExpr [ ComparisonOp BitShiftExpr ]

ComparisonOp ::= "<" | "<=" | ">" | ">=" | "==" | "!="
```

### Arithmetic Expressions

```ebnf
BitShiftExpr ::= AdditiveExpr { ("<<" | ">>") AdditiveExpr }

AdditiveExpr ::= MultiplicativeExpr { ("+" | "-") MultiplicativeExpr }

MultiplicativeExpr ::= UnaryExpr { MultiplicativeOp UnaryExpr }

MultiplicativeOp ::= "*" | "×" | "·" | "/" | "÷" | "per" | "%" | "mod"

UnaryExpr ::= "-" UnaryExpr
            | "!" UnaryExpr
            | "~" UnaryExpr
            | PowerExpr

PowerExpr ::= PostfixExpr [ "^" UnaryExpr ]

PostfixExpr ::= PrimaryExpr [ "!" ]  /* factorial */
```

### Primary Expressions

```ebnf
PrimaryExpr ::= Literal
              | Constant
              | Variable
              | FunctionCall
              | "(" Expression ")"

Literal ::= NumberWithUnit
          | DateTimeLiteral
          | BooleanLiteral

NumberWithUnit ::= NUMBER [ Unit ]
                 | CompositeUnit

CompositeUnit ::= NUMBER Unit WHITESPACE NUMBER Unit { WHITESPACE NUMBER Unit }
                  /* Example: 5 ft 3 in, 2 hr 30 min */
                  /* All units must have same dimension (validated semantically) */
```

### Functions

```ebnf
FunctionCall ::= FunctionName "(" [ ArgumentList ] ")"

FunctionName ::= TrigFunction
               | LogFunction
               | NumberFunction
               | RandomFunction
               | CombinatoricFunction

TrigFunction ::= "sin" | "cos" | "tan"
               | "asin" | "acos" | "atan"
               | "arcsin" | "arccos" | "arctan"
               | "sinh" | "cosh" | "tanh"
               | "asinh" | "acosh" | "atanh"
               | "arsinh" | "arcosh" | "artanh"

LogFunction ::= "sqrt" | "cbrt" | "log" | "ln" | "exp" | "log10"

NumberFunction ::= "abs" | "round" | "floor" | "ceil" | "trunc" | "frac"

RandomFunction ::= "random"

CombinatoricFunction ::= "perm" | "comb"

ArgumentList ::= Expression { "," Expression }
```

### Units

```ebnf
Unit ::= SimpleUnit
       | DerivedUnit

SimpleUnit ::= UNIT_TOKEN
             | IDENTIFIER  /* User-defined unit */

/* Derived units: multiplication/division of units
   Examples: m/s, kg m/s², W/m², J/(kg K) */

DerivedUnit ::= UnitTerm { WHITESPACE UnitTerm }
              | UnitTerm "/" UnitTerm { "/" UnitTerm }
              | UnitTerm "per" UnitTerm { "per" UnitTerm }

UnitTerm ::= SimpleUnit [ Exponent ]
           | "(" DerivedUnit ")" [ Exponent ]

Exponent ::= "^" INTEGER
           | "^" "-" INTEGER
           | SUPERSCRIPT_INTEGER

SUPERSCRIPT_INTEGER ::= [⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+
```

### Operator Precedence and Associativity

From highest to lowest:

```
Precedence  Operator                        Associativity
----------  --------                        -------------
1.          Function calls          f(x)    N/A
2.          Factorial               x!      Left
3.          Exponentiation          ^       Right
4.          Unary operators         -, !, ~ Right
5.          Multiplication/Division         Left
            *, ×, ·, /, ÷, per, %, mod
6.          Addition/Subtraction    +, -    Left
7.          Bit shifts              <<, >>  Left
8.          Comparisons                     Left
            <, <=, >, >=, ==, !=
9.          Bitwise AND             &       Left
10.         Bitwise XOR             xor     Left
11.         Bitwise OR              |       Left
12.         Logical AND             &&      Left
13.         Logical OR              ||      Left
14.         Conversion                      Left
            to, in, as, ->, →
15.         Conditional             if-then-else  Right
16.         Assignment              =       Right
```

**Note on associativity**:
- Right-associative: `2 ^ 3 ^ 2` = `2 ^ (3 ^ 2)` = 512
- Left-associative: `10 - 5 - 2` = `(10 - 5) - 2` = 3

---

## Type System

### Value Types

```
Dimensionless       Unitless numeric value (includes SI prefixes, percentages)
Length              Distance/length dimension (meter, foot, etc.)
Mass                Mass/weight dimension (gram, kilogram, pound, etc.)
Time                Duration dimension (second, minute, hour, day, etc.)
Temperature         Temperature dimension (Celsius, Fahrenheit, Kelvin)
Energy              Energy dimension (joule, calorie, BTU, etc.)
Power               Power dimension (watt, horsepower, etc.)
Speed               Velocity dimension (m/s, km/h, mph, etc.)
Pressure            Pressure dimension (pascal, bar, psi, etc.)
Force               Force dimension (newton, pound-force, etc.)
Angle               Angular dimension (degree, radian, etc.)
Currency            Monetary dimension (USD, EUR, JPY, etc. - per currency)
Data                Information dimension (bit, byte, KB, MB, etc.)
User-Defined        Custom dimension (clicks, trips, persons, etc.)

PlainDate           Date without time (YYYY-MM-DD)
PlainTime           Time without date (HH:MM:SS)
PlainDateTime       Date and time without timezone
Instant             Absolute point in time (Unix timestamp)
ZonedDateTime       Date, time, and timezone
DateDuration        Duration in calendar units (years, months, days)
TimeDuration        Duration in time units (hours, minutes, seconds)
DateTimeDuration    Duration with both date and time components

Boolean             true or false
```

### Type Compatibility

#### Unit Arithmetic

```
Same dimension:     5 m + 20 cm        → 5.2 m        (compatible)
Different dimension: 5 m + 20 kg       → ERROR         (incompatible)

Multiplication:     5 m * 2            → 10 m          (scalar multiplication)
                   5 m * 20 cm        → 100 m²        (derived unit)

Division:          10 m / 2            → 5 m           (scalar division)
                   10 m / 5 s         → 2 m/s         (derived unit)
                   10 km / 50 km/h    → 0.2 h         (unit cancellation)
```

#### Composite Units

```
Type:              CompositeUnit wraps multiple components of same dimension
Components:        [(5, ft), (3, in)]
Semantic level:    First-class value (same as simple values)

Operations:        (5 ft 3 in) * 2    → 10 ft 6 in
                   (5 ft 3 in) + (2 ft 9 in) → 8 ft 0 in
                   -(5 ft 3 in)       → -5 ft -3 in
```

#### Date/Time Arithmetic

See SPECS.md lines 834-937 for complete conversion table. Key rules:

```
PlainDate + TimeDuration        → PlainDateTime
PlainDate - PlainDate           → DateDuration
PlainTime + TimeDuration        → PlainTime (or PlainDateTime if >24h)
PlainDateTime + Duration        → PlainDateTime
Instant - Instant               → TimeDuration (in seconds)
ZonedDateTime - ZonedDateTime   → DateTimeDuration
```

---

## Disambiguation Rules

### 1. "in" Keyword Ambiguity

**Rule**: Left-to-right chained conversion

```
Expression:        5 km to m in cm
Interpretation:    ((5 km) to m) in cm      (left-associative)
Evaluation:        5000 m → 500000 cm
Result:            500000 cm

Explicit nesting:  5 km to (m in cm)        (composite unit target)
```

**Context determines meaning**:
```
10 in              → 10 inches (unit)
10 in in cm        → 10 inches converted to cm (first "in" = unit, second = keyword)
x in y             → x converted to y (keyword)
```

### 2. Unit Token Matching (including "m")

**Rule**: Longest match from unit database

```
5m                 → 5 UNIT(meter)
5 m                → 5 UNIT(meter)
5mL                → 5 UNIT(milliliter)
5mg                → 5 UNIT(milligram)
5mm                → 5 UNIT(millimeter)
```

**Lexer algorithm**:
```python
# After tokenizing NUMBER, attempt to match unit from database
def match_unit_after_number(input, position):
    # Try longest match first from unit database
    # Database contains: m, mm, mg, mL, meter, millimeter, milligram, milliliter, etc.

    candidates = []
    for unit_token in unit_database:
        if input[position:].startswith(unit_token):
            candidates.append(unit_token)

    # Return longest match
    if candidates:
        return max(candidates, key=len)

    return None
```

**No special "m" handling needed**: The unit "m" and "mL" and "mm" are all distinct entries in the unit database.

### 3. Scientific Notation vs Constant "e"

**Rule**: Scientific notation pattern takes lexical precedence

```
2e3                → NUMBER(2000)         (scientific notation)
2.5e-3             → NUMBER(0.0025)       (scientific notation)
e^2                → e to power 2         (constant)
2 * e * 3          → multiplication       (explicit operators required)
2e                 → INVALID              (not 2 * e)
```

**Lexer pattern**: `[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?`

### 4. City/Timezone Recognition

**Rule**: Lookup after time value in `TIME_VALUE IDENTIFIER` pattern

```
14:30 New York     → ZonedDateTime      (parse succeeds, city lookup succeeds)
I live in New York → PlainText          (parse fails for entire line)
New York           → PlainText          (not preceded by time value)
```

**Parsing strategy**:
```python
if current_token == TIME_VALUE and next_token == IDENTIFIER:
    timezone = lookup_city_or_timezone(next_token.value)
    if timezone:
        return ZonedDateTime(time, timezone)
    else:
        # Parse fails, treat line as plain text
        raise ParseError()
```

### 5. Composite vs Derived Units

**Rule**: Whitespace-separated NUMBER-UNIT pairs vs unit-only expressions

```
5 m 20 cm          → CompositeUnit    (value-unit pairs, same dimension)
m/s                → DerivedUnit      (unit expression, no values)
5 m * 20 cm        → DerivedUnit      (explicit operator creates derived)
5 m 20 kg          → ParseError       (different dimensions, semantic validation)
```

### 6. Number Base Conflicts

**Rule**: Prefix XOR suffix, never both

```
0b1010             → VALID      (binary prefix)
1010 bin           → VALID      (binary suffix)
0b1010 hex         → INVALID    (both prefix and suffix)
ABC hex            → VALID      (hex suffix, interprets ABC as hex digits)
```

**Validation**:
```python
if number.has_prefix and number.has_suffix:
    raise Error("Cannot mix prefix and suffix base specifications")
```

### 7. "per" Operator Context

**Rule**: Context determines unit formation vs division operator

```
"per" with single units following:
  km per h         → Derived unit (km/h)
  60 km per h      → 60 (km/h)        [unit formation]

"per" with expressions following:
  60 km per 2 h    → (60 km) / (2 h)  [division operator]
  → 30 km/h
```

**Disambiguation algorithm**:
```python
if operator == "per":
    if next_token_is_single_unit():
        # Unit formation
        return DerivedUnit(left_unit, "/", right_unit)
    else:
        # Division operator
        return BinaryOp(left_expr, "/", right_expr)
```

### 8. Angle Unit Quotes Special Case

**Rule**: Context-dependent interpretation of `'` and `"` symbols

```
After degree/deg/°:
  30° 15' 30"      → 30 degrees 15 arcminutes 30 arcseconds
  45 deg 30'       → 45 degrees 30 arcminutes

After plain number (no degree):
  5' 10"           → 5 feet 10 inches
  6'               → 6 feet
```

**Disambiguation algorithm**:
```python
if previous_token == DEGREE_UNIT:
    # Treat ' as arcminutes, " as arcseconds
    return ARCMINUTE or ARCSECOND
else:
    # Treat ' as feet, " as inches
    return FEET or INCHES
```

### 9. Whitespace Significance

**Rule**: Whitespace significance depends on context

**Required whitespace**:
```
Between keywords:    if true then 10 else 20
Between words:       3 days ago, New York, US dollars
```

**Optional whitespace**:
```
Around operators:    5+3  ≡  5 + 3
Number to unit:      5m  ≡  5 m  (when m = meter)
                     5kg  ≡  5 kg
```

**Context-dependent (unit token matching)**:
```
Attached units (no space between number and unit) are VALID:
  5m               → 5 UNIT(meter)
  5kg              → 5 UNIT(kilogram)
  5mL              → 5 UNIT(milliliter)
  5meter           → 5 UNIT(meter)

Separated units (with space) are VALID:
  5 m              → 5 UNIT(meter)
  5 kg             → 5 UNIT(kilogram)
  5 mL             → 5 UNIT(milliliter)
  5 meter          → 5 UNIT(meter)

Lexer uses longest match from unit database:
  - After number "5", lexer attempts to match unit tokens
  - "kg" matches UNIT(kilogram) as single token
  - "mL" matches UNIT(milliliter) as single token
  - "m" matches UNIT(meter) as single token
  - No separate prefix/base unit parsing
```

**Prohibited whitespace**:
```
Within scientific notation:   2e3  ✓    2 e 3  ✗
Within number:               1_000  ✓   1 _ 000  ✗
Within unit prefix:          5mL  ✓     5m L  ✗  (different meaning!)
```

**Multi-word units** (whitespace is part of unit):
```
cubic meter              (length³)
millimeter of mercury    (pressure)
New York                 (timezone city)
US dollars               (currency)
British Thermal Unit     (energy)
```

---

## Semantic Validation

### Phase 1: Type Checking

#### Validate Operations

```python
def validate_binary_op(op, left_type, right_type):
    if op in ['+', '-']:
        if not compatible_dimensions(left_type, right_type):
            raise TypeError(f"Cannot {op} incompatible dimensions")

    if op in ['*', '/']:
        # Creates derived unit or cancels dimensions
        return derive_unit_type(op, left_type, right_type)

    if op in ['<', '>', '<=', '>=', '==', '!=']:
        if not compatible_dimensions(left_type, right_type):
            raise TypeError(f"Cannot compare incompatible dimensions")
        return Boolean
```

#### Validate Conversions

```python
def validate_conversion(value_type, target_type):
    if isinstance(target_type, UnitTarget):
        if not same_dimension(value_type, target_type):
            raise ConversionError(f"Cannot convert {value_type} to {target_type}")

    elif isinstance(target_type, PresentationTarget):
        # Always valid (value, fraction, binary, etc.)
        pass

    elif isinstance(target_type, PropertyTarget):
        # Property extraction requires date/time types
        valid_types = (PlainDate, PlainTime, PlainDateTime, Instant, ZonedDateTime)
        if not isinstance(value_type, valid_types):
            raise TypeError(f"Cannot extract property from {value_type}")
```

#### Validate Composite Units

```python
def validate_composite_unit(components):
    dimensions = [component.unit.dimension for component in components]
    if not all_same(dimensions):
        raise TypeError(f"Composite unit components must have same dimension")
    return CompositeUnit(dimension=dimensions[0], components=components)
```

### Phase 2: Variable Scoping

```python
symbol_table = {}

def validate_variable_definition(name, value):
    # Variable definitions must be at line start
    if not at_line_start:
        raise SyntaxError("Variable definition must be at beginning of line")

    symbol_table[name] = evaluate(value)

def validate_variable_reference(name):
    if name not in symbol_table:
        raise NameError(f"Undefined variable: {name}")
    return symbol_table[name]
```

### Phase 3: Function Validation

```python
def validate_function_call(func_name, args):
    signatures = {
        'sin': [1],      # 1 argument
        'log': [1, 2],   # 1 or 2 arguments
        'round': [1, 2],
        'random': [0, 1, 2, 3],
        # ...
    }

    if len(args) not in signatures[func_name]:
        raise TypeError(f"{func_name} expects {signatures[func_name]} arguments")
```

---

## Evaluation Rules

### Unit Conversion

```python
def convert_unit(value, from_unit, to_unit):
    if from_unit.dimension != to_unit.dimension:
        raise ConversionError("Incompatible dimensions")

    # Convert to base unit, then to target unit
    base_value = value * from_unit.to_base_factor
    result = base_value / to_unit.to_base_factor
    return result
```

### Composite Unit Conversion

```python
def convert_composite_unit(composite, target_units):
    # Convert all components to base unit
    total_base = sum(comp.value * comp.unit.to_base_factor
                     for comp in composite.components)

    # Distribute to target units (largest to smallest)
    result = []
    remaining = total_base

    for target_unit in sorted(target_units, key=lambda u: u.to_base_factor, reverse=True):
        if target_unit == target_units[-1]:
            # Last unit: include fractional part
            value = remaining / target_unit.to_base_factor
        else:
            # Other units: use integer part
            value = int(remaining / target_unit.to_base_factor)
            remaining -= value * target_unit.to_base_factor

        result.append((value, target_unit))

    return CompositeUnit(result)
```

**Example**:
```
171 cm to ft in
  → 171 * 0.01 m = 1.71 m (base unit)
  → 1.71 / 0.3048 = 5.610... ft
  → Integer part: 5 ft, remaining: 0.610... ft
  → 0.610... ft * 12 = 7.32 in
  → Result: 5 ft 7.32 in
```

### Date Arithmetic

```python
def add_duration_to_date(date, duration):
    if duration.has_fractional_parts():
        # Convert entire duration to seconds, add
        total_seconds = duration.to_seconds()
        return date + timedelta(seconds=total_seconds)
    else:
        # Add each unit based on calendar values
        result = date
        result = add_years(result, duration.years)
        result = add_months(result, duration.months)
        result = add_days(result, duration.days)
        result = add_hours(result, duration.hours)
        # ...
        return result

def add_months(date, months):
    """
    Add months with day clamping for month overflow.

    Gregorian calendar rules:
    - If target day exceeds last day of target month, clamp to last day
    - Examples:
      Jan 31 + 1 month → Feb 28/29 (clamp to last day of Feb)
      Jan 30 + 1 month → Feb 28/29 (clamp to last day of Feb)
      Jan 15 + 1 month → Feb 15 (no clamping needed)
      Mar 31 + 1 month → Apr 30 (clamp to last day of Apr)
    """
    target_year = date.year + (date.month + months - 1) // 12
    target_month = (date.month + months - 1) % 12 + 1

    # Get last day of target month
    last_day = days_in_month(target_year, target_month)

    # Clamp day if necessary
    target_day = min(date.day, last_day)

    return Date(target_year, target_month, target_day)
```

**Special rules**:
1. Integer durations use calendar addition; fractional durations convert to smallest unit
2. Month addition uses day clamping (not day overflow)

**Implementation note**: The computation should follow the exact behavior of:
- `Temporal.PlainDate.prototype.add(duration, {overflow: "constrain"})`
- `Temporal.PlainDateTime.prototype.add(duration, {overflow: "constrain"})`

The `"constrain"` overflow mode clamps out-of-range values to valid range (as shown in examples below).

**Examples**:
```
1970 Feb 1 + 1 month 2 days     → 1970-03-03 (calendar: Feb+1month=Mar, +2days)
1970 Feb 1 + 1.5 months         → 1970-03-18 15:00:00 (1.5*30*24*3600 seconds)
1970 Jan 31 + 1 month           → 1970-02-28 (clamp to last day of Feb)
1970 Jan 30 + 1 month           → 1970-02-28 (clamp to last day of Feb)
1970 Jan 15 + 1 month           → 1970-02-15 (no clamping)
```

### Currency Conversion

```python
def convert_currency(amount, from_currency, to_currency):
    # Check if currencies are convertible
    if from_currency in AMBIGUOUS_CURRENCIES or to_currency in AMBIGUOUS_CURRENCIES:
        raise ConversionError("Cannot convert ambiguous currencies")

    # Fetch exchange rate
    rate = get_exchange_rate(from_currency, to_currency)
    result = amount * rate

    # Format with appropriate decimal places
    decimals = ISO4217_MINOR_UNITS[to_currency]
    return round(result, decimals)
```

---

## Examples

### Basic Arithmetic

```
2 + 2                           ⎙ 4
10 + -3                         ⎙ 7
3 * (4 + 5)                     ⎙ 27
10 / 4                          ⎙ 2.5
2 ^ 3                           ⎙ 8
5!                              ⎙ 120
```

### Unit Arithmetic

```
5 m + 20 cm                     ⎙ 5.2 m
2 hr - 30 min                   ⎙ 1.5 hr
3 kg * 2                        ⎙ 6 kg
4 m / 2                         ⎙ 2 m
5 m * 20 cm                     ⎙ 100 m²
10 km / 50 km/h                 ⎙ 0.2 h
```

### Unit Conversions

```
5 km to m                       ⎙ 5000 m
10 inches in cm                 ⎙ 25.4 cm
100 ft -> m                     ⎙ 30.48 m
100 USD to EUR                  ⎙ 85.8 EUR
60 mph to km/h                  ⎙ 96.56 km/h
```

### Composite Units

```
5 ft 3 in                       ⎙ 5 ft 3 in
(5 ft 3 in) * 2                 ⎙ 10 ft 6 in
5 ft 3 in to cm                 ⎙ 160.02 cm
171 cm to ft in                 ⎙ 5 ft 7.32 in
2 hr 30 min + 1 hr 45 min       ⎙ 4 hr 15 min
```

### Number Bases

```
0b1010                          ⎙ 10
0xA                             ⎙ 10
255 to binary                   ⎙ 0b11111111
255 to hex                      ⎙ 0xFF
ABC base 36                     ⎙ 13368
```

### Date/Time

```
1970 Jan 01                     ⎙ 1970-01-01 Thu
14:30                           ⎙ 14:30:00
2:30 PM                         ⎙ 14:30:00
today                           ⎙ (current date)
3 days ago                      ⎙ (current date - 3 days)
2023 Jan 10 - 2023 Jan 1        ⎙ 9 days
14:30 New York                  ⎙ 14:30:00 UTC-5
1970 Jan 01 01:00 UTC to Unix   ⎙ 3600
```

### Variables

```
x = 10 m                        ⎙ 10 m
y = 5 m                         ⎙ 5 m
x + y                           ⎙ 15 m
tax = 10%                       ⎙ 0.1
100 USD * (1 + tax)             ⎙ 110.00 USD
```

### Conditionals

```
if 5 > 3 then 10 else 20        ⎙ 10
if true || false then 100 USD else 200 USD  ⎙ 100.00 USD
```

### Functions

```
sin(30 deg)                     ⎙ 0.5
sqrt(16)                        ⎙ 4
log(100)                        ⎙ 2
round(3.6)                      ⎙ 4
abs(-5)                         ⎙ 5
```

---

## Implementation Checklist

### Lexer

- [ ] Number literal tokenization (decimal, binary, octal, hex)
- [ ] Scientific notation recognition
- [ ] Context-aware "m" disambiguation
- [ ] Unit tokenization with SI prefixes
- [ ] Date/time pattern recognition
- [ ] Currency symbol/name lookup
- [ ] Keyword vs identifier distinction
- [ ] Operator tokenization
- [ ] Comment handling
- [ ] Whitespace significance tracking

### Parser

- [ ] Recursive descent parser structure
- [ ] Operator precedence climbing
- [ ] Expression parsing (conditional, conversion, arithmetic)
- [ ] Function call parsing
- [ ] Composite unit parsing
- [ ] Variable definition parsing (line-start validation)
- [ ] City/timezone lookup during parsing
- [ ] Error recovery and reporting

### Semantic Analyzer

- [ ] Type system implementation
- [ ] Dimension compatibility checking
- [ ] Composite unit validation
- [ ] Variable scope tracking
- [ ] Function signature validation
- [ ] Conversion target validation
- [ ] Date/time type checking

### Evaluator

- [ ] Arithmetic evaluation
- [ ] Unit conversion engine
- [ ] Composite unit conversion
- [ ] Date/time arithmetic
- [ ] Currency conversion with exchange rates
- [ ] Function implementations
- [ ] Precision handling (Decimal.js)
- [ ] Result formatting
- [ ] Settings integration (precision, angle unit, decimal separator, digit grouping, date/time format, imperial units preference)

### Data Sources

- [ ] `units.json` - Unit database with conversion factors
- [ ] `currencies.json` - Currency codes and symbols
- [ ] `timezones.json` - IANA timezone mappings
- [ ] `exchange-rates.json` - Cached exchange rates
- [ ] Exchange rate API integration

### Testing

- [ ] Lexer unit tests
- [ ] Parser unit tests
- [ ] Semantic analyzer tests
- [ ] Evaluator tests
- [ ] Integration tests (200+ examples from SPECS.md)
- [ ] Error handling tests
- [ ] Edge case tests

---

## References

- **SPECS.md**: Full feature specification with examples
- **Unicode Standard Annex #31**: Identifier syntax
- **ISO 4217**: Currency codes
- **IANA Time Zone Database**: Timezone data
- **GeoNames**: City database
- **SI Units**: International System of Units

---

**End of Grammar Specification**

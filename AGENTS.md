# AGENTS.md

This file provides guidance when working with code in this repository.

## What This Is

A web-based "notepad calculator" — a text editor where each line is parsed as a math expression and evaluated in real-time. Supports unit-aware arithmetic, date/time math, currency conversion, variables, conditionals, and more.

## Commands

```bash
npm test              # Run all tests (vitest)
npx vitest run path/to/file.test.ts             # Run a single test file
npx vitest run -t "test name"                   # Run tests matching a name pattern
npm run build         # TypeScript check + Vite build
npm run dev           # Vite dev server
npm run lint          # ESLint
npm run build:nearley # Compile grammar.ne → grammar.ts
npm run dev:nearley   # Watch grammar.ne and recompile on changes
```

## Architecture

### Pipeline: Parse → Prune → Evaluate → Pick → Format

The core processing pipeline for each line:

1. **Preprocess** (`nearley/preprocessor.ts`) — Classify lines as empty, heading, or expression; strip inline comments
2. **Nearley Parse** (`nearley/grammar.ne` → `grammar.ts`, `lexer.ts`) — Produces multiple candidate parse trees (ambiguous grammar)
3. **Prune** (`nearley/pruner.ts`) — Scope-only validation: removes candidates that reference undefined variables. No type checking
4. **Evaluate-then-Pick** (`nearley/nearley-parser.ts`, `nearley/selector.ts`) — Trial-evaluate ALL surviving candidates, reject those that error, then pick from successes using structural scoring. This handles ambiguity with dynamic values (variables, function calls)
5. **Format** (`formatter.ts`) — Convert `Value` to display string using settings

Key insight: the parser is intentionally ambiguous. Disambiguation happens via trial evaluation, not grammar rules. When `Calculator.parse()` is called (syntax-only), no evaluator is passed, so only structural scoring picks the candidate. When `Calculator.calculate()` is called, the evaluator is passed for the evaluate-then-pick pipeline.

### Orchestration

- `Calculator` (`calculator.ts`) — Top-level orchestrator. Creates `NearleyParser`, `Evaluator`, `Formatter`
- `NearleyParser.parseDocument()` — Accepts optional `Evaluator` for trial evaluation. Returns `DocumentResult` with AST, errors, and optionally `evaluatedValues: Map<ParsedLine, Value | null>`
- `Calculator.calculate()` passes evaluator; `Calculator.parse()` does not

### Value Types

`Value` is the union type for all evaluated results:

- `NumericValue` — Unified type: `{ kind: "value", value: number, terms: Array<{unit, exponent}>, precision? }`. `terms: []` = dimensionless, `[{unit, exp:1}]` = simple unit, multiple/non-1 = derived
- `CompositeUnitValue` — Multiple value-unit pairs of same dimension (e.g., `5 ft 3 in`)
- `DateTimeValue` — PlainDate, PlainTime, PlainDateTime, Instant, ZonedDateTime, or Duration
- `BooleanValue`, `ErrorValue`, `PresentationValue`

Factory helpers: `numVal()`, `numValUnit()`, `numValTerms()`. Queries: `getUnit()`, `isDimensionless()`, `isSimpleUnit()`, `isDerived()`.

### Data Layer

- `DataLoader` — Loads JSON data files (units, currencies, timezones) and builds lookup tries for unit matching. Must call `.load()` before use
- `data/units.json` — Unit definitions with conversion factors
- `data/currencies.json` — Unambiguous/ambiguous currency definitions
- `data/timezones.json` — IANA timezone mappings
- `data/generate-*.ts` — Scripts that generate JSON data from CLDR/IANA sources

### Frontend

React + Vite + Tailwind CSS 4 + shadcn/ui components. CodeMirror 6 editor with custom extensions:

- `codemirror/language.ts` — Syntax highlighting via semantic tokens
- `codemirror/resultAlign.ts` — Aligns result panel with editor lines
- `codemirror/evalTooltip.ts` — Hover tooltips showing evaluated values
- `hooks/useCalculator.ts` — React hook that manages `Calculator` instance, exchange rate fetching, and re-calculation on input change

### Key Module Responsibilities

| Module | Role |
|--------|------|
| `evaluator/*.ts` | Expression evaluation, variable scoping, unit arithmetic, date math. Public: `evaluateDocument`, `createContext`, `tryEvaluateLine`, `commitAssignment` |
| `unit-converter.ts` | Unit conversion engine. Temperature etc. must use `unitConverter.convert()`, not factor-based |
| `currency.ts` | Currency conversion using exchange rates |
| `date-time.ts` | Date/time operations using `@js-temporal/polyfill` |
| `functions.ts` | Built-in math functions (trig, log, rounding, etc.) |
| `ast-helpers.ts` | Utilities for working with Nearley AST nodes (unit resolution, degree detection) |

## Testing Patterns

- Tests use `DataLoader` that must be `.load()`ed in `beforeAll`:
  ```ts
  let dataLoader: DataLoader;
  beforeAll(() => { dataLoader = new DataLoader(); dataLoader.load(); });
  ```
- Integration tests in `tests/calculator/integration/` cover end-to-end calculation scenarios
- Parser tests in `tests/calculator/nearley/` test parsing, pruning, selection
- Sandbox tests (`sandbox.test.ts`) are always skipped (22 tests)
- Path alias `@/` maps to `src/`

## Grammar Development

The Nearley grammar (`src/calculator/nearley/grammar.ne`) compiles to `grammar.ts`. After editing `.ne` file, run `npm run build:nearley`. The lexer (`lexer.ts`) uses `moo` for tokenization. The grammar's `@{%` preamble instantiates its own `DataLoader` for compile-time unit awareness.

## Conventions

- Unused variables prefixed with `_` (enforced by ESLint)
- `grammar.ts` is excluded from ESLint (auto-generated)
- TypeScript strict mode enabled
- ESM modules (`"type": "module"` in package.json)

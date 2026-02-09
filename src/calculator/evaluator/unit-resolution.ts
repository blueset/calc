import * as NearleyAST from "../nearley/types";
import type { Unit } from "../types/types";
import {
  isDegreeUnit,
  UnitResolutionContext,
} from "../ast-helpers";
export type { UnitResolutionContext } from "../ast-helpers";
import { SUPERSCRIPTS } from "@/constants";
import type { EvaluatorDeps } from "./eval-helpers";
import { createError } from "./eval-helpers";
import {
  type NumericValue,
  type ErrorValue,
  type EvaluatorSettings,
  numValTerms,
} from "./values";

// ── Numeric parsing ─────────────────────────────────────────────────

/**
 * Parse a numerical value node (NumberLiteral or PercentageLiteral) to a number or error
 */
export function parseNumericalValue(
  node: NearleyAST.NumericalValueNode,
): number | ErrorValue {
  if (node.type === "NumberLiteral") {
    const cleaned = node.value.replaceAll("_", "");
    // Validate base range
    if (node.base < 2 || node.base > 36) {
      return createError(`Base must be between 2 and 36, got ${node.base}`);
    }
    // For arbitrary base literals (e.g., "ABC base 10"), validate digits
    // Regular decimal literals (subType !== ArbitraryBase*) skip validation
    const isArbitraryBase = node.subType?.startsWith("ArbitraryBase");
    if (isArbitraryBase || node.base !== 10) {
      const validationError = validateBaseDigits(cleaned, node.base);
      if (validationError) {
        return createError(validationError);
      }
    }
    if (node.base === 10) {
      return parseFloat(cleaned);
    }
    // Handle fractional parts for non-base-10 numbers
    return parseBaseNumber(cleaned, node.base);
  }
  if (node.type === "PercentageLiteral") {
    const cleaned = node.value.replaceAll("_", "");
    const numValue = parseFloat(cleaned);
    return node.symbol === "percent" ? numValue / 100 : numValue / 1000;
  }
  return 0;
}

/**
 * Validate that all digits in a string are valid for the given base
 * Returns error message if invalid, null if valid
 */
export function validateBaseDigits(str: string, base: number): string | null {
  const digitRange =
    base <= 10
      ? `0-${String.fromCharCode(47 + base)}`
      : `0-9A-${String.fromCharCode(54 + base)}`;
  const invalid = new RegExp(`[^.\\-${digitRange}]`, "i");
  const match = str.match(invalid);
  if (match) {
    return `Invalid digit '${match[0]}' for base ${base}`;
  }
  return null;
}

/**
 * Parse a number string in an arbitrary base, supporting fractional parts
 */
export function parseBaseNumber(str: string, base: number): number {
  const parts = str.split(".");
  const intPart = parseInt(parts[0] || "0", base);

  if (parts.length === 1 || !parts[1]) {
    return intPart;
  }

  // Parse fractional part digit by digit
  let fracValue = 0;
  let placeValue = 1 / base;
  for (const char of parts[1]) {
    const digit = parseInt(char, base);
    if (isNaN(digit)) break;
    fracValue += digit * placeValue;
    placeValue /= base;
  }

  return (intPart >= 0 ? 1 : -1) * (Math.abs(intPart) + fracValue);
}

// ── Unit resolution ─────────────────────────────────────────────────

/**
 * Resolve a Nearley UnitsNode or CurrencyUnitNode to a Unit object
 */
export function resolveNearleyUnit(
  deps: EvaluatorDeps,
  unitNode: NearleyAST.UnitsNode | NearleyAST.CurrencyUnitNode,
  unitContext: UnitResolutionContext = { hasDegreeUnit: false },
): Unit | null {
  if (unitNode.type === "CurrencyUnit") {
    return resolveCurrencyUnit(deps, unitNode);
  }

  // UnitsNode - should be a single term for simple resolution
  if (unitNode.terms.length === 1 && unitNode.terms[0].exponent === 1) {
    return resolveUnitNode(deps, unitNode.terms[0].unit, unitContext);
  }

  // Multi-term or non-1 exponent: not a simple unit
  return null;
}

/**
 * Resolve a UnitNode directly to a Unit object using DataLoader's public API.
 * Consolidates the old resolveUnitFromNode + resolveUnitById two-step pipeline
 * into a single function that avoids redundant re-queries.
 */
export function resolveUnitNode(
  deps: EvaluatorDeps,
  node: NearleyAST.UnitNode,
  context: UnitResolutionContext = { hasDegreeUnit: false },
): Unit {
  let name = node.name;

  // Context-aware prime/doublePrime conversion
  if (name === "prime") {
    name = context.hasDegreeUnit ? "arcminute" : "ft";
  } else if (name === "doublePrime") {
    name = context.hasDegreeUnit ? "arcsecond" : "in";
  }

  // Step 1: Exact case-sensitive unit match
  const exactUnit = deps.dataLoader.getUnitByName(name);
  if (exactUnit) return exactUnit;

  // Step 2: Currency by exact code
  const currencyByCode = deps.dataLoader.getCurrencyByCode(name);
  if (currencyByCode && currencyByCode.code === name) {
    const currUnit = createCurrencyUnit(deps, currencyByCode.code);
    if (currUnit) return currUnit;
  }

  // Step 3: Currency by exact name
  const currenciesByName = deps.dataLoader.getCurrenciesByName(name);
  for (const currency of currenciesByName) {
    if (currency.names.includes(name)) {
      const currUnit = createCurrencyUnit(deps, currency.code);
      if (currUnit) return currUnit;
    }
  }

  // Step 4: Case-insensitive unit fallback (with similarity scoring)
  const fallbackUnit = deps.dataLoader.getUnitByNameWithFallback(name);
  if (fallbackUnit) return fallbackUnit;

  // Step 5: Case-insensitive currency fallback
  if (currencyByCode) {
    const currUnit = createCurrencyUnit(deps, currencyByCode.code);
    if (currUnit) return currUnit;
  }
  for (const currency of currenciesByName) {
    const currUnit = createCurrencyUnit(deps, currency.code);
    if (currUnit) return currUnit;
  }

  // Step 5: User-defined unit fallback
  return {
    id: name,
    dimension: `user_defined_${name}`,
    names: [name],
    conversion: { type: "linear", factor: 1.0 },
    displayName: {
      symbol: name,
      singular: name,
      plural: name + "s",
    },
  };
}

/**
 * Resolve a currency unit node to a Unit object
 */
export function resolveCurrencyUnit(
  deps: EvaluatorDeps,
  node: NearleyAST.CurrencyUnitNode,
): Unit | null {
  const name = node.name;

  // Check if it's an unambiguous currency symbol (like €, ₹, ₽, ฿)
  const unambiguous =
    deps.dataLoader.getCurrencyByAdjacentSymbol(name) ||
    deps.dataLoader.getCurrencyBySpacedSymbol(name);
  if (unambiguous) {
    return createCurrencyUnit(deps, unambiguous.code);
  }

  // Check if it's an ambiguous currency symbol (like $, £, ¥)
  const ambiguous = deps.dataLoader.getAmbiguousCurrencyByAdjacentSymbol(name);
  if (ambiguous) {
    return {
      id: ambiguous.dimension, // Use dimension as ID for ambiguous currencies
      dimension: ambiguous.dimension,
      names: [ambiguous.symbol],
      conversion: { type: "linear", factor: 1.0 },
      displayName: {
        symbol: name, // Preserve original symbol
        singular: name,
        plural: name,
      },
    };
  }

  // Try as currency code
  const currency = deps.dataLoader.getCurrencyByCode(name);
  if (currency) {
    return createCurrencyUnit(deps, currency.code);
  }

  return null;
}

/**
 * Create a Unit object for a currency code
 */
export function createCurrencyUnit(
  deps: EvaluatorDeps,
  code: string,
): Unit | null {
  const currency = deps.dataLoader.getCurrencyByCode(code);
  if (!currency) return null;

  let exchangeRate: number;
  if (currency.code === "USD") {
    exchangeRate = 1.0;
  } else {
    try {
      const converted = deps.currencyConverter.convert(
        { amount: 1.0, currencyCode: currency.code },
        "USD",
      );
      exchangeRate = converted.amount;
    } catch (e) {
      console.error(`Failed to get exchange rate for ${currency.code}:`, e);
      return null;
    }
  }

  return {
    id: code,
    dimension: "currency",
    names: [currency.code, ...currency.names],
    conversion: { type: "linear", factor: exchangeRate },
    displayName: {
      symbol: currency.code,
      singular: currency.displayName.singular,
      plural: currency.displayName.plural || currency.displayName.singular,
    },
  };
}

/**
 * Resolve a unit by its ID (after name→ID resolution from ast-helpers)
 */
export function resolveUnitById(
  deps: EvaluatorDeps,
  unitId: string,
  displayName: string,
): Unit {
  // STEP 1: Try regular unit database
  const unit = deps.dataLoader.getUnitById(unitId);
  if (unit) return unit;

  // STEP 2: Check unambiguous currency (ISO code)
  const currencyUnit = createCurrencyUnit(deps, unitId);
  if (currencyUnit) return currencyUnit;

  // STEP 3: Check ambiguous currency symbol
  if (unitId.startsWith("currency_symbol_")) {
    const ambiguous =
      deps.dataLoader.getAmbiguousCurrencyByAdjacentSymbol(displayName);
    if (ambiguous) {
      return {
        id: unitId,
        dimension: ambiguous.dimension,
        names: [ambiguous.symbol],
        conversion: { type: "linear", factor: 1.0 },
        displayName: {
          symbol: ambiguous.symbol,
          singular: ambiguous.symbol,
          plural: ambiguous.symbol,
        },
      };
    }
  }

  // STEP 4: User-defined unit fallback
  return {
    id: unitId,
    dimension: `user_defined_${unitId}`,
    names: [displayName],
    conversion: { type: "linear", factor: 1.0 },
    displayName: {
      symbol: displayName,
      singular: displayName,
      plural: displayName + "s",
    },
  };
}

/**
 * Resolve Nearley UnitsNode terms to NumericValue terms
 */
export function resolveNearleyUnitTerms(
  deps: EvaluatorDeps,
  node: NearleyAST.UnitsNode,
  unitContext: UnitResolutionContext = { hasDegreeUnit: false },
): Array<{ unit: Unit; exponent: number }> | null {
  const terms: Array<{ unit: Unit; exponent: number }> = [];
  let hasDegree = unitContext.hasDegreeUnit;
  for (const term of node.terms) {
    if (isDegreeUnit(term.unit.name)) {
      hasDegree = true;
    }
    const ctx: UnitResolutionContext = { hasDegreeUnit: hasDegree };
    const unit = resolveUnitNode(deps, term.unit, ctx);
    terms.push({ unit, exponent: term.exponent });
  }
  return terms;
}

// ── Dimension analysis ──────────────────────────────────────────────

/**
 * Compute dimension from derived unit terms
 *
 * Returns a map of base dimension ID → total exponent
 * Example: km/h → {length: 1, time: -1}
 */
export function computeDimension(
  deps: EvaluatorDeps,
  terms: Array<{ unit: Unit; exponent: number }>,
): Map<string, number> {
  const dimensionMap = new Map<string, number>();

  for (const term of terms) {
    // Get the dimension of this unit
    const dimension = deps.dataLoader.getDimensionById(term.unit.dimension);

    // Handle dimensions not in the database (user-defined, currency)
    if (!dimension) {
      if (isSpecialDimension(term.unit.dimension)) {
        const currentExp = dimensionMap.get(term.unit.dimension) || 0;
        dimensionMap.set(term.unit.dimension, currentExp + term.exponent);
        continue;
      }
      throw new Error(`Unknown dimension: ${term.unit.dimension}`);
    }

    // If it's a base dimension, add directly
    if (!dimension.derivedFrom?.length) {
      const currentExp = dimensionMap.get(dimension.id) || 0;
      dimensionMap.set(dimension.id, currentExp + term.exponent);
    } else {
      // If it's a derived dimension, expand it
      for (const baseDim of dimension.derivedFrom) {
        const currentExp = dimensionMap.get(baseDim.dimension) || 0;
        // Multiply exponents: term.exponent * baseDim.exponent
        dimensionMap.set(
          baseDim.dimension,
          currentExp + term.exponent * baseDim.exponent,
        );
      }
    }
  }

  // Remove zero exponents
  for (const [key, value] of dimensionMap.entries()) {
    if (value === 0) {
      dimensionMap.delete(key);
    }
  }

  return dimensionMap;
}

/**
 * Check if two dimension maps are compatible
 *
 * Two dimensions are compatible if they have the same base dimensions with the same exponents
 */
export function areDimensionsCompatible(
  dim1: Map<string, number>,
  dim2: Map<string, number>,
): boolean {
  // Check same number of dimensions
  if (dim1.size !== dim2.size) {
    return false;
  }

  // Check each dimension in dim1 exists in dim2 with same exponent
  for (const [dimId, exp1] of dim1.entries()) {
    const exp2 = dim2.get(dimId);
    if (exp2 === undefined || exp1 !== exp2) {
      return false;
    }
  }

  return true;
}

export function formatDimension(dim: Map<string, number>): string {
  const parts: string[] = [];
  for (const [dimId, exp] of dim.entries()) {
    if (exp === 1) {
      parts.push(dimId);
    } else {
      const expStr = String(exp);
      let superscript = "";
      for (const char of expStr) {
        superscript += SUPERSCRIPTS[char] || char;
      }
      parts.push(`${dimId}${superscript}`);
    }
  }
  return parts.join(", ");
}

// ── Term algebra ────────────────────────────────────────────────────

/**
 * Combine terms from multiplication or division operations
 * For division, negate exponents of right side before calling
 */
export function combineTerms(
  leftTerms: Array<{ unit: Unit; exponent: number }>,
  rightTerms: Array<{ unit: Unit; exponent: number }>,
): Array<{ unit: Unit; exponent: number }> {
  // Create map to combine exponents for same unit IDs
  const termMap = new Map<string, { unit: Unit; exponent: number }>();

  // Add left terms
  for (const term of leftTerms) {
    const existing = termMap.get(term.unit.id);
    if (existing) {
      existing.exponent += term.exponent;
    } else {
      termMap.set(term.unit.id, { unit: term.unit, exponent: term.exponent });
    }
  }

  // Add right terms
  for (const term of rightTerms) {
    const existing = termMap.get(term.unit.id);
    if (existing) {
      existing.exponent += term.exponent;
    } else {
      termMap.set(term.unit.id, { unit: term.unit, exponent: term.exponent });
    }
  }

  // Filter out zero exponents and return
  return Array.from(termMap.values()).filter((t) => t.exponent !== 0);
}

/**
 * Get the effective linear factor for a unit, handling linear/affine/variant conversions.
 */
function getEffectiveFactor(
  unit: Unit,
  variant?: EvaluatorSettings["variant"],
): number {
  if (unit.conversion.type === "linear" || unit.conversion.type === "affine") {
    return unit.conversion.factor;
  }
  return variant ? unit.conversion.variants[variant].factor : 1.0;
}

/**
 * Simplify terms by converting compatible units and canceling opposing exponents
 * Returns simplified terms and a conversion factor to apply to the numeric value
 */
export function simplifyTerms(
  terms: Array<{ unit: Unit; exponent: number }>,
  variant?: EvaluatorSettings["variant"],
): {
  simplified: Array<{ unit: Unit; exponent: number }>;
  factor: number;
} {
  // Group terms by dimension
  const byDimension = new Map<
    string,
    Array<{ unit: Unit; exponent: number }>
  >();
  for (const term of terms) {
    const dimension = term.unit.dimension;
    if (!byDimension.has(dimension)) {
      byDimension.set(dimension, []);
    }
    byDimension.get(dimension)!.push(term);
  }

  let factor = 1.0;
  const simplified: Array<{ unit: Unit; exponent: number }> = [];

  // For each dimension, check if units can be converted and canceled
  for (const [_dimension, dimTerms] of byDimension) {
    if (dimTerms.length === 1) {
      // Single unit for this dimension, keep as-is
      simplified.push(dimTerms[0]);
    } else {
      // Multiple units of same dimension - convert to common base unit and cancel
      // Calculate total exponent
      const totalExponent = dimTerms.reduce((sum, t) => sum + t.exponent, 0);

      // Apply conversion factors to the numeric value
      for (const term of dimTerms) {
        const unitFactor = getEffectiveFactor(term.unit, variant);
        const conversionFactor = Math.pow(unitFactor, term.exponent);
        factor *= conversionFactor;
      }

      // If total exponent is not zero, keep one representative unit with the total exponent
      if (totalExponent !== 0) {
        // Use the first unit as the representative (arbitrary choice)
        simplified.push({ unit: dimTerms[0].unit, exponent: totalExponent });
      }
      // If total exponent is zero, the units cancel completely (no term added)
    }
  }

  return { simplified, factor };
}

// ── Post-simplification term reduction ──────────────────────────────

/**
 * Floating point approximate equality with relative epsilon
 */
function approxEqual(a: number, b: number): boolean {
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-15);
  return Math.abs(a - b) / denom < 1e-9;
}

/** Check if a dimension ID is a special (currency or user-defined) dimension */
function isSpecialDimension(dim: string): boolean {
  return (
    dim === "currency" ||
    dim.startsWith("currency_symbol_") ||
    dim.startsWith("user_defined_")
  );
}

/**
 * Reduce terms after simplifyTerms by consolidating across different dimensions.
 *
 * Step 1: Group terms whose dimensions expand to a single base dimension.
 *         If multiple terms share the same base dimension, find a unit whose
 *         factor^totalExp matches the combined factor.
 *
 * Step 2: Check if the full base-dimension signature of remaining terms
 *         matches a named derived dimension → convert to that dimension's base unit.
 *
 * Guards: skip when terms.length <= 1, either operand was dimensionless,
 *         or any term has currency/user-defined dimension.
 */
export function reduceTerms(
  terms: Array<{ unit: Unit; exponent: number }>,
  value: number,
  deps: EvaluatorDeps,
  leftTerms: Array<{ unit: Unit; exponent: number }>,
  rightTerms: Array<{ unit: Unit; exponent: number }>,
): { reduced: Array<{ unit: Unit; exponent: number }>; value: number } {
  // Guard: already minimal
  if (terms.length <= 1) {
    return { reduced: terms, value };
  }

  // Guard: either operand was dimensionless → skip (prevents 2 * 30 km/h → m/s)
  if (leftTerms.length === 0 || rightTerms.length === 0) {
    return { reduced: terms, value };
  }

  // Guard: skip if any term has currency or user-defined dimension
  if (terms.some((t) => isSpecialDimension(t.unit.dimension))) {
    return { reduced: terms, value };
  }

  // ── Step 1: Single-base-dimension consolidation ──────────────────

  // For each term, determine if its dimension expands to a single base dimension
  // (e.g., volume -> length^3 is single-base; force -> mass*length*time^-2 is multi-base)
  const termBaseDimInfo: Array<{
    baseDim: string;
    dimExponent: number;
  } | null> = terms.map((term) => {
    const dimension = deps.dataLoader.getDimensionById(term.unit.dimension);
    if (!dimension) return null;

    if (!dimension.derivedFrom?.length) {
      return { baseDim: dimension.id, dimExponent: 1 };
    }
    if (dimension.derivedFrom.length === 1) {
      return {
        baseDim: dimension.derivedFrom[0].dimension,
        dimExponent: dimension.derivedFrom[0].exponent,
      };
    }
    return null; // Multi-base derived dimension
  });

  // Group by base dimension (only single-base terms)
  const byBaseDim = new Map<string, number[]>();
  for (let i = 0; i < terms.length; i++) {
    const info = termBaseDimInfo[i];
    if (info) {
      if (!byBaseDim.has(info.baseDim)) {
        byBaseDim.set(info.baseDim, []);
      }
      byBaseDim.get(info.baseDim)!.push(i);
    }
  }

  let currentValue = value;
  const resultTerms: Array<{ unit: Unit; exponent: number }> = [];
  const consumedIndices = new Set<number>();

  for (const [baseDim, indices] of byBaseDim) {
    if (indices.length < 2) continue; // No consolidation needed

    // Compute totalBaseExponent and combinedFactor
    let totalBaseExponent = 0;
    let combinedFactor = 1;

    for (const idx of indices) {
      const term = terms[idx];
      const info = termBaseDimInfo[idx]!;
      totalBaseExponent += term.exponent * info.dimExponent;
      const unitFactor = getEffectiveFactor(term.unit, deps.settings.variant);
      combinedFactor *= Math.pow(unitFactor, term.exponent);
    }

    if (totalBaseExponent === 0) {
      // Terms cancel completely — apply combined factor to value
      currentValue *= combinedFactor;
      for (const idx of indices) consumedIndices.add(idx);
      continue;
    }

    // Find a unit in baseDim where unit.factor^totalBaseExponent ≈ combinedFactor
    const baseDimension = deps.dataLoader.getDimensionById(baseDim);
    if (!baseDimension) continue;

    const candidateUnits = deps.dataLoader.getUnitsByDimension(baseDim);
    let foundUnit: Unit | null = null;

    for (const candidate of candidateUnits) {
      const candidateFactor = getEffectiveFactor(
        candidate,
        deps.settings.variant,
      );
      const candidatePower = Math.pow(candidateFactor, totalBaseExponent);
      if (approxEqual(candidatePower, combinedFactor)) {
        foundUnit = candidate;
        break;
      }
    }

    if (foundUnit) {
      resultTerms.push({ unit: foundUnit, exponent: totalBaseExponent });
      for (const idx of indices) consumedIndices.add(idx);
      // No factor adjustment needed — foundUnit.factor^totalExp ≈ combinedFactor
    }
  }

  // Add unconsumed terms
  for (let i = 0; i < terms.length; i++) {
    if (!consumedIndices.has(i)) {
      resultTerms.push(terms[i]);
    }
  }

  // ── Step 2: Named dimension matching ─────────────────────────────
  // Compute the base-dimension signature of all remaining terms. If it
  // matches a named derived dimension or a single base dimension, convert
  // to that dimension's base unit — but only when the result has fewer
  // perceived terms (using countAsTerms) than the input.

  if (resultTerms.length > 1) {
    const dimMap = computeDimension(deps, resultTerms);

    // Skip if any special dimensions remain
    if (!Array.from(dimMap.keys()).some(isSpecialDimension)) {
      // Try named derived dimension first, then single base dimension fallback
      let targetUnit: Unit | undefined;
      let targetExponent = 1;

      const signature = deps.dataLoader.buildSignatureFromMap(dimMap);
      const namedDimension = deps.dataLoader.getDimensionBySignature(signature);

      if (namedDimension) {
        targetUnit = deps.dataLoader.getUnitById(namedDimension.baseUnit);
      } else if (dimMap.size === 1) {
        // Single base dimension (e.g., {time:1} from GB/Mbps)
        const [dimId, exp] = dimMap.entries().next().value!;
        const baseDimension = deps.dataLoader.getDimensionById(dimId);
        if (baseDimension) {
          targetUnit = deps.dataLoader.getUnitById(baseDimension.baseUnit);
          targetExponent = exp;
        }
      }

      if (targetUnit) {
        const targetTermCount = targetUnit.countAsTerms ?? 1;
        if (targetTermCount < resultTerms.length) {
          let conversionFactor = 1;
          for (const term of resultTerms) {
            const f = getEffectiveFactor(term.unit, deps.settings.variant);
            conversionFactor *= Math.pow(f, term.exponent);
          }
          const baseUnitFactor = getEffectiveFactor(
            targetUnit,
            deps.settings.variant,
          );
          conversionFactor /= Math.pow(baseUnitFactor, targetExponent);

          return {
            reduced: [{ unit: targetUnit, exponent: targetExponent }],
            value: currentValue * conversionFactor,
          };
        }
      }
    }
  }

  return { reduced: resultTerms, value: currentValue };
}

/**
 * Multiply two numeric values (handles all combinations of number/unit/derived)
 */
export function multiplyValues(
  value: number,
  left: NumericValue,
  right: NumericValue,
  deps: EvaluatorDeps,
): NumericValue {
  const combinedTerms = combineTerms(left.terms, right.terms);
  const { simplified, factor } = simplifyTerms(
    combinedTerms,
    deps.settings.variant,
  );
  const { reduced, value: reducedValue } = reduceTerms(
    simplified,
    value * factor,
    deps,
    left.terms,
    right.terms,
  );
  return numValTerms(reducedValue, reduced);
}

/**
 * Divide two numeric values (handles all combinations of number/unit/derived)
 */
export function divideValues(
  value: number,
  left: NumericValue,
  right: NumericValue,
  deps: EvaluatorDeps,
): NumericValue {
  const negatedRightTerms = right.terms.map((t) => ({
    unit: t.unit,
    exponent: -t.exponent,
  }));
  const combinedTerms = combineTerms(left.terms, negatedRightTerms);
  const { simplified, factor } = simplifyTerms(
    combinedTerms,
    deps.settings.variant,
  );
  const { reduced, value: reducedValue } = reduceTerms(
    simplified,
    value * factor,
    deps,
    left.terms,
    negatedRightTerms,
  );
  return numValTerms(reducedValue, reduced);
}

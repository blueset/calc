/**
 * AST Helper Functions
 *
 * Helper functions providing operator mapping and unit resolution helpers
 * for Nearley AST consumption.
 */

import * as NearleyAST from './nearley/types';
import { DataLoader } from './data-loader';
import type { Unit } from './types/types';

// ============================================================================
// Unit Resolution Helpers
// ============================================================================

/**
 * Context for context-aware unit resolution
 */
export interface UnitResolutionContext {
  hasDegreeUnit: boolean; // True if a degree unit appears in the composite value
}

/**
 * Count matching characters at corresponding positions between two strings (case-sensitive)
 * Counts ALL matching positions, not just sequential from the left.
 * Used for similarity scoring in unit resolution.
 *
 * Example: countMatchingChars("KB", "kB") → 1 (position 1 matches: B==B)
 */
function countMatchingChars(a: string, b: string): number {
  let count = 0;
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) {
      count++;
    }
  }
  return count;
}

/**
 * Resolve UnitNode to unit ID and display name with optional context
 * Performs three-tier resolution:
 * 1. Exact case-sensitive match
 * 2. Case-insensitive with similarity scoring
 * 3. Fallback to name
 *
 * Returns the unit ID and display name, which can be used to lookup the full Unit from DataLoader
 */
export function resolveUnitFromNode(
  node: NearleyAST.UnitNode,
  dataLoader: DataLoader | null,
  context: UnitResolutionContext = { hasDegreeUnit: false }
): { id: string; displayName: string } {
  let name = node.name;

  // Context-aware prime/doublePrime conversion
  if (name === 'prime') {
    // If in degree context (composite value with degree unit), convert to arcminute
    // Otherwise, convert to ft (which resolves to 'foot')
    name = context.hasDegreeUnit ? 'arcminute' : 'ft';
  } else if (name === 'doublePrime') {
    // If in degree context, convert to arcsecond
    // Otherwise, convert to in (which resolves to 'inch')
    name = context.hasDegreeUnit ? 'arcsecond' : 'in';
  }

  if (dataLoader) {
    // Step 1: Try exact case-sensitive matches (early return on match)

    // Check units by exact case-sensitive name
    const unitExact = dataLoader['unitByCaseSensitiveName']?.get(name);
    if (unitExact) {
      return {
        id: unitExact.id,
        displayName: unitExact.displayName.symbol
      };
    }

    // Check currency by exact code match
    const currencyByCode = dataLoader.getCurrencyByCode(name);
    if (currencyByCode && currencyByCode.code === name) {
      return { id: name, displayName: name };
    }

    // Check currency by exact name match
    const currenciesByName = dataLoader.getCurrenciesByName(name);
    for (const currency of currenciesByName) {
      if (currency.names.includes(name)) {
        return { id: currency.code, displayName: currency.code };
      }
    }

    // Step 2: No exact match - collect case-insensitive candidates with similarity scoring
    type Candidate = {
      id: string;
      displayName: string;
      matchingChars: number;
    };

    const candidates: Candidate[] = [];

    // Case-insensitive unit candidates - score by matching against name variants
    const unitCandidates = dataLoader['unitByCaseInsensitiveName']?.get(name.toLowerCase());
    if (unitCandidates) {
      for (const unit of unitCandidates) {
        // Find the name variant that matches case-insensitively and score against it
        // (matches DataLoader.getUnitByNameWithFallback logic)
        const matchingName = unit.names.find(n => n.toLowerCase() === name.toLowerCase());
        const score = matchingName ? countMatchingChars(name, matchingName) : 0;
        candidates.push({
          id: unit.id,
          displayName: unit.displayName.symbol,
          matchingChars: score
        });
      }
    }

    // Case-insensitive currency by code
    if (currencyByCode) {
      candidates.push({
        id: currencyByCode.code,
        displayName: currencyByCode.code,
        matchingChars: countMatchingChars(name, currencyByCode.code)
      });
    }

    // Case-insensitive currency by name
    for (const currency of currenciesByName) {
      const bestMatchingChars = Math.max(
        ...currency.names.map(n => countMatchingChars(name, n)),
        countMatchingChars(name, currency.code)
      );
      candidates.push({
        id: currency.code,
        displayName: currency.code,
        matchingChars: bestMatchingChars
      });
    }

    // Select best candidate by similarity
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.matchingChars - a.matchingChars);
      const best = candidates[0];
      return { id: best.id, displayName: best.displayName };
    }
  }

  // Fallback: use name as-is
  return { id: name, displayName: name };
}

/**
 * Resolve UnitsNode to unit ID(s) and exponent(s)
 * Converts Nearley's numerator/denominator structure to signed exponents
 *
 * Returns either:
 * - { id: string } for a simple unit (single term with exponent 1)
 * - { terms: Array<{ id: string, exponent: number }> } for a derived unit
 *
 * The caller can use the IDs to lookup full Unit objects from DataLoader
 */
export function resolveUnitsExpression(
  node: NearleyAST.UnitsNode,
  dataLoader: DataLoader | null,
  context: UnitResolutionContext = { hasDegreeUnit: false }
): { id: string } | { terms: Array<{ id: string; exponent: number }> } {
  // If single term with exponent 1, return as simple unit ID
  if (node.terms.length === 1 && node.terms[0].exponent === 1) {
    const resolved = resolveUnitFromNode(node.terms[0].unit, dataLoader, context);
    return { id: resolved.id };
  }

  // Otherwise, return as derived unit with term IDs and exponents
  const terms = node.terms.map(termNode => {
    const resolved = resolveUnitFromNode(termNode.unit, dataLoader, context);
    return {
      id: resolved.id,
      exponent: termNode.exponent
    };
  });

  return { terms };
}

/**
 * Check if a unit name represents a degree unit
 */
export function isDegreeUnit(unitName: string): boolean {
  return unitName === 'degree' || unitName === 'deg' || unitName === '°';
}

/**
 * Check if a UnitsNode contains a degree unit
 */
export function hasDegreeInUnits(node: NearleyAST.UnitsNode): boolean {
  return node.terms.some(term => isDegreeUnit(term.unit.name));
}

/**
 * AST Helper Functions
 *
 * Helper functions providing operator mapping and unit resolution helpers
 * for Nearley AST consumption.
 */

import * as NearleyAST from "./nearley/types";
import { DataLoader } from "./data-loader";

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
  context: UnitResolutionContext = { hasDegreeUnit: false },
): { id: string; displayName: string } {
  let name = node.name;

  // Context-aware prime/doublePrime conversion
  if (name === "prime") {
    // If in degree context (composite value with degree unit), convert to arcminute
    // Otherwise, convert to ft (which resolves to 'foot')
    name = context.hasDegreeUnit ? "arcminute" : "ft";
  } else if (name === "doublePrime") {
    // If in degree context, convert to arcsecond
    // Otherwise, convert to in (which resolves to 'inch')
    name = context.hasDegreeUnit ? "arcsecond" : "in";
  }

  if (dataLoader) {
    // Step 1: Try unit lookup via public API (handles exact + case-insensitive with scoring)
    const unit = dataLoader.getUnitByNameWithFallback(name);
    if (unit) {
      return {
        id: unit.id,
        displayName: unit.displayName.symbol,
      };
    }

    // Step 2: Currency by exact code match
    const currencyByCode = dataLoader.getCurrencyByCode(name);
    if (currencyByCode && currencyByCode.code === name) {
      return { id: name, displayName: name };
    }

    // Step 3: Currency by exact name match
    const currenciesByName = dataLoader.getCurrenciesByName(name);
    for (const currency of currenciesByName) {
      if (currency.names.includes(name)) {
        return { id: currency.code, displayName: currency.code };
      }
    }

    // Step 4: Case-insensitive currency fallback
    if (currencyByCode) {
      return { id: currencyByCode.code, displayName: currencyByCode.code };
    }
    for (const currency of currenciesByName) {
      return { id: currency.code, displayName: currency.code };
    }
  }

  // Fallback: use name as-is
  return { id: name, displayName: name };
}

/**
 * Check if a unit name represents a degree unit
 */
export function isDegreeUnit(unitName: string): boolean {
  return unitName === "degree" || unitName === "deg" || unitName === "°";
}

/**
 * Check if a UnitsNode contains a degree unit
 */
export function hasDegreeInUnits(node: NearleyAST.UnitsNode): boolean {
  return node.terms.some((term) => isDegreeUnit(term.unit.name));
}

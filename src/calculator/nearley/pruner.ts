/**
 * Parse Tree Pruner
 *
 * Filters out invalid candidate parses based on scope rules:
 * - Out-of-scope variables
 *
 * Type-based disambiguation is now handled by trial evaluation in the
 * evaluate-then-pick pipeline (see NearleyParser.parseLine).
 *
 * Note: All unit identifiers are valid (either in-database or user-defined),
 * so no unit existence validation is needed.
 */

import * as NearleyAST from "./types";
import { DataLoader } from "../data-loader";

export interface PruningContext {
  dataLoader: DataLoader;
  definedVariables: Set<string>;
  lineNumber: number;
}

/**
 * Prune invalid candidates from parse results
 * Returns only semantically valid parses (scope-only validation)
 */
export function pruneInvalidCandidates(
  candidates: NearleyAST.LineNode[],
  context: PruningContext,
): NearleyAST.LineNode[] {
  return candidates.filter((candidate) => {
    if (candidate === null) {
      // Null lines are valid (empty lines)
      return true;
    }

    try {
      // Check for out-of-scope variables
      if (!validateVariableScopes(candidate, context)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error during pruning candidate: ", error);
      // If validation throws, consider candidate invalid
      return false;
    }
  });
}

/**
 * Validate that all variable references are in scope
 */
function validateVariableScopes(
  node: NearleyAST.LineNode,
  context: PruningContext,
): boolean {
  if (node === null) {
    return true;
  }

  // Collect all variable references
  const variables = collectVariables(node);

  // Check each variable is defined
  for (const varName of variables) {
    if (!context.definedVariables.has(varName)) {
      return false;
    }
  }

  return true;
}

/**
 * Collect all variable references in a node
 */
function collectVariables(node: NearleyAST.LineNode): Set<string> {
  const variables = new Set<string>();

  function visit(n: any): void {
    if (!n || typeof n !== "object") {
      return;
    }

    if (n.type === "Variable") {
      variables.add(n.name);
      return;
    }

    // Recurse into all properties
    for (const key of Object.keys(n)) {
      const value = n[key];
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (typeof value === "object" && value !== null) {
        visit(value);
      }
    }
  }

  visit(node);
  return variables;
}

/**
 * Check if a candidate is better than another based on structural simplicity
 * Used by selector, but defined here for potential pruning optimization
 */
export function compareComplexity(
  a: NearleyAST.LineNode,
  b: NearleyAST.LineNode,
): number {
  const aCount = countNodes(a);
  const bCount = countNodes(b);
  return aCount - bCount; // Lower count = simpler = better
}

/**
 * Count total nodes in AST (for complexity comparison)
 */
function countNodes(node: any): number {
  if (!node || typeof node !== "object") {
    return 0;
  }

  let count = 1; // Count this node

  // Count children
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (Array.isArray(value)) {
      count += value.reduce((sum, item) => sum + countNodes(item), 0);
    } else if (typeof value === "object" && value !== null) {
      count += countNodes(value);
    }
  }

  return count;
}

/**
 * Parse Tree Selector
 *
 * Chooses the best parse from valid candidates using prioritization rules:
 * 1. Prefer simpler unit expressions (fewer unit terms)
 * 2. Prefer in-database units over user-defined units
 * 3. Prefer variables over user-defined units (when identifier could be either)
 * 4. Prefer shorter parse trees (fewer AST nodes)
 */

import * as NearleyAST from './types';
import { PruningContext } from './pruner';

/**
 * Select the best candidate from valid parses
 * Assumes candidates have already been pruned for validity
 */
export function selectBestCandidate(
  candidates: NearleyAST.LineNode[],
  context: PruningContext
): NearleyAST.LineNode {
  if (candidates.length === 0) {
    throw new Error('No candidates to select from');
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  // Score each candidate
  const scores = candidates.map(candidate => ({
    candidate,
    score: scoreCandidate(candidate, context)
  }));

  // Sort by score (higher is better)
  scores.sort((a, b) => b.score - a.score);

  return scores[0].candidate;
}

/**
 * Score a candidate parse tree (higher = better)
 * Exported for testing
 */
export function scoreCandidate(node: NearleyAST.LineNode, context: PruningContext): number {
  let score = 0;

  // Rule 1: Prefer simpler unit expressions (fewer unit terms)
  score += 1000 * (1 / (1 + countUnitTerms(node)));

  // Rule 2: Prefer in-database units over user-defined units
  score += 500 * getInDatabaseUnitRatio(node, context);

  // Rule 3: Prefer variables over user-defined units
  score += 300 * getVariablePreferenceScore(node, context);

  // Rule 4: Prefer shorter parse trees (fewer nodes)
  const nodeCount = countNodes(node);
  score += 100 * (1 / (1 + nodeCount / 10));

  return score;
}

/**
 * Count total unit terms in the parse tree
 */
function countUnitTerms(node: any): number {
  if (!node || typeof node !== 'object') {
    return 0;
  }

  let count = 0;

  // Count units in UnitsNode
  if (node.type === 'Units') {
    count += node.numerators.length + node.denominators.length;
  }

  // Recurse into children
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (Array.isArray(value)) {
      count += value.reduce((sum, item) => sum + countUnitTerms(item), 0);
    } else if (typeof value === 'object' && value !== null) {
      count += countUnitTerms(value);
    }
  }

  return count;
}

/**
 * Get ratio of in-database units to total units (0.0 to 1.0)
 */
function getInDatabaseUnitRatio(node: any, context: PruningContext): number {
  const units = collectUnits(node);
  if (units.length === 0) {
    return 1.0; // No units = perfect score
  }

  const inDatabaseCount = units.filter(unitName => {
    return isInDatabaseUnit(unitName, context);
  }).length;

  return inDatabaseCount / units.length;
}

/**
 * Collect all unit names from the parse tree
 */
function collectUnits(node: any): string[] {
  const units: string[] = [];

  function visit(n: any): void {
    if (!n || typeof n !== 'object') {
      return;
    }

    if (n.type === 'Unit') {
      units.push(n.name);
      return;
    }

    // Recurse into all properties
    for (const key of Object.keys(n)) {
      const value = n[key];
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (typeof value === 'object' && value !== null) {
        visit(value);
      }
    }
  }

  visit(node);
  return units;
}

/**
 * Check if a unit name exists in the database
 */
function isInDatabaseUnit(unitName: string, context: PruningContext): boolean {
  try {
    // Try to find the unit in the database
    const unit = context.dataLoader.getUnitByName(unitName);
    return unit !== undefined;
  } catch {
    return false;
  }
}

/**
 * Get score for variable preference over user-defined units
 * Higher score when identifiers are resolved as variables vs units
 */
function getVariablePreferenceScore(node: any, context: PruningContext): number {
  // Find identifiers that could be either variables or units
  const ambiguousIdentifiers = findAmbiguousIdentifiers(node, context);

  if (ambiguousIdentifiers.length === 0) {
    return 1.0; // No ambiguity = perfect score
  }

  // Count how many are resolved as variables
  const variableCount = ambiguousIdentifiers.filter(id =>
    context.definedVariables.has(id)
  ).length;

  return variableCount / ambiguousIdentifiers.length;
}

/**
 * Find identifiers that could be interpreted as either variables or units
 */
function findAmbiguousIdentifiers(node: any, context: PruningContext): string[] {
  const identifiers: string[] = [];

  function visit(n: any): void {
    if (!n || typeof n !== 'object') {
      return;
    }

    // Check if this node is a Variable or Unit with the same name
    if (n.type === 'Variable') {
      const name = n.name;
      // Check if this could also be a unit
      if (!isInDatabaseUnit(name, context)) {
        identifiers.push(name);
      }
    }

    if (n.type === 'Unit') {
      const name = n.name;
      // Check if this could also be a variable
      if (context.definedVariables.has(name) && !isInDatabaseUnit(name, context)) {
        identifiers.push(name);
      }
    }

    // Recurse into all properties
    for (const key of Object.keys(n)) {
      const value = n[key];
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (typeof value === 'object' && value !== null) {
        visit(value);
      }
    }
  }

  visit(node);
  return identifiers;
}

/**
 * Count total nodes in AST (for complexity comparison)
 * Re-exported from pruner for consistency
 */
export function countNodes(node: any): number {
  if (!node || typeof node !== 'object') {
    return 0;
  }

  let count = 1; // Count this node

  // Count children
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (Array.isArray(value)) {
      count += value.reduce((sum, item) => sum + countNodes(item), 0);
    } else if (typeof value === 'object' && value !== null) {
      count += countNodes(value);
    }
  }

  return count;
}

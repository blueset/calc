/**
 * Parse Tree Pruner
 *
 * Filters out invalid candidate parses based on semantic rules:
 * - Out-of-scope variables
 * - Type errors (dimension compatibility)
 * - Dimension mismatches
 *
 * Note: All unit identifiers are valid (either in-database or user-defined),
 * so no unit existence validation is needed.
 */

import * as NearleyAST from './types';
import { DataLoader } from '../data-loader';

export interface PruningContext {
  dataLoader: DataLoader;
  definedVariables: Set<string>;
  lineNumber: number;
}

/**
 * Prune invalid candidates from parse results
 * Returns only semantically valid parses
 */
export function pruneInvalidCandidates(
  candidates: NearleyAST.LineNode[],
  context: PruningContext
): NearleyAST.LineNode[] {
  return candidates.filter(candidate => {
    if (candidate === null) {
      // Null lines are valid (empty lines)
      return true;
    }

    try {
      // Check for out-of-scope variables
      if (!validateVariableScopes(candidate, context)) {
        return false;
      }

      // Check for basic type errors
      if (!validateTypes(candidate, context)) {
        return false;
      }

      return true;
    } catch (error) {
      // If validation throws, consider candidate invalid
      return false;
    }
  });
}

/**
 * Validate that all variable references are in scope
 */
function validateVariableScopes(node: NearleyAST.LineNode, context: PruningContext): boolean {
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
    if (!n || typeof n !== 'object') {
      return;
    }

    if (n.type === 'Variable') {
      variables.add(n.name);
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
  return variables;
}

/**
 * Validate types - basic dimension compatibility checks
 * This is a lightweight check; full type checking happens in evaluator
 */
function validateTypes(node: NearleyAST.LineNode, context: PruningContext): boolean {
  if (node === null) {
    return true;
  }

  // For now, just ensure the tree structure is valid
  // More sophisticated type checking can be added later
  return validateExpression(node.type === 'VariableAssignment' ? node.value : node, context);
}

/**
 * Validate an expression node
 */
function validateExpression(node: NearleyAST.ExpressionNode, context: PruningContext): boolean {
  switch (node.type) {
    case 'ConditionalExpr':
      return (
        validateExpression(node.condition, context) &&
        validateExpression(node.then, context) &&
        validateExpression(node.else, context)
      );

    case 'Conversion':
      return (
        validateExpression(node.expression, context) &&
        validateConversionTarget(node.expression, node.target, context)
      );

    case 'BinaryExpression':
      return (
        validateExpression(node.left, context) &&
        validateExpression(node.right, context)
      );

    case 'UnaryExpression':
      return validateExpression(node.argument, context);

    case 'PostfixExpression':
      return validateExpression(node.argument, context);

    case 'Value':
      return true; // Values are always valid

    case 'CompositeValue':
      return node.values.every(v => true); // Composite values are always valid structurally

    case 'FunctionCall':
      return node.arguments.every(arg => validateExpression(arg, context));

    case 'BooleanLiteral':
    case 'Variable':
    case 'Constant':
      return true; // Literals are always valid

    // Date-time nodes
    case 'Instant':
    case 'PlainTime':
    case 'PlainDate':
    case 'PlainDateTime':
    case 'ZonedDateTime':
      return true; // Date-time literals are always valid

    default:
      // Unknown node type - reject to be safe
      return false;
  }
}

/**
 * Validate a conversion target
 */
function validateConversionTarget(
  expression: NearleyAST.ExpressionNode,
  target: NearleyAST.ConversionTargetNode,
  context: PruningContext
): boolean {
  // Reject conversions of dimensionless values to value with units
  if (target.type === 'Units') {
    const unitCount = target.numerators.length + target.denominators.length;
    const hasUnit = unitCount >= 1;

    if (hasUnit && isDimensionless(expression)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if an expression is dimensionless (no units attached)
 */
function isDimensionless(node: NearleyAST.ExpressionNode): boolean {
  switch (node.type) {
    case 'Value':
      // A Value is dimensionless if it has no unit field, or if it has a Units node with no numerators/denominators
      if (!node.unit) {
        return true;
      }
      if (node.unit.type === 'Units') {
        return node.unit.numerators.length === 0 && node.unit.denominators.length === 0;
      }
      // Currency units are not dimensionless
      return false;

    case 'BinaryExpression':
      // For simplicity, consider binary expressions dimensionful if either operand has dimensions
      // Full dimensional analysis would require evaluating the operation
      return isDimensionless(node.left) && isDimensionless(node.right);

    case 'UnaryExpression':
      return isDimensionless(node.argument);

    case 'PostfixExpression':
      return isDimensionless(node.argument);

    case 'BooleanLiteral':
    case 'Variable':
    case 'Constant':
      // These could have dimensions depending on their values
      // Conservative: assume they might have dimensions
      return false;

    case 'FunctionCall':
      // Functions can return dimensionful values
      return false;

    case 'ConditionalExpr':
      // Could have dimensions from either branch
      return false;

    case 'Conversion':
      // Conversions always produce dimensionful results
      return false;

    case 'CompositeValue':
      // Composite values are dimensionful
      return false;

    // Date-time nodes are not dimensionless (they're temporal values)
    case 'Instant':
    case 'PlainTime':
    case 'PlainDate':
    case 'PlainDateTime':
    case 'ZonedDateTime':
      return false;

    default:
      // Unknown types: conservative, assume dimensionful
      return false;
  }
}

/**
 * Check if a candidate is better than another based on structural simplicity
 * Used by selector, but defined here for potential pruning optimization
 */
export function compareComplexity(a: NearleyAST.LineNode, b: NearleyAST.LineNode): number {
  const aCount = countNodes(a);
  const bCount = countNodes(b);
  return aCount - bCount; // Lower count = simpler = better
}

/**
 * Count total nodes in AST (for complexity comparison)
 */
function countNodes(node: any): number {
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

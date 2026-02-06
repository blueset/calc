/**
 * Phase 2: Ambiguity Resolution Tests
 *
 * Tests the pruner and selector with real ambiguous parse cases:
 * - Variable vs user-defined unit disambiguation
 * - Multiple unit interpretations
 * - Operator precedence ambiguities
 * - Complex expressions with multiple valid parses
 */

import { describe, it, expect, beforeAll, assert } from 'vitest';
import nearley from 'nearley';
import grammar from '../../../src/calculator/nearley/grammar';
import { DataLoader } from '../../../src/calculator/data-loader';
import { pruneInvalidCandidates, PruningContext } from '../../../src/calculator/nearley/pruner';
import { selectBestCandidate } from '../../../src/calculator/nearley/selector';
import * as NearleyAST from '../../../src/calculator/nearley/types';

describe('Phase 2: Ambiguity Resolution', () => {
  let dataLoader: DataLoader;

  beforeAll(() => {
    dataLoader = new DataLoader();
  });

  /**
   * Helper to parse input and get all candidates
   */
  function parseExpression(input: string): NearleyAST.LineNode[] {
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    try {
      parser.feed(input);
      return parser.results as NearleyAST.LineNode[];
    } catch (error) {
      return [];
    }
  }

  describe('Parse Candidate Generation', () => {
    it('should handle expressions with valid syntax', () => {
      const testCases = [
        '5 * 3 + 2',    // Operator precedence
        '10 / 2',       // Division
        '5 km to m',    // Conversion
        'x + y',        // Variable addition (if x,y are variables or units)
      ];

      for (const input of testCases) {
        const candidates = parseExpression(input);
        expect(candidates.length).toBe(1);
      }
    });
  });

  describe('Pruner - Variable Scope Validation', () => {
    it('should prune candidates with undefined variables', () => {
      const input = 'x + y'; // x and y not defined
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(), // Empty - no variables defined
        lineNumber: 1
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);

      // If candidates use undefined variables, they should be pruned
      // However, identifiers might also be interpreted as user-defined units
      // So we might still have valid candidates where x and y are units
      expect(candidates.length).toBe(1);
      expect(validCandidates.length).toBe(0);
    });

    it('should keep candidates with defined variables', () => {
      const input = 'x + y';
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(['x', 'y']), // Both defined
        lineNumber: 1
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);

      // All candidates should be valid since variables are defined
      expect(candidates.length).toBe(1);
      expect(validCandidates.length).toBe(1);
    });

    it('should handle mixed defined/undefined variables', () => {
      const input = 'x + y';
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(['x']), // Only x defined, y undefined
        lineNumber: 1
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);

      // Some candidates might be pruned if they reference undefined y as a variable
      expect(candidates.length).toBe(1);
      expect(validCandidates.length).toBe(0);
    });
  });

  describe('Selector - Unit Preference', () => {
    it('should prefer in-database units over user-defined units', () => {
      // Parse expression with a known unit
      const input = '5 m'; // "m" is in database as meter
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(),
        lineNumber: 1
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);
      expect(validCandidates.length).toBe(1);
    });

    it('should prefer variables over user-defined units', () => {
      // When an identifier could be either a variable or a user-defined unit
      const input = 'foo + 5';
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(['foo']), // foo is defined as variable
        lineNumber: 1
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);
      expect(validCandidates.length).toBe(1);
    });

    it('should prefer simpler unit expressions', () => {
      // Expression that could be parsed with different unit structures
      const input = '10 m s'; // Could be meter*second or different interpretations
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(),
        lineNumber: 1
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);
      expect(validCandidates.length).toBe(1);
    });

    it('should prefer shorter parse trees', () => {
      const input = '5 + 3 + 2'; // Could be left-associative or right-associative
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(),
        lineNumber: 1
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);
      expect(validCandidates.length).toBe(1);
    });
  });

  describe('End-to-End Ambiguity Resolution', () => {
    it('should handle identifiers with defined variables', () => {
      // Test case: identifier as variable
      const input = 'distance + 5';
      const candidates = parseExpression(input);

      // When distance is defined as a variable
      const contextWithVar: PruningContext = {
        dataLoader,
        definedVariables: new Set(['distance']),
        lineNumber: 1
      };

      const validWithVar = pruneInvalidCandidates(candidates, contextWithVar);
      expect(validWithVar.length).toBe(1);
    });

    it('should handle simple unit expressions', () => {
      // Simple expression with standard units
      const input = '100 kg m / s'; // kg*m/s (not s² - that would need parentheses)
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(),
        lineNumber: 1
      };
      const validCandidates = pruneInvalidCandidates(candidates, context);
      expect(validCandidates.length).toBe(1);

      const best = selectBestCandidate(validCandidates, context);
      expect(best).toBeDefined();
    });

    it('should handle conversion expressions', () => {
      const input = '5 km to m';
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(),
        lineNumber: 1
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);
      expect(validCandidates.length).toBe(1);

      const best = selectBestCandidate(validCandidates, context);
      expect(best).toBeDefined();
      expect(best!.type).toBe('Conversion');
    });

    it('should handle arithmetic with units', () => {
      const input = '5 m + 3 m';
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(),
        lineNumber: 1
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);
      expect(validCandidates.length).toBe(1);
    });
  });

  describe('Pruner and Selector Integration', () => {
    it('should demonstrate pruner filtering with scoring', () => {
      // Test the full pipeline: parse → prune → select
      const input = '5 km + 3 km';
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(),
        lineNumber: 1
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);

      if (validCandidates.length > 0) {
        const best = selectBestCandidate(validCandidates, context);
        expect(best).toBeDefined();
      }
    });

    it('should handle unit addition with known units', () => {
      const input = '10 m + 5 cm';
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(),
        lineNumber: 1
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);
      expect(validCandidates.length).toBe(1);

      const best = selectBestCandidate(validCandidates, context);
      expect(best).toBeDefined();
    });

    it('should handle derived units correctly', () => {
      const input = '60 km/h';
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(),
        lineNumber: 1
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);
      expect(validCandidates.length).toBe(1);

      const best = selectBestCandidate(validCandidates, context);
      expect(best).toBeDefined();
      expect(best!.type).toBe('Value');
    });
  });

  describe('Real-World Ambiguous Cases', () => {
    it('should handle currency with custom units', () => {
      const input = '100 EUR per person';
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(),
        lineNumber: 1
      };

      expect(candidates.length).toBeGreaterThan(1);
      const validCandidates = pruneInvalidCandidates(candidates, context);
      expect(validCandidates.length).toBe(1);

      const best = selectBestCandidate(validCandidates, context);
      expect(best).toBeDefined();
      expect(best!.type).toBe('Value');
    });

    it('should handle currency with defined variables', () => {
      const input = '100 EUR per person';
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(['person']),
        lineNumber: 1
      };

      expect(candidates.length).toBeGreaterThan(1);
      const validCandidates = pruneInvalidCandidates(candidates, context);
      expect(validCandidates.length).toBeGreaterThan(1);

      const best = selectBestCandidate(validCandidates, context);
      expect(best).toBeDefined();
      expect(best!.type).toBe('BinaryExpression');
    });

    it('should handle complex units', () => {
      const input = '1000 pound force person hong kong dollar nautical mile';
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(),
        lineNumber: 1
      };

      expect(candidates.length).toBeGreaterThan(1);
      const validCandidates = pruneInvalidCandidates(candidates, context);
      expect(validCandidates.length).toBeGreaterThan(1);

      const best = selectBestCandidate(validCandidates, context);
      assert(!!best);
      assert(best.type === 'Value');
      assert(!!best.unit);
      assert(best.unit.type === 'Units');
      assert(best.unit.terms.length === 4);
      assert(best.unit.terms[0].unit.name === 'pound force');
      assert(best.unit.terms[1].unit.name === 'person');
      assert(best.unit.terms[2].unit.name === 'hong kong dollar');
      assert(best.unit.terms[3].unit.name === 'nautical mile');
    });

    it('should handle complex units with denominators', () => {
      const input = '1000 pound force person hong kong dollar per nautical mile';
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(),
        lineNumber: 1
      };

      expect(candidates.length).toBeGreaterThan(1);
      const validCandidates = pruneInvalidCandidates(candidates, context);
      expect(validCandidates.length).toBeGreaterThan(1);

      const best = selectBestCandidate(validCandidates, context);
      assert(!!best);
      assert(best.type === 'Value');
      assert(!!best.unit);
      assert(best.unit.type === 'Units');
      assert(best.unit.terms.length === 4);
      assert(best.unit.terms[0].unit.name === 'pound force');
      assert(best.unit.terms[1].unit.name === 'person');
      assert(best.unit.terms[2].unit.name === 'hong kong dollar');
      assert(best.unit.terms[3].unit.name === 'nautical mile');
      assert(best.unit.terms[3].exponent === -1); // denominator
    });

    it('should handle composite units', () => {
      const input = '5 ft 7 in';
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(),
        lineNumber: 1
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);
      expect(validCandidates.length).toBe(1);
      const best = selectBestCandidate(validCandidates, context);
      expect(best).toBeDefined();
    expect(best!.type).toBe('CompositeValue');
    });

    it('should handle expressions with multiple operators', () => {
      const input = '10 kg * 5 m / 2 s';
      const candidates = parseExpression(input);

      const context: PruningContext = {
        dataLoader,
        definedVariables: new Set(),
        lineNumber: 1
      };

      const validCandidates = pruneInvalidCandidates(candidates, context);
      expect(validCandidates.length).toBeGreaterThan(0);

      const best = selectBestCandidate(validCandidates, context);
      expect(best).toBeDefined();
      expect(best!.type).toBe('BinaryExpression');
    });
  });
});

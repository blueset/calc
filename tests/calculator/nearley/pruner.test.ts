/**
 * Pruner Unit Tests
 *
 * Tests the parse tree pruning logic that filters out semantically invalid
 * candidate parses from Nearley's ambiguous parses.
 *
 * Test Coverage (45 tests across 5 categories):
 * - A. Core Pruning Logic (8 tests)
 * - B. Variable Collection (4 tests)
 * - C. Type Validation (16 tests)
 * - D. Complexity Scoring (6 tests)
 * - E. Integration Tests (11 tests)
 *
 * Note: Exceeds planned 30 tests to provide comprehensive coverage of all
 * expression types, validation scenarios, and edge cases.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { DataLoader } from '../../../src/calculator/data-loader';
import {
  pruneInvalidCandidates,
  compareComplexity,
  PruningContext
} from '../../../src/calculator/nearley/pruner';
import * as NearleyAST from '../../../src/calculator/nearley/types';

describe('Pruner Unit Tests', () => {
  let dataLoader: DataLoader;

  beforeAll(() => {
    dataLoader = new DataLoader();
    dataLoader.load();
  });

  /**
   * Helper to create a minimal pruning context
   */
  function createContext(definedVariables: string[] = []): PruningContext {
    return {
      dataLoader,
      definedVariables: new Set(definedVariables),
      lineNumber: 1
    };
  }

  /**
   * Helper to create a simple value node
   */
  function createValue(value: string): NearleyAST.ValueNode {
    return {
      type: 'Value',
      location: 0,
      value: {
        type: 'NumberLiteral',
        location: 0,
        subType: 'decimal',
        base: 10,
        value
      },
      unit: null
    };
  }

  /**
   * Helper to create a variable node
   */
  function createVariable(name: string): NearleyAST.VariableNode {
    return {
      type: 'Variable',
      location: 0,
      name
    };
  }

  /**
   * Helper to create a constant node
   */
  function createConstant(name: string): NearleyAST.ConstantNode {
    return {
      type: 'Constant',
      location: 0,
      name
    };
  }

  /**
   * Helper to create a binary expression node
   */
  function createBinaryExpression(
    left: NearleyAST.ExpressionNode,
    operator: NearleyAST.BinaryOperator,
    right: NearleyAST.ExpressionNode
  ): NearleyAST.BinaryExpressionNode {
    return {
      type: 'BinaryExpression',
      location: 0,
      operator,
      left,
      right
    };
  }

  /**
   * Helper to create a unary expression node
   */
  function createUnaryExpression(
    operator: NearleyAST.UnaryOperator,
    argument: NearleyAST.ExpressionNode
  ): NearleyAST.UnaryExpressionNode {
    return {
      type: 'UnaryExpression',
      location: 0,
      operator,
      argument
    };
  }

  /**
   * Helper to create a function call node
   */
  function createFunctionCall(
    name: string,
    args: NearleyAST.ExpressionNode[]
  ): NearleyAST.FunctionCallNode {
    return {
      type: 'FunctionCall',
      location: 0,
      name,
      arguments: args
    };
  }

  describe('A. Core Pruning Logic', () => {
    describe('pruneInvalidCandidates() - Main pruning function', () => {
      it('should filter out invalid candidates', () => {
        const context = createContext(); // No variables defined
        const validCandidate = createValue('42');
        const invalidCandidate = createVariable('undefined_var');

        const candidates: NearleyAST.LineNode[] = [validCandidate, invalidCandidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(validCandidate);
      });

      it('should preserve valid candidates', () => {
        const context = createContext(['x', 'y']);
        const candidate1 = createVariable('x');
        const candidate2 = createVariable('y');
        const candidate3 = createBinaryExpression(
          createVariable('x'),
          'plus',
          createVariable('y')
        );

        const candidates: NearleyAST.LineNode[] = [candidate1, candidate2, candidate3];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(3);
        expect(result).toEqual(candidates);
      });

      it('should handle empty candidate lists', () => {
        const context = createContext();
        const candidates: NearleyAST.LineNode[] = [];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toEqual([]);
      });

      it('should handle all-null candidates', () => {
        const context = createContext();
        const candidates: NearleyAST.LineNode[] = [null, null, null];
        const result = pruneInvalidCandidates(candidates, context);

        // Null lines are valid (empty lines)
        expect(result).toHaveLength(3);
        expect(result).toEqual([null, null, null]);
      });

      it('should catch validation exceptions', () => {
        const context = createContext();
        // Create a malformed candidate that might throw during validation
        const malformedCandidate = {
          type: 'UnknownType',
          location: 0
        } as any;

        const candidates: NearleyAST.LineNode[] = [
          createValue('42'),
          malformedCandidate
        ];
        const result = pruneInvalidCandidates(candidates, context);

        // Should filter out the malformed candidate
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(createValue('42'));
      });

      it('should preserve candidate order', () => {
        const context = createContext(['a', 'b', 'c']);
        const candidates: NearleyAST.LineNode[] = [
          createVariable('a'),
          createVariable('b'),
          createVariable('c')
        ];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual(candidates[0]);
        expect(result[1]).toEqual(candidates[1]);
        expect(result[2]).toEqual(candidates[2]);
      });
    });

    describe('validateVariableScopes() - Variable validation', () => {
      it('should accept candidates with in-scope variables', () => {
        const context = createContext(['x', 'y', 'z']);
        const candidate = createBinaryExpression(
          createVariable('x'),
          'plus',
          createVariable('y')
        );

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(candidate);
      });

      it('should reject candidates with out-of-scope variables', () => {
        const context = createContext(['x']); // Only 'x' is defined
        const candidate = createBinaryExpression(
          createVariable('x'),
          'plus',
          createVariable('undefined_var')
        );

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(0);
      });
    });
  });

  describe('B. Variable Collection', () => {
    describe('collectVariables() - Variable extraction (tested via pruning)', () => {
      it('should find all Variable nodes in tree', () => {
        const context = createContext(['x', 'y', 'z']);
        const candidate = createBinaryExpression(
          createBinaryExpression(
            createVariable('x'),
            'plus',
            createVariable('y')
          ),
          'times',
          createVariable('z')
        );

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        // All variables are defined, should pass
        expect(result).toHaveLength(1);
      });

      it('should handle nested expressions', () => {
        const context = createContext(['a', 'b', 'c', 'd']);
        const candidate = createBinaryExpression(
          createBinaryExpression(
            createVariable('a'),
            'plus',
            createBinaryExpression(
              createVariable('b'),
              'times',
              createVariable('c')
            )
          ),
          'minus',
          createVariable('d')
        );

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it('should handle arrays of nodes (function arguments)', () => {
        const context = createContext(['x', 'y', 'z']);
        const candidate = createFunctionCall('sum', [
          createVariable('x'),
          createVariable('y'),
          createVariable('z')
        ]);

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it('should ignore non-variable identifiers (constants, units)', () => {
        const context = createContext(); // No variables defined
        // Constants should be valid even without being in definedVariables
        const candidate = createConstant('pi');

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        // Constants are always valid
        expect(result).toHaveLength(1);
      });
    });
  });

  describe('C. Type Validation', () => {
    describe('validateTypes() - Basic type checking', () => {
      it('should accept structurally valid expressions', () => {
        const context = createContext(['x']);
        const candidate = createBinaryExpression(
          createVariable('x'),
          'plus',
          createValue('42')
        );

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it('should handle all expression types', () => {
        const context = createContext(['x']);
        const expressionTypes: NearleyAST.LineNode[] = [
          createValue('42'),
          { type: 'BooleanLiteral', location: 0, value: true },
          createVariable('x'),
          createConstant('pi'),
          createBinaryExpression(createValue('1'), 'plus', createValue('2')),
          createUnaryExpression('minus', createValue('5'))
        ];

        for (const expr of expressionTypes) {
          const result = pruneInvalidCandidates([expr], context);
          expect(result).toHaveLength(1);
        }
      });

      it('should validate nested structures', () => {
        const context = createContext(['x', 'y']);
        const candidate = createBinaryExpression(
          createUnaryExpression(
            'minus',
            createBinaryExpression(
              createVariable('x'),
              'times',
              createValue('2')
            )
          ),
          'plus',
          createVariable('y')
        );

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it('should reject unknown node types', () => {
        const context = createContext();
        const invalidNode = {
          type: 'InvalidExpressionType',
          location: 0
        } as any;

        const candidates: NearleyAST.LineNode[] = [invalidNode];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(0);
      });
    });

    describe('validateExpression() - Expression validation (tested via pruning)', () => {
      it('should validate ConditionalExpr correctly', () => {
        const context = createContext(['x']);
        const candidate: NearleyAST.ConditionalExprNode = {
          type: 'ConditionalExpr',
          location: 0,
          condition: { type: 'BooleanLiteral', location: 0, value: true },
          then: createVariable('x'),
          else: createValue('0')
        };

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it('should validate Conversion expressions', () => {
        const context = createContext();
        const candidate: NearleyAST.ConversionNode = {
          type: 'Conversion',
          location: 0,
          expression: createValue('5'),
          operator: 'kw_to',
          target: {
            type: 'PresentationFormat',
            location: 0,
            format: 'value'
          }
        };

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it('should validate PostfixExpression correctly', () => {
        const context = createContext();
        const candidate: NearleyAST.PostfixExpressionNode = {
          type: 'PostfixExpression',
          location: 0,
          operator: 'bang',
          argument: createValue('5')
        };

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it('should validate FunctionCall with multiple arguments', () => {
        const context = createContext(['x', 'y']);
        const candidate = createFunctionCall('max', [
          createVariable('x'),
          createVariable('y'),
          createValue('100')
        ]);

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it('should validate CompositeValue nodes', () => {
        const context = createContext();
        const candidate: NearleyAST.CompositeValueNode = {
          type: 'CompositeValue',
          location: 0,
          subType: 'length',
          values: [createValue('5'), createValue('10')]
        };

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it('should validate date-time nodes: Instant', () => {
        const context = createContext();
        const candidate: NearleyAST.InstantKeywordNode = {
          type: 'Instant',
          location: 0,
          keyword: 'now'
        };

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it('should validate date-time nodes: PlainDate', () => {
        const context = createContext();
        const candidate: NearleyAST.PlainDateNode = {
          type: 'PlainDate',
          location: 0,
          subType: 'ymd',
          year: 2024,
          month: 2,
          day: 4
        };

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it('should validate date-time nodes: PlainTime', () => {
        const context = createContext();
        const candidate: NearleyAST.PlainTimeNode = {
          type: 'PlainTime',
          location: 0,
          subType: 'hms',
          hour: 14,
          minute: 30,
          second: 0
        };

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });
    });

    describe('validateConversionTarget() - Target validation', () => {
      it('should validate PresentationFormat targets', () => {
        const context = createContext();
        const formats: NearleyAST.PresentationFormatNode[] = [
          { type: 'PresentationFormat', location: 0, format: 'value' },
          { type: 'PresentationFormat', location: 0, format: 'base', base: 16 },
          { type: 'PresentationFormat', location: 0, format: 'sigFigs', sigFigs: 3 },
          { type: 'PresentationFormat', location: 0, format: 'decimals', decimals: 2 },
          { type: 'PresentationFormat', location: 0, format: 'scientific' },
          { type: 'PresentationFormat', location: 0, format: 'fraction' }
        ];

        for (const format of formats) {
          const candidate: NearleyAST.ConversionNode = {
            type: 'Conversion',
            location: 0,
            expression: createValue('42'),
            operator: 'kw_to',
            target: format
          };
          const result = pruneInvalidCandidates([candidate], context);
          expect(result).toHaveLength(1);
        }
      });

      it('should validate PropertyTarget targets', () => {
        const context = createContext();
        const properties: Array<NearleyAST.PropertyTargetNode['property']> = [
          'year', 'month', 'day', 'hour', 'minute', 'second'
        ];

        for (const property of properties) {
          const target: NearleyAST.PropertyTargetNode = {
            type: 'PropertyTarget',
            location: 0,
            property
          };
          const candidate: NearleyAST.ConversionNode = {
            type: 'Conversion',
            location: 0,
            expression: {
              type: 'PlainDate',
              location: 0,
              subType: 'ymd',
              year: 2024,
              month: 2,
              day: 4
            },
            operator: 'kw_to',
            target
          };
          const result = pruneInvalidCandidates([candidate], context);
          expect(result).toHaveLength(1);
        }
      });

      it('should reject PropertyTarget on non-temporal Value nodes', () => {
        const context = createContext();
        const target: NearleyAST.PropertyTargetNode = {
          type: 'PropertyTarget',
          location: 0,
          property: 'minute'
        };

        // Dimensionless value: "100 in minute"
        const dimensionless: NearleyAST.ConversionNode = {
          type: 'Conversion',
          location: 0,
          expression: createValue('100'),
          operator: 'kw_to',
          target
        };
        expect(pruneInvalidCandidates([dimensionless], context)).toHaveLength(0);

        // Value with unit: "100 hour in minute"
        const withUnit: NearleyAST.ConversionNode = {
          type: 'Conversion',
          location: 0,
          expression: {
            type: 'Value',
            location: 0,
            value: { type: 'NumberLiteral', location: 0, subType: 'decimal', base: 10, value: '100' },
            unit: {
              type: 'Units',
              location: 0,
              subType: 'simple',
              terms: [{
                type: 'UnitWithExponent',
                location: 0,
                unit: { type: 'Unit', location: 0, name: 'hour', matched: 'unit' },
                exponent: 1
              }]
            }
          },
          operator: 'kw_to',
          target
        };
        expect(pruneInvalidCandidates([withUnit], context)).toHaveLength(0);
      });

      it('should reject PropertyTarget on BinaryExpression of Values', () => {
        const context = createContext();
        const target: NearleyAST.PropertyTargetNode = {
          type: 'PropertyTarget',
          location: 0,
          property: 'minute'
        };
        const candidate: NearleyAST.ConversionNode = {
          type: 'Conversion',
          location: 0,
          expression: {
            type: 'BinaryExpression',
            location: 0,
            left: createValue('100'),
            operator: '+',
            right: createValue('50')
          },
          operator: 'kw_to',
          target
        };
        expect(pruneInvalidCandidates([candidate], context)).toHaveLength(0);
      });

      it('should accept PropertyTarget on temporal expressions', () => {
        const context = createContext();
        const target: NearleyAST.PropertyTargetNode = {
          type: 'PropertyTarget',
          location: 0,
          property: 'minute'
        };

        // PlainTime
        const plainTime: NearleyAST.ConversionNode = {
          type: 'Conversion',
          location: 0,
          expression: {
            type: 'PlainTime',
            location: 0,
            subType: 'hm',
            hour: 12,
            minute: 35
          },
          operator: 'kw_to',
          target
        };
        expect(pruneInvalidCandidates([plainTime], context)).toHaveLength(1);

        // BinaryExpression with temporal operand: "PlainTime + Value"
        const mixed: NearleyAST.ConversionNode = {
          type: 'Conversion',
          location: 0,
          expression: {
            type: 'BinaryExpression',
            location: 0,
            left: {
              type: 'PlainTime',
              location: 0,
              subType: 'hm',
              hour: 12,
              minute: 35
            },
            operator: '+',
            right: createValue('1')
          },
          operator: 'kw_to',
          target
        };
        expect(pruneInvalidCandidates([mixed], context)).toHaveLength(1);
      });

      it('should reject PropertyTarget on subtraction of two temporal values', () => {
        const context = createContext();
        const target: NearleyAST.PropertyTargetNode = {
          type: 'PropertyTarget',
          location: 0,
          property: 'minute'
        };
        // "tomorrow - now in minute" — subtraction of two Instants yields a Duration
        const candidate: NearleyAST.ConversionNode = {
          type: 'Conversion',
          location: 0,
          expression: {
            type: 'BinaryExpression',
            location: 0,
            left: { type: 'Instant', location: 0, keyword: 'tomorrow' },
            operator: 'minus',
            right: { type: 'Instant', location: 0, keyword: 'now' }
          },
          operator: 'kw_to',
          target
        };
        expect(pruneInvalidCandidates([candidate], context)).toHaveLength(0);
      });

      it('should conservatively accept PropertyTarget on Variable', () => {
        const context = createContext(['x']);
        const target: NearleyAST.PropertyTargetNode = {
          type: 'PropertyTarget',
          location: 0,
          property: 'hour'
        };
        const candidate: NearleyAST.ConversionNode = {
          type: 'Conversion',
          location: 0,
          expression: createVariable('x'),
          operator: 'kw_to',
          target
        };
        expect(pruneInvalidCandidates([candidate], context)).toHaveLength(1);
      });

      it('should validate Units targets', () => {
        const context = createContext();
        const target: NearleyAST.UnitsNode = {
          type: 'Units',
          location: 0,
          subType: 'simple',
          terms: [{
            type: 'UnitWithExponent',
            location: 0,
            unit: { type: 'Unit', location: 0, name: 'm', matched: 'unit' },
            exponent: 1
          }]
        };

        const candidate: NearleyAST.ConversionNode = {
          type: 'Conversion',
          location: 0,
          expression: createValue('5'),
          operator: 'kw_to',
          target
        };

        const result = pruneInvalidCandidates([candidate], context);
        expect(result).toHaveLength(0);
      });

      it('should validate Timezone targets', () => {
        const context = createContext();
        const timezoneTargets: NearleyAST.TimezoneNode[] = [
          {
            type: 'UTCOffset',
            location: 0,
            subType: 'offset',
            offsetStr: '+05:00',
            baseZone: 'UTC'
          },
          {
            type: 'TimezoneName',
            location: 0,
            zoneName: 'America/New_York'
          }
        ];

        for (const timezone of timezoneTargets) {
          const candidate: NearleyAST.ConversionNode = {
            type: 'Conversion',
            location: 0,
            expression: {
              type: 'Instant',
              location: 0,
              keyword: 'now'
            },
            operator: 'kw_to',
            target: timezone
          };
          const result = pruneInvalidCandidates([candidate], context);
          expect(result).toHaveLength(1);
        }
      });
    });
  });

  describe('D. Complexity Scoring', () => {
    describe('compareComplexity() - Tree comparison', () => {
      it('should prefer simpler trees (lower node count)', () => {
        const simpleTree = createValue('42');
        const complexTree = createBinaryExpression(
          createBinaryExpression(
            createValue('10'),
            'plus',
            createValue('20')
          ),
          'plus',
          createValue('12')
        );

        const comparison = compareComplexity(simpleTree, complexTree);
        expect(comparison).toBeLessThan(0); // simpleTree should be better (negative)
      });

      it('should handle node count differences', () => {
        const tree1 = createBinaryExpression(
          createValue('1'),
          'plus',
          createValue('2')
        );
        const tree2 = createBinaryExpression(
          createBinaryExpression(
            createValue('1'),
            'plus',
            createValue('2')
          ),
          'times',
          createValue('3')
        );

        const comparison = compareComplexity(tree1, tree2);
        expect(comparison).toBeLessThan(0); // tree1 is simpler
      });

      it('should handle equal complexity trees', () => {
        const tree1 = createBinaryExpression(
          createValue('1'),
          'plus',
          createValue('2')
        );
        const tree2 = createBinaryExpression(
          createValue('3'),
          'minus',
          createValue('4')
        );

        const comparison = compareComplexity(tree1, tree2);
        expect(comparison).toBe(0); // Both have same node count
      });

      it('should handle null nodes', () => {
        const tree = createValue('42');
        const comparison1 = compareComplexity(null, null);
        const comparison2 = compareComplexity(tree, null);
        const comparison3 = compareComplexity(null, tree);

        expect(comparison1).toBe(0);
        expect(comparison2).toBeGreaterThan(0);
        expect(comparison3).toBeLessThan(0);
      });
    });

    describe('countNodes() - AST node counting (tested via compareComplexity)', () => {
      it('should count nodes accurately in simple expressions', () => {
        const expr1 = createValue('42');
        const expr2 = createBinaryExpression(
          createValue('1'),
          'plus',
          createValue('2')
        );

        // expr1: 1 Value + 1 NumberLiteral = 2 nodes
        // expr2: 1 BinaryExpr + 2 Values + 2 NumberLiterals = 5 nodes
        const comparison = compareComplexity(expr1, expr2);
        expect(comparison).toBeLessThan(0);
      });

      it('should count nodes in nested structures', () => {
        const shallow = createBinaryExpression(
          createValue('1'),
          'plus',
          createValue('2')
        );
        const nested = createBinaryExpression(
          createBinaryExpression(
            createValue('1'),
            'plus',
            createValue('2')
          ),
          'times',
          createBinaryExpression(
            createValue('3'),
            'minus',
            createValue('4')
          )
        );

        const comparison = compareComplexity(shallow, nested);
        expect(comparison).toBeLessThan(0);
      });
    });
  });

  describe('E. Integration Tests', () => {
    describe('Integration with PruningContext', () => {
      it('should use DataLoader from context', () => {
        const context = createContext();
        expect(context.dataLoader).toBeDefined();
        expect(context.dataLoader).toBe(dataLoader);
      });

      it('should track defined variables in context', () => {
        const context = createContext(['x', 'y', 'z']);
        expect(context.definedVariables.has('x')).toBe(true);
        expect(context.definedVariables.has('y')).toBe(true);
        expect(context.definedVariables.has('z')).toBe(true);
        expect(context.definedVariables.has('undefined')).toBe(false);
      });

      it('should include line number in context', () => {
        const context = createContext();
        expect(context.lineNumber).toBe(1);
      });
    });

    describe('Real-world pruning scenarios', () => {
      it('should handle ambiguous variable/unit parses', () => {
        // When 'foo' could be a variable or a user-defined unit
        const contextNoVar = createContext();
        const contextWithVar = createContext(['foo']);

        const candidate = createBinaryExpression(
          createValue('5'),
          'times',
          createVariable('foo')
        );

        // Without 'foo' defined, should be pruned
        const resultNoVar = pruneInvalidCandidates([candidate], contextNoVar);
        expect(resultNoVar).toHaveLength(0);

        // With 'foo' defined, should pass
        const resultWithVar = pruneInvalidCandidates([candidate], contextWithVar);
        expect(resultWithVar).toHaveLength(1);
      });

      it('should handle multiple operator precedence interpretations', () => {
        const context = createContext();
        // Both interpretations should be structurally valid
        const leftAssoc = createBinaryExpression(
          createBinaryExpression(
            createValue('1'),
            'plus',
            createValue('2')
          ),
          'times',
          createValue('3')
        );
        const rightAssoc = createBinaryExpression(
          createValue('1'),
          'plus',
          createBinaryExpression(
            createValue('2'),
            'times',
            createValue('3')
          )
        );

        const candidates: NearleyAST.LineNode[] = [leftAssoc, rightAssoc];
        const result = pruneInvalidCandidates(candidates, context);

        // Both should be valid structurally (pruner doesn't enforce precedence)
        expect(result).toHaveLength(2);
      });

      it('should handle complex nested expressions with variables', () => {
        const context = createContext(['a', 'b', 'c', 'd']);
        const candidate = createBinaryExpression(
          createFunctionCall('sqrt', [
            createBinaryExpression(
              createVariable('a'),
              'caret',
              createValue('2')
            )
          ]),
          'plus',
          createBinaryExpression(
            createUnaryExpression(
              'minus',
              createVariable('b')
            ),
            'times',
            createBinaryExpression(
              createVariable('c'),
              'divide',
              createVariable('d')
            )
          )
        );

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it('should handle edge case: variable assignment with complex expression', () => {
        const context = createContext(['x', 'y']);
        const candidate: NearleyAST.VariableAssignmentNode = {
          type: 'VariableAssignment',
          location: 0,
          name: 'result',
          value: createBinaryExpression(
            createFunctionCall('max', [
              createVariable('x'),
              createVariable('y')
            ]),
            'times',
            createValue('2')
          )
        };

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it('should handle edge case: deeply nested conditionals', () => {
        const context = createContext(['flag1', 'flag2']);
        const candidate: NearleyAST.ConditionalExprNode = {
          type: 'ConditionalExpr',
          location: 0,
          condition: createVariable('flag1'),
          then: {
            type: 'ConditionalExpr',
            location: 0,
            condition: createVariable('flag2'),
            then: createValue('1'),
            else: createValue('2')
          },
          else: createValue('3')
        };

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it('should handle edge case: mixed valid and invalid in complex expression', () => {
        const context = createContext(['x']); // Only 'x' is defined
        const validCandidate = createBinaryExpression(
          createVariable('x'),
          'plus',
          createValue('10')
        );
        const invalidCandidate = createBinaryExpression(
          createVariable('x'),
          'plus',
          createVariable('undefined_var')
        );

        const candidates: NearleyAST.LineNode[] = [validCandidate, invalidCandidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(validCandidate);
      });

      it('should handle edge case: recursive structures with function calls', () => {
        const context = createContext(['n']);
        const candidate = createFunctionCall('factorial', [
          createBinaryExpression(
            createVariable('n'),
            'minus',
            createValue('1')
          )
        ]);

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it('should handle edge case: all candidates invalid', () => {
        const context = createContext(); // No variables defined
        const candidates: NearleyAST.LineNode[] = [
          createVariable('a'),
          createVariable('b'),
          createVariable('c')
        ];

        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(0);
      });

      it('should validate VariableAssignment with undefined variables', () => {
        const context = createContext(['x']); // Only 'x' is defined

        // Assignment with undefined variable in value
        const invalidAssignment: NearleyAST.VariableAssignmentNode = {
          type: 'VariableAssignment',
          location: 0,
          name: 'result',
          value: createBinaryExpression(
            createVariable('x'),
            'plus',
            createVariable('undefinedVar') // This variable is not defined
          )
        };

        const candidates: NearleyAST.LineNode[] = [invalidAssignment];
        const result = pruneInvalidCandidates(candidates, context);

        // Should be pruned due to undefined variable
        expect(result).toHaveLength(0);
      });

      it('should validate VariableAssignment with all defined variables', () => {
        const context = createContext(['x', 'y']);

        // Assignment with all defined variables
        const validAssignment: NearleyAST.VariableAssignmentNode = {
          type: 'VariableAssignment',
          location: 0,
          name: 'sum',
          value: createBinaryExpression(
            createVariable('x'),
            'plus',
            createVariable('y')
          )
        };

        const candidates: NearleyAST.LineNode[] = [validAssignment];
        const result = pruneInvalidCandidates(candidates, context);

        // Should pass validation
        expect(result).toHaveLength(1);
      });
    });
  });
});

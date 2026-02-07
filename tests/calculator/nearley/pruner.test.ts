/**
 * Pruner Unit Tests
 *
 * Tests the parse tree pruning logic that filters out semantically invalid
 * candidate parses from Nearley's ambiguous parses.
 *
 * The pruner only performs scope-based validation.
 * Type-based disambiguation is handled
 * by trial evaluation in the parser.
 *
 * Test Coverage:
 * - Core Pruning Logic (scope-only)
 * - Variable Collection
 * - Complexity Scoring
 * - Integration Tests
 */

import { describe, it, expect, beforeAll } from "vitest";
import { DataLoader } from "../../../src/calculator/data-loader";
import {
  pruneInvalidCandidates,
  compareComplexity,
  PruningContext,
} from "../../../src/calculator/nearley/pruner";
import * as NearleyAST from "../../../src/calculator/nearley/types";

describe("Pruner Unit Tests", () => {
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
      lineNumber: 1,
    };
  }

  /**
   * Helper to create a simple value node
   */
  function createValue(value: string): NearleyAST.ValueNode {
    return {
      type: "Value",
      offset: 0,
      value: {
        type: "NumberLiteral",
        offset: 0,
        subType: "decimal",
        base: 10,
        value,
      },
      unit: null,
    };
  }

  /**
   * Helper to create a variable node
   */
  function createVariable(name: string): NearleyAST.VariableNode {
    return {
      type: "Variable",
      offset: 0,
      name,
    };
  }

  /**
   * Helper to create a constant node
   */
  function createConstant(name: string): NearleyAST.ConstantNode {
    return {
      type: "Constant",
      offset: 0,
      name,
    };
  }

  /**
   * Helper to create a binary expression node
   */
  function createBinaryExpression(
    left: NearleyAST.ExpressionNode,
    operator: NearleyAST.BinaryOperator,
    right: NearleyAST.ExpressionNode,
  ): NearleyAST.BinaryExpressionNode {
    return {
      type: "BinaryExpression",
      offset: 0,
      operator,
      left,
      right,
    };
  }

  /**
   * Helper to create a unary expression node
   */
  function createUnaryExpression(
    operator: NearleyAST.UnaryOperator,
    argument: NearleyAST.ExpressionNode,
  ): NearleyAST.UnaryExpressionNode {
    return {
      type: "UnaryExpression",
      offset: 0,
      operator,
      argument,
    };
  }

  /**
   * Helper to create a function call node
   */
  function createFunctionCall(
    name: string,
    args: NearleyAST.ExpressionNode[],
  ): NearleyAST.FunctionCallNode {
    return {
      type: "FunctionCall",
      offset: 0,
      name,
      arguments: args,
    };
  }

  describe("Core Pruning Logic", () => {
    describe("pruneInvalidCandidates() - Main pruning function", () => {
      it("should filter out invalid candidates", () => {
        const context = createContext(); // No variables defined
        const validCandidate = createValue("42");
        const invalidCandidate = createVariable("undefined_var");

        const candidates: NearleyAST.LineNode[] = [
          validCandidate,
          invalidCandidate,
        ];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(validCandidate);
      });

      it("should preserve valid candidates", () => {
        const context = createContext(["x", "y"]);
        const candidate1 = createVariable("x");
        const candidate2 = createVariable("y");
        const candidate3 = createBinaryExpression(
          createVariable("x"),
          "plus",
          createVariable("y"),
        );

        const candidates: NearleyAST.LineNode[] = [
          candidate1,
          candidate2,
          candidate3,
        ];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(3);
        expect(result).toEqual(candidates);
      });

      it("should handle empty candidate lists", () => {
        const context = createContext();
        const candidates: NearleyAST.LineNode[] = [];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toEqual([]);
      });

      it("should handle all-null candidates", () => {
        const context = createContext();
        const candidates: NearleyAST.LineNode[] = [null, null, null];
        const result = pruneInvalidCandidates(candidates, context);

        // Null lines are valid (empty lines)
        expect(result).toHaveLength(3);
        expect(result).toEqual([null, null, null]);
      });

      it("should preserve candidate order", () => {
        const context = createContext(["a", "b", "c"]);
        const candidates: NearleyAST.LineNode[] = [
          createVariable("a"),
          createVariable("b"),
          createVariable("c"),
        ];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual(candidates[0]);
        expect(result[1]).toEqual(candidates[1]);
        expect(result[2]).toEqual(candidates[2]);
      });
    });

    describe("validateVariableScopes() - Variable validation", () => {
      it("should accept candidates with in-scope variables", () => {
        const context = createContext(["x", "y", "z"]);
        const candidate = createBinaryExpression(
          createVariable("x"),
          "plus",
          createVariable("y"),
        );

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(candidate);
      });

      it("should reject candidates with out-of-scope variables", () => {
        const context = createContext(["x"]); // Only 'x' is defined
        const candidate = createBinaryExpression(
          createVariable("x"),
          "plus",
          createVariable("undefined_var"),
        );

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(0);
      });
    });
  });

  describe("Variable Collection", () => {
    describe("collectVariables() - Variable extraction (tested via pruning)", () => {
      it("should find all Variable nodes in tree", () => {
        const context = createContext(["x", "y", "z"]);
        const candidate = createBinaryExpression(
          createBinaryExpression(
            createVariable("x"),
            "plus",
            createVariable("y"),
          ),
          "times",
          createVariable("z"),
        );

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        // All variables are defined, should pass
        expect(result).toHaveLength(1);
      });

      it("should handle nested expressions", () => {
        const context = createContext(["a", "b", "c", "d"]);
        const candidate = createBinaryExpression(
          createBinaryExpression(
            createVariable("a"),
            "plus",
            createBinaryExpression(
              createVariable("b"),
              "times",
              createVariable("c"),
            ),
          ),
          "minus",
          createVariable("d"),
        );

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it("should handle arrays of nodes (function arguments)", () => {
        const context = createContext(["x", "y", "z"]);
        const candidate = createFunctionCall("sum", [
          createVariable("x"),
          createVariable("y"),
          createVariable("z"),
        ]);

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it("should ignore non-variable identifiers (constants, units)", () => {
        const context = createContext(); // No variables defined
        // Constants should be valid even without being in definedVariables
        const candidate = createConstant("pi");

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        // Constants are always valid
        expect(result).toHaveLength(1);
      });
    });
  });

  describe("Complexity Scoring", () => {
    describe("compareComplexity() - Tree comparison", () => {
      it("should prefer simpler trees (lower node count)", () => {
        const simpleTree = createValue("42");
        const complexTree = createBinaryExpression(
          createBinaryExpression(createValue("10"), "plus", createValue("20")),
          "plus",
          createValue("12"),
        );

        const comparison = compareComplexity(simpleTree, complexTree);
        expect(comparison).toBeLessThan(0); // simpleTree should be better (negative)
      });

      it("should handle node count differences", () => {
        const tree1 = createBinaryExpression(
          createValue("1"),
          "plus",
          createValue("2"),
        );
        const tree2 = createBinaryExpression(
          createBinaryExpression(createValue("1"), "plus", createValue("2")),
          "times",
          createValue("3"),
        );

        const comparison = compareComplexity(tree1, tree2);
        expect(comparison).toBeLessThan(0); // tree1 is simpler
      });

      it("should handle equal complexity trees", () => {
        const tree1 = createBinaryExpression(
          createValue("1"),
          "plus",
          createValue("2"),
        );
        const tree2 = createBinaryExpression(
          createValue("3"),
          "minus",
          createValue("4"),
        );

        const comparison = compareComplexity(tree1, tree2);
        expect(comparison).toBe(0); // Both have same node count
      });

      it("should handle null nodes", () => {
        const tree = createValue("42");
        const comparison1 = compareComplexity(null, null);
        const comparison2 = compareComplexity(tree, null);
        const comparison3 = compareComplexity(null, tree);

        expect(comparison1).toBe(0);
        expect(comparison2).toBeGreaterThan(0);
        expect(comparison3).toBeLessThan(0);
      });
    });

    describe("countNodes() - AST node counting (tested via compareComplexity)", () => {
      it("should count nodes accurately in simple expressions", () => {
        const expr1 = createValue("42");
        const expr2 = createBinaryExpression(
          createValue("1"),
          "plus",
          createValue("2"),
        );

        // expr1: 1 Value + 1 NumberLiteral = 2 nodes
        // expr2: 1 BinaryExpr + 2 Values + 2 NumberLiterals = 5 nodes
        const comparison = compareComplexity(expr1, expr2);
        expect(comparison).toBeLessThan(0);
      });

      it("should count nodes in nested structures", () => {
        const shallow = createBinaryExpression(
          createValue("1"),
          "plus",
          createValue("2"),
        );
        const nested = createBinaryExpression(
          createBinaryExpression(createValue("1"), "plus", createValue("2")),
          "times",
          createBinaryExpression(createValue("3"), "minus", createValue("4")),
        );

        const comparison = compareComplexity(shallow, nested);
        expect(comparison).toBeLessThan(0);
      });
    });
  });

  describe("Integration Tests", () => {
    describe("Integration with PruningContext", () => {
      it("should use DataLoader from context", () => {
        const context = createContext();
        expect(context.dataLoader).toBeDefined();
        expect(context.dataLoader).toBe(dataLoader);
      });

      it("should track defined variables in context", () => {
        const context = createContext(["x", "y", "z"]);
        expect(context.definedVariables.has("x")).toBe(true);
        expect(context.definedVariables.has("y")).toBe(true);
        expect(context.definedVariables.has("z")).toBe(true);
        expect(context.definedVariables.has("undefined")).toBe(false);
      });

      it("should include line number in context", () => {
        const context = createContext();
        expect(context.lineNumber).toBe(1);
      });
    });

    describe("Real-world pruning scenarios", () => {
      it("should handle ambiguous variable/unit parses", () => {
        // When 'foo' could be a variable or a user-defined unit
        const contextNoVar = createContext();
        const contextWithVar = createContext(["foo"]);

        const candidate = createBinaryExpression(
          createValue("5"),
          "times",
          createVariable("foo"),
        );

        // Without 'foo' defined, should be pruned
        const resultNoVar = pruneInvalidCandidates([candidate], contextNoVar);
        expect(resultNoVar).toHaveLength(0);

        // With 'foo' defined, should pass
        const resultWithVar = pruneInvalidCandidates(
          [candidate],
          contextWithVar,
        );
        expect(resultWithVar).toHaveLength(1);
      });

      it("should handle multiple operator precedence interpretations", () => {
        const context = createContext();
        // Both interpretations should be structurally valid
        const leftAssoc = createBinaryExpression(
          createBinaryExpression(createValue("1"), "plus", createValue("2")),
          "times",
          createValue("3"),
        );
        const rightAssoc = createBinaryExpression(
          createValue("1"),
          "plus",
          createBinaryExpression(createValue("2"), "times", createValue("3")),
        );

        const candidates: NearleyAST.LineNode[] = [leftAssoc, rightAssoc];
        const result = pruneInvalidCandidates(candidates, context);

        // Both should be valid structurally (pruner doesn't enforce precedence)
        expect(result).toHaveLength(2);
      });

      it("should handle complex nested expressions with variables", () => {
        const context = createContext(["a", "b", "c", "d"]);
        const candidate = createBinaryExpression(
          createFunctionCall("sqrt", [
            createBinaryExpression(
              createVariable("a"),
              "caret",
              createValue("2"),
            ),
          ]),
          "plus",
          createBinaryExpression(
            createUnaryExpression("minus", createVariable("b")),
            "times",
            createBinaryExpression(
              createVariable("c"),
              "divide",
              createVariable("d"),
            ),
          ),
        );

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it("should handle edge case: variable assignment with complex expression", () => {
        const context = createContext(["x", "y"]);
        const candidate: NearleyAST.VariableAssignmentNode = {
          type: "VariableAssignment",
          offset: 0,
          name: "result",
          value: createBinaryExpression(
            createFunctionCall("max", [
              createVariable("x"),
              createVariable("y"),
            ]),
            "times",
            createValue("2"),
          ),
        };

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it("should handle edge case: deeply nested conditionals", () => {
        const context = createContext(["flag1", "flag2"]);
        const candidate: NearleyAST.ConditionalExprNode = {
          type: "ConditionalExpr",
          offset: 0,
          condition: createVariable("flag1"),
          then: {
            type: "ConditionalExpr",
            offset: 0,
            condition: createVariable("flag2"),
            then: createValue("1"),
            else: createValue("2"),
          },
          else: createValue("3"),
        };

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it("should handle edge case: mixed valid and invalid in complex expression", () => {
        const context = createContext(["x"]); // Only 'x' is defined
        const validCandidate = createBinaryExpression(
          createVariable("x"),
          "plus",
          createValue("10"),
        );
        const invalidCandidate = createBinaryExpression(
          createVariable("x"),
          "plus",
          createVariable("undefined_var"),
        );

        const candidates: NearleyAST.LineNode[] = [
          validCandidate,
          invalidCandidate,
        ];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(validCandidate);
      });

      it("should handle edge case: recursive structures with function calls", () => {
        const context = createContext(["n"]);
        const candidate = createFunctionCall("factorial", [
          createBinaryExpression(
            createVariable("n"),
            "minus",
            createValue("1"),
          ),
        ]);

        const candidates: NearleyAST.LineNode[] = [candidate];
        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(1);
      });

      it("should handle edge case: all candidates invalid", () => {
        const context = createContext(); // No variables defined
        const candidates: NearleyAST.LineNode[] = [
          createVariable("a"),
          createVariable("b"),
          createVariable("c"),
        ];

        const result = pruneInvalidCandidates(candidates, context);

        expect(result).toHaveLength(0);
      });

      it("should validate VariableAssignment with undefined variables", () => {
        const context = createContext(["x"]); // Only 'x' is defined

        // Assignment with undefined variable in value
        const invalidAssignment: NearleyAST.VariableAssignmentNode = {
          type: "VariableAssignment",
          offset: 0,
          name: "result",
          value: createBinaryExpression(
            createVariable("x"),
            "plus",
            createVariable("undefinedVar"), // This variable is not defined
          ),
        };

        const candidates: NearleyAST.LineNode[] = [invalidAssignment];
        const result = pruneInvalidCandidates(candidates, context);

        // Should be pruned due to undefined variable
        expect(result).toHaveLength(0);
      });

      it("should validate VariableAssignment with all defined variables", () => {
        const context = createContext(["x", "y"]);

        // Assignment with all defined variables
        const validAssignment: NearleyAST.VariableAssignmentNode = {
          type: "VariableAssignment",
          offset: 0,
          name: "sum",
          value: createBinaryExpression(
            createVariable("x"),
            "plus",
            createVariable("y"),
          ),
        };

        const candidates: NearleyAST.LineNode[] = [validAssignment];
        const result = pruneInvalidCandidates(candidates, context);

        // Should pass validation
        expect(result).toHaveLength(1);
      });
    });
  });
});

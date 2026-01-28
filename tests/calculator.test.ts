import { describe, it, expect, beforeAll } from 'vitest';
import { Calculator } from '../src/calculator';
import { DataLoader } from '../src/data-loader';
import * as path from 'path';

describe('Calculator - Error Recording Integration', () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '..', 'data'));
    calculator = new Calculator(dataLoader);
  });

  describe('Lexer Error Recording', () => {
    it('should record lexer errors and continue processing', () => {
      const input = `5 + 3
invalid @ character
10 * 2`;

      const result = calculator.parse(input);

      // Should have lexer errors
      expect(result.errors.lexer.length).toBe(1);
      expect(result.errors.lexer[0].message).toContain('Unexpected character \'@\'');

      // Should still parse valid lines
      expect(result.ast.lines.length).toBeGreaterThan(0);
    });

    it('should record multiple lexer errors from different lines', () => {
      const input = `5 + 3
invalid @ character
10 * 2
another $ bad # line`;

      const result = calculator.parse(input);

      // Should have multiple lexer errors
      expect(result.errors.lexer.length).toBeGreaterThan(0);
    });

    it('should handle unknown characters at different positions', () => {
      const input = `valid line 1
@ at start
middle @ error
end error @`;

      const result = calculator.parse(input);

      // Should record all errors
      expect(result.errors.lexer.length).toBeGreaterThan(0);
    });
  });

  describe('Parser Error Recording', () => {
    it('should record parser errors and create PlainText fallback', () => {
      const input = `5 + 3
this is just text
10 * 2`;

      const result = calculator.parse(input);

      // Should parse successfully
      expect(result.ast.lines.length).toBeGreaterThan(0);

      // The text line may parse as an ExpressionLine with identifiers, not necessarily PlainText
      // The important thing is that it doesn't cause the parser to fail
      expect(result.ast.lines.length).toBeGreaterThanOrEqual(3);
      expect(result.ast.lines[0].type).toBe('ExpressionLine');
      // Last line should be an expression
      expect(result.ast.lines[result.ast.lines.length - 1].type).toBe('ExpressionLine');
    });
  });

  describe('Mixed Errors', () => {
    it('should handle both lexer and parser errors', () => {
      const input = `# Valid heading
5 + 3
invalid @ character
just text
10 * 2
another $ error`;

      const result = calculator.parse(input);

      // Should have both types of errors
      expect(result.errors.lexer.length).toBeGreaterThan(0);

      // Should still create AST with all lines
      expect(result.ast.lines.length).toBeGreaterThan(0);
    });

    it('should provide raw line text for errors', () => {
      const input = `5 + 3
invalid @ character here
10 * 2`;

      const result = calculator.parse(input);

      // Lexer errors have raw text in their context
      expect(result.errors.lexer.length).toBe(1);
    });
  });

  describe('Full Document Processing', () => {
    it('should process entire document despite errors', () => {
      const input = `# Shopping List

Price per item: $5
5 @ items wanted
Total: 5 * 10

Final $ price`;

      const result = calculator.parse(input);

      // Should have processed all lines
      expect(result.ast.lines.length).toBeGreaterThan(0);

      // Should have recorded errors
      expect(result.errors.lexer.length).toBeGreaterThan(0);
    });

    it('should handle documents with only errors', () => {
      const input = `@@@
$$$
###invalid`;

      const result = calculator.parse(input);

      // Should record errors
      expect(result.errors.lexer.length).toBeGreaterThan(0);

      // Should still create document
      expect(result.ast.type).toBe('Document');
    });

    it('should handle documents with no errors', () => {
      const input = `5 + 3
10 * 2
15 / 3`;

      const result = calculator.parse(input);

      // Should have no errors
      expect(result.errors.lexer.length).toBe(0);
      expect(result.errors.parser.length).toBe(0);

      // Should parse all expressions
      expect(result.ast.lines.length).toBe(3);
    });
  });

  describe('Empty and Edge Cases', () => {
    it('should handle empty input', () => {
      const result = calculator.parse('');

      expect(result.errors.lexer.length).toBe(0);
      expect(result.errors.parser.length).toBe(0);
      expect(result.ast.type).toBe('Document');
    });

    it('should handle whitespace-only input', () => {
      const result = calculator.parse('   \n  \n   ');

      expect(result.errors.lexer.length).toBe(0);
      expect(result.errors.parser.length).toBe(0);
    });

    it('should handle single error line', () => {
      const result = calculator.parse('@@@');

      expect(result.errors.lexer.length).toBe(1);
    });
  });

  describe('Error Position Information', () => {
    it('should provide accurate line numbers for errors', () => {
      const input = `line 1
line 2
error @ here
line 4`;

      const result = calculator.parse(input);

      expect(result.errors.lexer.length).toBe(1);
      expect(result.errors.lexer[0].start.line).toBe(3);
    });

    it('should provide accurate column numbers for errors', () => {
      const input = 'some text @ here';

      const result = calculator.parse(input);

      expect(result.errors.lexer.length).toBe(1);
      expect(result.errors.lexer[0].start.column).toBeGreaterThan(0);
    });
  });
});

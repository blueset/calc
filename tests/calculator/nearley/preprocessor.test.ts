/**
 * Unit tests for Line Preprocessor
 */

import { describe, it, expect } from 'vitest';
import { preprocessDocument, preprocessLine, PreprocessedLine } from '../../../src/calculator/nearley/preprocessor';

describe('preprocessLine', () => {
  describe('empty lines', () => {
    it('should detect empty line', () => {
      const result = preprocessLine('');
      expect(result.type).toBe('empty');
      expect(result.content).toBe('');
    });

    it('should detect whitespace-only line', () => {
      const result = preprocessLine('   \t  ');
      expect(result.type).toBe('empty');
      expect(result.content).toBe('');
    });
  });

  describe('headings', () => {
    it('should detect heading with single #', () => {
      const result = preprocessLine('# Title');
      expect(result.type).toBe('heading');
      expect(result.level).toBe(1);
      expect(result.content).toBe('Title');
    });

    it('should detect heading with multiple #', () => {
      const result = preprocessLine('### Subheading');
      expect(result.type).toBe('heading');
      expect(result.level).toBe(3);
      expect(result.content).toBe('Subheading');
    });

    it('should handle heading without space after #', () => {
      const result = preprocessLine('#Title');
      expect(result.type).toBe('heading');
      expect(result.level).toBe(1);
      expect(result.content).toBe('Title');
    });

    it('should handle heading with no text', () => {
      const result = preprocessLine('##');
      expect(result.type).toBe('heading');
      expect(result.level).toBe(2);
      expect(result.content).toBe('');
    });
  });

  describe('expressions with inline comments', () => {
    it('should strip inline comment from expression', () => {
      const result = preprocessLine('5 + 5 # this is a comment');
      expect(result.type).toBe('expression');
      expect(result.content).toBe('5 + 5');
    });

    it('should handle expression without comment', () => {
      const result = preprocessLine('10 * 20');
      expect(result.type).toBe('expression');
      expect(result.content).toBe('10 * 20');
    });

    it('should strip comment and trailing whitespace', () => {
      const result = preprocessLine('100 / 4   # another comment');
      expect(result.type).toBe('expression');
      expect(result.content).toBe('100 / 4');
    });

    it('should handle # at end of line', () => {
      const result = preprocessLine('42 #');
      expect(result.type).toBe('expression');
      expect(result.content).toBe('42');
    });

    it('should handle multiple # in comment', () => {
      const result = preprocessLine('2 + 2 # comment # with # hashes');
      expect(result.type).toBe('expression');
      expect(result.content).toBe('2 + 2');
    });
  });

  describe('line number tracking', () => {
    it('should track line number correctly', () => {
      const result = preprocessLine('5 + 5', 42);
      expect(result.lineNumber).toBe(42);
    });

    it('should default to line 1', () => {
      const result = preprocessLine('test');
      expect(result.lineNumber).toBe(1);
    });
  });

  describe('original text preservation', () => {
    it('should preserve original text for empty line', () => {
      const original = '   ';
      const result = preprocessLine(original);
      expect(result.originalText).toBe(original);
    });

    it('should preserve original text for heading', () => {
      const original = '# Heading Text';
      const result = preprocessLine(original);
      expect(result.originalText).toBe(original);
    });

    it('should preserve original text for expression with comment', () => {
      const original = '5 + 5 # comment';
      const result = preprocessLine(original);
      expect(result.originalText).toBe(original);
    });
  });
});

describe('preprocessDocument', () => {
  it('should handle multi-line document', () => {
    const input = `# Calculations
5 + 5 # addition
10 * 20

100 / 4`;

    const result = preprocessDocument(input);

    expect(result).toHaveLength(5);

    expect(result[0].type).toBe('heading');
    expect(result[0].level).toBe(1);
    expect(result[0].content).toBe('Calculations');
    expect(result[0].lineNumber).toBe(1);

    expect(result[1].type).toBe('expression');
    expect(result[1].content).toBe('5 + 5');
    expect(result[1].lineNumber).toBe(2);

    expect(result[2].type).toBe('expression');
    expect(result[2].content).toBe('10 * 20');
    expect(result[2].lineNumber).toBe(3);

    expect(result[3].type).toBe('empty');
    expect(result[3].lineNumber).toBe(4);

    expect(result[4].type).toBe('expression');
    expect(result[4].content).toBe('100 / 4');
    expect(result[4].lineNumber).toBe(5);
  });

  it('should handle empty document', () => {
    const result = preprocessDocument('');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('empty');
  });

  it('should handle document with only headings', () => {
    const input = `# Title
## Subtitle
### Section`;

    const result = preprocessDocument(input);

    expect(result).toHaveLength(3);
    expect(result[0].level).toBe(1);
    expect(result[1].level).toBe(2);
    expect(result[2].level).toBe(3);
  });

  it('should handle document with mixed content', () => {
    const input = `# Finance
income = 5000 USD # monthly income
expenses = 3000 USD

## Net
net = income - expenses # after expenses`;

    const result = preprocessDocument(input);

    expect(result).toHaveLength(6);
    expect(result[0].type).toBe('heading');
    expect(result[1].type).toBe('expression');
    expect(result[1].content).toBe('income = 5000 USD');
    expect(result[2].type).toBe('expression');
    expect(result[2].content).toBe('expenses = 3000 USD');
    expect(result[3].type).toBe('empty');
    expect(result[4].type).toBe('heading');
    expect(result[5].type).toBe('expression');
    expect(result[5].content).toBe('net = income - expenses');
  });
});

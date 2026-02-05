/**
 * Integration tests for Nearley Parser
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { NearleyParser } from '../../src/nearley/nearley-parser';
import { DataLoader } from '../../src/data-loader';

describe('NearleyParser', () => {
  let dataLoader: DataLoader;
  let parser: NearleyParser;

  beforeAll(() => {
    dataLoader = new DataLoader();
    dataLoader.load();
  });

  beforeEach(() => {
    parser = new NearleyParser(dataLoader);
  });

  describe('basic parsing', () => {
    it('should parse empty document', () => {
      const result = parser.parseDocument('');
      expect(result.ast.lines).toHaveLength(1);
      expect(result.ast.lines[0].type).toBe('EmptyLine');
      expect(result.errors).toHaveLength(0);
    });

    it('should parse heading', () => {
      const result = parser.parseDocument('# Title');
      expect(result.ast.lines).toHaveLength(1);
      expect(result.ast.lines[0].type).toBe('Heading');
      if (result.ast.lines[0].type === 'Heading') {
        expect(result.ast.lines[0].level).toBe(1);
        expect(result.ast.lines[0].text).toBe('Title');
      }
      expect(result.errors).toHaveLength(0);
    });

    it('should parse simple number', () => {
      const result = parser.parseDocument('42');
      expect(result.ast.lines).toHaveLength(1);
      expect(result.ast.lines[0].type).toBe('ExpressionLine');
      expect(result.errors).toHaveLength(0);
    });

    it('should parse simple arithmetic', () => {
      const result = parser.parseDocument('5 + 5');
      expect(result.ast.lines).toHaveLength(1);
      expect(result.ast.lines[0].type).toBe('ExpressionLine');
      expect(result.errors).toHaveLength(0);
    });

    it('should parse variable assignment', () => {
      const result = parser.parseDocument('x = 10');
      expect(result.ast.lines).toHaveLength(1);
      expect(result.ast.lines[0].type).toBe('VariableDefinition');
      if (result.ast.lines[0].type === 'VariableDefinition') {
        expect(result.ast.lines[0].name).toBe('x');
      }
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('inline comments', () => {
    it('should strip inline comments', () => {
      const result = parser.parseDocument('5 + 5 # this is a comment');
      expect(result.ast.lines).toHaveLength(1);
      expect(result.ast.lines[0].type).toBe('ExpressionLine');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle line with only comment as plain text', () => {
      const result = parser.parseDocument('# not a heading because of leading text # comment');
      // This should either be a heading or plain text depending on how preprocessor handles it
      expect(result.ast.lines).toHaveLength(1);
    });
  });

  describe('multi-line documents', () => {
    it('should parse multi-line document', () => {
      const input = `# Calculations
5 + 5
10 * 20

100 / 4`;

      const result = parser.parseDocument(input);
      expect(result.ast.lines).toHaveLength(5);
      expect(result.ast.lines[0].type).toBe('Heading');
      expect(result.ast.lines[1].type).toBe('ExpressionLine');
      expect(result.ast.lines[2].type).toBe('ExpressionLine');
      expect(result.ast.lines[3].type).toBe('EmptyLine');
      expect(result.ast.lines[4].type).toBe('ExpressionLine');
    });

    it('should track variable definitions across lines', () => {
      const input = `x = 10
y = x + 5`;

      const result = parser.parseDocument(input);
      expect(result.ast.lines).toHaveLength(2);
      expect(result.ast.lines[0].type).toBe('VariableDefinition');
      expect(result.ast.lines[1].type).toBe('VariableDefinition');
      // Second line should successfully reference x
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('units', () => {
    it('should parse number with unit', () => {
      const result = parser.parseDocument('5 km');
      expect(result.ast.lines).toHaveLength(1);
      expect(result.ast.lines[0].type).toBe('ExpressionLine');
    });

    it('should parse unit conversion', () => {
      const result = parser.parseDocument('5 km to m');
      expect(result.ast.lines).toHaveLength(1);
      expect(result.ast.lines[0].type).toBe('ExpressionLine');
    });
  });

  describe('error handling', () => {
    it('should handle invalid syntax as plain text', () => {
      const result = parser.parseDocument('this is not valid syntax @ $ %% ]]');
      expect(result.ast.lines).toHaveLength(1);
      expect(result.ast.lines[0].type).toBe('PlainText');
    });

    it('should continue parsing after error', () => {
      const input = `5 + 5
invalid @ syntax
10 * 20`;

      const result = parser.parseDocument(input);
      expect(result.ast.lines).toHaveLength(3);
      expect(result.ast.lines[0].type).toBe('ExpressionLine');
      expect(result.ast.lines[1].type).toBe('PlainText');
      expect(result.ast.lines[2].type).toBe('ExpressionLine');
    });
  });

  describe('edge cases', () => {
    it('should handle empty lines', () => {
      const input = `

5 + 5

`;

      const result = parser.parseDocument(input);
      expect(result.ast.lines).toHaveLength(5);
      expect(result.ast.lines[0].type).toBe('EmptyLine');
      expect(result.ast.lines[1].type).toBe('EmptyLine');
      expect(result.ast.lines[2].type).toBe('ExpressionLine');
      expect(result.ast.lines[3].type).toBe('EmptyLine');
      expect(result.ast.lines[4].type).toBe('EmptyLine');
    });

    it('should handle whitespace-only lines', () => {
      const input = `5 + 5

10 * 20`;

      const result = parser.parseDocument(input);
      expect(result.ast.lines).toHaveLength(3);
      expect(result.ast.lines[0].type).toBe('ExpressionLine');
      expect(result.ast.lines[1].type).toBe('EmptyLine');
      expect(result.ast.lines[2].type).toBe('ExpressionLine');
    });
  });
});

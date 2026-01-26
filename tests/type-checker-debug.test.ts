import { describe, it, expect, beforeAll } from 'vitest';
import { Parser } from '../src/parser';
import { Lexer } from '../src/lexer';
import { DataLoader } from '../src/data-loader';
import * as path from 'path';

describe('Type Checker Debug', () => {
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '..', 'data'));
  });

  it('should show what "3 days" parses to', () => {
    const input = '3 days';
    const lexer = new Lexer(input, dataLoader);
    const tokens = lexer.tokenize();
    console.log('\nTokens:', tokens.map(t => ({ type: t.type, value: t.value })));

    const parser = new Parser(tokens, dataLoader);
    const document = parser.parseDocument();
    console.log('\nParsed document:', JSON.stringify(document, null, 2));

    const firstLine = document.lines[0];
    console.log('\nFirst line type:', firstLine.type);
    if (firstLine.type === 'ExpressionLine') {
      console.log('Expression type:', firstLine.expression.type);
      console.log('Expression:', JSON.stringify(firstLine.expression, null, 2));
    }
  });

  it('should show what "171 cm to ft in" parses to', () => {
    const input = '171 cm to ft in';
    const lexer = new Lexer(input, dataLoader);
    const tokens = lexer.tokenize();
    console.log('\nTokens:', tokens.map(t => ({ type: t.type, value: t.value })));

    const parser = new Parser(tokens, dataLoader);
    const document = parser.parseDocument();
    console.log('\nParsed document:', JSON.stringify(document, null, 2));

    const firstLine = document.lines[0];
    console.log('\nFirst line type:', firstLine.type);
    if (firstLine.type === 'ExpressionLine') {
      console.log('Expression type:', firstLine.expression.type);
      console.log('Expression:', JSON.stringify(firstLine.expression, null, 2));
    }
  });

  it('should show what "2024 Jan 1" parses to', () => {
    const input = '2024 Jan 1';
    const lexer = new Lexer(input, dataLoader);
    const tokens = lexer.tokenize();
    console.log('\nTokens:', tokens.map(t => ({ type: t.type, value: t.value })));

    const parser = new Parser(tokens, dataLoader);
    const document = parser.parseDocument();
    console.log('\nParsed document:', JSON.stringify(document, null, 2));

    const firstLine = document.lines[0];
    console.log('\nFirst line type:', firstLine.type);
  });
});

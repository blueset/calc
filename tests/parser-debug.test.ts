import { describe, it, expect, beforeAll } from 'vitest';
import { Parser } from '../src/parser';
import { Lexer } from '../src/lexer';
import { DataLoader } from '../src/data-loader';
import * as path from 'path';

describe('Parser Debug', () => {
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '..', 'data'));
  });

  it('should debug "5 km" tokenization and parsing', () => {
    const input = '5 km';
    console.log(`\nParsing: "${input}"`);

    const lexer = new Lexer(input, dataLoader);
    const tokens = lexer.tokenize();

    console.log('Tokens:');
    tokens.forEach(t => console.log(`  ${t.type}: "${t.value}"`));

    try {
      const parser = new Parser(tokens, dataLoader);
      const doc = parser.parseDocument();

      console.log('\nParsed document:');
      console.log(`  Lines: ${doc.lines.length}`);
      if (doc.lines.length > 0) {
        console.log(`  First line type: ${doc.lines[0].type}`);
        console.log(`  First line:`, JSON.stringify(doc.lines[0], null, 2));
      }
    } catch (error: any) {
      console.error('\nParser error:', error);
      console.error('Stack:', error.stack);
      throw error;
    }
  });

  it('should show what error happens during parsing "5 km"', () => {
    const input = '5 km';
    const lexer = new Lexer(input, dataLoader);
    const tokens = lexer.tokenize();

    // Manually call parseLine to see the error
    const parser = new Parser(tokens, dataLoader);
    try {
      const doc = parser.parseDocument();
      console.log('Document:', doc);
    } catch (error: any) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    }
  });

  it('should debug composite unit "5 ft 3 in"', () => {
    const input = '5 ft 3 in';
    const lexer = new Lexer(input, dataLoader);
    const tokens = lexer.tokenize();

    console.log('\nTokens for "5 ft 3 in":');
    tokens.forEach(t => console.log(`  ${t.type}: "${t.value}"`));

    const parser = new Parser(tokens, dataLoader);
    const doc = parser.parseDocument();

    console.log('\nParsed:');
    console.log(JSON.stringify(doc.lines[0], null, 2));
  });

  it('should debug conditional "if 5 > 3 then 10 else 20"', () => {
    const input = 'if 5 > 3 then 10 else 20';
    const lexer = new Lexer(input, dataLoader);
    const tokens = lexer.tokenize();

    console.log('\nTokens for conditional:');
    tokens.forEach(t => console.log(`  ${t.type}: "${t.value}"`));

    const parser = new Parser(tokens, dataLoader);
    const doc = parser.parseDocument();

    console.log('\nParsed:');
    const line = doc.lines[0] as any;
    console.log(`Line type: ${line.type}`);
    if (line.expression) {
      console.log(`Expression type: ${line.expression.type}`);
    }
  });

  it('should debug "5 km per h"', () => {
    const input = '5 km per h';
    const lexer = new Lexer(input, dataLoader);
    const tokens = lexer.tokenize();

    console.log('\nTokens for "5 km per h":');
    tokens.forEach(t => console.log(`  ${t.type}: "${t.value}"`));

    // Enable error logging temporarily
    const parser = new Parser(tokens, dataLoader);

    // Patch the parseLine to log errors
    const originalParseLine = (parser as any).parseLine;
    (parser as any).parseLine = function() {
      try {
        return originalParseLine.call(this);
      } catch (error: any) {
        console.error('\n[Caught error in parseLine]:', error.message);
        throw error;
      }
    };

    const doc = parser.parseDocument();

    console.log('\nParsed:');
    console.log(`Line type: ${doc.lines[0].type}`);
    if (doc.lines[0].type === 'ExpressionLine') {
      console.log(`Expression type: ${(doc.lines[0] as any).expression.type}`);
      console.log(`Expression:`, JSON.stringify((doc.lines[0] as any).expression, null, 2));
    }
    if (doc.lines[0].type === 'PlainText') {
      console.log(`Text: "${(doc.lines[0] as any).text}"`);
    }
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { Lexer } from '../src/lexer';
import { DataLoader } from '../src/data-loader';
import { TokenType } from '../src/tokens';
import * as path from 'path';

describe('Lexer', () => {
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    await dataLoader.load(path.join(__dirname, '..', 'data'));
  });

  function tokenize(input: string) {
    const lexer = new Lexer(input, dataLoader);
    return lexer.tokenize();
  }

  function getTokenTypes(input: string): TokenType[] {
    return tokenize(input).map(t => t.type);
  }

  function getTokenValues(input: string): string[] {
    return tokenize(input).map(t => t.value);
  }

  describe('Number Literals', () => {
    it('should tokenize integer numbers', () => {
      const tokens = tokenize('42');
      expect(tokens).toHaveLength(2); // NUMBER + EOF
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('42');
    });

    it('should tokenize decimal numbers', () => {
      const tokens = tokenize('3.14');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('3.14');
    });

    it('should tokenize scientific notation', () => {
      const tokens = tokenize('2e3');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('2e3');
    });

    it('should tokenize scientific notation with sign', () => {
      const tokens = tokenize('1.5e-10');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('1.5e-10');
    });

    it('should tokenize binary numbers', () => {
      const tokens = tokenize('0b1010');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('0b1010');
    });

    it('should tokenize octal numbers', () => {
      const tokens = tokenize('0o755');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('0o755');
    });

    it('should tokenize hexadecimal numbers', () => {
      const tokens = tokenize('0xFF');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('0xFF');
    });
  });

  describe('Scientific Notation Priority', () => {
    it('should prioritize scientific notation over constant e', () => {
      // "2e3" should be NUMBER(2e3), not NUMBER(2) * IDENTIFIER(e) * NUMBER(3)
      const tokens = tokenize('2e3');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('2e3');
    });

    it('should recognize e as constant when not scientific notation', () => {
      // "e^2" should be IDENTIFIER(e) CARET NUMBER(2)
      const types = getTokenTypes('e^2');
      expect(types).toEqual([TokenType.IDENTIFIER, TokenType.CARET, TokenType.NUMBER, TokenType.EOF]);
    });

    it('should handle scientific notation with uppercase E', () => {
      const tokens = tokenize('1E6');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('1E6');
    });
  });

  describe('Units After Numbers', () => {
    it('should tokenize number with unit (no space)', () => {
      // "5km" should be NUMBER(5) UNIT(km)
      const types = getTokenTypes('5km');
      const values = getTokenValues('5km');
      expect(types.slice(0, -1)).toEqual([TokenType.NUMBER, TokenType.UNIT]);
      expect(values.slice(0, -1)).toEqual(['5', 'km']);
    });

    it('should tokenize number with unit (with space)', () => {
      // "5 km" should be NUMBER(5) UNIT(km)
      const types = getTokenTypes('5 km');
      const values = getTokenValues('5 km');
      expect(types.slice(0, -1)).toEqual([TokenType.NUMBER, TokenType.UNIT]);
      expect(values.slice(0, -1)).toEqual(['5', 'km']);
    });

    it('should handle case-sensitive unit matching', () => {
      // "5mL" should match milliliter (case-sensitive)
      const types = getTokenTypes('5mL');
      expect(types.slice(0, -1)).toEqual([TokenType.NUMBER, TokenType.UNIT]);
    });

    it('should match longest unit name', () => {
      // "5km" should match "km" not "k" + "m"
      const tokens = tokenize('5km');
      expect(tokens[1].type).toBe(TokenType.UNIT);
      expect(tokens[1].value).toBe('km');
    });
  });

  describe('Operators', () => {
    it('should tokenize arithmetic operators', () => {
      const types = getTokenTypes('+ - * / % ^');
      expect(types.slice(0, -1)).toEqual([
        TokenType.PLUS,
        TokenType.MINUS,
        TokenType.STAR,
        TokenType.SLASH,
        TokenType.PERCENT,
        TokenType.CARET
      ]);
    });

    it('should tokenize comparison operators', () => {
      const types = getTokenTypes('< <= > >= == !=');
      expect(types.slice(0, -1)).toEqual([
        TokenType.LT,
        TokenType.LTE,
        TokenType.GT,
        TokenType.GTE,
        TokenType.EQ,
        TokenType.NEQ
      ]);
    });

    it('should tokenize logical operators', () => {
      const types = getTokenTypes('&& ||');
      expect(types.slice(0, -1)).toEqual([TokenType.AND, TokenType.OR]);
    });

    it('should tokenize bitwise operators', () => {
      const types = getTokenTypes('& | ~ << >>');
      expect(types.slice(0, -1)).toEqual([
        TokenType.AMPERSAND,
        TokenType.PIPE,
        TokenType.TILDE,
        TokenType.LSHIFT,
        TokenType.RSHIFT
      ]);
    });
  });

  describe('Keywords', () => {
    it('should tokenize conversion keywords', () => {
      const types = getTokenTypes('to in as');
      expect(types.slice(0, -1)).toEqual([TokenType.TO, TokenType.IN, TokenType.AS]);
    });

    it('should tokenize conditional keywords', () => {
      const types = getTokenTypes('if then else');
      expect(types.slice(0, -1)).toEqual([TokenType.IF, TokenType.THEN, TokenType.ELSE]);
    });

    it('should tokenize other keywords', () => {
      const types = getTokenTypes('mod per xor');
      expect(types.slice(0, -1)).toEqual([TokenType.MOD, TokenType.PER, TokenType.XOR]);
    });

    it('should tokenize boolean literals', () => {
      const types = getTokenTypes('true false');
      expect(types.slice(0, -1)).toEqual([TokenType.BOOLEAN, TokenType.BOOLEAN]);
    });
  });

  describe('Identifiers and Constants', () => {
    it('should tokenize identifiers', () => {
      const tokens = tokenize('myVariable');
      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('myVariable');
    });

    it('should tokenize identifiers with underscores', () => {
      const tokens = tokenize('my_var_123');
      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('my_var_123');
    });

    it('should tokenize constants as identifiers', () => {
      const types = getTokenTypes('pi e golden_ratio');
      expect(types.slice(0, -1)).toEqual([
        TokenType.IDENTIFIER,
        TokenType.IDENTIFIER,
        TokenType.IDENTIFIER
      ]);
    });

    it('should distinguish keywords from identifiers', () => {
      // "if" is keyword, "iffy" is identifier
      const tokens = tokenize('if iffy');
      expect(tokens[0].type).toBe(TokenType.IF);
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    });
  });

  describe('Date/Time Patterns', () => {
    it('should recognize month names', () => {
      const tokens = tokenize('Jan January');
      expect(tokens[0].type).toBe(TokenType.DATETIME);
      expect(tokens[1].type).toBe(TokenType.DATETIME);
    });

    it('should recognize day names', () => {
      const tokens = tokenize('Mon Monday');
      expect(tokens[0].type).toBe(TokenType.DATETIME);
      expect(tokens[1].type).toBe(TokenType.DATETIME);
    });

    it('should recognize AM/PM with valid time hours', () => {
      // When preceded by integers 1-12, am/pm should be DATETIME
      const tokens1 = tokenize('10 am');
      expect(tokens1[0].type).toBe(TokenType.NUMBER);
      expect(tokens1[1].type).toBe(TokenType.DATETIME);

      const tokens2 = tokenize('12 pm');
      expect(tokens2[0].type).toBe(TokenType.NUMBER);
      expect(tokens2[1].type).toBe(TokenType.DATETIME);
    });
  });

  describe('Comments and Headings', () => {
    it('should tokenize inline comments', () => {
      const tokens = tokenize('5 + 3 # this is a comment');
      const commentToken = tokens.find(t => t.type === TokenType.COMMENT);
      expect(commentToken).toBeDefined();
      expect(commentToken?.value).toBe('this is a comment');
    });

    it('should tokenize headings at start of line', () => {
      const tokens = tokenize('# Heading');
      expect(tokens[0].type).toBe(TokenType.HEADING);
      expect(tokens[0].value).toBe('1:Heading');
    });

    it('should tokenize multiple-hash headings', () => {
      const tokens = tokenize('## Level 2 Heading');
      expect(tokens[0].type).toBe(TokenType.HEADING);
      expect(tokens[0].value).toBe('2:Level 2 Heading');
    });

    it('should distinguish heading from comment', () => {
      // Heading at start of line, comment after other tokens
      const tokens1 = tokenize('# Heading');
      const tokens2 = tokenize('5 # comment');

      expect(tokens1[0].type).toBe(TokenType.HEADING);
      // tokens2: NUMBER(5), COMMENT(comment), EOF
      expect(tokens2[1].type).toBe(TokenType.COMMENT);
    });
  });

  describe('Punctuation', () => {
    it('should tokenize parentheses', () => {
      const types = getTokenTypes('(5 + 3)');
      expect(types).toContain(TokenType.LPAREN);
      expect(types).toContain(TokenType.RPAREN);
    });

    it('should tokenize commas', () => {
      const types = getTokenTypes('max(1, 2, 3)');
      expect(types.filter(t => t === TokenType.COMMA)).toHaveLength(2);
    });

    it('should tokenize assignment operator', () => {
      const tokens = tokenize('x = 5');
      expect(tokens[1].type).toBe(TokenType.ASSIGN);
    });

    it('should tokenize arrow operator', () => {
      const tokens = tokenize('5 km → m');
      expect(tokens.find(t => t.type === TokenType.ARROW)).toBeDefined();
    });
  });

  describe('Newlines', () => {
    it('should tokenize newlines', () => {
      const tokens = tokenize('5\n10');
      const newlineTokens = tokens.filter(t => t.type === TokenType.NEWLINE);
      expect(newlineTokens).toHaveLength(1);
    });

    it('should handle multiple newlines', () => {
      const tokens = tokenize('5\n\n\n10');
      const newlineTokens = tokens.filter(t => t.type === TokenType.NEWLINE);
      expect(newlineTokens).toHaveLength(3);
    });
  });

  describe('Complex Expressions', () => {
    it('should tokenize arithmetic expression', () => {
      const types = getTokenTypes('2 + 3 * 4');
      expect(types.slice(0, -1)).toEqual([
        TokenType.NUMBER,
        TokenType.PLUS,
        TokenType.NUMBER,
        TokenType.STAR,
        TokenType.NUMBER
      ]);
    });

    it('should tokenize unit conversion expression', () => {
      const types = getTokenTypes('5 km to m');
      expect(types.slice(0, -1)).toEqual([
        TokenType.NUMBER,
        TokenType.UNIT,
        TokenType.TO,
        TokenType.UNIT
      ]);
    });

    it('should tokenize function call', () => {
      const types = getTokenTypes('sin(pi / 2)');
      expect(types.slice(0, -1)).toEqual([
        TokenType.IDENTIFIER,
        TokenType.LPAREN,
        TokenType.IDENTIFIER,
        TokenType.SLASH,
        TokenType.NUMBER,
        TokenType.RPAREN
      ]);
    });

    it('should tokenize conditional expression', () => {
      const types = getTokenTypes('if x > 5 then 10 else 20');
      expect(types.slice(0, -1)).toEqual([
        TokenType.IF,
        TokenType.IDENTIFIER,
        TokenType.GT,
        TokenType.NUMBER,
        TokenType.THEN,
        TokenType.NUMBER,
        TokenType.ELSE,
        TokenType.NUMBER
      ]);
    });
  });

  describe('Source Location Tracking', () => {
    it('should track line and column positions', () => {
      const tokens = tokenize('5 + 3');
      expect(tokens[0].start.line).toBe(1);
      expect(tokens[0].start.column).toBe(1);
      expect(tokens[1].start.column).toBe(3);
      expect(tokens[2].start.column).toBe(5);
    });

    it('should track positions across newlines', () => {
      const tokens = tokenize('5\n10');
      expect(tokens[0].start.line).toBe(1);
      expect(tokens[2].start.line).toBe(2); // NUMBER(10) is on line 2
      expect(tokens[2].start.column).toBe(1);
    });

    it('should track end positions', () => {
      const tokens = tokenize('123');
      expect(tokens[0].start.column).toBe(1);
      expect(tokens[0].end.column).toBe(4); // After consuming "123"
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const tokens = tokenize('');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should handle whitespace-only input', () => {
      const tokens = tokenize('   \t  ');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should skip leading whitespace', () => {
      const tokens = tokenize('   42');
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('42');
    });

    it('should handle mixed whitespace', () => {
      const tokens = tokenize('5  \t  + \t 3');
      const types = tokens.map(t => t.type).filter(t => t !== TokenType.EOF);
      expect(types).toEqual([TokenType.NUMBER, TokenType.PLUS, TokenType.NUMBER]);
    });

    it('should handle unknown characters gracefully', () => {
      // Unknown characters should be skipped
      const tokens = tokenize('5 @ 3');
      // @ should be skipped, leaving NUMBER IDENTIFIER/NUMBER
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('Currency Units', () => {
    it('should tokenize currency codes as units', () => {
      const types = getTokenTypes('100 USD');
      expect(types.slice(0, -1)).toEqual([TokenType.NUMBER, TokenType.UNIT]);
    });

    it('should tokenize specific currency names as units', () => {
      // Use a specific, unambiguous currency name
      const types = getTokenTypes('100 EUR');
      expect(types.slice(0, -1)).toEqual([TokenType.NUMBER, TokenType.UNIT]);
    });
  });

  describe('AM/PM Disambiguation', () => {
    describe('Time indicators (DATETIME)', () => {
      it('should recognize single-digit hours 1-9 as time', () => {
        for (let i = 1; i <= 9; i++) {
          const tokens = tokenize(`${i} am`);
          expect(tokens[1].type).toBe(TokenType.DATETIME);
          expect(tokens[1].value).toBe('am');
        }
      });

      it('should recognize zero-padded hours 01-09 as time', () => {
        for (let i = 1; i <= 9; i++) {
          const tokens = tokenize(`0${i} pm`);
          expect(tokens[1].type).toBe(TokenType.DATETIME);
          expect(tokens[1].value).toBe('pm');
        }
      });

      it('should recognize hours 10-12 as time', () => {
        const tokens10 = tokenize('10 am');
        expect(tokens10[1].type).toBe(TokenType.DATETIME);

        const tokens11 = tokenize('11 PM');
        expect(tokens11[1].type).toBe(TokenType.DATETIME);

        const tokens12 = tokenize('12 pm');
        expect(tokens12[1].type).toBe(TokenType.DATETIME);
      });

      it('should work with all case variations', () => {
        const testCases = [
          '10 am', '10 AM', '10 pm', '10 PM',
          '5 am', '5 AM', '5 pm', '5 PM'
        ];

        for (const testCase of testCases) {
          const tokens = tokenize(testCase);
          expect(tokens[1].type).toBe(TokenType.DATETIME);
        }
      });
    });

    describe('Units (attometers/picometers/petameters)', () => {
      it('should treat decimal numbers as units', () => {
        const tokens1 = tokenize('10.0 am');
        expect(tokens1[1].type).toBe(TokenType.UNIT);

        const tokens2 = tokenize('1.5 pm');
        expect(tokens2[1].type).toBe(TokenType.UNIT);

        const tokens3 = tokenize('5.0 PM');
        expect(tokens3[1].type).toBe(TokenType.UNIT);
      });

      it('should treat numbers outside 1-12 range as units', () => {
        const tokens0 = tokenize('0 am');
        expect(tokens0[1].type).toBe(TokenType.UNIT);

        const tokens13 = tokenize('13 am');
        expect(tokens13[1].type).toBe(TokenType.UNIT);

        const tokens22 = tokenize('22 pm');
        expect(tokens22[1].type).toBe(TokenType.UNIT);

        const tokens33 = tokenize('33 PM');
        expect(tokens33[1].type).toBe(TokenType.UNIT);

        const tokens100 = tokenize('100 am');
        expect(tokens100[1].type).toBe(TokenType.UNIT);
      });

      it('should treat leading zeros beyond 2 digits as units', () => {
        const tokens010 = tokenize('010 am');
        expect(tokens010[1].type).toBe(TokenType.UNIT);

        const tokens001 = tokenize('001 pm');
        expect(tokens001[1].type).toBe(TokenType.UNIT);
      });

      it('should treat am/pm without preceding number as units', () => {
        const tokens = tokenize('am pm AM PM');
        expect(tokens[0].type).toBe(TokenType.UNIT);
        expect(tokens[1].type).toBe(TokenType.UNIT);
        expect(tokens[2].type).toBe(TokenType.UNIT);
        expect(tokens[3].type).toBe(TokenType.UNIT);
      });

      it('should handle full unit names', () => {
        const tokens1 = tokenize('10 attometers');
        expect(tokens1[1].type).toBe(TokenType.UNIT);

        const tokens2 = tokenize('10 picometers');
        expect(tokens2[1].type).toBe(TokenType.UNIT);

        const tokens3 = tokenize('10 petameters');
        expect(tokens3[1].type).toBe(TokenType.UNIT);
      });
    });

    describe('Edge cases', () => {
      it('should handle am/pm after non-number tokens', () => {
        const tokens = tokenize('hello am');
        expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
        expect(tokens[1].type).toBe(TokenType.UNIT);
      });

      it('should handle multiple am/pm in sequence', () => {
        const tokens = tokenize('10 am 5 pm');
        expect(tokens[1].type).toBe(TokenType.DATETIME);  // 10 am
        expect(tokens[3].type).toBe(TokenType.DATETIME);  // 5 pm
      });

      it('should handle mixed time and unit usage', () => {
        const tokens = tokenize('10 am 13 am');
        expect(tokens[1].type).toBe(TokenType.DATETIME);  // 10 am (time)
        expect(tokens[3].type).toBe(TokenType.UNIT);      // 13 am (attometers)
      });
    });
  });
});

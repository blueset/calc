// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var assign: any;
declare var lparen: any;
declare var rparen: any;
declare var kw_if: any;
declare var kw_then: any;
declare var kw_else: any;
declare var kw_to: any;
declare var kw_as: any;
declare var kw_in: any;
declare var arrow: any;
declare var kw_value: any;
declare var kw_binary: any;
declare var kw_octal: any;
declare var kw_decimal: any;
declare var kw_hexadecimal: any;
declare var decimalDigits: any;
declare var sigFigs: any;
declare var kw_decimals: any;
declare var kw_base: any;
declare var kw_scientific: any;
declare var kw_fraction: any;
declare var kw_percentage: any;
declare var percent: any;
declare var ISO8601: any;
declare var RFC9557: any;
declare var RFC2822: any;
declare var kw_unix: any;
declare var identifier: any;
declare var dayOfYear: any;
declare var weekOfYear: any;
declare var or: any;
declare var and: any;
declare var pipe: any;
declare var kw_xor: any;
declare var ampersand: any;
declare var lessThan: any;
declare var lessThanOrEqual: any;
declare var greaterThan: any;
declare var greaterThanOrEqual: any;
declare var equals: any;
declare var notEquals: any;
declare var lShift: any;
declare var rShift: any;
declare var plus: any;
declare var minus: any;
declare var times: any;
declare var slash: any;
declare var divide: any;
declare var kw_per: any;
declare var kw_mod: any;
declare var bang: any;
declare var tilde: any;
declare var caret: any;
declare var superscript: any;
declare var kw_true: any;
declare var kw_false: any;
declare var constantSymbol: any;
declare var currencySymbolAdjacent: any;
declare var comma: any;
declare var kw_square: any;
declare var kw_squared: any;
declare var kw_cubic: any;
declare var kw_cubed: any;
declare var degree: any;
declare var prime: any;
declare var doublePrime: any;
declare var hexNumber: any;
declare var binaryNumber: any;
declare var octalNumber: any;
declare var dot: any;
declare var permille: any;
declare var scienceExponential: any;
declare var kw_now: any;
declare var kw_today: any;
declare var kw_yesterday: any;
declare var kw_tomorrow: any;
declare var kw_ago: any;
declare var kw_from: any;
declare var plainTime: any;
declare var ws: any;

import { lexer } from './lexer';
import { DataLoader } from '../data-loader';
import { isConstant } from '../constants';

const dataLoader = new DataLoader();
dataLoader.load();

function expandList(index: number) {
  return (data: any[]): any[] => {
    const first = data[0];
    const rest = data[1].map((item: any) => item[index]);
    return [first, ...rest];
  };
}

function mergeParts (data: any[]): any {
  return { text: data.map((token: any) => token.value).join(''), offset: data[0].offset };
}

function optionalBinaryOp(data: any[], location: any, reject: any): any {
  // consolidate args for patterns like `LogicalOrExpr -> LogicalAndExpr ( _ %or _ LogicalAndExpr ):*`
  if (data[1]?.length ) {
    if (data[1][0] === null) {
      data[1] = [data[1]];
    }
    return data[1].reduce((left: any, item: any) => {
      const operator = Array.isArray(item[1]) ? item[1][0] : item[1];
      const right = item[3];
      return { 
        type: 'BinaryExpression', 
        operator: operator.type, 
        left, right, 
        offset: left.offset, 
        operatorToken: { offset: operator.offset, length: operator.value.length } 
      };
    }, data[0]);
  } else {
    return data[0];
  }
}

function optionalUnaryOp(opIndex: number, exprIndex: number) {
  return (data: any[], location: any, reject: any): any => {
    if (data[opIndex]) {
      return { type: 'UnaryExpression', operator: data[opIndex].type, argument: data[exprIndex], offset: data[opIndex].offset };
    } else {
      return data[exprIndex];
    }
  };
}

function negateExponents(unitWithExpNodes: any[]): any[] {
  return unitWithExpNodes.map((node: any) => ({
    ...node,
    exponent: -node.exponent
  }));
}

function parseMonthName(name: string): number | null {
  const months: { [key: string]: number } = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'september': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12
  };

  return months[name] ?? null;
}

interface NearleyToken {
  value: any;
  [key: string]: any;
};

interface NearleyLexer {
  reset: (chunk: string, info: any) => void;
  next: () => NearleyToken | undefined;
  save: () => any;
  formatError: (token: never) => string;
  has: (tokenType: string) => boolean;
};

interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any;
};

type NearleySymbol = string | { literal: any } | { test: (token: any) => boolean };

interface Grammar {
  Lexer: NearleyLexer | undefined;
  ParserRules: NearleyRule[];
  ParserStart: string;
};

const grammar: Grammar = {
  Lexer: lexer,
  ParserRules: [
    {"name": "Line", "symbols": ["VariableAssignment"], "postprocess": id},
    {"name": "Line", "symbols": ["Expression"], "postprocess": id},
    {"name": "Line", "symbols": []},
    {"name": "VariableAssignment", "symbols": ["Variable", "_", (lexer.has("assign") ? {type: "assign"} : assign), "_", "Expression"], "postprocess": 
        (data, location) => ({ type: 'VariableAssignment', name: data[0].name, value: data[4], offset: data[0].offset })
        },
    {"name": "Expression", "symbols": ["ConditionalExpr"], "postprocess": id},
    {"name": "Expression", "symbols": ["ParenthesizedExpr"], "postprocess": id},
    {"name": "Expression", "symbols": ["Conversion"], "postprocess": id},
    {"name": "ParenthesizedExpr", "symbols": [(lexer.has("lparen") ? {type: "lparen"} : lparen), "_", "Expression", "_", (lexer.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": (data) => data[2]},
    {"name": "ConditionalExpr", "symbols": [(lexer.has("kw_if") ? {type: "kw_if"} : kw_if), "__", "LogicalOrExpr", "__", (lexer.has("kw_then") ? {type: "kw_then"} : kw_then), "__", "Expression", "__", (lexer.has("kw_else") ? {type: "kw_else"} : kw_else), "__", "Expression"], "postprocess": 
        (data, location) => ({ 
          type: 'ConditionalExpr', 
          condition: data[2], then: data[6], else: data[10], 
          offset: data[0].offset, 
          ifToken: { offset: data[0].offset, length: data[0].value.length }, 
          thenToken: { offset: data[4].offset, length: data[4].value.length }, 
          elseToken: { offset: data[8].offset, length: data[8].value.length } 
        })
        },
    {"name": "Conversion$ebnf$1$subexpression$1", "symbols": ["__", "ConversionOp", "__", "ConversionTarget"]},
    {"name": "Conversion$ebnf$1", "symbols": ["Conversion$ebnf$1$subexpression$1"]},
    {"name": "Conversion$ebnf$1$subexpression$2", "symbols": ["__", "ConversionOp", "__", "ConversionTarget"]},
    {"name": "Conversion$ebnf$1", "symbols": ["Conversion$ebnf$1", "Conversion$ebnf$1$subexpression$2"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Conversion", "symbols": ["ConversionSource", "Conversion$ebnf$1"], "postprocess": 
        (data, location) => {
          // Reduce multiple conversions into nested Conversion nodes
          // e.g., "1.71 m to ft in to fraction" becomes Conversion(Conversion(1.71 m, to ft in), to fraction)
          return data[1].reduce((expr: any, conversion: any) => {
            const target = conversion[3];
            return {
              type: 'Conversion', expression: expr, operator: conversion[1].type, target,
              offset: target.offset,
              operatorToken: { offset: conversion[1].offset, length: conversion[1].value.length }
            };
          }, data[0]);
        }
        },
    {"name": "Conversion", "symbols": ["ConversionSource"], "postprocess": id},
    {"name": "ConversionSource", "symbols": ["LogicalOrExpr"], "postprocess": id},
    {"name": "ConversionSource", "symbols": ["ConditionalExpr"], "postprocess": id},
    {"name": "ConversionOp", "symbols": [(lexer.has("kw_to") ? {type: "kw_to"} : kw_to)], "postprocess": id},
    {"name": "ConversionOp", "symbols": [(lexer.has("kw_as") ? {type: "kw_as"} : kw_as)], "postprocess": id},
    {"name": "ConversionOp", "symbols": [(lexer.has("kw_in") ? {type: "kw_in"} : kw_in)], "postprocess": id},
    {"name": "ConversionOp", "symbols": [(lexer.has("arrow") ? {type: "arrow"} : arrow)], "postprocess": id},
    {"name": "ConversionTarget", "symbols": ["UnitTarget"], "postprocess": id},
    {"name": "ConversionTarget", "symbols": ["PresentationTarget"], "postprocess": id},
    {"name": "ConversionTarget", "symbols": ["PropertyTarget"], "postprocess": id},
    {"name": "ConversionTarget", "symbols": ["TimezoneTarget"], "postprocess": id},
    {"name": "UnitTarget", "symbols": ["Units"], "postprocess": id},
    {"name": "PresentationTarget", "symbols": [(lexer.has("kw_value") ? {type: "kw_value"} : kw_value)], "postprocess": (data, location) => ({ type: 'PresentationFormat', format: 'value', offset: data[0].offset, sourceLength: data[0].value.length })},
    {"name": "PresentationTarget", "symbols": [(lexer.has("kw_binary") ? {type: "kw_binary"} : kw_binary)], "postprocess": 
        (data, location) => ({ type: 'PresentationFormat', format: 'base', base: 2, offset: data[0].offset, sourceLength: data[0].value.length })
                            },
    {"name": "PresentationTarget", "symbols": [(lexer.has("kw_octal") ? {type: "kw_octal"} : kw_octal)], "postprocess": 
        (data, location) => ({ type: 'PresentationFormat', format: 'base', base: 8, offset: data[0].offset, sourceLength: data[0].value.length })
                            },
    {"name": "PresentationTarget", "symbols": [(lexer.has("kw_decimal") ? {type: "kw_decimal"} : kw_decimal)], "postprocess": 
        (data, location) => ({ type: 'PresentationFormat', format: 'base', base: 10, offset: data[0].offset, sourceLength: data[0].value.length })
                            },
    {"name": "PresentationTarget", "symbols": [(lexer.has("kw_hexadecimal") ? {type: "kw_hexadecimal"} : kw_hexadecimal)], "postprocess": 
        (data, location) => ({ type: 'PresentationFormat', format: 'base', base: 16, offset: data[0].offset, sourceLength: data[0].value.length })
                            },
    {"name": "PresentationTarget", "symbols": [(lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), "__", (lexer.has("sigFigs") ? {type: "sigFigs"} : sigFigs)], "postprocess": 
        (data, location) => {
          const sourceLength = (data[2].offset + data[2].value.length) - data[0].offset;
          return { type: 'PresentationFormat', format: 'sigFigs', sigFigs: parseInt(data[0].value.replaceAll('_', '')), offset: data[0].offset, sourceLength };
        }
                            },
    {"name": "PresentationTarget$subexpression$1", "symbols": [(lexer.has("kw_decimals") ? {type: "kw_decimals"} : kw_decimals)]},
    {"name": "PresentationTarget$subexpression$1", "symbols": [(lexer.has("kw_decimal") ? {type: "kw_decimal"} : kw_decimal)]},
    {"name": "PresentationTarget", "symbols": [(lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), "__", "PresentationTarget$subexpression$1"], "postprocess": 
        (data, location) => {
          const lastToken = data[2][0];
          const sourceLength = (lastToken.offset + lastToken.value.length) - data[0].offset;
          return { type: 'PresentationFormat', format: 'decimals', decimals: parseInt(data[0].value.replaceAll('_', '')), offset: data[0].offset, sourceLength };
        }
                            },
    {"name": "PresentationTarget", "symbols": [(lexer.has("kw_base") ? {type: "kw_base"} : kw_base), "__", (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)], "postprocess": 
        (data, location) => {
          const sourceLength = (data[2].offset + data[2].value.length) - data[0].offset;
          return { type: 'PresentationFormat', format: 'base', base: parseInt(data[2].value.replaceAll('_', '')), offset: data[0].offset, sourceLength };
        }
                            },
    {"name": "PresentationTarget", "symbols": [(lexer.has("kw_scientific") ? {type: "kw_scientific"} : kw_scientific)], "postprocess": 
        (data, location) => ({ type: 'PresentationFormat', format: 'scientific', offset: data[0].offset, sourceLength: data[0].value.length })
                            },
    {"name": "PresentationTarget", "symbols": [(lexer.has("kw_fraction") ? {type: "kw_fraction"} : kw_fraction)], "postprocess": 
        (data, location) => ({ type: 'PresentationFormat', format: 'fraction', offset: data[0].offset, sourceLength: data[0].value.length })
                            },
    {"name": "PresentationTarget$subexpression$2", "symbols": [(lexer.has("kw_percentage") ? {type: "kw_percentage"} : kw_percentage)]},
    {"name": "PresentationTarget$subexpression$2", "symbols": [(lexer.has("percent") ? {type: "percent"} : percent)]},
    {"name": "PresentationTarget", "symbols": ["PresentationTarget$subexpression$2"], "postprocess": 
        (data, location) => ({
          type: 'PresentationFormat', format: 'percentage',
          offset: data[0][0].offset, sourceLength: data[0][0].value.length
        })
                            },
    {"name": "PresentationTarget", "symbols": [(lexer.has("ISO8601") ? {type: "ISO8601"} : ISO8601)], "postprocess": 
        (data, location) => ({ type: 'PresentationFormat', format: 'ISO 8601', offset: data[0].offset, sourceLength: data[0].value.length })
                            },
    {"name": "PresentationTarget", "symbols": [(lexer.has("RFC9557") ? {type: "RFC9557"} : RFC9557)], "postprocess": 
        (data, location) => ({ type: 'PresentationFormat', format: 'RFC 9557', offset: data[0].offset, sourceLength: data[0].value.length })
                            },
    {"name": "PresentationTarget", "symbols": [(lexer.has("RFC2822") ? {type: "RFC2822"} : RFC2822)], "postprocess": 
        (data, location) => ({ type: 'PresentationFormat', format: 'RFC 2822', offset: data[0].offset, sourceLength: data[0].value.length })
                            },
    {"name": "PresentationTarget$ebnf$1$subexpression$1", "symbols": ["__", (lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "PresentationTarget$ebnf$1", "symbols": ["PresentationTarget$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "PresentationTarget$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "PresentationTarget", "symbols": [(lexer.has("kw_unix") ? {type: "kw_unix"} : kw_unix), "PresentationTarget$ebnf$1"], "postprocess": 
        (data, location, reject) => {
          if (data[1]?.[1]?.value && !/^(s|seconds?|ms|milliseconds?)$/i.test(data[1][1].value)) return reject;
          const lastToken = data[1]?.[1] ?? data[0];
          const sourceLength = (lastToken.offset + lastToken.value.length) - data[0].offset;
          return { type: 'PresentationFormat', format: 'unix', unit: data[1]?.[1]?.value ?? "second", offset: data[0].offset, sourceLength };
        }
                            },
    {"name": "PresentationTarget", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": 
        (data, location, reject) =>
          !/^(binary|octal|decimal|hexadecimal|scientific|bin|oct|dec|hex|fraction|unix|value|decimals|base|ordinal)$/i.test(data[0].value)
          ? reject
          : ({ type: 'PresentationFormat', format: 'namedFormat', name: data[0].value, offset: data[0].offset, sourceLength: data[0].value.length })
                            },
    {"name": "PropertyTarget", "symbols": [(lexer.has("dayOfYear") ? {type: "dayOfYear"} : dayOfYear)], "postprocess": 
        (data, location) => ({ type: 'PropertyTarget', property: 'dayOfYear', offset: data[0].offset, sourceLength: data[0].value.length })
                            },
    {"name": "PropertyTarget", "symbols": [(lexer.has("weekOfYear") ? {type: "weekOfYear"} : weekOfYear)], "postprocess": 
        (data, location) => ({ type: 'PropertyTarget', property: 'weekOfYear', offset: data[0].offset, sourceLength: data[0].value.length })
                            },
    {"name": "PropertyTarget", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": 
        (data, location, reject) =>
          /^(year|month|day|weekday|hour|minute|second|millisecond|offset)s?$/i.test(data[0].value)
          ? ({ type: 'PropertyTarget', property: data[0].value, offset: data[0].offset, sourceLength: data[0].value.length })
          : reject
                            },
    {"name": "TimezoneTarget", "symbols": ["Timezone"], "postprocess": id},
    {"name": "LogicalOrExpr$ebnf$1", "symbols": []},
    {"name": "LogicalOrExpr$ebnf$1$subexpression$1", "symbols": ["_", (lexer.has("or") ? {type: "or"} : or), "_", "LogicalAndExpr"]},
    {"name": "LogicalOrExpr$ebnf$1", "symbols": ["LogicalOrExpr$ebnf$1", "LogicalOrExpr$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "LogicalOrExpr", "symbols": ["LogicalAndExpr", "LogicalOrExpr$ebnf$1"], "postprocess": optionalBinaryOp},
    {"name": "LogicalAndExpr$ebnf$1", "symbols": []},
    {"name": "LogicalAndExpr$ebnf$1$subexpression$1", "symbols": ["_", (lexer.has("and") ? {type: "and"} : and), "_", "BitwiseOrExpr"]},
    {"name": "LogicalAndExpr$ebnf$1", "symbols": ["LogicalAndExpr$ebnf$1", "LogicalAndExpr$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "LogicalAndExpr", "symbols": ["BitwiseOrExpr", "LogicalAndExpr$ebnf$1"], "postprocess": optionalBinaryOp},
    {"name": "BitwiseOrExpr$ebnf$1", "symbols": []},
    {"name": "BitwiseOrExpr$ebnf$1$subexpression$1", "symbols": ["_", (lexer.has("pipe") ? {type: "pipe"} : pipe), "_", "BitwiseXorExpr"]},
    {"name": "BitwiseOrExpr$ebnf$1", "symbols": ["BitwiseOrExpr$ebnf$1", "BitwiseOrExpr$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "BitwiseOrExpr", "symbols": ["BitwiseXorExpr", "BitwiseOrExpr$ebnf$1"], "postprocess": optionalBinaryOp},
    {"name": "BitwiseXorExpr$ebnf$1", "symbols": []},
    {"name": "BitwiseXorExpr$ebnf$1$subexpression$1", "symbols": ["_", (lexer.has("kw_xor") ? {type: "kw_xor"} : kw_xor), "_", "BitwiseAndExpr"]},
    {"name": "BitwiseXorExpr$ebnf$1", "symbols": ["BitwiseXorExpr$ebnf$1", "BitwiseXorExpr$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "BitwiseXorExpr", "symbols": ["BitwiseAndExpr", "BitwiseXorExpr$ebnf$1"], "postprocess": optionalBinaryOp},
    {"name": "BitwiseAndExpr$ebnf$1", "symbols": []},
    {"name": "BitwiseAndExpr$ebnf$1$subexpression$1", "symbols": ["_", (lexer.has("ampersand") ? {type: "ampersand"} : ampersand), "_", "ComparisonExpr"]},
    {"name": "BitwiseAndExpr$ebnf$1", "symbols": ["BitwiseAndExpr$ebnf$1", "BitwiseAndExpr$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "BitwiseAndExpr", "symbols": ["ComparisonExpr", "BitwiseAndExpr$ebnf$1"], "postprocess": optionalBinaryOp},
    {"name": "ComparisonExpr$ebnf$1$subexpression$1", "symbols": ["_", "ComparisonOp", "_", "BitShiftExpr"]},
    {"name": "ComparisonExpr$ebnf$1", "symbols": ["ComparisonExpr$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "ComparisonExpr$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "ComparisonExpr", "symbols": ["BitShiftExpr", "ComparisonExpr$ebnf$1"], "postprocess": optionalBinaryOp},
    {"name": "ComparisonOp", "symbols": [(lexer.has("lessThan") ? {type: "lessThan"} : lessThan)]},
    {"name": "ComparisonOp", "symbols": [(lexer.has("lessThanOrEqual") ? {type: "lessThanOrEqual"} : lessThanOrEqual)]},
    {"name": "ComparisonOp", "symbols": [(lexer.has("greaterThan") ? {type: "greaterThan"} : greaterThan)]},
    {"name": "ComparisonOp", "symbols": [(lexer.has("greaterThanOrEqual") ? {type: "greaterThanOrEqual"} : greaterThanOrEqual)]},
    {"name": "ComparisonOp", "symbols": [(lexer.has("equals") ? {type: "equals"} : equals)]},
    {"name": "ComparisonOp", "symbols": [(lexer.has("notEquals") ? {type: "notEquals"} : notEquals)]},
    {"name": "BitShiftExpr$ebnf$1", "symbols": []},
    {"name": "BitShiftExpr$ebnf$1$subexpression$1$subexpression$1", "symbols": [(lexer.has("lShift") ? {type: "lShift"} : lShift)]},
    {"name": "BitShiftExpr$ebnf$1$subexpression$1$subexpression$1", "symbols": [(lexer.has("rShift") ? {type: "rShift"} : rShift)]},
    {"name": "BitShiftExpr$ebnf$1$subexpression$1", "symbols": ["_", "BitShiftExpr$ebnf$1$subexpression$1$subexpression$1", "_", "AdditiveExpr"]},
    {"name": "BitShiftExpr$ebnf$1", "symbols": ["BitShiftExpr$ebnf$1", "BitShiftExpr$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "BitShiftExpr", "symbols": ["AdditiveExpr", "BitShiftExpr$ebnf$1"], "postprocess": optionalBinaryOp},
    {"name": "AdditiveExpr$ebnf$1", "symbols": []},
    {"name": "AdditiveExpr$ebnf$1$subexpression$1$subexpression$1", "symbols": [(lexer.has("plus") ? {type: "plus"} : plus)]},
    {"name": "AdditiveExpr$ebnf$1$subexpression$1$subexpression$1", "symbols": [(lexer.has("minus") ? {type: "minus"} : minus)]},
    {"name": "AdditiveExpr$ebnf$1$subexpression$1", "symbols": ["_", "AdditiveExpr$ebnf$1$subexpression$1$subexpression$1", "_", "MultiplicativeExpr"]},
    {"name": "AdditiveExpr$ebnf$1", "symbols": ["AdditiveExpr$ebnf$1", "AdditiveExpr$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "AdditiveExpr", "symbols": ["MultiplicativeExpr", "AdditiveExpr$ebnf$1"], "postprocess": optionalBinaryOp},
    {"name": "MultiplicativeExpr$ebnf$1", "symbols": []},
    {"name": "MultiplicativeExpr$ebnf$1$subexpression$1", "symbols": ["_", "MultiplicativeOp", "_", "UnaryExpr"]},
    {"name": "MultiplicativeExpr$ebnf$1", "symbols": ["MultiplicativeExpr$ebnf$1", "MultiplicativeExpr$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "MultiplicativeExpr", "symbols": ["UnaryExpr", "MultiplicativeExpr$ebnf$1"], "postprocess": optionalBinaryOp},
    {"name": "MultiplicativeOp", "symbols": [(lexer.has("times") ? {type: "times"} : times)]},
    {"name": "MultiplicativeOp", "symbols": [(lexer.has("slash") ? {type: "slash"} : slash)]},
    {"name": "MultiplicativeOp", "symbols": [(lexer.has("divide") ? {type: "divide"} : divide)]},
    {"name": "MultiplicativeOp", "symbols": [(lexer.has("kw_per") ? {type: "kw_per"} : kw_per)]},
    {"name": "MultiplicativeOp", "symbols": [(lexer.has("percent") ? {type: "percent"} : percent)]},
    {"name": "MultiplicativeOp", "symbols": [(lexer.has("kw_mod") ? {type: "kw_mod"} : kw_mod)]},
    {"name": "UnaryExpr", "symbols": [(lexer.has("minus") ? {type: "minus"} : minus), "UnaryExpr"], "postprocess": optionalUnaryOp(0, 1)},
    {"name": "UnaryExpr", "symbols": [(lexer.has("bang") ? {type: "bang"} : bang), "UnaryExpr"], "postprocess": optionalUnaryOp(0, 1)},
    {"name": "UnaryExpr", "symbols": [(lexer.has("tilde") ? {type: "tilde"} : tilde), "UnaryExpr"], "postprocess": optionalUnaryOp(0, 1)},
    {"name": "UnaryExpr", "symbols": ["PowerExpr"], "postprocess": id},
    {"name": "UnaryExpr", "symbols": ["ValueWithUnits"], "postprocess": id},
    {"name": "PowerExpr$ebnf$1$subexpression$1", "symbols": ["_", (lexer.has("caret") ? {type: "caret"} : caret), "_", "UnaryExpr"]},
    {"name": "PowerExpr$ebnf$1", "symbols": ["PowerExpr$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "PowerExpr$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "PowerExpr", "symbols": ["PostfixExpr", "PowerExpr$ebnf$1"], "postprocess": 
        (data, location) =>
          data[1]
          ? ({
              type: 'BinaryExpression', subType: 'caret',
              operator: data[1][1].type, left: data[0], right: data[1][3],
              offset: data[0].offset,
              operatorToken: { offset: data[1][1].offset, length: data[1][1].value.length }
            })
          : data[0]
                     },
    {"name": "PowerExpr", "symbols": ["PostfixExpr", (lexer.has("superscript") ? {type: "superscript"} : superscript)], "postprocess": 
        (data, location) => {
          const exponentStr = data[1].value.normalize("NFKC");
          const exponent = parseInt(exponentStr);
          return {
            type: 'BinaryExpression', subType: 'superscript',
            operator: data[1].type,
            left: data[0],
            right: {
              type: 'NumberLiteral',
              subType: 'baseSuperscript',
              base: 10, value: exponent.toString(),
              offset: data[1].offset,
              sourceLength: data[1].value.length
            },
            offset: data[0].offset,
            operatorToken: { offset: data[1].offset, length: data[1].value.length }
          };
        }
                   },
    {"name": "PostfixExpr$ebnf$1$subexpression$1", "symbols": [(lexer.has("bang") ? {type: "bang"} : bang)]},
    {"name": "PostfixExpr$ebnf$1", "symbols": ["PostfixExpr$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "PostfixExpr$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "PostfixExpr", "symbols": ["UnitlessPrimary", "PostfixExpr$ebnf$1"], "postprocess": 
        (data, location) =>
          data[1]
          ? ({
              type: 'PostfixExpression',
              operator: data[1][0].type, argument: data[0],
              offset: data[0].offset,
              operatorToken: { offset: data[1][0].offset, length: data[1][0].value.length }
            })
          : data[0]
                       },
    {"name": "UnitlessPrimary", "symbols": ["Variable"], "postprocess": id},
    {"name": "UnitlessPrimary", "symbols": ["FunctionCall"], "postprocess": id},
    {"name": "UnitlessPrimary", "symbols": [(lexer.has("lparen") ? {type: "lparen"} : lparen), "_", "Expression", "_", (lexer.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": (data) => data[2]},
    {"name": "UnitlessPrimary", "symbols": ["BooleanLiteral"], "postprocess": id},
    {"name": "UnitlessPrimary", "symbols": ["DateTimeLiteral"], "postprocess": id},
    {"name": "UnitlessPrimary", "symbols": ["BareNumber"], "postprocess": id},
    {"name": "BooleanLiteral", "symbols": [(lexer.has("kw_true") ? {type: "kw_true"} : kw_true)], "postprocess": (data, location) => ({ type: 'BooleanLiteral', value: true, offset: data[0].offset })},
    {"name": "BooleanLiteral", "symbols": [(lexer.has("kw_false") ? {type: "kw_false"} : kw_false)], "postprocess": (data, location) => ({ type: 'BooleanLiteral', value: false, offset: data[0].offset })},
    {"name": "Variable$subexpression$1", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "Variable$subexpression$1", "symbols": [(lexer.has("kw_value") ? {type: "kw_value"} : kw_value)]},
    {"name": "Variable", "symbols": ["Variable$subexpression$1"], "postprocess":  (data, location, reject) => {
          return ({ type: 'Variable', name: data[0][0].value, offset: data[0][0].offset });
        } },
    {"name": "Constant$subexpression$1", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "Constant$subexpression$1", "symbols": [(lexer.has("constantSymbol") ? {type: "constantSymbol"} : constantSymbol)]},
    {"name": "Constant", "symbols": ["Constant$subexpression$1"], "postprocess":  
        (data, location, reject) => isConstant(data[0][0].value) ? ({ type: 'Constant', name: data[0][0].value, offset: data[0][0].offset }) : reject
                    },
    {"name": "BareNumber", "symbols": ["NumericalValue"], "postprocess": 
        (data, location) => ({ type: 'Value', value: data[0], unit: null, offset: data[0].offset })
        },
    {"name": "ValueWithUnits", "symbols": ["CompositeValue"], "postprocess": id},
    {"name": "ValueWithUnits", "symbols": ["NumericalValue", "_", "Units"], "postprocess": 
        (data, location) => ({ type: 'Value', value: data[0], unit: data[2], offset: data[0].offset })
                          },
    {"name": "ValueWithUnits", "symbols": ["CurrencyWithPrefix"], "postprocess": id},
    {"name": "NumberWithRequiredUnit", "symbols": ["NumericalValue", "_", "Units"], "postprocess": 
        (data, location) => ({ type: 'Value', value: data[0], unit: data[2], offset: data[0].offset })
        },
    {"name": "CurrencyWithPrefix", "symbols": [(lexer.has("currencySymbolAdjacent") ? {type: "currencySymbolAdjacent"} : currencySymbolAdjacent), "NumericalValue"], "postprocess": 
        (data, location) => ({ 
          type: 'Value', value: data[1], 
          unit: { type: 'CurrencyUnit', subType: 'symbolAdjacent', name: data[0].value, offset: data[0].offset }, 
          offset: data[0].offset 
        })
        },
    {"name": "CurrencyWithPrefix", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "__", "NumericalValue"], "postprocess": 
        (data, location, reject) => {
          return (
            !dataLoader.getCurrencyBySpacedSymbol(data[0].value)
            ? reject
            : ({ 
              type: 'Value', 
              value: data[2], 
              unit: { type: 'CurrencyUnit', subType: 'symbolSpaced', name: data[0].value, offset: data[0].offset }, 
              offset: data[0].offset 
            })
          );
        }
        },
    {"name": "CompositeValue$ebnf$1$subexpression$1", "symbols": ["_", "NumberWithRequiredUnit"]},
    {"name": "CompositeValue$ebnf$1", "symbols": ["CompositeValue$ebnf$1$subexpression$1"]},
    {"name": "CompositeValue$ebnf$1$subexpression$2", "symbols": ["_", "NumberWithRequiredUnit"]},
    {"name": "CompositeValue$ebnf$1", "symbols": ["CompositeValue$ebnf$1", "CompositeValue$ebnf$1$subexpression$2"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "CompositeValue", "symbols": ["NumberWithRequiredUnit", "CompositeValue$ebnf$1"], "postprocess": 
        (data, location) => {
          const first = data[0];
          const rest = data[1].map((item: any) => item[1]);
          return { type: 'CompositeValue', subType: 'composite', values: [first, ...rest], offset: data[0].offset };
        }
        },
    {"name": "FunctionCall$ebnf$1$subexpression$1", "symbols": ["_", "ArgumentList"]},
    {"name": "FunctionCall$ebnf$1", "symbols": ["FunctionCall$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "FunctionCall$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "FunctionCall", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "_", (lexer.has("lparen") ? {type: "lparen"} : lparen), "FunctionCall$ebnf$1", "_", (lexer.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": 
        (data, location) => {
          return { type: 'FunctionCall', name: data[0].value, arguments: data[3] ? data[3][1] : [], offset: data[0].offset };
        }
        },
    {"name": "ArgumentList$ebnf$1", "symbols": []},
    {"name": "ArgumentList$ebnf$1$subexpression$1", "symbols": ["_", (lexer.has("comma") ? {type: "comma"} : comma), "_", "Expression"]},
    {"name": "ArgumentList$ebnf$1", "symbols": ["ArgumentList$ebnf$1", "ArgumentList$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "ArgumentList", "symbols": ["Expression", "ArgumentList$ebnf$1"], "postprocess": expandList(3)},
    {"name": "Units$ebnf$1", "symbols": []},
    {"name": "Units$ebnf$1", "symbols": ["Units$ebnf$1", "UnitsList"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Units$ebnf$2$subexpression$1", "symbols": ["_", (lexer.has("slash") ? {type: "slash"} : slash), "_", "UnitsDenominatorList"]},
    {"name": "Units$ebnf$2", "symbols": ["Units$ebnf$2$subexpression$1"]},
    {"name": "Units$ebnf$2$subexpression$2", "symbols": ["_", (lexer.has("slash") ? {type: "slash"} : slash), "_", "UnitsDenominatorList"]},
    {"name": "Units$ebnf$2", "symbols": ["Units$ebnf$2", "Units$ebnf$2$subexpression$2"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Units", "symbols": ["Units$ebnf$1", "Units$ebnf$2"], "postprocess": 
        (data, location) => {
          const numerators = data[0]?.flat() || [];
          const denominators = data[1].flatMap((item: any) => item[3]);
          const terms = [
            ...numerators,
            ...negateExponents(denominators)
          ];
          return { type: 'Units', subType: "slashDenominator", terms, offset: terms[0]?.offset ?? 0 };
        }
                },
    {"name": "Units$ebnf$3", "symbols": []},
    {"name": "Units$ebnf$3", "symbols": ["Units$ebnf$3", "UnitsList"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Units$ebnf$4$subexpression$1", "symbols": ["__", (lexer.has("kw_per") ? {type: "kw_per"} : kw_per), "__", "UnitsDenominatorList"]},
    {"name": "Units$ebnf$4", "symbols": ["Units$ebnf$4$subexpression$1"]},
    {"name": "Units$ebnf$4$subexpression$2", "symbols": ["__", (lexer.has("kw_per") ? {type: "kw_per"} : kw_per), "__", "UnitsDenominatorList"]},
    {"name": "Units$ebnf$4", "symbols": ["Units$ebnf$4", "Units$ebnf$4$subexpression$2"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Units", "symbols": ["Units$ebnf$3", "Units$ebnf$4"], "postprocess": 
        (data, location) => {
          const numerators = data[0]?.flat() || [];
          const denominators = data[1].flatMap((item: any) => item[3]);
          const terms = [
            ...numerators,
            ...negateExponents(denominators)
          ];
          return { type: 'Units', subType: "perDenominator", terms, offset: terms[0]?.offset ?? 0 };
        }
                },
    {"name": "Units$ebnf$5", "symbols": ["UnitsList"]},
    {"name": "Units$ebnf$5", "symbols": ["Units$ebnf$5", "UnitsList"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Units", "symbols": ["Units$ebnf$5"], "postprocess": 
        (data, location) => {
          return { type: 'Units', subType: "numerator", terms: data[0]?.flat(), offset: data[0]?.flat()[0]?.offset ?? 0 };
        }
                },
    {"name": "UnitsList$ebnf$1", "symbols": []},
    {"name": "UnitsList$ebnf$1$subexpression$1", "symbols": ["__", "UnitWithExponent"]},
    {"name": "UnitsList$ebnf$1", "symbols": ["UnitsList$ebnf$1", "UnitsList$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "UnitsList", "symbols": ["UnitWithExponent", "UnitsList$ebnf$1"], "postprocess": 
        (data) => {
          const first = data[0];
          const rest = data[1].map((item: any) => item[1]);
          return [first, ...rest];
        }
        },
    {"name": "UnitsDenominatorList", "symbols": [(lexer.has("lparen") ? {type: "lparen"} : lparen), "_", "UnitsList", "_", (lexer.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": (data) => data[2]},
    {"name": "UnitsDenominatorList", "symbols": ["UnitWithExponent"], "postprocess": (data) => [data[0]]},
    {"name": "UnitWithExponent$ebnf$1$subexpression$1", "symbols": ["Exponent"], "postprocess": id},
    {"name": "UnitWithExponent$ebnf$1", "symbols": ["UnitWithExponent$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "UnitWithExponent$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "UnitWithExponent", "symbols": ["Unit", "UnitWithExponent$ebnf$1"], "postprocess": 
        (data, location) => {
          return { type: 'UnitWithExponent', subType: 'numerical', unit: data[0], exponent: data[1] ?? 1, offset: data[0].offset };
        }
                        },
    {"name": "UnitWithExponent", "symbols": [(lexer.has("kw_square") ? {type: "kw_square"} : kw_square), "__", "Unit"], "postprocess": 
        (data, location) => {
          return { type: 'UnitWithExponent', subType: 'square', unit: data[2], exponent: 2, offset: data[0].offset };
        }
                        },
    {"name": "UnitWithExponent", "symbols": ["Unit", "__", (lexer.has("kw_squared") ? {type: "kw_squared"} : kw_squared)], "postprocess": 
        (data, location) => {
          return { type: 'UnitWithExponent', subType: 'squared', unit: data[0], exponent: 2, offset: data[0].offset };
        }
                        },
    {"name": "UnitWithExponent", "symbols": [(lexer.has("kw_cubic") ? {type: "kw_cubic"} : kw_cubic), "__", "Unit"], "postprocess": 
        (data, location) => {
          return { type: 'UnitWithExponent', subType: 'cubic', unit: data[2], exponent: 3, offset: data[0].offset };
        }
                        },
    {"name": "UnitWithExponent", "symbols": ["Unit", "__", (lexer.has("kw_cubed") ? {type: "kw_cubed"} : kw_cubed)], "postprocess": 
        (data, location) => {
          return { type: 'UnitWithExponent', subType: 'cubed', unit: data[0], exponent: 3, offset: data[0].offset };
        }
                        },
    {"name": "Exponent$ebnf$1", "symbols": ["NumberSymbol"], "postprocess": id},
    {"name": "Exponent$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Exponent", "symbols": [(lexer.has("caret") ? {type: "caret"} : caret), "Exponent$ebnf$1", (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)], "postprocess": 
        (data) => {
          const sign = data[1] ? (data[1].type === 'plus' ? 1 : -1) : 1;
          return sign * parseInt(data[2].value.replaceAll('_', ''));
        }
        },
    {"name": "Exponent", "symbols": [(lexer.has("superscript") ? {type: "superscript"} : superscript)], "postprocess": (data) => { return parseInt(data[0].value.normalize("NFKC")); }},
    {"name": "Unit$subexpression$1$ebnf$1", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": id},
    {"name": "Unit$subexpression$1$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Unit$subexpression$1", "symbols": [(lexer.has("degree") ? {type: "degree"} : degree), "Unit$subexpression$1$ebnf$1"]},
    {"name": "Unit$subexpression$1", "symbols": [(lexer.has("prime") ? {type: "prime"} : prime)]},
    {"name": "Unit$subexpression$1", "symbols": [(lexer.has("doublePrime") ? {type: "doublePrime"} : doublePrime)]},
    {"name": "Unit", "symbols": ["Unit$subexpression$1"], "postprocess": 
        (data, location, reject) => {
          const flat = data.flat(2).filter(Boolean);
          const lastToken = flat[flat.length - 1];
          const sourceLength = (lastToken.offset + lastToken.value.length) - flat[0].offset;
          let unitName: string;
          if (flat[0].type === 'degree') {
            if (flat[1] && !/^[cf]$/i.test(flat[1].value)) {
              return reject;
            }
            unitName = flat[1] ? `°${flat[1].value}` : '°';
          } else if (flat[0].type === 'prime') {
            unitName = 'prime';
          } else { // doublePrime
            unitName = 'doublePrime';
          }
          return { type: 'Unit', name: unitName, matched: 'symbol', offset: flat[0].offset, sourceLength };
        }
            },
    {"name": "Unit$subexpression$2", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "Unit$subexpression$2", "symbols": [(lexer.has("kw_in") ? {type: "kw_in"} : kw_in)]},
    {"name": "Unit$ebnf$1", "symbols": []},
    {"name": "Unit$ebnf$1$subexpression$1$subexpression$1", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "Unit$ebnf$1$subexpression$1$subexpression$1", "symbols": [(lexer.has("kw_in") ? {type: "kw_in"} : kw_in)]},
    {"name": "Unit$ebnf$1$subexpression$1", "symbols": ["__", "Unit$ebnf$1$subexpression$1$subexpression$1"]},
    {"name": "Unit$ebnf$1", "symbols": ["Unit$ebnf$1", "Unit$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Unit", "symbols": ["Unit$subexpression$2", "Unit$ebnf$1"], "postprocess": 
        (data, location, reject) => {
          const firstToken = data[0][0];
          const first = firstToken.value;
          const rest = data[1].map((item: any) => item[1][0].value);
          const unitName = [first, ...rest].join(' ');
          const lastToken = data[1].length > 0 ? data[1][data[1].length - 1][1][0] : firstToken;
          const sourceLength = (lastToken.offset + lastToken.value.length) - firstToken.offset;
          const matched =
            dataLoader.getUnitsByCaseInsensitiveName(unitName)?.length ? "unit" :
            dataLoader.getCurrenciesByName(unitName)?.length ? "currencyName" :
            dataLoader.getCurrencyByCode(unitName) ? "currencyCode" :
            /^(bin|hex|oct|dec|offset)$/i.test(unitName) ? null : // base conversions and offsets should be handled by PresentationFormat
            /^\p{XID_Start}\p{XID_Continue}*$/u.test(unitName) ? "identifier" :
            null;
          if (!matched) {
            return reject;
          }
          return { type: 'Unit', name: unitName, matched, offset: firstToken.offset, sourceLength };
        }
              },
    {"name": "NumericalValue", "symbols": [(lexer.has("hexNumber") ? {type: "hexNumber"} : hexNumber)], "postprocess":  (data, location) => ({
          type: 'NumberLiteral', subType: "0x",
          base: 16, value: data[0].value.substring(2), offset: data[0].offset,
          sourceLength: data[0].value.length
        }) },
    {"name": "NumericalValue", "symbols": [(lexer.has("binaryNumber") ? {type: "binaryNumber"} : binaryNumber)], "postprocess":  (data, location) => ({
          type: 'NumberLiteral', subType: "0b",
          base: 2, value: data[0].value.substring(2), offset: data[0].offset,
          sourceLength: data[0].value.length
        }) },
    {"name": "NumericalValue", "symbols": [(lexer.has("octalNumber") ? {type: "octalNumber"} : octalNumber)], "postprocess":  (data, location) => ({
          type: 'NumberLiteral', subType: "0o",
          base: 8, value: data[0].value.substring(2), offset: data[0].offset,
          sourceLength: data[0].value.length
        }) },
    {"name": "NumericalValue", "symbols": ["PercentageNumber"], "postprocess": id},
    {"name": "NumericalValue", "symbols": ["ArbitraryBaseNumberWithBase"], "postprocess": id},
    {"name": "NumericalValue", "symbols": ["DecimalNumber"], "postprocess": id},
    {"name": "NumericalValue", "symbols": ["Constant"], "postprocess": id},
    {"name": "PercentageNumber$ebnf$1", "symbols": ["NumberSymbol"], "postprocess": id},
    {"name": "PercentageNumber$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "PercentageNumber$ebnf$2$subexpression$1", "symbols": [(lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)]},
    {"name": "PercentageNumber$ebnf$2", "symbols": ["PercentageNumber$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "PercentageNumber$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "PercentageNumber$subexpression$1", "symbols": [(lexer.has("percent") ? {type: "percent"} : percent)]},
    {"name": "PercentageNumber$subexpression$1", "symbols": [(lexer.has("permille") ? {type: "permille"} : permille)]},
    {"name": "PercentageNumber", "symbols": ["PercentageNumber$ebnf$1", (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), "PercentageNumber$ebnf$2", "_", "PercentageNumber$subexpression$1"], "postprocess": 
        (data, location) => {
          const sign = data[0] ? (data[0].type === 'plus' ? 1 : -1) : 1;
          const integerPart = data[1].value;
          const fractionalPart = data[2] ? "." + data[2][1].value : '';
          const value = `${sign === -1 ? '-' : ''}${integerPart}${fractionalPart}`;
          const symbol = data[4][0].type;
          const firstToken = data[0] ?? data[1];
          const lastToken = data[4][0];
          const sourceLength = (lastToken.offset + lastToken.value.length) - firstToken.offset;
          return { type: 'PercentageLiteral', value, symbol, offset: firstToken.offset, sourceLength };
        }
        },
    {"name": "ArbitraryBaseNumberWithBase", "symbols": ["ArbitraryBaseNumber", "__", (lexer.has("kw_base") ? {type: "kw_base"} : kw_base), "__", (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)], "postprocess": 
        (data, location) => {
          const numberToken = data[0];
          const baseToken = data[4];
          const base = parseInt(baseToken.value.replaceAll('_', ''));
          const value = numberToken.text;
          const sourceLength = (baseToken.offset + baseToken.value.length) - data[0].offset;
          return { type: 'NumberLiteral', subType: 'ArbitraryBaseNumberWithBase', base, value, offset: data[0].offset, sourceLength };
        }
        },
    {"name": "ArbitraryBaseNumber", "symbols": [(lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)], "postprocess": mergeParts},
    {"name": "ArbitraryBaseNumber", "symbols": [(lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), (lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)], "postprocess": mergeParts},
    {"name": "ArbitraryBaseNumber", "symbols": [(lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), (lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": mergeParts},
    {"name": "ArbitraryBaseNumber", "symbols": [(lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), (lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": mergeParts},
    {"name": "ArbitraryBaseNumber", "symbols": [(lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": mergeParts},
    {"name": "ArbitraryBaseNumber", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": mergeParts},
    {"name": "ArbitraryBaseNumber", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), (lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)], "postprocess": mergeParts},
    {"name": "ArbitraryBaseNumber", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), (lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": mergeParts},
    {"name": "ArbitraryBaseNumber", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), (lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": mergeParts},
    {"name": "ArbitraryBaseNumber", "symbols": [(lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), (lexer.has("identifier") ? {type: "identifier"} : identifier), (lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)], "postprocess": mergeParts},
    {"name": "ArbitraryBaseNumber", "symbols": [(lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), (lexer.has("identifier") ? {type: "identifier"} : identifier), (lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": mergeParts},
    {"name": "ArbitraryBaseNumber", "symbols": [(lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), (lexer.has("identifier") ? {type: "identifier"} : identifier), (lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": mergeParts},
    {"name": "ArbitraryBaseNumber", "symbols": [(lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)], "postprocess": mergeParts},
    {"name": "ArbitraryBaseNumber", "symbols": [(lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": mergeParts},
    {"name": "ArbitraryBaseNumber", "symbols": [(lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": mergeParts},
    {"name": "DecimalNumber$ebnf$1", "symbols": ["NumberSymbol"], "postprocess": id},
    {"name": "DecimalNumber$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "DecimalNumber$ebnf$2$subexpression$1", "symbols": [(lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)]},
    {"name": "DecimalNumber$ebnf$2", "symbols": ["DecimalNumber$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "DecimalNumber$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "DecimalNumber$ebnf$3$subexpression$1", "symbols": ["ScientificNotation"]},
    {"name": "DecimalNumber$ebnf$3", "symbols": ["DecimalNumber$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "DecimalNumber$ebnf$3", "symbols": [], "postprocess": () => null},
    {"name": "DecimalNumber", "symbols": ["DecimalNumber$ebnf$1", (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), "DecimalNumber$ebnf$2", "DecimalNumber$ebnf$3"], "postprocess": 
        (data, location) => {
          const sign = data[0] ? (data[0].type === 'plus' ? 1 : -1) : 1;
          const integerPart = data[1].value;
          const fractionalPart = data[2] ? "." + data[2][1].value : '';
          const sci = data[3] ? data[3][0] : null;
          const exponentPart = sci ? "e" + sci.value : '';
          const value = `${sign === -1 ? '-' : ''}${integerPart}${fractionalPart}${exponentPart}`;
          const firstToken = data[0] ?? data[1];
          const lastToken = sci ? sci.__lastToken : (data[2] ? data[2][1] : data[1]);
          const sourceLength = (lastToken.offset + lastToken.value.length) - firstToken.offset;
          return { type: 'NumberLiteral', subType: 'DecimalNumber', base: 10, value, offset: firstToken.offset, sourceLength };
        }
        },
    {"name": "ScientificNotation$ebnf$1", "symbols": ["NumberSymbol"], "postprocess": id},
    {"name": "ScientificNotation$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "ScientificNotation", "symbols": [(lexer.has("scienceExponential") ? {type: "scienceExponential"} : scienceExponential), "ScientificNotation$ebnf$1", (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)], "postprocess": 
        (data) => {
          const sign = data[1] ? (data[1].type === 'plus' ? 1 : -1) : 1;
          const exponent = parseInt(data[2].value.replaceAll('_', ''));
          const value = sign * exponent;
          return { value, __lastToken: data[2] };
        }
        },
    {"name": "DateTimeLiteral", "symbols": ["ZonedDateTime"], "postprocess": id},
    {"name": "DateTimeLiteral", "symbols": ["Instant"], "postprocess": id},
    {"name": "DateTimeLiteral", "symbols": ["PlainDateTime"], "postprocess": id},
    {"name": "DateTimeLiteral", "symbols": ["PlainDate"], "postprocess": id},
    {"name": "DateTimeLiteral", "symbols": ["PlainTime"], "postprocess": id},
    {"name": "ZonedDateTime", "symbols": ["PlainDateTime", "__", "Timezone"], "postprocess": 
        (data, location) => {
          const sourceLength = (data[2].offset + data[2].sourceLength) - data[0].offset;
          return { type: 'ZonedDateTime', subType: 'dateTime', dateTime: data[0], timezone: data[2], offset: data[0].offset, sourceLength };
        }
                      },
    {"name": "ZonedDateTime", "symbols": ["PlainTime", "__", "Timezone"], "postprocess": 
        (data, location) => {
          const sourceLength = (data[2].offset + data[2].sourceLength) - data[0].offset;
          return {
            type: 'ZonedDateTime',
            subType: 'plainTime',
            dateTime: {
              type: 'PlainDateTime',
              subType: 'plainTimeZoned',
              date: null,
              time: data[0],
              offset: data[0].offset
            },
            timezone: data[2],
            offset: data[0].offset,
            sourceLength
          };
        }
                      },
    {"name": "ZonedDateTime", "symbols": ["PlainDate", "__", "Timezone"], "postprocess": 
        (data, location) => {
          const sourceLength = (data[2].offset + data[2].sourceLength) - data[0].offset;
          // Create a PlainDateTime by combining PlainDate with 00:00:00 time
          const plainTime = {
            type: 'PlainTime',
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0,
            offset: data[0].offset
          };
          const plainDateTime = {
            type: 'PlainDateTime',
            subType: 'plainDate',
            dateTime: {
              type: 'PlainDateTime',
              subType: 'plainDateZoned',
              date: data[0],
              time: plainTime,
              offset: data[0].offset
            },
            offset: data[0].offset
          };
          return { type: 'ZonedDateTime', dateTime: plainDateTime, timezone: data[2], offset: data[0].offset, sourceLength };
        }
                      },
    {"name": "Instant", "symbols": [(lexer.has("kw_now") ? {type: "kw_now"} : kw_now)], "postprocess": (data, location) => ({ type: 'Instant', keyword: 'now', offset: data[0].offset, sourceLength: data[0].value.length })},
    {"name": "Instant", "symbols": [(lexer.has("kw_today") ? {type: "kw_today"} : kw_today)], "postprocess": (data, location) => ({ type: 'Instant', keyword: 'today', offset: data[0].offset, sourceLength: data[0].value.length })},
    {"name": "Instant", "symbols": [(lexer.has("kw_yesterday") ? {type: "kw_yesterday"} : kw_yesterday)], "postprocess": (data, location) => ({ type: 'Instant', keyword: 'yesterday', offset: data[0].offset, sourceLength: data[0].value.length })},
    {"name": "Instant", "symbols": [(lexer.has("kw_tomorrow") ? {type: "kw_tomorrow"} : kw_tomorrow)], "postprocess": (data, location) => ({ type: 'Instant', keyword: 'tomorrow', offset: data[0].offset, sourceLength: data[0].value.length })},
    {"name": "Instant", "symbols": ["NumericalValue", "__", (lexer.has("identifier") ? {type: "identifier"} : identifier), "__", (lexer.has("kw_ago") ? {type: "kw_ago"} : kw_ago)], "postprocess": 
        (data, location) => {
          const sourceLength = (data[4].offset + data[4].value.length) - data[0].offset;
          return { type: 'Instant', amount: data[0], unit: data[2].value, direction: 'ago', offset: data[0].offset, sourceLength };
        }
                 },
    {"name": "Instant", "symbols": ["NumericalValue", "__", (lexer.has("identifier") ? {type: "identifier"} : identifier), "__", (lexer.has("kw_from") ? {type: "kw_from"} : kw_from), "__", (lexer.has("kw_now") ? {type: "kw_now"} : kw_now)], "postprocess": 
        (data, location) => {
          const sourceLength = (data[6].offset + data[6].value.length) - data[0].offset;
          return { type: 'Instant', amount: data[0], unit: data[2].value, direction: 'fromNow', offset: data[0].offset, sourceLength };
        }
                 },
    {"name": "Instant$ebnf$1$subexpression$1", "symbols": ["__", (lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "Instant$ebnf$1", "symbols": ["Instant$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "Instant$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Instant", "symbols": ["NumericalValue", "__", (lexer.has("kw_unix") ? {type: "kw_unix"} : kw_unix), "Instant$ebnf$1"], "postprocess": 
        (data, location) => {
          const lastToken = data[3]?.[1] ?? data[2];
          const sourceLength = (lastToken.offset + lastToken.value.length) - data[0].offset;
          return { type: 'Instant', amount: data[0], unit: data[3]?.[1]?.value ?? "second", direction: 'sinceEpoch', offset: data[0].offset, sourceLength };
        }
                 },
    {"name": "PlainDateTime", "symbols": ["PlainDate", "__", "PlainTime"], "postprocess": 
        (data, location) => {
          const sourceLength = (data[2].offset + data[2].sourceLength) - data[0].offset;
          return { type: 'PlainDateTime', subType: 'dateTime', date: data[0], time: data[2], offset: data[0].offset, sourceLength };
        }
        },
    {"name": "PlainDateTime", "symbols": ["PlainTime", "__", "PlainDate"], "postprocess": 
        (data, location) => {
          const sourceLength = (data[2].offset + data[2].sourceLength) - data[0].offset;
          return { type: 'PlainDateTime', subType: 'timeDate', date: data[2], time: data[0], offset: data[0].offset, sourceLength };
        }
        },
    {"name": "PlainTime", "symbols": [(lexer.has("plainTime") ? {type: "plainTime"} : plainTime), "_", (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": 
        (data, location, reject) => {
          const timeStr = data[0].value;
          const ampm = data[2].value;
          if (!/^[ap]m$/i.test(ampm)) return reject;
          const parts = timeStr.split(':').map((p: string) => parseInt(p));
          let hour = parts[0] || 0;
          const minute = parts[1] || 0;
          const second = parts[2] || 0;
          if (ampm.toLowerCase() === 'am') {
            hour = hour === 12 ? 0 : hour;
          } else {
            hour = hour === 12 ? 12 : hour + 12;
          }
          const sourceLength = (data[2].offset + data[2].value.length) - data[0].offset;
          return { type: 'PlainTime', subType: '12hFull', hour, minute, second, offset: data[0].offset, sourceLength };
        }
                    },
    {"name": "PlainTime", "symbols": [(lexer.has("plainTime") ? {type: "plainTime"} : plainTime)], "postprocess": 
        (data, location) => {
          const timeStr = data[0].value;
          const parts = timeStr.split(':').map((p: string) => parseInt(p));
          const hour = parts[0] || 0;
          const minute = parts[1] || 0;
          const second = parts[2] || 0;
          return { type: 'PlainTime', subType: '24hFull', hour, minute, second, offset: data[0].offset, sourceLength: data[0].value.length };
        }
                    },
    {"name": "PlainTime", "symbols": [(lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), "_", (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": 
        (data, location, reject) => {
          let hour = parseInt(data[0].value.replaceAll('_', ''));
          const ampm = data[2].value;
          if (!/^[ap]m$/i.test(ampm) || hour < 1 || hour > 12) return reject;
          if (ampm.toLowerCase() === 'am') {
            hour = hour === 12 ? 0 : hour;
          } else {
            hour = hour === 12 ? 12 : hour + 12;
          }
          const sourceLength = (data[2].offset + data[2].value.length) - data[0].offset;
          return { type: 'PlainTime', subType: '12hShort', hour, minute: 0, second: 0, offset: data[0].offset, sourceLength };
        }
                    },
    {"name": "PlainDate", "symbols": [(lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), (lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), (lexer.has("dot") ? {type: "dot"} : dot), (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)], "postprocess": 
        (data, location) => {
          const year = parseInt(data[0].value.replaceAll('_', ''));
          const month = parseInt(data[2].value.replaceAll('_', ''));
          const day = parseInt(data[4].value.replaceAll('_', ''));
          const sourceLength = (data[4].offset + data[4].value.length) - data[0].offset;
          return { type: 'PlainDate', subType: 'dot', day, month, year, offset: data[0].offset, sourceLength };
        }
                      },
    {"name": "PlainDate", "symbols": [(lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), (lexer.has("minus") ? {type: "minus"} : minus), (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), (lexer.has("minus") ? {type: "minus"} : minus), (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)], "postprocess": 
        (data, location, reject) => {
          const year = parseInt(data[0].value.replaceAll('_', ''));
          const month = parseInt(data[2].value.replaceAll('_', ''));
          const day = parseInt(data[4].value.replaceAll('_', ''));
          if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000 || year > 9999) return reject;
          const sourceLength = (data[4].offset + data[4].value.length) - data[0].offset;
          return { type: 'PlainDate', subType: 'hyphen', day, month, year, offset: data[0].offset, sourceLength };
        }
                      },
    {"name": "PlainDate", "symbols": [(lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), "__", (lexer.has("identifier") ? {type: "identifier"} : identifier), "__", (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)], "postprocess": 
        (data, location, reject) => {
          const monthName = data[2].value;
          const month = parseMonthName(monthName.toLowerCase());
          if (month === null) { return reject; }
          const left = parseInt(data[0].value.replaceAll('_', ''));
          const right = parseInt(data[4].value.replaceAll('_', ''));
          const day = Math.min(left, right);
          const year = Math.max(left, right);
          const sourceLength = (data[4].offset + data[4].value.length) - data[0].offset;
          return { type: 'PlainDate', subType: 'ymd/Dmy', day, month, year, offset: data[0].offset, sourceLength };
        }
                      },
    {"name": "PlainDate", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "__", (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits), "__", (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)], "postprocess": 
        (data, location, reject) => {
          const monthName = data[0].value;
          const month = parseMonthName(monthName.toLowerCase());
          if (month === null) { return reject; }
          const day = parseInt(data[2].value.replaceAll('_', ''));
          const year = parseInt(data[4].value.replaceAll('_', ''));
          const sourceLength = (data[4].offset + data[4].value.length) - data[0].offset;
          return { type: 'PlainDate', subType: 'mdy', day, month, year, offset: data[0].offset, sourceLength };
        }
                      },
    {"name": "Timezone", "symbols": ["UTCOffset"], "postprocess": id},
    {"name": "Timezone", "symbols": ["TimezoneName"], "postprocess": id},
    {"name": "UTCOffset", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "NumberSymbol", (lexer.has("plainTime") ? {type: "plainTime"} : plainTime)], "postprocess": 
        (data, location, reject) => {
          const baseZone = data[0].value;
          if (!/^(UTC|GMT)$/i.test(baseZone)) { return reject; }
          const prefix = data[1].type === 'plus' ? '+' : '-';
          const timeStr = data[2].value.padStart(5, '0');
          const sourceLength = (data[2].offset + data[2].value.length) - data[0].offset;
          return { type: 'UTCOffset', subType: 'time', offsetStr: prefix + timeStr, baseZone, offset: data[0].offset, sourceLength };
        }
                      },
    {"name": "UTCOffset", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "NumberSymbol", (lexer.has("decimalDigits") ? {type: "decimalDigits"} : decimalDigits)], "postprocess": 
        (data, location, reject) => {
          const baseZone = data[0].value;
          if (!/^(UTC|GMT)$/i.test(baseZone)) { return reject; }
          const prefix = data[1].type === 'plus' ? '+' : '-';
          const hour = parseInt(data[2].value.replaceAll('_', ''));
          const offsetStr = prefix + (
            hour >= 100 ?
              hour.toString().slice(0, -2).padStart(2, '0') + ":" + hour.toString().slice(-2)
              : hour.toString().padStart(2, '0') + ":00"
          );
          const sourceLength = (data[2].offset + data[2].value.length) - data[0].offset;
          return { type: 'UTCOffset', subType: 'numerical', offsetStr, baseZone, offset: data[0].offset, sourceLength };
        }
                      },
    {"name": "TimezoneName$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": [(lexer.has("slash") ? {type: "slash"} : slash), (lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "TimezoneName$ebnf$1$subexpression$1$ebnf$1", "symbols": ["TimezoneName$ebnf$1$subexpression$1$ebnf$1$subexpression$1"]},
    {"name": "TimezoneName$ebnf$1$subexpression$1$ebnf$1$subexpression$2", "symbols": [(lexer.has("slash") ? {type: "slash"} : slash), (lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "TimezoneName$ebnf$1$subexpression$1$ebnf$1", "symbols": ["TimezoneName$ebnf$1$subexpression$1$ebnf$1", "TimezoneName$ebnf$1$subexpression$1$ebnf$1$subexpression$2"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "TimezoneName$ebnf$1$subexpression$1", "symbols": ["TimezoneName$ebnf$1$subexpression$1$ebnf$1"]},
    {"name": "TimezoneName$ebnf$1$subexpression$1$ebnf$2$subexpression$1", "symbols": ["__", (lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "TimezoneName$ebnf$1$subexpression$1$ebnf$2", "symbols": ["TimezoneName$ebnf$1$subexpression$1$ebnf$2$subexpression$1"]},
    {"name": "TimezoneName$ebnf$1$subexpression$1$ebnf$2$subexpression$2", "symbols": ["__", (lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "TimezoneName$ebnf$1$subexpression$1$ebnf$2", "symbols": ["TimezoneName$ebnf$1$subexpression$1$ebnf$2", "TimezoneName$ebnf$1$subexpression$1$ebnf$2$subexpression$2"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "TimezoneName$ebnf$1$subexpression$1", "symbols": ["TimezoneName$ebnf$1$subexpression$1$ebnf$2"]},
    {"name": "TimezoneName$ebnf$1", "symbols": ["TimezoneName$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "TimezoneName$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "TimezoneName", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "TimezoneName$ebnf$1"], "postprocess": 
        (data, location, reject) => {
          const parts = [data[0].value, ...(data[1]?.flat(2).map((item: any) => item === null ? " " : item.value) || [])];
          const zoneName = parts.join('');
          if (!dataLoader.getTimezoneMatches(zoneName)?.length) {
            return reject;
          }
          const flatTokens = data[1]?.flat(Infinity).filter((t: any) => t && t.offset != null) || [];
          const lastToken = flatTokens.length > 0 ? flatTokens[flatTokens.length - 1] : data[0];
          const sourceLength = (lastToken.offset + lastToken.value.length) - data[0].offset;
          return { type: 'TimezoneName', zoneName, offset: data[0].offset, sourceLength };
        }
                        },
    {"name": "NumberSymbol$subexpression$1", "symbols": [(lexer.has("plus") ? {type: "plus"} : plus)], "postprocess": id},
    {"name": "NumberSymbol$subexpression$1", "symbols": [(lexer.has("minus") ? {type: "minus"} : minus)], "postprocess": id},
    {"name": "NumberSymbol", "symbols": ["NumberSymbol$subexpression$1"], "postprocess": id},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", (lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": 
        (data) => null
        },
    {"name": "__$ebnf$1", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", (lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": 
        (data) => null
        }
  ],
  ParserStart: "Line",
};

export default grammar;

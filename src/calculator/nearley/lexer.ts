import * as moo from "moo";

import currencies from "../data/currencies.json";
import { getAllConstants } from "../constants";

function buildConstantSymbolsPattern(): RegExp {
  const symbols: string[] = getAllConstants()
    .flatMap((constant) => [constant.name, ...constant.aliases])
    .filter((symbol) => !/^\p{XID_Start}\p{XID_Continue}*$/u.test(symbol));
  const pattern = `(?:${symbols
    .map((s) => s.replaceAll(".", "\\.").replaceAll("$", "\\$"))
    .join("|")})\\b`;
  return new RegExp(pattern, "u");
}

function buildAdjacentCurrencySymbolsPattern(): RegExp {
  const symbols: string[] = [];
  for (const unambiguousSymbol of currencies.unambiguous) {
    symbols.push(
      ...unambiguousSymbol.symbolAdjacent.map((s) =>
        s.replaceAll(".", "\\.").replaceAll("$", "\\$"),
      ),
    );
  }
  for (const ambiguousSymbol of currencies.ambiguous.symbolAdjacent) {
    symbols.push(
      ambiguousSymbol.symbol.replaceAll(".", "\\.").replaceAll("$", "\\$"),
    );
  }

  const pattern = `(?:${symbols.join("|")})(?=\\d+)`;
  return new RegExp(pattern, "u");
}

function buildNumberPattern(
  prefix: string,
  digitChars: string,
  withExponential: boolean,
): RegExp {
  const leadingDigit = `[${digitChars}]`;
  const followingDigitChars = `0${digitChars}`;
  const integerDigitsWithUnderscore = `(?:${leadingDigit}[_${followingDigitChars}]*)`;
  const fractionDigitsWithUnderscore = `(?:[${followingDigitChars}][_${followingDigitChars}]*)`;
  const optionalIntegerDigits = `(?:${integerDigitsWithUnderscore})?`;
  const optionalFractionDigits = `(?:${fractionDigitsWithUnderscore})?`;
  const exponentialPart = withExponential
    ? `(?:[Ee][+-]?${integerDigitsWithUnderscore})?`
    : "";
  const pattern =
    prefix +
    `[+-]?` +
    `(?:` +
    `${optionalIntegerDigits}\\.${fractionDigitsWithUnderscore}` +
    `|` +
    `${integerDigitsWithUnderscore}\\.${optionalFractionDigits}` +
    `|` +
    integerDigitsWithUnderscore +
    `)` +
    exponentialPart;
  return new RegExp(pattern, "u");
}

export const lexer = moo.compile({
  ws: /[ \t]+/u,
  // ampmTime: buildAmPmTimePattern(),
  plainTime: /(?:2[0-3]|[01]?[0-9]):[0-5][0-9](?::[0-5][0-9])?/u,

  // Known number bases
  hexNumber: buildNumberPattern("0x", "1-9A-Fa-f", false),
  octalNumber: buildNumberPattern("0o", "1-7", false),
  binaryNumber: buildNumberPattern("0b", "1", false),
  currencySymbolAdjacent: buildAdjacentCurrencySymbolsPattern(),

  // Special conversion targets
  dayOfYear: /days?\s+of\s+year/u,
  weekOfYear: /weeks?\s+of\s+year/u,

  // Default decimal
  // number: buildNumberPattern("", "1-9", true),
  decimalDigits: /[0-9][_0-9]*/u,

  // two charts
  equals: "==",
  notEquals: "!=",
  lessThanOrEqual: "<=",
  greaterThanOrEqual: ">=",
  lShift: "<<",
  rShift: ">>",
  and: "&&",
  or: "||",
  arrow: /(?:->|→)/u,
  doublePrime: /(?:"|″|'')/u,

  constantSymbol: buildConstantSymbolsPattern(),

  // single char
  lessThan: "<",
  greaterThan: ">",
  plus: "+",
  minus: /-/u,
  times: /[*·×]/u,
  slash: "/",
  divide: "÷",
  sharp: "#",
  lparen: "(",
  rparen: ")",
  dot: ".",
  assign: "=",
  percent: "%",
  permille: "‰",
  caret: "^",
  bang: "!",
  tilde: "~",
  ampersand: "&",
  pipe: "|",
  comma: ",",
  prime: /['′]/u,
  degree: /[°º˚]/u,
  colon: ":",

  superscript: /⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+/u,
  scienceExponential: /(?<=\b[\d_]+)[eE](?=[+-]?[\d_]+\b)/u,

  sigFigs: /(?:sig figs?|significant figures?)/u,
  ISO8601: /(?:iso|ISO|Iso) ?8601/u,
  RFC9557: /(?:rfc|RFC|Rfc) ?9557/u,
  RFC2822: /(?:rfc|RFC|Rfc) ?2822/u,
  kw_unix: /(?:unix|Unix|UNIX)\b/u,

  identifier: {
    match: /\p{XID_Start}\p{XID_Continue}*/u,
    type: moo.keywords(
      Object.fromEntries([
        ...[
          "to",
          "in",
          "as",
          "if",
          "then",
          "else",
          "base",
          "per",
          "mod",
          "xor",
          "square",
          "squared",
          "cubic",
          "cubed",
          "true",
          "false",
          // ---
          "value",
          "fraction",
          "binary",
          "octal",
          "decimal",
          "hexadecimal",
          "decimals",
          "scientific",
          "fraction",
          "percentage",
          // ---
          "now",
          "yesterday",
          "today",
          "tomorrow",
          "from",
          "ago",
        ].map((k) => ["kw_" + k, k]),
        // ...[
        //   "Unix",
        // ].map((k) => [k, new RegExp(k, "ui")]),
      ]),
    ),
  },
});

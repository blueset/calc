@preprocessor typescript

@{%
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
%}

# Pass your lexer with @lexer:
@lexer lexer

# Base number patterns:
# - decimalDigits
# - decimalDigits dot decimalDigits
# - decimalDigits dot identifier
# - decimalDigits dot decimalDigits identifier
# - decimalDigits identifier
# - identifier
# - identifier dot decimalDigits
# - identifier dot identifier
# - identifier dot decimalDigits identifier
# - decimalDigits identifier dot decimalDigits
# - decimalDigits identifier dot identifier
# - decimalDigits identifier dot decimalDigits identifier
# - dot decimalDigits
# - dot identifier
# - dot decimalDigits identifier

### Expressions

Line -> VariableAssignment {% id %}
      | Expression {% id %}
      | null

VariableAssignment -> Variable _ %assign _ Expression {%
  (data, location) => ({ type: 'VariableAssignment', name: data[0].name, value: data[4], offset: data[0].offset })
%}

Expression -> ConditionalExpr {% id %}
            | ParenthesizedExpr {% id %}
            | Conversion {% id %}

ParenthesizedExpr -> %lparen _ Expression _ %rparen {% (data) => data[2] %}

### Conversion Targets

ConditionalExpr -> %kw_if __ LogicalOrExpr __ %kw_then __ Expression __ %kw_else __ Expression {%
  (data, location) => ({ 
    type: 'ConditionalExpr', 
    condition: data[2], then: data[6], else: data[10], 
    offset: data[0].offset, 
    ifToken: { offset: data[0].offset, length: data[0].value.length }, 
    thenToken: { offset: data[4].offset, length: data[4].value.length }, 
    elseToken: { offset: data[8].offset, length: data[8].value.length } 
  })
%}

Conversion -> ConversionSource ( __ ConversionOp __ ConversionTarget ):+ {%
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
%}
           | ConversionSource {% id %}

ConversionSource -> LogicalOrExpr {% id %}
                  | ConditionalExpr {% id %}

ConversionOp -> %kw_to {% id %}
              | %kw_as {% id %}
              | %kw_in {% id %}
              | %arrow {% id %}

ConversionTarget -> UnitTarget {% id %}
                  | PresentationTarget {% id %}
                  | PropertyTarget {% id %}
                  | TimezoneTarget {% id %}

UnitTarget -> Units {% id %}

PresentationTarget -> %kw_value {% (data, location) => ({ type: 'PresentationFormat', format: 'value', offset: data[0].offset, sourceLength: data[0].value.length }) %}
                    | %kw_binary {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'base', base: 2, offset: data[0].offset, sourceLength: data[0].value.length })
                    %}
                    | %kw_octal {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'base', base: 8, offset: data[0].offset, sourceLength: data[0].value.length })
                    %}
                    | %kw_decimal {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'base', base: 10, offset: data[0].offset, sourceLength: data[0].value.length })
                    %}
                    | %kw_hexadecimal {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'base', base: 16, offset: data[0].offset, sourceLength: data[0].value.length })
                    %}
                    | %decimalDigits __ %sigFigs {%
                      (data, location) => {
                        const sourceLength = (data[2].offset + data[2].value.length) - data[0].offset;
                        return { type: 'PresentationFormat', format: 'sigFigs', sigFigs: parseInt(data[0].value.replaceAll('_', '')), offset: data[0].offset, sourceLength };
                      }
                    %}
                    | %decimalDigits __ (%kw_decimals | %kw_decimal) {%
                      (data, location) => {
                        const lastToken = data[2][0];
                        const sourceLength = (lastToken.offset + lastToken.value.length) - data[0].offset;
                        return { type: 'PresentationFormat', format: 'decimals', decimals: parseInt(data[0].value.replaceAll('_', '')), offset: data[0].offset, sourceLength };
                      }
                    %}
                    | %kw_base __ %decimalDigits {%
                      (data, location) => {
                        const sourceLength = (data[2].offset + data[2].value.length) - data[0].offset;
                        return { type: 'PresentationFormat', format: 'base', base: parseInt(data[2].value.replaceAll('_', '')), offset: data[0].offset, sourceLength };
                      }
                    %}
                    | %kw_scientific {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'scientific', offset: data[0].offset, sourceLength: data[0].value.length })
                    %}
                    | %kw_fraction {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'fraction', offset: data[0].offset, sourceLength: data[0].value.length })
                    %}
                    | (%kw_percentage | %percent) {%
                      (data, location) => ({
                        type: 'PresentationFormat', format: 'percentage',
                        offset: data[0][0].offset, sourceLength: data[0][0].value.length
                      })
                    %}
                    | %ISO8601 {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'ISO 8601', offset: data[0].offset, sourceLength: data[0].value.length })
                    %}
                    | %RFC9557 {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'RFC 9557', offset: data[0].offset, sourceLength: data[0].value.length })
                    %}
                    | %RFC2822 {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'RFC 2822', offset: data[0].offset, sourceLength: data[0].value.length })
                    %}
                    | %kw_unix (__ %identifier):? {%
                      (data, location, reject) => {
                        if (data[1]?.[1]?.value && !/^(s|seconds?|ms|milliseconds?)$/i.test(data[1][1].value)) return reject;
                        const lastToken = data[1]?.[1] ?? data[0];
                        const sourceLength = (lastToken.offset + lastToken.value.length) - data[0].offset;
                        return { type: 'PresentationFormat', format: 'unix', unit: data[1]?.[1]?.value ?? "second", offset: data[0].offset, sourceLength };
                      }
                    %}
                    | %identifier {%
                      (data, location, reject) =>
                        !/^(binary|octal|decimal|hexadecimal|scientific|bin|oct|dec|hex|fraction|unix|value|decimals|base|ordinal)$/i.test(data[0].value)
                        ? reject
                        : ({ type: 'PresentationFormat', format: 'namedFormat', name: data[0].value, offset: data[0].offset, sourceLength: data[0].value.length })
                    %}
PropertyTarget -> %dayOfYear {%
                      (data, location) => ({ type: 'PropertyTarget', property: 'dayOfYear', offset: data[0].offset, sourceLength: data[0].value.length })
                    %}
                 | %weekOfYear {%
                      (data, location) => ({ type: 'PropertyTarget', property: 'weekOfYear', offset: data[0].offset, sourceLength: data[0].value.length })
                    %}
                 | %identifier {%
                      (data, location, reject) =>
                        /^(year|month|day|weekday|hour|minute|second|millisecond|offset)s?$/i.test(data[0].value)
                        ? ({ type: 'PropertyTarget', property: data[0].value, offset: data[0].offset, sourceLength: data[0].value.length })
                        : reject
                    %}

TimezoneTarget -> Timezone {% id %}

### Boolean and Comparison Expressions

LogicalOrExpr -> LogicalAndExpr ( _ %or _ LogicalAndExpr ):* {% optionalBinaryOp %}
LogicalAndExpr -> BitwiseOrExpr ( _ %and _ BitwiseOrExpr ):* {% optionalBinaryOp %}
BitwiseOrExpr -> BitwiseXorExpr ( _ %pipe _ BitwiseXorExpr ):* {% optionalBinaryOp %}
BitwiseXorExpr -> BitwiseAndExpr ( _ %kw_xor _ BitwiseAndExpr ):* {% optionalBinaryOp %}
BitwiseAndExpr -> ComparisonExpr ( _ %ampersand _ ComparisonExpr ):* {% optionalBinaryOp %}
ComparisonExpr -> BitShiftExpr ( _ ComparisonOp _ BitShiftExpr ):? {% optionalBinaryOp %}
ComparisonOp -> %lessThan | %lessThanOrEqual | %greaterThan | %greaterThanOrEqual | %equals | %notEquals

### Arithmetic Expressions

BitShiftExpr -> AdditiveExpr ( _ ( %lShift | %rShift ) _ AdditiveExpr ):* {% optionalBinaryOp %}
AdditiveExpr -> MultiplicativeExpr ( _ ( %plus | %minus ) _ MultiplicativeExpr ):* {% optionalBinaryOp %}
MultiplicativeExpr -> UnaryExpr ( _ MultiplicativeOp _ UnaryExpr ):* {% optionalBinaryOp %}
MultiplicativeOp -> %times | %slash | %divide | %kw_per | %percent | %kw_mod
UnaryExpr -> %minus UnaryExpr {% optionalUnaryOp(0, 1) %}
            | %bang UnaryExpr {% optionalUnaryOp(0, 1) %}
            | %tilde UnaryExpr {% optionalUnaryOp(0, 1) %}
            | PowerExpr {% id %}
            | ValueWithUnits {% id %}
PowerExpr -> PostfixExpr ( _ %caret _ UnaryExpr ):? {%
                (data, location) =>
                  data[1]
                  ? ({
                      type: 'BinaryExpression', subType: 'caret',
                      operator: data[1][1].type, left: data[0], right: data[1][3],
                      offset: data[0].offset,
                      operatorToken: { offset: data[1][1].offset, length: data[1][1].value.length }
                    })
                  : data[0]
             %}
           | PostfixExpr %superscript {%
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
           %}
PostfixExpr -> UnitlessPrimary ( %bang ):? {%
                  (data, location) =>
                    data[1]
                    ? ({
                        type: 'PostfixExpression',
                        operator: data[1][0].type, argument: data[0],
                        offset: data[0].offset,
                        operatorToken: { offset: data[1][0].offset, length: data[1][0].value.length }
                      })
                    : data[0]
               %}

### Primary Expressions

UnitlessPrimary -> Variable {% id %}
                 | FunctionCall {% id %}
                 | %lparen _ Expression _ %rparen {% (data) => data[2] %}
                 | BooleanLiteral {% id %}
                 | DateTimeLiteral {% id %}
                 | BareNumber {% id %}

BooleanLiteral -> %kw_true {% (data, location) => ({ type: 'BooleanLiteral', value: true, offset: data[0].offset }) %}
                | %kw_false {% (data, location) => ({ type: 'BooleanLiteral', value: false, offset: data[0].offset }) %}

Variable -> ( %identifier | %kw_value ) {% (data, location, reject) => {
            return ({ type: 'Variable', name: data[0][0].value, offset: data[0][0].offset });
          } %}

Constant -> ( %identifier | %constantSymbol ) {% 
              (data, location, reject) => isConstant(data[0][0].value) ? ({ type: 'Constant', name: data[0][0].value, offset: data[0][0].offset }) : reject
            %}

BareNumber -> NumericalValue {%
  (data, location) => ({ type: 'Value', value: data[0], unit: null, offset: data[0].offset })
%}

ValueWithUnits -> CompositeValue {% id %}
                | NumericalValue _ Units {%
                    (data, location) => ({ type: 'Value', value: data[0], unit: data[2], offset: data[0].offset })
                  %}
                | CurrencyWithPrefix {% id %}

# Require unit on first component to disambiguate from arithmetic (e.g., "5 ft 3 in" vs "2 + 3")
NumberWithRequiredUnit -> NumericalValue _ Units {%
  (data, location) => ({ type: 'Value', value: data[0], unit: data[2], offset: data[0].offset })
%}

CurrencyWithPrefix -> %currencySymbolAdjacent NumericalValue {%
  (data, location) => ({ 
    type: 'Value', value: data[1], 
    unit: { type: 'CurrencyUnit', subType: 'symbolAdjacent', name: data[0].value, offset: data[0].offset }, 
    offset: data[0].offset 
  })
%}
                          | %identifier __ NumericalValue {%
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
%}

CompositeValue -> NumberWithRequiredUnit ( _ NumberWithRequiredUnit ):+ {%
  (data, location) => {
    const first = data[0];
    const rest = data[1].map((item: any) => item[1]);
    return { type: 'CompositeValue', subType: 'composite', values: [first, ...rest], offset: data[0].offset };
  }
%}


### Functions

FunctionCall -> %identifier _ %lparen ( _ ArgumentList ):? _ %rparen {%
  (data, location) => {
    return { type: 'FunctionCall', name: data[0].value, arguments: data[3] ? data[3][1] : [], offset: data[0].offset };
  }
%}

ArgumentList -> Expression ( _ %comma _ Expression ):* {% expandList(3) %}

### Units

Units -> UnitsList:* (_ %slash _ UnitsDenominatorList ):+ {%
          (data, location) => {
            const numerators = data[0]?.flat() || [];
            const denominators = data[1].flatMap((item: any) => item[3]);
            const terms = [
              ...numerators,
              ...negateExponents(denominators)
            ];
            return { type: 'Units', subType: "slashDenominator", terms, offset: terms[0]?.offset ?? 0 };
          }
        %}
        | UnitsList:* ( __ %kw_per __ UnitsDenominatorList ):+ {%
          (data, location) => {
            const numerators = data[0]?.flat() || [];
            const denominators = data[1].flatMap((item: any) => item[3]);
            const terms = [
              ...numerators,
              ...negateExponents(denominators)
            ];
            return { type: 'Units', subType: "perDenominator", terms, offset: terms[0]?.offset ?? 0 };
          }
        %}
        | UnitsList:+ {%
          (data, location) => {
            return { type: 'Units', subType: "numerator", terms: data[0]?.flat(), offset: data[0]?.flat()[0]?.offset ?? 0 };
          }
        %}

UnitsList -> UnitWithExponent ( __ UnitWithExponent ):* {%
  (data) => {
    const first = data[0];
    const rest = data[1].map((item: any) => item[1]);
    return [first, ...rest];
  }
%}

UnitsDenominatorList -> %lparen _ UnitsList _ %rparen {% (data) => data[2] %} 
                      | UnitWithExponent {% (data) => [data[0]] %}

UnitWithExponent -> Unit ( Exponent {% id %} ):? {%
                  (data, location) => {
                    return { type: 'UnitWithExponent', subType: 'numerical', unit: data[0], exponent: data[1] ?? 1, offset: data[0].offset };
                  }
                %}
               | %kw_square __ Unit {%
                  (data, location) => {
                    return { type: 'UnitWithExponent', subType: 'square', unit: data[2], exponent: 2, offset: data[0].offset };
                  }
                %}
               | Unit __ %kw_squared {%
                  (data, location) => {
                    return { type: 'UnitWithExponent', subType: 'squared', unit: data[0], exponent: 2, offset: data[0].offset };
                  }
                %}
               | %kw_cubic __ Unit {%
                  (data, location) => {
                    return { type: 'UnitWithExponent', subType: 'cubic', unit: data[2], exponent: 3, offset: data[0].offset };
                  }
                %}
               | Unit __ %kw_cubed {%
                  (data, location) => {
                    return { type: 'UnitWithExponent', subType: 'cubed', unit: data[0], exponent: 3, offset: data[0].offset };
                  }
                %}

Exponent -> %caret NumberSymbol:? %decimalDigits {%
  (data) => {
    const sign = data[1] ? (data[1].type === 'plus' ? 1 : -1) : 1;
    return sign * parseInt(data[2].value.replaceAll('_', ''));
  }
%}
          | %superscript {% (data) => { return parseInt(data[0].value.normalize("NFKC")); } %}

# in can be a unit (e.g., inches) or a conversion keyword
Unit -> ( %degree %identifier:? | %prime | %doublePrime ) {%
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
    %}
      | (%identifier | %kw_in ) ( __ (%identifier | %kw_in) ):* {%
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
      %}

### Numerical value

NumericalValue -> %hexNumber {% (data, location) => ({
                    type: 'NumberLiteral', subType: "0x",
                    base: 16, value: data[0].value.substring(2), offset: data[0].offset,
                    sourceLength: data[0].value.length
                  }) %}
                 | %binaryNumber {% (data, location) => ({
                    type: 'NumberLiteral', subType: "0b",
                    base: 2, value: data[0].value.substring(2), offset: data[0].offset,
                    sourceLength: data[0].value.length
                  }) %}
                 | %octalNumber {% (data, location) => ({
                    type: 'NumberLiteral', subType: "0o",
                    base: 8, value: data[0].value.substring(2), offset: data[0].offset,
                    sourceLength: data[0].value.length
                  }) %}
                 | PercentageNumber {% id %}
                 | ArbitraryBaseNumberWithBase {% id %}
                 | DecimalNumber {% id %}
                 | Constant {% id %}

PercentageNumber -> NumberSymbol:? %decimalDigits ( %dot %decimalDigits ):? _ ( %percent | %permille ) {%
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
%}

ArbitraryBaseNumberWithBase -> ArbitraryBaseNumber __ %kw_base __ %decimalDigits {%
  (data, location) => {
    const numberToken = data[0];
    const baseToken = data[4];
    const base = parseInt(baseToken.value.replaceAll('_', ''));
    const value = numberToken.text;
    const sourceLength = (baseToken.offset + baseToken.value.length) - data[0].offset;
    return { type: 'NumberLiteral', subType: 'ArbitraryBaseNumberWithBase', base, value, offset: data[0].offset, sourceLength };
  }
%}

ArbitraryBaseNumber -> %decimalDigits {% mergeParts %}
                     | %decimalDigits %dot %decimalDigits {% mergeParts %}
                     | %decimalDigits %dot %identifier {% mergeParts %}
                     | %decimalDigits %dot %decimalDigits %identifier {% mergeParts %}
                     | %decimalDigits %identifier {% mergeParts %}
                     | %identifier {% mergeParts %}
                     | %identifier %dot %decimalDigits {% mergeParts %}
                     | %identifier %dot %identifier {% mergeParts %}
                     | %identifier %dot %decimalDigits %identifier {% mergeParts %}
                     | %decimalDigits %identifier %dot %decimalDigits {% mergeParts %}
                     | %decimalDigits %identifier %dot %identifier {% mergeParts %}
                     | %decimalDigits %identifier %dot %decimalDigits %identifier {% mergeParts %}
                     | %dot %decimalDigits {% mergeParts %}
                     | %dot %identifier {% mergeParts %}
                     | %dot %decimalDigits %identifier {% mergeParts %}

DecimalNumber -> NumberSymbol:? %decimalDigits ( %dot %decimalDigits ):? ( ScientificNotation ):? {%
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
%}

ScientificNotation -> %scienceExponential NumberSymbol:? %decimalDigits {%
  (data) => {
    const sign = data[1] ? (data[1].type === 'plus' ? 1 : -1) : 1;
    const exponent = parseInt(data[2].value.replaceAll('_', ''));
    const value = sign * exponent;
    return { value, __lastToken: data[2] };
  }
%}

### Date time

DateTimeLiteral -> ZonedDateTime {% id %}
                 | Instant {% id %}
                 | PlainDateTime {% id %}
                 | PlainDate {% id %}
                 | PlainTime {% id %}

ZonedDateTime -> PlainDateTime __ Timezone {%
                (data, location) => {
                  const sourceLength = (data[2].offset + data[2].sourceLength) - data[0].offset;
                  return { type: 'ZonedDateTime', subType: 'dateTime', dateTime: data[0], timezone: data[2], offset: data[0].offset, sourceLength };
                }
              %}
               | PlainTime __ Timezone {%
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
              %}
               | PlainDate __ Timezone {%
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
              %}

Instant -> %kw_now {% (data, location) => ({ type: 'Instant', keyword: 'now', offset: data[0].offset, sourceLength: data[0].value.length }) %}
         | %kw_today {% (data, location) => ({ type: 'Instant', keyword: 'today', offset: data[0].offset, sourceLength: data[0].value.length }) %}
         | %kw_yesterday {% (data, location) => ({ type: 'Instant', keyword: 'yesterday', offset: data[0].offset, sourceLength: data[0].value.length }) %}
         | %kw_tomorrow {% (data, location) => ({ type: 'Instant', keyword: 'tomorrow', offset: data[0].offset, sourceLength: data[0].value.length }) %}
         | NumericalValue __ %identifier __ %kw_ago {%
           (data, location) => {
             const sourceLength = (data[4].offset + data[4].value.length) - data[0].offset;
             return { type: 'Instant', amount: data[0], unit: data[2].value, direction: 'ago', offset: data[0].offset, sourceLength };
           }
         %}
         | NumericalValue __ %identifier __ %kw_from __ %kw_now {%
           (data, location) => {
             const sourceLength = (data[6].offset + data[6].value.length) - data[0].offset;
             return { type: 'Instant', amount: data[0], unit: data[2].value, direction: 'fromNow', offset: data[0].offset, sourceLength };
           }
         %}
         | NumericalValue __ %kw_unix (__ %identifier):? {%
           (data, location) => {
             const lastToken = data[3]?.[1] ?? data[2];
             const sourceLength = (lastToken.offset + lastToken.value.length) - data[0].offset;
             return { type: 'Instant', amount: data[0], unit: data[3]?.[1]?.value ?? "second", direction: 'sinceEpoch', offset: data[0].offset, sourceLength };
           }
         %}

PlainDateTime -> PlainDate __ PlainTime {%
  (data, location) => {
    const sourceLength = (data[2].offset + data[2].sourceLength) - data[0].offset;
    return { type: 'PlainDateTime', subType: 'dateTime', date: data[0], time: data[2], offset: data[0].offset, sourceLength };
  }
%}
               | PlainTime __ PlainDate {%
  (data, location) => {
    const sourceLength = (data[2].offset + data[2].sourceLength) - data[0].offset;
    return { type: 'PlainDateTime', subType: 'timeDate', date: data[2], time: data[0], offset: data[0].offset, sourceLength };
  }
%}

PlainTime -> %plainTime _ %identifier {%
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
            %}
           | %plainTime {%
              (data, location) => {
                const timeStr = data[0].value;
                const parts = timeStr.split(':').map((p: string) => parseInt(p));
                const hour = parts[0] || 0;
                const minute = parts[1] || 0;
                const second = parts[2] || 0;
                return { type: 'PlainTime', subType: '24hFull', hour, minute, second, offset: data[0].offset, sourceLength: data[0].value.length };
              }
            %}
           | %decimalDigits _ %identifier {%
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
            %} 

PlainDate -> %decimalDigits %dot %decimalDigits %dot %decimalDigits {%
                (data, location) => {
                  const year = parseInt(data[0].value.replaceAll('_', ''));
                  const month = parseInt(data[2].value.replaceAll('_', ''));
                  const day = parseInt(data[4].value.replaceAll('_', ''));
                  const sourceLength = (data[4].offset + data[4].value.length) - data[0].offset;
                  return { type: 'PlainDate', subType: 'dot', day, month, year, offset: data[0].offset, sourceLength };
                }
              %}
              | %decimalDigits %minus %decimalDigits %minus %decimalDigits {%
                (data, location, reject) => {
                  const year = parseInt(data[0].value.replaceAll('_', ''));
                  const month = parseInt(data[2].value.replaceAll('_', ''));
                  const day = parseInt(data[4].value.replaceAll('_', ''));
                  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000 || year > 9999) return reject;
                  const sourceLength = (data[4].offset + data[4].value.length) - data[0].offset;
                  return { type: 'PlainDate', subType: 'hyphen', day, month, year, offset: data[0].offset, sourceLength };
                }
              %}
              | %decimalDigits __ %identifier __ %decimalDigits {%
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
              %}
              | %identifier __ %decimalDigits __ %decimalDigits {%
                (data, location, reject) => {
                  const monthName = data[0].value;
                  const month = parseMonthName(monthName.toLowerCase());
                  if (month === null) { return reject; }
                  const day = parseInt(data[2].value.replaceAll('_', ''));
                  const year = parseInt(data[4].value.replaceAll('_', ''));
                  const sourceLength = (data[4].offset + data[4].value.length) - data[0].offset;
                  return { type: 'PlainDate', subType: 'mdy', day, month, year, offset: data[0].offset, sourceLength };
                }
              %}

Timezone -> UTCOffset {% id %}
          | TimezoneName {% id %}

UTCOffset -> %identifier NumberSymbol %plainTime {%
                (data, location, reject) => {
                  const baseZone = data[0].value;
                  if (!/^(UTC|GMT)$/i.test(baseZone)) { return reject; }
                  const prefix = data[1].type === 'plus' ? '+' : '-';
                  const timeStr = data[2].value.padStart(5, '0');
                  const sourceLength = (data[2].offset + data[2].value.length) - data[0].offset;
                  return { type: 'UTCOffset', subType: 'time', offsetStr: prefix + timeStr, baseZone, offset: data[0].offset, sourceLength };
                }
              %}
           | %identifier NumberSymbol %decimalDigits {%
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
              %}

TimezoneName -> %identifier ( ( %slash %identifier ):+ | ( __ %identifier ):+ ):? {%
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
                %}

NumberSymbol -> ( %plus {% id %} | %minus {% id %} ) {% id %} 

### Whitespaces

_ -> %ws:* {%
  (data) => null
%}

__ -> %ws:+ {%
  (data) => null
%}

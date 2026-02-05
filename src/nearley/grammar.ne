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
  // console.log('mergeParts data:', data);
  return data.map((token: any) => token.value).join('');
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
      return { type: 'BinaryExpression', operator: operator.type, left, right, location };
    }, data[0]);
  } else {
    return data[0];
  }
}

function optionalUnaryOp(opIndex: number, exprIndex: number) {
  return (data: any[], location: any, reject: any): any => {
    if (data[opIndex]) {
      return { type: 'UnaryExpression', operator: data[opIndex].type, argument: data[exprIndex], location };
    } else {
      return data[exprIndex];
    }
  };
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
  (data, location) => ({ type: 'VariableAssignment', name: data[0].name, value: data[4], location })
%}

Expression -> ConditionalExpr {% id %}
            | ParenthesizedExpr {% id %}
            | Conversion {% id %}

ParenthesizedExpr -> %lparen _ Expression _ %rparen {% (data) => data[2] %}

### Conversion Targets

ConditionalExpr -> %kw_if __ LogicalOrExpr __ %kw_then __ Expression __ %kw_else __ Expression {%
  (data, location) => ({ type: 'ConditionalExpr', condition: data[2], then: data[6], else: data[10], location })
%}

Conversion -> ConversionSource ( __ ConversionOp __ ConversionTarget ):+ {%
  (data, location) => {
    // Reduce multiple conversions into nested Conversion nodes
    // e.g., "1.71 m to ft in to fraction" becomes Conversion(Conversion(1.71 m, to ft in), to fraction)
    return data[1].reduce((expr: any, conversion: any) => {
      const target = conversion[3];
      // Use target's location for each conversion node
      const conversionLocation = target.location;
      return { type: 'Conversion', expression: expr, operator: conversion[1].type, target, location: conversionLocation };
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

PresentationTarget -> %kw_value {% (data, location) => ({ type: 'PresentationFormat', format: 'value', location }) %}
                    | %kw_binary {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'base', base: 2, location })
                    %}
                    | %kw_octal {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'base', base: 8, location })
                    %}
                    | %kw_decimal {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'base', base: 10, location })
                    %}
                    | %kw_hexadecimal {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'base', base: 16, location })
                    %}
                    | %decimalDigits __ %sigFigs {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'sigFigs', sigFigs: parseInt(data[0].value.replaceAll('_', '')), location })
                    %}
                    | %decimalDigits __ (%kw_decimals | %kw_decimal) {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'decimals', decimals: parseInt(data[0].value.replaceAll('_', '')), location })
                    %}
                    | %kw_base __ %decimalDigits {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'base', base: parseInt(data[2].value.replaceAll('_', '')), location })
                    %}
                    | %kw_scientific {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'scientific', location })
                    %}
                    | %kw_fraction {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'fraction', location })
                    %}
                    | %ISO8601 {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'ISO 8601', location })
                    %}
                    | %RFC9557 {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'RFC 9557', location })
                    %}
                    | %RFC2822 {%
                      (data, location) => ({ type: 'PresentationFormat', format: 'RFC 2822', location })
                    %}
                    | %kw_unix (__ %identifier):? {%
                      (data, location, reject) => 
                        data[1]?.[1]?.value && !/^(s|seconds?|ms|milliseconds?)$/i.test(data[1][1].value)
                        ? reject
                        : ({ type: 'PresentationFormat', format: 'unix', unit: data[1]?.[1]?.value ?? "second", location })
                    %}
                    | %identifier {%
                      (data, location, reject) => 
                        !/^(binary|octal|decimal|hexadecimal|scientific|bin|oct|dec|hex|fraction|unix|value|decimals|base)$/i.test(data[0].value)
                        ? reject
                        : ({ type: 'PresentationFormat', format: 'namedFormat', name: data[0].value, location })
                    %}
PropertyTarget -> %dayOfYear {%
                      (data, location) => ({ type: 'PropertyTarget', property: 'dayOfYear', location })
                    %}
                 | %weekOfYear {%
                      (data, location) => ({ type: 'PropertyTarget', property: 'weekOfYear', location })
                    %}
                 | %identifier {%
                      (data, location, reject) => 
                        /^(year|month|day|weekday|hour|minute|second|millisecond|offset)$/i.test(data[0].value)
                        ? ({ type: 'PropertyTarget', property: data[0].value, location })
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
                  ? ({ type: 'BinaryExpression', subType: 'caret', operator: data[1][1].type, left: data[0], right: data[1][3], location })
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
                  location: data[1].offset 
                }, 
                location 
              };
            }
           %}
PostfixExpr -> UnitlessPrimary ( %bang ):? {%
                  (data, location) => 
                    data[1] 
                    ? ({ type: 'PostfixExpression', operator: data[1][0].type, argument: data[0], location }) 
                    : data[0] 
               %}

### Primary Expressions

UnitlessPrimary -> Constant {% id %}
                 | Variable {% id %}
                 | FunctionCall {% id %}
                 | %lparen _ Expression _ %rparen {% (data) => data[2] %}
                 | BooleanLiteral {% id %}
                 | DateTimeLiteral {% id %}
                 | BareNumber {% id %}

BooleanLiteral -> %kw_true {% (data, location) => ({ type: 'BooleanLiteral', value: true, location }) %}
                | %kw_false {% (data, location) => ({ type: 'BooleanLiteral', value: false, location }) %}

Variable -> ( %identifier | %kw_value ) {% (data, location, reject) => {
            return ({ type: 'Variable', name: data[0][0].value, location });
          } %}

Constant -> ( %identifier | %constantSymbol ) {% (data, location, reject) => isConstant(data[0][0].value) ? ({ type: 'Constant', name: data[0][0].value, location }) : reject %}

BareNumber -> NumericalValue {%
  (data, location) => ({ type: 'Value', value: data[0], unit: null, location })
%}

ValueWithUnits -> CompositeValue {% id %}
                | NumericalValue _ Units {%
                    (data, location) => ({ type: 'Value', value: data[0], unit: data[2], location })
                  %}
                | CurrencyWithPrefix {% id %}

# Require unit on first component to disambiguate from arithmetic (e.g., "5 ft 3 in" vs "2 + 3")
NumberWithRequiredUnit -> NumericalValue _ Units {%
  (data, location) => ({ type: 'Value', value: data[0], unit: data[2], location })
%}

CurrencyWithPrefix -> %currencySymbolAdjacent NumericalValue {%
  (data, location) => ({ type: 'Value', value: data[1], unit: { type: 'CurrencyUnit', subType: 'symbolAdjacent', name: data[0].value }, location })
%}
                          | %identifier __ NumericalValue {%
  (data, location, reject) => {
    return (
      !dataLoader.getCurrencyBySpacedSymbol(data[0].value)
      ? reject
      : ({ type: 'Value', value: data[2], unit: { type: 'CurrencyUnit', subType: 'symbolSpaced', name: data[0].value }, location })
    );
  }
%}

CompositeValue -> NumberWithRequiredUnit ( _ NumberWithRequiredUnit ):+ {%
  (data, location) => {
    const first = data[0];
    const rest = data[1].map((item: any) => item[1]);
    return { type: 'CompositeValue', subType: 'composite', values: [first, ...rest], location };
  }
%}


### Functions

FunctionCall -> %identifier _ %lparen ( _ ArgumentList ):? _ %rparen {%
  (data, location) => {
    return { type: 'FunctionCall', name: data[0].value, arguments: data[3] ? data[3][1] : [], location };
  }
%}

ArgumentList -> Expression ( _ %comma _ Expression ):* {% expandList(3) %}

### Units

Units -> UnitsList:* (_ %slash _ UnitsDenominatorList ):+ {%
          (data, location) => {
            const numerators = data[0]?.flat();
            const denominators = data[1].flatMap((item: any) => item[3]);
            return { type: 'Units', subType: "slashDenominator", numerators, denominators, location };
          }
        %}
        | UnitsList:* ( __ %kw_per __ UnitsDenominatorList ):+ {%
          (data, location) => {
            const numerators = data[0]?.flat();
            const denominators = data[1].flatMap((item: any) => item[3]);
            return { type: 'Units', subType: "perDenominator", numerators, denominators, location };
          }
        %}
        | UnitsList:+ {%
          (data, location) => {
            return { type: 'Units', subType: "numerator", numerators: data[0]?.flat(), denominators: [], location };
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
                    return { type: 'UnitWithExponent', subType: 'numerical', unit: data[0], exponent: data[1] ?? 1, location };
                  }
                %}
               | %kw_square __ Unit {%
                  (data, location) => {
                    return { type: 'UnitWithExponent', subType: 'square', unit: data[2], exponent: 2, location };
                  }
                %}
               | Unit __ %kw_squared {%
                  (data, location) => {
                    return { type: 'UnitWithExponent', subType: 'squared', unit: data[0], exponent: 2, location };
                  }
                %}
               | %kw_cubic __ Unit {%
                  (data, location) => {
                    return { type: 'UnitWithExponent', subType: 'cubic', unit: data[2], exponent: 3, location };
                  }
                %}
               | Unit __ %kw_cubed {%
                  (data, location) => {
                    return { type: 'UnitWithExponent', subType: 'cubed', unit: data[0], exponent: 3, location };
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
        data = data.flat(2);
        // console.log('Parsing special unit:', data);
        let unitName: string;
        if (data[0].type === 'degree') {
          if (data[1] && !/^[cf]$/i.test(data[1].value)) {
            return reject;
          }
          unitName = data[1] ? `deg ${data[1].value}` : 'deg';
        } else if (data[0].type === 'prime') {
          unitName = 'prime';
        } else { // doublePrime
          unitName = 'doublePrime';
        }
        return { type: 'Unit', name: unitName, matched: 'symbol', location };
      }
    %}
      | (%identifier | %kw_in ) ( __ (%identifier | %kw_in) ):* {%
        (data, location, reject) => {
          const first = data[0][0].value;
          const rest = data[1].map((item: any) => item[1][0].value);
          const unitName = [first, ...rest].join(' ');
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
          return { type: 'Unit', name: unitName, matched, location };
        }
      %}

### Numerical value

NumericalValue -> %hexNumber {% (data, location) => ({
                    type: 'NumberLiteral', subType: "0x", 
                    base: 16, value: data[0].value.substring(2), location 
                  }) %}
                 | %binaryNumber {% (data, location) => ({
                    type: 'NumberLiteral', subType: "0b", 
                    base: 2, value: data[0].value.substring(2), location 
                  }) %}
                 | %octalNumber {% (data, location) => ({
                    type: 'NumberLiteral', subType: "0o", 
                    base: 8, value: data[0].value.substring(2), location 
                  }) %}
                 | PercentageNumber {% id %}
                 | ArbitraryBaseNumberWithBase {% id %}
                 | DecimalNumber {% id %}

PercentageNumber -> NumberSymbol:? %decimalDigits ( %dot %decimalDigits ):? _ ( %percent | %permille ) {%
  (data, location) => {
    const sign = data[0] ? (data[0].type === 'plus' ? 1 : -1) : 1;
    const integerPart = data[1].value;
    const fractionalPart = data[2] ? "." + data[2][1].value : '';
    const value = `${sign === -1 ? '-' : ''}${integerPart}${fractionalPart}`;
    const symbol = data[4][0].type;
    return { type: 'PercentageLiteral', value, symbol, location };
  }
%}

ArbitraryBaseNumberWithBase -> ArbitraryBaseNumber __ %kw_base __ %decimalDigits {%
  (data, location) => {
    const numberToken = data[0];
    const baseToken = data[4];
    const base = parseInt(baseToken.value.replaceAll('_', ''));
    const value = numberToken;
    return { type: 'NumberLiteral', subType: 'ArbitraryBaseNumberWithBase', base, value, location };
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
    const exponentPart = data[3] ? "e" + data[3] : '';
    const value = `${sign === -1 ? '-' : ''}${integerPart}${fractionalPart}${exponentPart}`;
    return { type: 'NumberLiteral', subType: 'DecimalNumber', base: 10, value, location };
  }
%}

ScientificNotation -> %scienceExponential NumberSymbol:? %decimalDigits {%
  (data) => {
    const sign = data[1] ? (data[1].type === 'plus' ? 1 : -1) : 1;
    const exponent = parseInt(data[2].value.replaceAll('_', ''));
    return sign * exponent;
  }
%}

### Date time

DateTimeLiteral -> ZonedDateTime {% id %}
                 | Instant {% id %}
                 | PlainDateTime {% id %}
                 | PlainDate {% id %}
                 | PlainTime {% id %}

ZonedDateTime -> PlainDateTime __ Timezone {%
                (data, location) => ({ type: 'ZonedDateTime', subType: 'dateTime', dateTime: data[0], timezone: data[2], location })
              %}
               | PlainTime __ Timezone {%
                (data, location) => {
                  return {
                    type: 'ZonedDateTime',
                    subType: 'plainTime',
                    dateTime: {
                      type: 'PlainDateTime',
                      subType: 'plainTimeZoned',
                      date: null,
                      time: data[0],
                      location: data[0].location
                    },
                    timezone: data[2],
                    location
                  };
                }
              %}
               | PlainDate __ Timezone {%
                (data, location) => {
                  // Create a PlainDateTime by combining PlainDate with 00:00:00 time
                  const plainTime = {
                    type: 'PlainTime',
                    hour: 0,
                    minute: 0,
                    second: 0,
                    millisecond: 0,
                    location: data[0].location
                  };
                  const plainDateTime = {
                    type: 'PlainDateTime',
                    subType: 'plainDate',
                    dateTime: {
                      type: 'PlainDateTime',
                      subType: 'plainDateZoned',
                      date: data[0],
                      time: plainTime,
                      location: data[0].location
                    },
                    location: data[0].location
                  };
                  return { type: 'ZonedDateTime', dateTime: plainDateTime, timezone: data[2], location };
                }
              %}

Instant -> %kw_now {% (data, location) => ({ type: 'Instant', keyword: 'now', location }) %}
         | %kw_today {% (data, location) => ({ type: 'Instant', keyword: 'today', location }) %}
         | %kw_yesterday {% (data, location) => ({ type: 'Instant', keyword: 'yesterday', location }) %}
         | %kw_tomorrow {% (data, location) => ({ type: 'Instant', keyword: 'tomorrow', location }) %}
         | NumericalValue __ %identifier __ %kw_ago {% (data, location) => ({ type: 'Instant', amount: data[0], unit: data[2].value, direction: 'ago', location }) %}
         | NumericalValue __ %identifier __ %kw_from __ %kw_now {% (data, location) => ({ type: 'Instant', amount: data[0], unit: data[2].value, direction: 'fromNow', location }) %}
         | NumericalValue __ %kw_unix (__ %identifier):? {%
           (data, location) => ({ type: 'Instant', amount: data[0], unit: data[3]?.[1]?.value ?? "second", direction: 'sinceEpoch', location })
         %}

PlainDateTime -> PlainDate __ PlainTime {% (data, location) => ({ type: 'PlainDateTime', subType: 'dateTime', date: data[0], time: data[2], location }) %}
               | PlainTime __ PlainDate {% (data, location) => ({ type: 'PlainDateTime', subType: 'timeDate', date: data[2], time: data[0], location }) %}

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
                return { type: 'PlainTime', subType: '12hFull', hour, minute, second, location };
              }
            %}
           | %plainTime {%
              (data, location) => {
                const timeStr = data[0].value;
                const parts = timeStr.split(':').map((p: string) => parseInt(p));
                const hour = parts[0] || 0;
                const minute = parts[1] || 0;
                const second = parts[2] || 0;
                return { type: 'PlainTime', subType: '24hFull', hour, minute, second, location };
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
                return { type: 'PlainTime', subType: '12hShort', hour, minute: 0, second: 0, location };
              }
            %} 

PlainDate -> %decimalDigits %dot %decimalDigits %dot %decimalDigits {%
                (data, location) => {
                  const year = parseInt(data[0].value.replaceAll('_', ''));
                  const month = parseInt(data[2].value.replaceAll('_', ''));
                  const day = parseInt(data[4].value.replaceAll('_', ''));
                  return { type: 'PlainDate', subType: 'dot', day, month, year, location };
                }
              %}
              | %decimalDigits %minus %decimalDigits %minus %decimalDigits {%
                (data, location, reject) => {
                  const year = parseInt(data[0].value.replaceAll('_', ''));
                  const month = parseInt(data[2].value.replaceAll('_', ''));
                  const day = parseInt(data[4].value.replaceAll('_', ''));
                  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000 || year > 9999) return reject;
                  return { type: 'PlainDate', subType: 'hyphen', day, month, year, location };
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
                  return { type: 'PlainDate', subType: 'ymd/Dmy', day, month, year, location };
                }
              %}
              | %identifier __ %decimalDigits __ %decimalDigits {%
                (data, location, reject) => {
                  const monthName = data[0].value;
                  const month = parseMonthName(monthName.toLowerCase());
                  if (month === null) { return reject; }
                  const day = parseInt(data[2].value.replaceAll('_', ''));
                  const year = parseInt(data[4].value.replaceAll('_', ''));
                  return { type: 'PlainDate', subType: 'mdy', day, month, year, location };
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
                  return { type: 'UTCOffset', subType: 'time', offsetStr: prefix + timeStr, baseZone, location };
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
                  return { type: 'UTCOffset', subType: 'numerical', offsetStr, baseZone, location };
                }
              %}

TimezoneName -> %identifier ( ( %slash %identifier ):+ | ( __ %identifier ):+ ):? {%
                  (data, location, reject) => {
                    const parts = [data[0].value, ...(data[1]?.flat(2).map((item: any) => item === null ? " " : item.value) || [])];
                    const zoneName = parts.join('');
                    if (!dataLoader.getTimezoneMatches(zoneName)?.length) {
                      return reject;
                    }
                    return { type: 'TimezoneName', zoneName, location };
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

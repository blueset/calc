import { describe, expect, it } from "vitest";
import { Arr, LineNode, ValueNode } from "../../src/nearley/types";
import { buildCandidateTrees } from "../../src/nearley/merge";

describe("merger", () => {
  describe("buildCandidateTrees", () => {
    it("should build candidate trees from candidates", () => {
      /*
      1000[«hong»:1 «kong»:1 «dollar»:1 / «compensation»:1]
      1000["hong kong dollar":1 / «compensation»:1]
      ₂slash(1000["hong kong dollar":1], Variable(name=compensation, location=8))
      ₂slash(1000[«hong»:1 «kong»:1 «dollar»:1], Variable(name=compensation, location=8))
      */

      const candidates: LineNode[] = [
        {
          type: "Value",
          value: {
            type: "NumberLiteral",
            subType: "DecimalNumber",
            base: 10,
            value: "1000",
            location: 0,
          },
          unit: {
            type: "Units",
            subType: "slashDenominator",
            numerators: [
              {
                type: "UnitWithExponent",
                unit: {
                  type: "Unit",
                  name: "hong",
                  matched: "identifier",
                  location: 2,
                },
                exponent: 1,
                location: 2,
              },
              {
                type: "UnitWithExponent",
                unit: {
                  type: "Unit",
                  name: "kong",
                  matched: "identifier",
                  location: 4,
                },
                exponent: 1,
                location: 4,
              },
              {
                type: "UnitWithExponent",
                unit: {
                  type: "Unit",
                  name: "dollar",
                  matched: "identifier",
                  location: 6,
                },
                exponent: 1,
                location: 6,
              },
            ],
            denominators: [
              {
                type: "UnitWithExponent",
                unit: {
                  type: "Unit",
                  name: "compensation",
                  matched: "identifier",
                  location: 8,
                },
                exponent: 1,
                location: 8,
              },
            ],
            location: 2,
          },
          location: 0,
        },
        {
          type: "Value",
          value: {
            type: "NumberLiteral",
            subType: "DecimalNumber",
            base: 10,
            value: "1000",
            location: 0,
          },
          unit: {
            type: "Units",
            subType: "slashDenominator",
            numerators: [
              {
                type: "UnitWithExponent",
                unit: {
                  type: "Unit",
                  name: "hong kong dollar",
                  matched: "currencyName",
                  location: 2,
                },
                exponent: 1,
                location: 2,
              },
            ],
            denominators: [
              {
                type: "UnitWithExponent",
                unit: {
                  type: "Unit",
                  name: "compensation",
                  matched: "identifier",
                  location: 8,
                },
                exponent: 1,
                location: 8,
              },
            ],
            location: 2,
          },
          location: 0,
        },
        {
          type: "BinaryExpression",
          operator: "slash",
          left: {
            type: "Value",
            value: {
              type: "NumberLiteral",
              subType: "DecimalNumber",
              base: 10,
              value: "1000",
              location: 0,
            },
            unit: {
              type: "Units",
              subType: "numerator",
              numerators: [
                {
                  type: "UnitWithExponent",
                  unit: {
                    type: "Unit",
                    name: "hong kong dollar",
                    matched: "currencyName",
                    location: 2,
                  },
                  exponent: 1,
                  location: 2,
                },
              ],
              denominators: [],
              location: 2,
            },
            location: 0,
          },
          right: { type: "Variable", name: "compensation", location: 8 },
          location: 0,
        },
        {
          type: "BinaryExpression",
          operator: "slash",
          left: {
            type: "Value",
            value: {
              type: "NumberLiteral",
              subType: "DecimalNumber",
              base: 10,
              value: "1000",
              location: 0,
            },
            unit: {
              type: "Units",
              subType: "numerator",
              numerators: [
                {
                  type: "UnitWithExponent",
                  unit: {
                    type: "Unit",
                    name: "hong",
                    matched: "identifier",
                    location: 2,
                  },
                  exponent: 1,
                  location: 2,
                },
                {
                  type: "UnitWithExponent",
                  unit: {
                    type: "Unit",
                    name: "kong",
                    matched: "identifier",
                    location: 4,
                  },
                  exponent: 1,
                  location: 4,
                },
                {
                  type: "UnitWithExponent",
                  unit: {
                    type: "Unit",
                    name: "dollar",
                    matched: "identifier",
                    location: 6,
                  },
                  exponent: 1,
                  location: 6,
                },
              ],
              denominators: [],
              location: 2,
            },
            location: 0,
          },
          right: { type: "Variable", name: "compensation", location: 8 },
          location: 0,
        },
      ];

      const candidateTrees: LineNode<Arr> = [
        {
          type: "Value",
          location: 0,
          value: [
            {
              type: "NumberLiteral",
              subType: "DecimalNumber",
              base: 10,
              value: "1000",
              location: 0,
            },
          ],
          unit: [
            {
              type: "Units",
              subType: "slashDenominator",
              location: 2,
              numerators: [
                [
                  {
                    type: "UnitWithExponent",
                    unit: {
                      type: "Unit",
                      name: "hong",
                      matched: "identifier",
                      location: 2,
                    },
                    exponent: 1,
                    location: 2,
                  },
                  {
                    type: "UnitWithExponent",
                    unit: {
                      type: "Unit",
                      name: "kong",
                      matched: "identifier",
                      location: 4,
                    },
                    exponent: 1,
                    location: 4,
                  },
                  {
                    type: "UnitWithExponent",
                    unit: {
                      type: "Unit",
                      name: "dollar",
                      matched: "identifier",
                      location: 6,
                    },
                    exponent: 1,
                    location: 6,
                  },
                ],
                [
                  {
                    type: "UnitWithExponent",
                    unit: {
                      type: "Unit",
                      name: "hong kong dollar",
                      matched: "currencyName",
                      location: 2,
                    },
                    exponent: 1,
                    location: 2,
                  },
                ],
              ],
              denominators: [
                [
                  {
                    type: "UnitWithExponent",
                    unit: {
                      type: "Unit",
                      name: "compensation",
                      matched: "identifier",
                      location: 8,
                    },
                    exponent: 1,
                    location: 8,
                  },
                ],
              ],
            },
          ],
        },
        {
          type: "BinaryExpression",
          operator: "slash",
          location: 0,
          left: [
            {
              type: "Value",
              location: 0,
              value: [
                {
                  type: "NumberLiteral",
                  subType: "DecimalNumber",
                  base: 10,
                  value: "1000",
                  location: 0,
                },
              ],
              unit: [
                {
                  type: "Units",
                  subType: "numerator",
                  location: 2,
                  numerators: [
                    [
                      {
                        type: "UnitWithExponent",
                        unit: {
                          type: "Unit",
                          name: "hong kong dollar",
                          matched: "currencyName",
                          location: 2,
                        },
                        exponent: 1,
                        location: 2,
                      },
                    ],
                    [
                      {
                        type: "UnitWithExponent",
                        unit: {
                          type: "Unit",
                          name: "hong",
                          matched: "identifier",
                          location: 2,
                        },
                        exponent: 1,
                        location: 2,
                      },
                      {
                        type: "UnitWithExponent",
                        unit: {
                          type: "Unit",
                          name: "kong",
                          matched: "identifier",
                          location: 4,
                        },
                        exponent: 1,
                        location: 4,
                      },
                      {
                        type: "UnitWithExponent",
                        unit: {
                          type: "Unit",
                          name: "dollar",
                          matched: "identifier",
                          location: 6,
                        },
                        exponent: 1,
                        location: 6,
                      },
                    ],
                  ],
                  denominators: [[]],
                },
              ],
            },
          ],
          right: [{ type: "Variable", name: "compensation", location: 8 }],
        },
      ];

      expect(buildCandidateTrees(candidates)).toEqual(candidateTrees);
    });
  });
});

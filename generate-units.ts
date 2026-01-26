/**
 * Script to generate units.json for the notepad calculator
 * Run with: npx ts-node generate-units.ts
 */

import * as fs from "fs";

// ============================================================================
// Type Definitions (from types.ts)
// ============================================================================

interface UnitsDatabase {
  dimensions: Dimension[];
  units: Unit[];
}

interface Dimension {
  id: string;
  name: string;
  baseUnit: string;
  derivedFrom?: {
    numerator: Array<{ dimension: string; exponent: number }>;
    denominator?: Array<{ dimension: string; exponent: number }>;
  };
  hasNamedUnits?: boolean;
}

interface Unit {
  id: string;
  dimension: string;
  displayName: DisplayName;
  names: string[];
  conversion: UnitConversion;
  isBaseUnit?: boolean;
}

interface DisplayName {
  symbol: string;
  singular: string;
  plural?: string;
}

type UnitConversion = LinearConversion | AffineConversion | VariantConversion;

interface LinearConversion {
  type: "linear";
  factor: number;
}

interface AffineConversion {
  type: "affine";
  offset: number;
  factor: number;
}

interface VariantConversion {
  type: "variant";
  variants: {
    us: LinearConversion | AffineConversion;
    uk: LinearConversion | AffineConversion;
  };
}

// ============================================================================
// SI Prefix Definitions
// ============================================================================

interface SIPrefix {
  name: string;
  symbol: string;
  exponent: number;
}

// All 25 SI prefixes (includes base with empty string)
const ALL_SI_PREFIXES: SIPrefix[] = [
  { name: "quetta", symbol: "Q", exponent: 30 },
  { name: "ronna", symbol: "R", exponent: 27 },
  { name: "yotta", symbol: "Y", exponent: 24 },
  { name: "zetta", symbol: "Z", exponent: 21 },
  { name: "exa", symbol: "E", exponent: 18 },
  { name: "peta", symbol: "P", exponent: 15 },
  { name: "tera", symbol: "T", exponent: 12 },
  { name: "giga", symbol: "G", exponent: 9 },
  { name: "mega", symbol: "M", exponent: 6 },
  { name: "kilo", symbol: "k", exponent: 3 },
  { name: "hecto", symbol: "h", exponent: 2 },
  { name: "deka", symbol: "da", exponent: 1 },
  { name: "", symbol: "", exponent: 0 }, // base unit
  { name: "deci", symbol: "d", exponent: -1 },
  { name: "centi", symbol: "c", exponent: -2 },
  { name: "milli", symbol: "m", exponent: -3 },
  { name: "micro", symbol: "μ", exponent: -6 },
  { name: "nano", symbol: "n", exponent: -9 },
  { name: "pico", symbol: "p", exponent: -12 },
  { name: "femto", symbol: "f", exponent: -15 },
  { name: "atto", symbol: "a", exponent: -18 },
  { name: "zepto", symbol: "z", exponent: -21 },
  { name: "yocto", symbol: "y", exponent: -24 },
  { name: "ronto", symbol: "r", exponent: -27 },
  { name: "quecto", symbol: "q", exponent: -30 },
];

// SI prefixes kilo and larger (for data units)
const LARGE_SI_PREFIXES: SIPrefix[] = ALL_SI_PREFIXES.filter(
  (p) => p.exponent >= 3
);

// Binary prefixes for data units
interface BinaryPrefix {
  name: string;
  symbol: string;
  exponent: number; // power of 2
}

const BINARY_PREFIXES: BinaryPrefix[] = [
  { name: "kibi", symbol: "Ki", exponent: 10 },
  { name: "mebi", symbol: "Mi", exponent: 20 },
  { name: "gibi", symbol: "Gi", exponent: 30 },
  { name: "tebi", symbol: "Ti", exponent: 40 },
  { name: "pebi", symbol: "Pi", exponent: 50 },
  { name: "exbi", symbol: "Ei", exponent: 60 },
  { name: "zebi", symbol: "Zi", exponent: 70 },
  { name: "yobi", symbol: "Yi", exponent: 80 },
  { name: "robi", symbol: "Ri", exponent: 90 },
  { name: "quebi", symbol: "Qi", exponent: 100 },
];

// ============================================================================
// Dimension Definitions
// ============================================================================

const dimensions: Dimension[] = [
  { id: "dimensionless", name: "Dimensionless", baseUnit: "unity" },
  { id: "length", name: "Length", baseUnit: "meter" },
  { id: "mass", name: "Mass", baseUnit: "gram" },
  {
    id: "area",
    name: "Area",
    baseUnit: "square_meter",
    derivedFrom: { numerator: [{ dimension: "length", exponent: 2 }] },
    hasNamedUnits: true,
  },
  {
    id: "volume",
    name: "Volume",
    baseUnit: "cubic_meter",
    derivedFrom: { numerator: [{ dimension: "length", exponent: 3 }] },
    hasNamedUnits: true,
  },
  { id: "temperature", name: "Temperature", baseUnit: "kelvin" },
  { id: "time", name: "Time", baseUnit: "second" },
  {
    id: "speed",
    name: "Speed",
    baseUnit: "meter_per_second",
    derivedFrom: {
      numerator: [{ dimension: "length", exponent: 1 }],
      denominator: [{ dimension: "time", exponent: 1 }],
    },
    hasNamedUnits: true,
  },
  {
    id: "energy",
    name: "Energy",
    baseUnit: "joule",
    derivedFrom: {
      numerator: [
        { dimension: "mass", exponent: 1 },
        { dimension: "length", exponent: 2 },
      ],
      denominator: [{ dimension: "time", exponent: 2 }],
    },
    hasNamedUnits: true,
  },
  {
    id: "power",
    name: "Power",
    baseUnit: "watt",
    derivedFrom: {
      numerator: [{ dimension: "energy", exponent: 1 }],
      denominator: [{ dimension: "time", exponent: 1 }],
    },
    hasNamedUnits: true,
  },
  { id: "data", name: "Data", baseUnit: "bit" },
  {
    id: "pressure",
    name: "Pressure",
    baseUnit: "pascal",
    derivedFrom: {
      numerator: [{ dimension: "force", exponent: 1 }],
      denominator: [{ dimension: "length", exponent: 2 }],
    },
    hasNamedUnits: true,
  },
  {
    id: "force",
    name: "Force",
    baseUnit: "newton",
    derivedFrom: {
      numerator: [
        { dimension: "mass", exponent: 1 },
        { dimension: "length", exponent: 1 },
      ],
      denominator: [{ dimension: "time", exponent: 2 }],
    },
    hasNamedUnits: true,
  },
  { id: "angle", name: "Angle", baseUnit: "radian" },
  { id: "cycle", name: "Cycle", baseUnit: "cycle" },
  {
    id: "frequency",
    name: "Frequency",
    baseUnit: "hertz",
    derivedFrom: {
      numerator: [{ dimension: "cycle", exponent: 1 }],
      denominator: [{ dimension: "time", exponent: 1 }],
    },
    hasNamedUnits: true,
  },
  { id: "current", name: "Electric Current", baseUnit: "ampere" },
  { id: "luminous_intensity", name: "Luminous Intensity", baseUnit: "candela" },
  { id: "printing", name: "Printing/Display", baseUnit: "dot" },
  { id: "operation", name: "Operation", baseUnit: "operation" },
  {
    id: "operation_rate",
    name: "Operation Rate",
    baseUnit: "flops",
    derivedFrom: {
      numerator: [{ dimension: "operation", exponent: 1 }],
      denominator: [{ dimension: "time", exponent: 1 }],
    },
    hasNamedUnits: true,
  },
  { id: "beat", name: "Beat", baseUnit: "beat" },
  {
    id: "beat_rate",
    name: "Beat Rate",
    baseUnit: "bpm",
    derivedFrom: {
      numerator: [{ dimension: "beat", exponent: 1 }],
      denominator: [{ dimension: "time", exponent: 1 }],
    },
    hasNamedUnits: true,
  },
];

// ============================================================================
// Unit Generation Helpers
// ============================================================================

function generateSIPrefixedUnits(
  baseId: string,
  baseSymbol: string,
  baseSingular: string,
  basePlural: string,
  dimension: string,
  baseFactorToSI: number = 1
): Unit[] {
  const units: Unit[] = [];

  for (const prefix of ALL_SI_PREFIXES) {
    const isBase = prefix.exponent === 0;
    const id = isBase ? baseId : `${prefix.name}${baseId}`;
    const symbol = `${prefix.symbol}${baseSymbol}`;
    const singular = isBase ? baseSingular : `${prefix.name}${baseSingular}`;
    const plural = isBase ? basePlural : `${prefix.name}${basePlural}`;

    // Factor relative to the base unit of the dimension
    const factor = baseFactorToSI * Math.pow(10, prefix.exponent);

    const names: string[] = [symbol, singular, plural];

    units.push({
      id,
      dimension,
      displayName: { symbol, singular, plural },
      names: [...new Set(names)],
      conversion: { type: "linear", factor },
      isBaseUnit: isBase && baseFactorToSI === 1 ? true : undefined,
    });
  }

  return units;
}

function generateDataUnits(
  baseId: string,
  baseSymbol: string,
  baseSingular: string,
  basePlural: string,
  baseFactorToBit: number = 1
): Unit[] {
  const units: Unit[] = [];

  // Base unit
  units.push({
    id: baseId,
    dimension: "data",
    displayName: { symbol: baseSymbol, singular: baseSingular, plural: basePlural },
    names: [baseSymbol, baseSingular, basePlural],
    conversion: { type: "linear", factor: baseFactorToBit },
    isBaseUnit: baseFactorToBit === 1 ? true : undefined,
  });

  // Decimal SI prefixes (kilo and larger)
  for (const prefix of LARGE_SI_PREFIXES) {
    const id = `${prefix.name}${baseId}`;
    const symbol = `${prefix.symbol}${baseSymbol}`;
    const singular = `${prefix.name}${baseSingular}`;
    const plural = `${prefix.name}${basePlural}`;
    const factor = baseFactorToBit * Math.pow(10, prefix.exponent);

    units.push({
      id,
      dimension: "data",
      displayName: { symbol, singular, plural },
      names: [symbol, singular, plural],
      conversion: { type: "linear", factor },
    });
  }

  // Binary prefixes
  for (const prefix of BINARY_PREFIXES) {
    const id = `${prefix.name}${baseId}`;
    const symbol = `${prefix.symbol}${baseSymbol}`;
    const singular = `${prefix.name}${baseSingular}`;
    const plural = `${prefix.name}${basePlural}`;
    const factor = baseFactorToBit * Math.pow(2, prefix.exponent);

    units.push({
      id,
      dimension: "data",
      displayName: { symbol, singular, plural },
      names: [symbol, singular, plural],
      conversion: { type: "linear", factor },
    });
  }

  return units;
}

function generateFLOPSUnits(): Unit[] {
  const units: Unit[] = [];

  // Base FLOPS (1 FLOPS = 1 operation per second)
  units.push({
    id: "flops",
    dimension: "operation_rate",
    displayName: { symbol: "FLOPS", singular: "FLOPS", plural: "FLOPS" },
    names: ["FLOPS", "flops"],
    conversion: { type: "linear", factor: 1 },
    isBaseUnit: true,
  });

  // SI prefixes kilo and larger
  for (const prefix of LARGE_SI_PREFIXES) {
    const id = `${prefix.name}flops`;
    const symbol = `${prefix.symbol}FLOPS`;
    const factor = Math.pow(10, prefix.exponent);

    units.push({
      id,
      dimension: "operation_rate",
      displayName: { symbol, singular: symbol, plural: symbol },
      names: [symbol],
      conversion: { type: "linear", factor },
    });
  }

  return units;
}

// ============================================================================
// Static Unit Definitions
// ============================================================================

const staticUnits: Unit[] = [
  // ---- Dimensionless ----
  {
    id: "unity",
    dimension: "dimensionless",
    displayName: { symbol: "", singular: "", plural: "" },
    names: [],
    conversion: { type: "linear", factor: 1 },
    isBaseUnit: true,
  },
  {
    id: "percent",
    dimension: "dimensionless",
    displayName: { symbol: "%", singular: "percent", plural: "percent" },
    names: ["%", "percent", "pct"],
    conversion: { type: "linear", factor: 0.01 },
  },
  {
    id: "permille",
    dimension: "dimensionless",
    displayName: { symbol: "‰", singular: "per mille", plural: "per mille" },
    names: ["‰", "per mille", "per thousand", "permille", "permil"],
    conversion: { type: "linear", factor: 0.001 },
  },
  {
    id: "mol",
    dimension: "dimensionless",
    displayName: { symbol: "mol", singular: "mole", plural: "moles" },
    names: ["mol", "mole", "moles"],
    conversion: { type: "linear", factor: 6.02214076e23 },
  },
  {
    id: "dozen",
    dimension: "dimensionless",
    displayName: { symbol: "doz", singular: "dozen", plural: "dozen" },
    names: ["doz", "dozen", "dozens"],
    conversion: { type: "linear", factor: 12 },
  },
  {
    id: "gross",
    dimension: "dimensionless",
    displayName: { symbol: "gr", singular: "gross", plural: "gross" },
    names: ["gross"],
    conversion: { type: "linear", factor: 144 },
  },
  {
    id: "score",
    dimension: "dimensionless",
    displayName: { symbol: "score", singular: "score", plural: "score" },
    names: ["score", "scores"],
    conversion: { type: "linear", factor: 20 },
  },
  {
    id: "thousand",
    dimension: "dimensionless",
    displayName: { symbol: "thousand", singular: "thousand", plural: "thousand" },
    names: ["thousand", "thousands"],
    conversion: { type: "linear", factor: 1000 },
  },
  {
    id: "million",
    dimension: "dimensionless",
    displayName: { symbol: "mn", singular: "million", plural: "million" },
    names: ["million", "millions", "mn"],
    conversion: { type: "linear", factor: 1e6 },
  },
  {
    id: "billion",
    dimension: "dimensionless",
    displayName: { symbol: "bn", singular: "billion", plural: "billion" },
    names: ["billion", "billions", "bn"],
    conversion: { type: "linear", factor: 1e9 },
  },
  {
    id: "trillion",
    dimension: "dimensionless",
    displayName: { symbol: "tn", singular: "trillion", plural: "trillion" },
    names: ["trillion", "trillions", "tn"],
    conversion: { type: "linear", factor: 1e12 },
  },

  // ---- Length (non-SI) ----
  {
    id: "inch",
    dimension: "length",
    displayName: { symbol: "in", singular: "inch", plural: "inches" },
    names: ["in", "inch", "inches", "″", "''", '"'],
    conversion: { type: "linear", factor: 0.0254 },
  },
  {
    id: "foot",
    dimension: "length",
    displayName: { symbol: "ft", singular: "foot", plural: "feet" },
    names: ["ft", "foot", "feet", "′", "'"],
    conversion: { type: "linear", factor: 0.3048 },
  },
  {
    id: "yard",
    dimension: "length",
    displayName: { symbol: "yd", singular: "yard", plural: "yards" },
    names: ["yd", "yard", "yards"],
    conversion: { type: "linear", factor: 0.9144 },
  },
  {
    id: "mile",
    dimension: "length",
    displayName: { symbol: "mi", singular: "mile", plural: "miles" },
    names: ["mi", "mile", "miles"],
    conversion: { type: "linear", factor: 1609.344 },
  },
  {
    id: "angstrom",
    dimension: "length",
    displayName: { symbol: "Å", singular: "angstrom", plural: "angstroms" },
    names: ["Å", "angstrom", "angstroms"],
    conversion: { type: "linear", factor: 1e-10 },
  },
  {
    id: "nautical_mile",
    dimension: "length",
    displayName: { symbol: "nmi", singular: "nautical mile", plural: "nautical miles" },
    names: ["nmi", "nautical mile", "nautical miles", "NM"],
    conversion: { type: "linear", factor: 1852 },
  },
  {
    id: "astronomical_unit",
    dimension: "length",
    displayName: { symbol: "au", singular: "astronomical unit", plural: "astronomical units" },
    names: ["au", "astronomical unit", "astronomical units"],
    conversion: { type: "linear", factor: 149597870700 },
  },
  {
    id: "lightyear",
    dimension: "length",
    displayName: { symbol: "ly", singular: "lightyear", plural: "lightyears" },
    names: ["ly", "lightyear", "lightyears", "light year", "light years", "light-year", "light-years"],
    conversion: { type: "linear", factor: 9.4607304725808e15 },
  },

  // ---- Mass (non-SI) ----
  {
    id: "tonne",
    dimension: "mass",
    displayName: { symbol: "t", singular: "tonne", plural: "tonnes" },
    names: ["t", "tonne", "tonnes", "ton", "tons", "metric ton", "metric tons"],
    conversion: { type: "linear", factor: 1e6 }, // 1 tonne = 1e6 grams
  },
  {
    id: "carat",
    dimension: "mass",
    displayName: { symbol: "ct", singular: "carat", plural: "carats" },
    names: ["ct", "carat", "carats"],
    conversion: { type: "linear", factor: 0.2 }, // 1 carat = 0.2 grams
  },
  {
    id: "ounce",
    dimension: "mass",
    displayName: { symbol: "oz", singular: "ounce", plural: "ounces" },
    names: ["oz", "ounce", "ounces"],
    conversion: { type: "linear", factor: 28.349523125 }, // grams
  },
  {
    id: "pound",
    dimension: "mass",
    displayName: { symbol: "lb", singular: "pound", plural: "pounds" },
    names: ["lb", "lbs", "pound", "pounds"],
    conversion: { type: "linear", factor: 453.59237 }, // grams
  },
  {
    id: "stone",
    dimension: "mass",
    displayName: { symbol: "st", singular: "stone", plural: "stones" },
    names: ["st", "stone", "stones"],
    conversion: { type: "linear", factor: 6350.29318 }, // grams
  },
  {
    id: "short_ton",
    dimension: "mass",
    displayName: { symbol: "sh tn", singular: "short ton", plural: "short tons" },
    names: ["short ton", "short tons", "sh tn", "US ton", "US tons"],
    conversion: { type: "linear", factor: 907184.74 }, // grams (2000 lb)
  },
  {
    id: "long_ton",
    dimension: "mass",
    displayName: { symbol: "lg tn", singular: "long ton", plural: "long tons" },
    names: ["long ton", "long tons", "lg tn", "UK ton", "UK tons", "imperial ton", "imperial tons"],
    conversion: { type: "linear", factor: 1016046.9088 }, // grams (2240 lb)
  },

  // ---- Area ----
  {
    id: "square_meter",
    dimension: "area",
    displayName: { symbol: "m²", singular: "square meter", plural: "square meters" },
    names: ["m²", "m^2", "square meter", "square meters", "meter squared", "meters squared", "sq m"],
    conversion: { type: "linear", factor: 1 },
    isBaseUnit: true,
  },
  {
    id: "hectare",
    dimension: "area",
    displayName: { symbol: "ha", singular: "hectare", plural: "hectares" },
    names: ["ha", "hectare", "hectares"],
    conversion: { type: "linear", factor: 10000 }, // m²
  },
  {
    id: "acre",
    dimension: "area",
    displayName: { symbol: "acre", singular: "acre", plural: "acres" },
    names: ["acre", "acres", "ac"],
    conversion: { type: "linear", factor: 4046.8564224 }, // m²
  },
  {
    id: "square_foot",
    dimension: "area",
    displayName: { symbol: "ft²", singular: "square foot", plural: "square feet" },
    names: ["ft²", "ft^2", "square foot", "square feet", "sq ft"],
    conversion: { type: "linear", factor: 0.09290304 }, // m²
  },
  {
    id: "square_inch",
    dimension: "area",
    displayName: { symbol: "in²", singular: "square inch", plural: "square inches" },
    names: ["in²", "in^2", "square inch", "square inches", "sq in"],
    conversion: { type: "linear", factor: 0.00064516 }, // m²
  },
  {
    id: "square_mile",
    dimension: "area",
    displayName: { symbol: "mi²", singular: "square mile", plural: "square miles" },
    names: ["mi²", "mi^2", "square mile", "square miles", "sq mi"],
    conversion: { type: "linear", factor: 2589988.110336 }, // m²
  },
  {
    id: "square_kilometer",
    dimension: "area",
    displayName: { symbol: "km²", singular: "square kilometer", plural: "square kilometers" },
    names: ["km²", "km^2", "square kilometer", "square kilometers", "sq km"],
    conversion: { type: "linear", factor: 1000000 }, // m²
  },
  {
    id: "square_centimeter",
    dimension: "area",
    displayName: { symbol: "cm²", singular: "square centimeter", plural: "square centimeters" },
    names: ["cm²", "cm^2", "square centimeter", "square centimeters", "sq cm"],
    conversion: { type: "linear", factor: 0.0001 }, // m²
  },

  // ---- Volume ----
  {
    id: "cubic_meter",
    dimension: "volume",
    displayName: { symbol: "m³", singular: "cubic meter", plural: "cubic meters" },
    names: ["m³", "m^3", "cubic meter", "cubic meters", "meter cubed", "meters cubed"],
    conversion: { type: "linear", factor: 1 },
    isBaseUnit: true,
  },
  {
    id: "cubic_centimeter",
    dimension: "volume",
    displayName: { symbol: "cm³", singular: "cubic centimeter", plural: "cubic centimeters" },
    names: ["cm³", "cm^3", "cubic centimeter", "cubic centimeters", "cc"],
    conversion: { type: "linear", factor: 1e-6 }, // m³
  },
  {
    id: "cubic_foot",
    dimension: "volume",
    displayName: { symbol: "ft³", singular: "cubic foot", plural: "cubic feet" },
    names: ["ft³", "ft^3", "cubic foot", "cubic feet"],
    conversion: { type: "linear", factor: 0.028316846592 }, // m³
  },
  {
    id: "cubic_inch",
    dimension: "volume",
    displayName: { symbol: "in³", singular: "cubic inch", plural: "cubic inches" },
    names: ["in³", "in^3", "cubic inch", "cubic inches"],
    conversion: { type: "linear", factor: 1.6387064e-5 }, // m³
  },
  {
    id: "teaspoon",
    dimension: "volume",
    displayName: { symbol: "tsp", singular: "teaspoon", plural: "teaspoons" },
    names: ["tsp", "teaspoon", "teaspoons"],
    conversion: {
      type: "variant",
      variants: {
        us: { type: "linear", factor: 4.92892159375e-6 }, // m³
        uk: { type: "linear", factor: 5.91938802083e-6 }, // m³
      },
    },
  },
  {
    id: "tablespoon",
    dimension: "volume",
    displayName: { symbol: "tbsp", singular: "tablespoon", plural: "tablespoons" },
    names: ["tbsp", "tablespoon", "tablespoons"],
    conversion: {
      type: "variant",
      variants: {
        us: { type: "linear", factor: 1.47867647813e-5 }, // m³
        uk: { type: "linear", factor: 1.77581640625e-5 }, // m³
      },
    },
  },
  {
    id: "cup",
    dimension: "volume",
    displayName: { symbol: "cup", singular: "cup", plural: "cups" },
    names: ["cup", "cups", "c"],
    conversion: {
      type: "variant",
      variants: {
        us: { type: "linear", factor: 2.365882365e-4 }, // m³
        uk: { type: "linear", factor: 2.84130625e-4 }, // m³ (metric cup, 250 mL)
      },
    },
  },
  {
    id: "fluid_ounce",
    dimension: "volume",
    displayName: { symbol: "fl oz", singular: "fluid ounce", plural: "fluid ounces" },
    names: ["fl oz", "fluid ounce", "fluid ounces", "floz"],
    conversion: {
      type: "variant",
      variants: {
        us: { type: "linear", factor: 2.95735295625e-5 }, // m³
        uk: { type: "linear", factor: 2.84130625e-5 }, // m³
      },
    },
  },
  {
    id: "pint",
    dimension: "volume",
    displayName: { symbol: "pt", singular: "pint", plural: "pints" },
    names: ["pt", "pint", "pints"],
    conversion: {
      type: "variant",
      variants: {
        us: { type: "linear", factor: 4.73176473e-4 }, // m³
        uk: { type: "linear", factor: 5.6826125e-4 }, // m³
      },
    },
  },
  {
    id: "quart",
    dimension: "volume",
    displayName: { symbol: "qt", singular: "quart", plural: "quarts" },
    names: ["qt", "quart", "quarts"],
    conversion: {
      type: "variant",
      variants: {
        us: { type: "linear", factor: 9.46352946e-4 }, // m³
        uk: { type: "linear", factor: 1.1365225e-3 }, // m³
      },
    },
  },
  {
    id: "gallon",
    dimension: "volume",
    displayName: { symbol: "gal", singular: "gallon", plural: "gallons" },
    names: ["gal", "gallon", "gallons"],
    conversion: {
      type: "variant",
      variants: {
        us: { type: "linear", factor: 3.785411784e-3 }, // m³
        uk: { type: "linear", factor: 4.54609e-3 }, // m³
      },
    },
  },

  // ---- Temperature ----
  {
    id: "kelvin",
    dimension: "temperature",
    displayName: { symbol: "K", singular: "kelvin", plural: "kelvins" },
    names: ["K", "kelvin", "kelvins"],
    conversion: { type: "linear", factor: 1 },
    isBaseUnit: true,
  },
  {
    id: "celsius",
    dimension: "temperature",
    displayName: { symbol: "°C", singular: "degree Celsius", plural: "degrees Celsius" },
    names: ["°C", "C", "celsius", "Celsius", "deg C", "degree Celsius", "degrees Celsius"],
    conversion: { type: "affine", offset: 273.15, factor: 1 },
  },
  {
    id: "fahrenheit",
    dimension: "temperature",
    displayName: { symbol: "°F", singular: "degree Fahrenheit", plural: "degrees Fahrenheit" },
    names: ["°F", "F", "fahrenheit", "Fahrenheit", "deg F", "degree Fahrenheit", "degrees Fahrenheit"],
    conversion: { type: "affine", offset: 459.67, factor: 5 / 9 },
  },

  // ---- Time ----
  {
    id: "second",
    dimension: "time",
    displayName: { symbol: "s", singular: "second", plural: "seconds" },
    names: ["s", "sec", "second", "seconds", "secs"],
    conversion: { type: "linear", factor: 1 },
    isBaseUnit: true,
  },
  {
    id: "millisecond",
    dimension: "time",
    displayName: { symbol: "ms", singular: "millisecond", plural: "milliseconds" },
    names: ["ms", "millisecond", "milliseconds", "msec", "msecs"],
    conversion: { type: "linear", factor: 0.001 },
  },
  {
    id: "microsecond",
    dimension: "time",
    displayName: { symbol: "μs", singular: "microsecond", plural: "microseconds" },
    names: ["μs", "us", "microsecond", "microseconds"],
    conversion: { type: "linear", factor: 1e-6 },
  },
  {
    id: "nanosecond",
    dimension: "time",
    displayName: { symbol: "ns", singular: "nanosecond", plural: "nanoseconds" },
    names: ["ns", "nanosecond", "nanoseconds"],
    conversion: { type: "linear", factor: 1e-9 },
  },
  {
    id: "minute",
    dimension: "time",
    displayName: { symbol: "min", singular: "minute", plural: "minutes" },
    names: ["min", "minute", "minutes", "mins"],
    conversion: { type: "linear", factor: 60 },
  },
  {
    id: "hour",
    dimension: "time",
    displayName: { symbol: "h", singular: "hour", plural: "hours" },
    names: ["h", "hr", "hrs", "hour", "hours"],
    conversion: { type: "linear", factor: 3600 },
  },
  {
    id: "day",
    dimension: "time",
    displayName: { symbol: "day", singular: "day", plural: "days" },
    names: ["day", "days", "d"],
    conversion: { type: "linear", factor: 86400 },
  },
  {
    id: "week",
    dimension: "time",
    displayName: { symbol: "wk", singular: "week", plural: "weeks" },
    names: ["wk", "week", "weeks", "wks"],
    conversion: { type: "linear", factor: 604800 },
  },
  {
    id: "month",
    dimension: "time",
    displayName: { symbol: "mo", singular: "month", plural: "months" },
    names: ["mo", "mth", "month", "months", "mths"],
    conversion: { type: "linear", factor: 2629746 }, // average month (365.25/12 days)
  },
  {
    id: "year",
    dimension: "time",
    displayName: { symbol: "yr", singular: "year", plural: "years" },
    names: ["yr", "yrs", "year", "years"],
    conversion: { type: "linear", factor: 31556952 }, // 365.25 days
  },

  // ---- Energy (non-SI) ----
  {
    id: "small_calorie",
    dimension: "energy",
    displayName: { symbol: "gcal", singular: "small calorie", plural: "small calories" },
    names: ["gcal", "small calorie", "small calories", "sm cal", "gram calorie", "gram calories"],
    conversion: { type: "linear", factor: 4.184 }, // joules
  },
  {
    id: "kilocalorie",
    dimension: "energy",
    displayName: { symbol: "kcal", singular: "kilocalorie", plural: "kilocalories" },
    names: ["kcal", "kilocalorie", "kilocalories", "Cal", "calorie", "calories", "cal", "food calorie", "food calories"],
    conversion: { type: "linear", factor: 4184 }, // joules
  },
  {
    id: "btu",
    dimension: "energy",
    displayName: { symbol: "BTU", singular: "BTU", plural: "BTUs" },
    names: ["BTU", "BTUs", "Btu", "British thermal unit", "British thermal units"],
    conversion: { type: "linear", factor: 1055.06 }, // joules
  },

  // ---- Speed ----
  {
    id: "meter_per_second",
    dimension: "speed",
    displayName: { symbol: "m/s", singular: "meter per second", plural: "meters per second" },
    names: ["m/s", "meter per second", "meters per second", "mps"],
    conversion: { type: "linear", factor: 1 },
    isBaseUnit: true,
  },
  {
    id: "knot",
    dimension: "speed",
    displayName: { symbol: "kn", singular: "knot", plural: "knots" },
    names: ["kn", "kt", "knot", "knots"],
    conversion: { type: "linear", factor: 0.514444 }, // m/s
  },
  {
    id: "mach",
    dimension: "speed",
    displayName: { symbol: "mach", singular: "mach", plural: "mach" },
    names: ["mach", "Mach"],
    conversion: { type: "linear", factor: 343 }, // m/s at sea level
  },

  // ---- Power (non-SI) ----
  {
    id: "horsepower",
    dimension: "power",
    displayName: { symbol: "HP", singular: "horsepower", plural: "horsepower" },
    names: ["HP", "hp", "horsepower"],
    conversion: { type: "linear", factor: 745.7 }, // watts
  },

  // ---- Pressure (non-SI) ----
  {
    id: "atmosphere",
    dimension: "pressure",
    displayName: { symbol: "atm", singular: "atmosphere", plural: "atmospheres" },
    names: ["atm", "atmosphere", "atmospheres"],
    conversion: { type: "linear", factor: 101325 }, // pascals
  },
  {
    id: "bar",
    dimension: "pressure",
    displayName: { symbol: "bar", singular: "bar", plural: "bars" },
    names: ["bar", "bars"],
    conversion: { type: "linear", factor: 100000 }, // pascals
  },
  {
    id: "mmhg",
    dimension: "pressure",
    displayName: { symbol: "mmHg", singular: "millimeter of mercury", plural: "millimeters of mercury" },
    names: ["mmHg", "millimeter of mercury", "millimeters of mercury", "mm Hg"],
    conversion: { type: "linear", factor: 133.322 }, // pascals
  },
  {
    id: "inhg",
    dimension: "pressure",
    displayName: { symbol: "inHg", singular: "inch of mercury", plural: "inches of mercury" },
    names: ["inHg", "inch of mercury", "inches of mercury", "in Hg"],
    conversion: { type: "linear", factor: 3386.39 }, // pascals
  },

  // ---- Force (non-SI) ----
  {
    id: "pound_force",
    dimension: "force",
    displayName: { symbol: "lbf", singular: "pound-force", plural: "pounds-force" },
    names: ["lbf", "pound-force", "pounds-force", "pound force", "pounds force"],
    conversion: { type: "linear", factor: 4.44822 }, // newtons
  },
  {
    id: "kilogram_force",
    dimension: "force",
    displayName: { symbol: "kgf", singular: "kilogram-force", plural: "kilograms-force" },
    names: ["kgf", "kilogram-force", "kilograms-force", "kilogram force", "kilograms force"],
    conversion: { type: "linear", factor: 9.80665 }, // newtons
  },

  // ---- Angle ----
  {
    id: "radian",
    dimension: "angle",
    displayName: { symbol: "rad", singular: "radian", plural: "radians" },
    names: ["rad", "radian", "radians"],
    conversion: { type: "linear", factor: 1 },
    isBaseUnit: true,
  },
  {
    id: "degree",
    dimension: "angle",
    displayName: { symbol: "°", singular: "degree", plural: "degrees" },
    names: ["°", "deg", "degree", "degrees"],
    conversion: { type: "linear", factor: Math.PI / 180 }, // radians
  },
  {
    id: "arcminute",
    dimension: "angle",
    displayName: { symbol: "′", singular: "arcminute", plural: "arcminutes" },
    names: ["′", "arcminute", "arcminutes", "arcmin", "arc minute", "arc minutes", "'"],
    conversion: { type: "linear", factor: Math.PI / 10800 }, // radians
  },
  {
    id: "arcsecond",
    dimension: "angle",
    displayName: { symbol: "″", singular: "arcsecond", plural: "arcseconds" },
    names: ["″", "arcsecond", "arcseconds", "arcsec", "arc second", "arc seconds", "''", '"'],
    conversion: { type: "linear", factor: Math.PI / 648000 }, // radians
  },

  // ---- Frequency ----
  {
    id: "cycle",
    dimension: "cycle",
    displayName: { symbol: "cycle", singular: "cycle", plural: "cycles" },
    names: ["cycle", "cycles"],
    conversion: { type: "linear", factor: 1 },
    isBaseUnit: true,
  },

  // ---- Operations ----
  {
    id: "operation",
    dimension: "operation",
    displayName: { symbol: "ops", singular: "operation", plural: "operations" },
    names: ["op", "ops", "operation", "operations"],
    conversion: { type: "linear", factor: 1 },
    isBaseUnit: true,
  },

  // ---- Beats ----
  {
    id: "beat",
    dimension: "beat",
    displayName: { symbol: "beat", singular: "beat", plural: "beats" },
    names: ["beat", "beats"],
    conversion: { type: "linear", factor: 1 },
    isBaseUnit: true,
  },

  // ---- Beat Rate ----
  {
    id: "bpm",
    dimension: "beat_rate",
    displayName: { symbol: "BPM", singular: "BPM", plural: "BPM" },
    names: ["BPM", "bpm", "beats per minute"],
    conversion: { type: "linear", factor: 1 }, // 1 BPM = 1 beat/minute (base unit for beat_rate)
    isBaseUnit: true,
  },

  // ---- Printing ----
  {
    id: "dot",
    dimension: "printing",
    displayName: { symbol: "dot", singular: "dot", plural: "dots" },
    names: ["dot", "dots"],
    conversion: { type: "linear", factor: 1 },
    isBaseUnit: true,
  },
];

// ============================================================================
// Generate All Units
// ============================================================================

function generateAllUnits(): Unit[] {
  const units: Unit[] = [...staticUnits];

  // Meter with all SI prefixes (base unit for length)
  units.push(
    ...generateSIPrefixedUnits("meter", "m", "meter", "meters", "length", 1)
  );

  // Gram with all SI prefixes (base unit for mass)
  units.push(
    ...generateSIPrefixedUnits("gram", "g", "gram", "grams", "mass", 1)
  );

  // Ampere with all SI prefixes
  units.push(
    ...generateSIPrefixedUnits("ampere", "A", "ampere", "amperes", "current", 1)
  );

  // Hertz with all SI prefixes
  units.push(
    ...generateSIPrefixedUnits("hertz", "Hz", "hertz", "hertz", "frequency", 1)
  );

  // Pascal with all SI prefixes
  units.push(
    ...generateSIPrefixedUnits("pascal", "Pa", "pascal", "pascals", "pressure", 1)
  );

  // Joule with all SI prefixes
  units.push(
    ...generateSIPrefixedUnits("joule", "J", "joule", "joules", "energy", 1)
  );

  // Watt with all SI prefixes
  units.push(
    ...generateSIPrefixedUnits("watt", "W", "watt", "watts", "power", 1)
  );

  // Liter with all SI prefixes (1 L = 0.001 m³)
  units.push(
    ...generateSIPrefixedUnits("liter", "L", "liter", "liters", "volume", 0.001)
  );

  // Electronvolt with all SI prefixes (1 eV = 1.602176634e-19 J)
  units.push(
    ...generateSIPrefixedUnits(
      "electronvolt",
      "eV",
      "electronvolt",
      "electronvolts",
      "energy",
      1.602176634e-19
    )
  );

  // Newton with all SI prefixes
  units.push(
    ...generateSIPrefixedUnits("newton", "N", "newton", "newtons", "force", 1)
  );

  // Candela with all SI prefixes
  units.push(
    ...generateSIPrefixedUnits(
      "candela",
      "cd",
      "candela",
      "candelas",
      "luminous_intensity",
      1
    )
  );

  // Data units (bit and byte)
  units.push(...generateDataUnits("bit", "b", "bit", "bits", 1));
  units.push(...generateDataUnits("byte", "B", "byte", "bytes", 8));

  // FLOPS units
  units.push(...generateFLOPSUnits());

  return units;
}

// ============================================================================
// Main
// ============================================================================

function reportDuplicateNames(units: Unit[]): void {
  // Allowed duplicate exceptions: name -> set of unit IDs that are allowed to share this name
  const allowedDuplicates: Map<string, Set<string>> = new Map([
    ["′", new Set(["foot", "arcminute"])],
    ["'", new Set(["foot", "arcminute"])],
    ["″", new Set(["inch", "arcsecond"])],
    ["''", new Set(["inch", "arcsecond"])],
    ['"', new Set(["inch", "arcsecond"])],
  ]);

  // Map: name -> list of unit IDs that have this name
  const nameToUnits = new Map<string, string[]>();

  for (const unit of units) {
    // Collect all names for this unit
    const allNames: string[] = [];

    // Add displayName fields
    if (unit.displayName.symbol) allNames.push(unit.displayName.symbol);
    if (unit.displayName.singular) allNames.push(unit.displayName.singular);
    if (unit.displayName.plural) allNames.push(unit.displayName.plural);

    // Add all names array values
    allNames.push(...unit.names);

    // Dedupe within unit and add to map
    const uniqueNames = [...new Set(allNames)];
    for (const name of uniqueNames) {
      if (!name) continue; // skip empty strings
      const existing = nameToUnits.get(name) || [];
      existing.push(unit.id);
      nameToUnits.set(name, existing);
    }
  }

  // Find duplicates (names that appear in more than one unit)
  const duplicates: Array<{ name: string; unitIds: string[] }> = [];
  for (const [name, unitIds] of nameToUnits.entries()) {
    if (unitIds.length > 1) {
      // Check if this is an allowed exception
      const allowed = allowedDuplicates.get(name);
      if (allowed) {
        const unitIdSet = new Set(unitIds);
        // Check if the sets are exactly equal
        if (unitIdSet.size === allowed.size && [...unitIdSet].every(id => allowed.has(id))) {
          continue; // Skip this allowed duplicate
        }
      }
      duplicates.push({ name, unitIds });
    }
  }

  // Report
  if (duplicates.length === 0) {
    console.log(`\nNo duplicate names found.`);
  } else {
    console.log(`\n⚠️  Found ${duplicates.length} duplicate names (case-sensitive):`);
    // Sort by name for readability
    duplicates.sort((a, b) => a.name.localeCompare(b.name));
    for (const { name, unitIds } of duplicates) {
      console.log(`  "${name}" -> [${unitIds.join(", ")}]`);
    }
  }
}

function main() {
  const database: UnitsDatabase = {
    dimensions,
    units: generateAllUnits(),
  };

  // Remove undefined values and clean up
  const cleanDatabase = JSON.parse(JSON.stringify(database));

  fs.writeFileSync(
    "units.json",
    JSON.stringify(cleanDatabase, null, 2),
    "utf-8"
  );

  console.log(`Generated units.json with:`);
  console.log(`  - ${cleanDatabase.dimensions.length} dimensions`);
  console.log(`  - ${cleanDatabase.units.length} units`);

  // Report duplicates
  reportDuplicateNames(cleanDatabase.units as Unit[]);
}

main();

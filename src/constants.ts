/**
 * Mathematical and physical constants available in the calculator
 */

export interface Constant {
  name: string;
  aliases: string[];
  value: number;
  description: string;
}

/**
 * All built-in constants (primary definitions)
 */
const CONSTANT_DEFINITIONS: Constant[] = [
  {
    name: 'pi',
    aliases: ['π'],
    value: Math.PI,
    description: 'Pi (π), the ratio of a circle\'s circumference to its diameter'
  },
  {
    name: 'e',
    aliases: [],
    value: Math.E,
    description: 'Euler\'s number (e), the base of natural logarithms'
  },
  {
    name: 'golden_ratio',
    aliases: ['phi', 'φ'],
    value: (1 + Math.sqrt(5)) / 2, // φ ≈ 1.618033988749895
    description: 'The golden ratio (φ), (1 + √5) / 2'
  },
  {
    name: 'NaN',
    aliases: [],
    value: NaN,
    description: 'Not a Number'
  },
  {
    name: 'Infinity',
    aliases: ['inf', '∞'],
    value: Infinity,
    description: 'Positive infinity'
  },
  {
    name: 'sqrt2',
    aliases: ['√2'],
    value: Math.SQRT2,
    description: 'Square root of 2 (√2)'
  },
  {
    name: 'sqrt1_2',
    aliases: ['√½'],
    value: Math.SQRT1_2,
    description: 'Square root of 1/2 (1/√2)'
  },
  {
    name: 'ln2',
    aliases: [],
    value: Math.LN2,
    description: 'Natural logarithm of 2'
  },
  {
    name: 'ln10',
    aliases: [],
    value: Math.LN10,
    description: 'Natural logarithm of 10'
  },
  {
    name: 'log2e',
    aliases: [],
    value: Math.LOG2E,
    description: 'Base-2 logarithm of e'
  },
  {
    name: 'log10e',
    aliases: [],
    value: Math.LOG10E,
    description: 'Base-10 logarithm of e'
  }
];

/**
 * Lookup map from name/alias to constant value
 */
const CONSTANT_LOOKUP = new Map<string, number>();

// Build lookup map including all aliases
for (const constant of CONSTANT_DEFINITIONS) {
  CONSTANT_LOOKUP.set(constant.name, constant.value);
  for (const alias of constant.aliases) {
    CONSTANT_LOOKUP.set(alias, constant.value);
  }
}

/**
 * All built-in constants (legacy Record format for compatibility)
 */
export const CONSTANTS: Record<string, Constant> = {};
for (const constant of CONSTANT_DEFINITIONS) {
  CONSTANTS[constant.name] = constant;
}

/**
 * Check if a name is a constant (including aliases)
 */
export function isConstant(name: string): boolean {
  return CONSTANT_LOOKUP.has(name);
}

/**
 * Get constant value by name or alias
 */
export function getConstant(name: string): number | undefined {
  return CONSTANT_LOOKUP.get(name);
}

/**
 * Get all constant names (primary names only, not aliases)
 */
export function getAllConstantNames(): string[] {
  return CONSTANT_DEFINITIONS.map(c => c.name);
}

/**
 * Get all constant definitions (for documentation or UI)
 */
export function getAllConstants(): Constant[] {
  return [...CONSTANT_DEFINITIONS];
}

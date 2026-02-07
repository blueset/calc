// Also change in index.html.
export const APP_NAME = import.meta.env.VITE_APP_TITLE || "Calc";

export const DEFAULT_DOCUMENT = `# Arithmetic
2 + 3
10 * 4 - 7
(100 + 50) / 3

# Units
5 km
170 cm to ft in
3.5 hours + 45 minutes

# Conversions
100 °F to °C
1 mile to km
5 kg to lbs

# Variables
width = 10 m
height = 5 m
area = width * height
`;

export const HELP_DOCUMENT = `# Welcome to ${APP_NAME}!

More content coming soon.
`;

export const FONT_SIZE_MAP = {
  small: 13,
  medium: 15,
  large: 18,
} as const;

export const FONT_FAMILY_MAP: Record<string, string> = {
  monospace: "var(--font-mono)",
  "sans-serif": "var(--font-sans)",
  serif: "var(--font-serif)",
};

export const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
  ".": "·",
};

export const DOCUMENT_STORAGE_KEY = "calc-document";
export const SETTINGS_STORAGE_KEY = "calc-settings";
export const EXCHANGE_RATES_STORAGE_KEY = "calc-exchange-rates";

// Also change in index.html.
export const APP_NAME = import.meta.env.VITE_APP_TITLE || "Calc";

export const DEFAULT_DOCUMENT = `# Arithmetic
2 + 3
10 * 4 - 7
(100 + 50) / 3

# Units
5 km
25 km + 50 mi
3 ft 10 in + 20 in

# Conversions
100 C to F
1 mile to km
171 cm to ft in
3 hrs 15 min + 45 min to hrs min

# Variables
size = 12.59 GiB
speed = 100 Mbps
time = size / speed in min

# Date & Time
now
3 hours ago
18:30 New York in London
now + 2 months 3 days
2038-01-19 03:14:07 UTC - now  # The infamous 2038 problem!

# Currency
100 USD to EUR

`;

export const DEMO_DOCUMENT = `# Welcome to ${APP_NAME}!
# Try editing any line to see results update instantly.

# Arithmetic
2 + 3
10 * 4 - 7
(100 + 50) / 3
2 ^ 10

# Percentages
200 + 15%
50% of 80

# Units & conversions
5 km to miles
170 cm to ft in
100 °F to °C
3.5 hours + 45 minutes to minutes

# Variables
price = 49.99
qty = 12
subtotal = price * qty
tax = subtotal * 8.5%
total = subtotal + tax

# Currency
1 USD to EUR
100 JPY to GBP

# Functions
sqrt(144)
sin(45 deg)
log(1000)
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

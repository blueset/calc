/**
 * Application settings (as specified in SPECS.md)
 * Controls how values are displayed and UI preferences
 */

export interface Settings {
  // UI Settings
  /**
   * Theme (default: 'system')
   * - 'light': Light theme
   * - 'dark': Dark theme
   * - 'system': Follow system preference
   */
  theme: "light" | "dark" | "system";

  /**
   * Font size (default: 'medium')
   */
  fontSize: "small" | "medium" | "large";

  /**
   * Font family (default: 'monospace')
   */
  fontFamily: "monospace" | "sans-serif" | "serif";

  /**
   * Line wrapping in editor (default: false)
   */
  lineWrapping: boolean;

  // Number Formatting Settings
  /**
   * Number of decimal places to display (default: -1)
   * Set to -1 for automatic precision based on magnitude
   */
  precision: number;

  /**
   * Angle unit for trigonometric functions (default: 'degree')
   * Note: This affects both calculation and display
   */
  angleUnit: "degree" | "radian";

  /**
   * Decimal separator character (default: '.')
   * - '.': Standard decimal point (1234.56)
   * - ',': European decimal comma (1234,56)
   */
  decimalSeparator: "." | ",";

  /**
   * Digit grouping separator (default: ' ')
   * - '': No grouping (1234567)
   * - '\u202F': Narrow no-break space separator (1\u{202F}234\u{202F}567)
   * - ',': Comma separator (1,234,567)
   * - '.': Dot separator (1.234.567)
   * - '′': Prime symbol separator (1′234′567)
   */
  digitGroupingSeparator: "" | "\u202F" | "," | "." | "′";

  /**
   * Digit grouping size (default: '3')
   * - '3': European style (1,234,567)
   * - '2-3': South Asian style (12,34,567) - first 3, then groups of 2
   * - '4': East Asian style (1234,5678)
   * - 'off': No grouping
   */
  digitGroupingSize: "3" | "2-3" | "4" | "off";

  // Date/Time Formatting Settings
  /**
   * Date format (default: 'YYYY-MM-DD DDD')
   * Tokens: YYYY (year), MM (month), DD (day), MMM (month name), DDD (day of week)
   * Examples:
   * - 'YYYY-MM-DD DDD': 2024-01-31 Wed
   * - 'YYYY MMM DD DDD': 2024 Jan 31 Wed
   * - 'DDD DD MMM YYYY': Wed 31 Jan 2024
   * - 'DDD MMM DD YYYY': Wed Jan 31 2024
   */
  dateFormat: string;

  /**
   * Time format (default: 'h23')
   * - 'h12': 12-hour format with AM/PM (3:45 PM)
   * - 'h23': 24-hour format (15:45)
   */
  timeFormat: "h12" | "h23";

  /**
   * Date time format - order of date and time (default: '{date} {time}')
   * - '{date} {time}': Date first, then time (2024-01-31 15:45)
   * - '{time} {date}': Time first, then date (15:45 2024-01-31)
   */
  dateTimeFormat: "{date} {time}" | "{time} {date}";

  // Unit Settings
  /**
   * Imperial units variant (default: 'us')
   * - 'us': US imperial units (US gallon, etc.)
   * - 'uk': UK imperial units (UK gallon, etc.)
   */
  imperialUnits: "us" | "uk";

  /**
   * Unit display style (default: 'symbol')
   * - 'symbol': Use short symbols (km, kg, °C)
   * - 'name': Use full names (kilometer, kilogram, degree Celsius)
   */
  unitDisplayStyle: "symbol" | "name";
}

/**
 * Default settings (as specified in SPECS.md)
 */
export const defaultSettings: Settings = {
  // UI defaults
  theme: "system",
  fontSize: "medium",
  fontFamily: "monospace",
  lineWrapping: true,

  // Number formatting defaults
  precision: -1, // Automatic precision
  angleUnit: "degree",
  decimalSeparator: ".",
  digitGroupingSeparator: "\u202F", // Narrow no-break space
  digitGroupingSize: "3", // European style (3 digits)

  // Date/time defaults
  dateFormat: "YYYY-MM-DD DDD",
  timeFormat: "h23",
  dateTimeFormat: "{date} {time}",

  // Unit defaults
  imperialUnits: "us",
  unitDisplayStyle: "symbol",
};

/**
 * Create settings with partial overrides
 */
export function createSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...defaultSettings,
    ...overrides,
  };
}

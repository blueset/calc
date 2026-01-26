/**                                                                                                                                                                                                                                             
 * Units database - source format                                                                                                                                                                                                               
 * At build time, this can be expanded to include all SI-prefixed variants
 */
interface UnitsDatabase {
  dimensions: Dimension[];
  units: Unit[];
}

interface Dimension {
  id: string; // e.g., "length", "mass", "time", "dimensionless"
  name: string;
  baseUnit: string; // reference to unit ID that's the base

  // For derived dimensions (e.g., volume = length³, speed = length/time)
  derivedFrom?: {
    numerator: Array<{ dimension: string; exponent: number }>;
    denominator?: Array<{ dimension: string; exponent: number }>;
  };

  // Some dimensions also have named units (e.g., "liter" for volume)
  hasNamedUnits?: boolean;
}

interface Unit {
  id: string; // unique identifier, e.g., "meter", "foot", "celsius"
  dimension: string; // reference to dimension ID

  // Canonical display names
  displayName: DisplayName;

  // All ways this unit can be written
  names: string[];

  // Conversion to base unit of this dimension
  conversion: UnitConversion;

  // Flags
  isBaseUnit?: boolean; // true for the base unit of the dimension
}

interface DisplayName {
  symbol: string; // e.g., "m", "ft", "°C"
  singular: string; // e.g., "meter", "foot", "degree Celsius"
  plural?: string; // e.g., "meters", "feet", "degrees Celsius"
}

type UnitConversion =
  | LinearConversion
  | AffineConversion
  | VariantConversion;

interface LinearConversion {
  type: "linear";
  factor: number; // base_value = input_value * factor
  // e.g., 1 km = 1000 m, so factor = 1000
}

interface AffineConversion {
  type: "affine";
  // base_value = (input_value + offset) * factor
  offset: number; // add before scaling (for temperature: shift to absolute zero)
  factor: number; // scale factor
  // Examples:
  // Celsius to Kelvin: offset=273.15, factor=1
  // Fahrenheit to Kelvin: offset=459.67, factor=5/9
}

interface VariantConversion {
  type: "variant";
  variants: {
    us: LinearConversion | AffineConversion;
    uk: LinearConversion | AffineConversion;
  };
  // e.g., US gallon vs UK gallon
}

interface CurrenciesDatabase {
  unambiguous: UnambiguousCurrency[];
  ambiguous: AmbiguousCurrency[];
}

interface UnambiguousCurrency {
  code: string; // ISO 4217 code, e.g., "USD", "EUR", "JPY"
  minorUnits: number; // decimal places, e.g., 2 for USD, 0 for JPY, 3 for KWD

  // All ways to write this currency
  displayName: Pick<DisplayName, "singular" | "plural">;
  names: string[];
}

interface AmbiguousCurrency {
  // These are treated as user-defined units (non-convertible)
  symbol: string; // e.g., "$", "¢", "¥", "¤"
  dimension: string; // unique dimension ID for this ambiguous currency
}

interface TimezonesDatabase {
  timezones: Timezone[];
}

interface Timezone {
  iana: string; // IANA timezone name, e.g., "America/New_York"

  // All ways to refer to this timezone
  names: TimezoneName[];
}

interface TimezoneName {
  name: string;
  territory?: string; // e.g., "US", "GB", "001"
}

interface ExchangeRatesDatabase {
  baseCurrency: string; // e.g., "USD"
  timestamp: string; // ISO 8601 timestamp of last update
  rates: ExchangeRate[];
}

interface ExchangeRate {
  from: string; // ISO 4217 currency code
  to: string; // ISO 4217 currency code
  rate: number; // exchange rate
}

// Alternative flat structure for faster lookup:
interface ExchangeRatesDatabaseFlat {
  baseCurrency: string;
  timestamp: string;

  // Map of "FROM_TO" → rate
  // e.g., "USD_EUR" → 0.858
  rates: Record<string, number>;
}

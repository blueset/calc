import type { UnambiguousCurrency, ExchangeRatesDatabase, ExchangeRate } from './types/types';
import type { DataLoader } from './data-loader';

/**
 * Currency value with code
 */
export interface CurrencyValue {
  amount: number;
  currencyCode: string; // ISO 4217 code
}

/**
 * Currency conversion engine
 * Handles currency conversions using exchange rates
 */
export class CurrencyConverter {
  private exchangeRates: Map<string, number> = new Map();
  private baseCurrency: string = '';
  private lastUpdate: string = '';

  constructor(private dataLoader: DataLoader) {}

  /**
   * Load exchange rates from database
   *
   * @param rates Exchange rates database with nested structure
   */
  loadExchangeRates(rates: ExchangeRatesDatabase): void {
    this.lastUpdate = rates.date;

    // Clear existing rates
    this.exchangeRates.clear();

    // Load rates from nested structure
    // Structure: { date: "...", usd: { eur: 0.85, gbp: 0.73 }, eur: { gbp: 0.86 } }
    for (const [key, value] of Object.entries(rates)) {
      // Skip the 'date' field
      if (key === 'date') {
        continue;
      }

      // This is a base currency with its rates
      const baseCurrency = key.toUpperCase();

      // Set first encountered currency as base (typically 'usd')
      if (!this.baseCurrency) {
        this.baseCurrency = baseCurrency;
      }

      const ratesForBase = value as ExchangeRate;

      // Convert nested structure to flat "FROM_TO" keys for internal storage
      for (const [targetCurrency, rate] of Object.entries(ratesForBase)) {
        const pair = `${baseCurrency}_${targetCurrency.toUpperCase()}`;
        this.exchangeRates.set(pair, rate);
      }
    }
  }

  /**
   * Convert currency value from one currency to another
   *
   * @param value The currency value to convert
   * @param targetCurrency Target currency code
   * @param round Whether to round to minor units (default: false for precision)
   * @returns Converted currency value
   * @throws Error if currencies are not found or conversion rate is unavailable
   */
  convert(value: CurrencyValue, targetCurrency: string, round: boolean = false): CurrencyValue {
    const fromCurrency = this.dataLoader.getCurrencyByCode(value.currencyCode);
    const toCurrency = this.dataLoader.getCurrencyByCode(targetCurrency);

    if (!fromCurrency) {
      throw new Error(`Currency not found: ${value.currencyCode}`);
    }

    if (!toCurrency) {
      throw new Error(`Currency not found: ${targetCurrency}`);
    }

    // If same currency, no conversion needed
    if (value.currencyCode === targetCurrency) {
      return value;
    }

    // Get exchange rate
    const rate = this.getExchangeRate(value.currencyCode, targetCurrency);

    if (rate === null) {
      throw new Error(
        `Exchange rate not available for ${value.currencyCode} → ${targetCurrency}`
      );
    }

    // Convert amount
    let convertedAmount = value.amount * rate;

    // Optionally round to appropriate decimal places for target currency
    if (round) {
      convertedAmount = this.roundToMinorUnits(convertedAmount, toCurrency);
    }

    return {
      amount: convertedAmount,
      currencyCode: targetCurrency
    };
  }

  /**
   * Get exchange rate between two currencies
   *
   * Supports both direct rates (USD_EUR) and indirect rates through base currency
   *
   * @param fromCurrency Source currency code
   * @param toCurrency Target currency code
   * @returns Exchange rate, or null if not available
   */
  getExchangeRate(fromCurrency: string, toCurrency: string): number | null {
    // Same currency
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    // Try direct rate
    const directKey = `${fromCurrency}_${toCurrency}`;
    if (this.exchangeRates.has(directKey)) {
      return this.exchangeRates.get(directKey)!;
    }

    // Try inverse rate
    const inverseKey = `${toCurrency}_${fromCurrency}`;
    if (this.exchangeRates.has(inverseKey)) {
      return 1 / this.exchangeRates.get(inverseKey)!;
    }

    // Try conversion through base currency
    // From → Base → To
    const fromToBaseKey = `${fromCurrency}_${this.baseCurrency}`;
    const baseToToKey = `${this.baseCurrency}_${toCurrency}`;

    let fromToBase: number | undefined;
    let baseToTo: number | undefined;

    // Get from → base rate
    if (fromCurrency === this.baseCurrency) {
      fromToBase = 1.0;
    } else if (this.exchangeRates.has(fromToBaseKey)) {
      fromToBase = this.exchangeRates.get(fromToBaseKey);
    } else {
      const baseToFromKey = `${this.baseCurrency}_${fromCurrency}`;
      if (this.exchangeRates.has(baseToFromKey)) {
        fromToBase = 1 / this.exchangeRates.get(baseToFromKey)!;
      }
    }

    // Get base → to rate
    if (toCurrency === this.baseCurrency) {
      baseToTo = 1.0;
    } else if (this.exchangeRates.has(baseToToKey)) {
      baseToTo = this.exchangeRates.get(baseToToKey);
    } else {
      const toToBaseKey = `${toCurrency}_${this.baseCurrency}`;
      if (this.exchangeRates.has(toToBaseKey)) {
        baseToTo = 1 / this.exchangeRates.get(toToBaseKey)!;
      }
    }

    if (fromToBase !== undefined && baseToTo !== undefined) {
      return fromToBase * baseToTo;
    }

    // No rate available
    return null;
  }

  /**
   * Round amount to the appropriate number of decimal places for a currency
   *
   * @param amount Amount to round
   * @param currency Currency information
   * @returns Rounded amount
   */
  roundToMinorUnits(amount: number, currency: UnambiguousCurrency): number {
    const factor = Math.pow(10, currency.minorUnits);
    return Math.round(amount * factor) / factor;
  }

  /**
   * Format currency amount with proper decimal places
   *
   * @param value Currency value
   * @returns Formatted string
   */
  format(value: CurrencyValue): string {
    const currency = this.dataLoader.getCurrencyByCode(value.currencyCode);

    if (!currency) {
      return `${value.amount} ${value.currencyCode}`;
    }

    const rounded = this.roundToMinorUnits(value.amount, currency);
    return `${rounded.toFixed(currency.minorUnits)} ${value.currencyCode}`;
  }

  /**
   * Get the base currency used for exchange rates
   */
  getBaseCurrency(): string {
    return this.baseCurrency;
  }

  /**
   * Get timestamp of last exchange rate update
   */
  getLastUpdate(): string {
    return this.lastUpdate;
  }

  /**
   * Check if exchange rate is available between two currencies
   *
   * @param fromCurrency Source currency code
   * @param toCurrency Target currency code
   * @returns true if conversion is possible
   */
  canConvert(fromCurrency: string, toCurrency: string): boolean {
    return this.getExchangeRate(fromCurrency, toCurrency) !== null;
  }

  /**
   * Get all available currency codes
   */
  getAvailableCurrencies(): string[] {
    const currencies = this.dataLoader.getAllUnambiguousCurrencies();
    return currencies.map(c => c.code);
  }
}

import units from "../data/units.json"
import currencies from "../data/currencies.json"
import timezones from "../data/timezones.json"

import type {
  Unit,
  Dimension,
  UnitsDatabase,
  UnambiguousCurrency,
  AmbiguousCurrency,
  CurrenciesDatabase,
  Timezone,
  TimezonesDatabase
} from '../types/types';

/**
 * TrieNode for efficient longest-match unit lookup
 */
class TrieNode {
  children: Map<string, TrieNode> = new Map();
  // Store all units that end at this node (may have multiple due to case variations)
  units: Unit[] = [];
  isEndOfUnit: boolean = false;
}

/**
 * Trie for longest-match unit lookup with case sensitivity support
 */
class UnitTrie {
  private root: TrieNode = new TrieNode();

  /**
   * Insert a unit name into the trie
   */
  insert(name: string, unit: Unit): void {
    let node = this.root;
    for (const char of name) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.isEndOfUnit = true;
    node.units.push(unit);
  }

  /**
   * Find the longest matching unit name starting from a position in the input
   * Returns the matched unit and the length of the match
   *
   * Matching algorithm:
   * 1. Try case-sensitive match first (highest priority)
   * 2. If no match, try case-insensitive match
   * 3. If multiple case-insensitive matches, pick the one with most matching case characters
   * 4. If tie on matching case count, use first match in the candidates list
   */
  findLongestMatch(input: string, startPos: number): { unit: Unit; length: number } | null {
    let longestMatch: { units: Unit[]; length: number } | null = null;
    let node = this.root;
    let currentLength = 0;

    // Try to match as many characters as possible
    for (let i = startPos; i < input.length; i++) {
      const char = input[i];

      if (!node.children.has(char)) {
        break;
      }

      node = node.children.get(char)!;
      currentLength++;

      if (node.isEndOfUnit && node.units.length > 0) {
        longestMatch = { units: node.units, length: currentLength };
      }
    }

    if (!longestMatch) {
      return null;
    }

    // If only one unit, return it
    if (longestMatch.units.length === 1) {
      return { unit: longestMatch.units[0], length: longestMatch.length };
    }

    // Multiple units at this position - apply tie-breaking rules
    const matchedText = input.substring(startPos, startPos + longestMatch.length);

    // First, try exact case-sensitive match
    for (const unit of longestMatch.units) {
      if (unit.names.includes(matchedText)) {
        return { unit, length: longestMatch.length };
      }
    }

    // No exact match - apply case-insensitive with character counting
    let bestUnit = longestMatch.units[0];
    let bestMatchingChars = 0;

    for (const unit of longestMatch.units) {
      // Find the name variant that matches case-insensitively
      const matchingName = unit.names.find(n =>
        n.toLowerCase() === matchedText.toLowerCase()
      );

      if (matchingName) {
        // Count matching case characters
        let matchingChars = 0;
        for (let i = 0; i < matchingName.length; i++) {
          if (matchingName[i] === matchedText[i]) {
            matchingChars++;
          }
        }

        if (matchingChars > bestMatchingChars) {
          bestMatchingChars = matchingChars;
          bestUnit = unit;
        }
      }
    }

    return { unit: bestUnit, length: longestMatch.length };
  }
}

/**
 * Timezone match with territory information
 */
interface TimezoneMatch {
  iana: string;
  territory?: string;
}

/**
 * Main data loader class
 * Loads units, currencies, and timezones from JSON files
 * Builds fast lookup structures and trie for unit matching
 */
export class DataLoader {
  // Units data
  private units: Unit[] = [];
  private dimensions: Dimension[] = [];

  // Fast lookup maps
  private unitById = new Map<string, Unit>();
  private unitTrie = new UnitTrie();
  private unitByCaseSensitiveName = new Map<string, Unit>();
  private unitByCaseInsensitiveName = new Map<string, Unit[]>();

  // Dimension lookup
  private dimensionById = new Map<string, Dimension>();

  // Currency data
  private unambiguousCurrencies: UnambiguousCurrency[] = [];
  private ambiguousCurrencies: {
    name: AmbiguousCurrency[];
    symbolAdjacent: AmbiguousCurrency[];
    symbolSpaced: AmbiguousCurrency[];
  } = { name: [], symbolAdjacent: [], symbolSpaced: [] };
  private currencyByCode = new Map<string, UnambiguousCurrency>();
  private currencyByCaseInsensitiveName = new Map<string, UnambiguousCurrency[]>();
  private currencyByAdjacentSymbol = new Map<string, UnambiguousCurrency>();
  private currencyBySpacedSymbol = new Map<string, UnambiguousCurrency>();
  private ambiguousCurrencyByAdjacentSymbol = new Map<string, AmbiguousCurrency>();
  private ambiguousCurrencyBySpacedSymbol = new Map<string, AmbiguousCurrency>();
  private ambiguousCurrencyByDimension = new Map<string, AmbiguousCurrency>();

  // Timezone data
  private timezones: Timezone[] = [];
  private timezoneByName = new Map<string, TimezoneMatch[]>();

  // User locale for timezone resolution
  private userLocale: string = 'en-US'; // Default, can be configured
  private userCountryCode: string = 'US'; // Extracted from locale

  /**
   * Load all data files
   */
  load(): void {
    this.loadUnits(units as UnitsDatabase);
    this.loadCurrencies(currencies as CurrenciesDatabase);
    this.loadTimezones(timezones as TimezonesDatabase);
  }

  /**
   * Set user locale for timezone disambiguation
   */
  setUserLocale(locale: string): void {
    this.userLocale = locale;
    // Extract country code from locale (e.g., "en-US" -> "US")
    const parts = locale.split('-');
    this.userCountryCode = parts.length > 1 ? parts[1].toUpperCase() : 'US';
  }

  /**
   * Load units from JSON file
   */
  private loadUnits(data: UnitsDatabase): void {
    this.dimensions = data.dimensions;
    this.units = data.units;

    // Build dimension lookup
    for (const dimension of this.dimensions) {
      this.dimensionById.set(dimension.id, dimension);
    }

    // Build unit lookups and trie
    for (const unit of this.units) {
      // By ID
      this.unitById.set(unit.id, unit);

      // Insert all name variants into the trie and lookup maps
      for (const name of unit.names) {
        // Insert into trie
        this.unitTrie.insert(name, unit);

        // Case-sensitive map
        this.unitByCaseSensitiveName.set(name, unit);

        // Case-insensitive map (can have multiple units)
        const lowerName = name.toLowerCase();
        if (!this.unitByCaseInsensitiveName.has(lowerName)) {
          this.unitByCaseInsensitiveName.set(lowerName, []);
        }
        const existing = this.unitByCaseInsensitiveName.get(lowerName)!;
        if (!existing.includes(unit)) {
          existing.push(unit);
        }
      }
    }
  }

  /**
   * Load currencies from JSON file
   */
  private loadCurrencies(data: CurrenciesDatabase): void {
    this.unambiguousCurrencies = data.unambiguous;
    this.ambiguousCurrencies = data.ambiguous;

    // Build currency lookups
    for (const currency of this.unambiguousCurrencies) {
      // By code (case-insensitive)
      this.currencyByCode.set(currency.code.toUpperCase(), currency);

      // By name variants (case-insensitive) - include names, symbolAdjacent, and symbolSpaced
      const allNames = [
        ...currency.names,
        ...currency.symbolAdjacent,
        ...currency.symbolSpaced,
      ];
      for (const name of allNames) {
        const lowerName = name.toLowerCase();
        if (!this.currencyByCaseInsensitiveName.has(lowerName)) {
          this.currencyByCaseInsensitiveName.set(lowerName, []);
        }
        const existing = this.currencyByCaseInsensitiveName.get(lowerName)!;
        if (!existing.includes(currency)) {
          existing.push(currency);
        }
      }

      // Build symbolAdjacent lookup (exact match, case-sensitive)
      for (const symbol of currency.symbolAdjacent) {
        this.currencyByAdjacentSymbol.set(symbol, currency);
      }

      // Build symbolSpaced lookup (exact match, case-sensitive)
      for (const symbol of currency.symbolSpaced) {
        this.currencyBySpacedSymbol.set(symbol, currency);
      }
    }

    // Build ambiguous currency lookups
    for (const ambiguous of this.ambiguousCurrencies.symbolAdjacent) {
      this.ambiguousCurrencyByAdjacentSymbol.set(ambiguous.symbol, ambiguous);
      this.ambiguousCurrencyByDimension.set(ambiguous.dimension, ambiguous);
    }
    for (const ambiguous of this.ambiguousCurrencies.symbolSpaced) {
      this.ambiguousCurrencyBySpacedSymbol.set(ambiguous.symbol, ambiguous);
      this.ambiguousCurrencyByDimension.set(ambiguous.dimension, ambiguous);
    }
  }

  /**
   * Load timezones from JSON file
   */
  private loadTimezones(data: TimezonesDatabase): void {
    this.timezones = data.timezones;

    // Build timezone lookup with territory support
    for (const timezone of this.timezones) {
      // First, add the IANA identifier itself as a name
      const ianaLower = timezone.iana.toLowerCase();
      if (!this.timezoneByName.has(ianaLower)) {
        this.timezoneByName.set(ianaLower, []);
      }
      this.timezoneByName.get(ianaLower)!.push({
        iana: timezone.iana,
        territory: undefined // IANA names don't have territories
      });

      // Then add all the alternative names
      for (const nameObj of timezone.names) {
        const lowerName = nameObj.name.toLowerCase();

        if (!this.timezoneByName.has(lowerName)) {
          this.timezoneByName.set(lowerName, []);
        }

        this.timezoneByName.get(lowerName)!.push({
          iana: timezone.iana,
          territory: nameObj.territory
        });
      }
    }
  }

  /**
   * Find longest matching unit starting from a position in input
   */
  findLongestUnitMatch(input: string, startPos: number): { unit: Unit; length: number } | null {
    return this.unitTrie.findLongestMatch(input, startPos);
  }

  /**
   * Get unit by ID
   */
  getUnitById(id: string): Unit | undefined {
    return this.unitById.get(id);
  }

  /**
   * Get unit by exact name (case-sensitive)
   */
  getUnitByName(name: string): Unit | undefined {
    return this.unitByCaseSensitiveName.get(name);
  }

  /**
   * Get units by case-insensitive name (may return multiple)
   */
  getUnitsByCaseInsensitiveName(name: string): Unit[] {
    return this.unitByCaseInsensitiveName.get(name.toLowerCase()) || [];
  }

  /**
   * Get dimension by ID
   */
  getDimensionById(id: string): Dimension | undefined {
    return this.dimensionById.get(id);
  }

  /**
   * Get all dimensions
   */
  getAllDimensions(): Dimension[] {
    return this.dimensions;
  }

  /**
   * Get all units
   */
  getAllUnits(): Unit[] {
    return this.units;
  }

  /**
   * Get currency by code (case-insensitive)
   */
  getCurrencyByCode(code: string): UnambiguousCurrency | undefined {
    return this.currencyByCode.get(code.toUpperCase());
  }

  /**
   * Get currencies by name (case-insensitive, may return multiple)
   */
  getCurrenciesByName(name: string): UnambiguousCurrency[] {
    return this.currencyByCaseInsensitiveName.get(name.toLowerCase()) || [];
  }

  /**
   * Get all unambiguous currencies
   */
  getAllUnambiguousCurrencies(): UnambiguousCurrency[] {
    return this.unambiguousCurrencies;
  }

  /**
   * Get all ambiguous currencies
   */
  getAllAmbiguousCurrencies(): {
    name: AmbiguousCurrency[];
    symbolAdjacent: AmbiguousCurrency[];
    symbolSpaced: AmbiguousCurrency[];
  } {
    return this.ambiguousCurrencies;
  }

  /**
   * Get unambiguous currency by adjacent symbol (exact match, case-sensitive)
   * Adjacent symbols go before the number with no space: US$100, €100, CA$100
   */
  getCurrencyByAdjacentSymbol(symbol: string): UnambiguousCurrency | undefined {
    return this.currencyByAdjacentSymbol.get(symbol);
  }

  /**
   * Get unambiguous currency by spaced symbol (exact match, case-sensitive)
   * Spaced symbols go before the number with a space: USD 100, EUR 50, Kč 100
   */
  getCurrencyBySpacedSymbol(symbol: string): UnambiguousCurrency | undefined {
    return this.currencyBySpacedSymbol.get(symbol);
  }

  /**
   * Get ambiguous currency by adjacent symbol (exact match, case-sensitive)
   * Returns the dimension code for ambiguous currency symbols like $, £, ¥
   */
  getAmbiguousCurrencyByAdjacentSymbol(symbol: string): AmbiguousCurrency | undefined {
    return this.ambiguousCurrencyByAdjacentSymbol.get(symbol);
  }

  /**
   * Get ambiguous currency by spaced symbol (exact match, case-sensitive)
   * Returns the dimension code for ambiguous currency symbols
   */
  getAmbiguousCurrencyBySpacedSymbol(symbol: string): AmbiguousCurrency | undefined {
    return this.ambiguousCurrencyBySpacedSymbol.get(symbol);
  }

  /**
   * Get ambiguous currency by dimension ID (e.g., "currency_symbol_0024" for "$")
   * Used by parser to resolve ambiguous currency dimensions to their symbols
   */
  getAmbiguousCurrencyByDimension(dimension: string): AmbiguousCurrency | undefined {
    return this.ambiguousCurrencyByDimension.get(dimension);
  }

  /**
   * Resolve timezone name to IANA timezone using territory-based disambiguation
   *
   * Priority:
   * 1. Match entries where territory equals user's country code
   * 2. Match entries where territory is "001" (universal/world)
   * 3. Match entries where territory is undefined
   * 4. If multiple matches at same priority, use first match
   */
  resolveTimezone(name: string): string | undefined {
    const matches = this.timezoneByName.get(name.toLowerCase());

    if (!matches || matches.length === 0) {
      return undefined;
    }

    if (matches.length === 1) {
      return matches[0].iana;
    }

    // Priority 1: User's country code
    const countryMatches = matches.filter(m => m.territory === this.userCountryCode);
    if (countryMatches.length > 0) {
      return countryMatches[0].iana;
    }

    // Priority 2: Universal (001)
    const universalMatches = matches.filter(m => m.territory === '001');
    if (universalMatches.length > 0) {
      return universalMatches[0].iana;
    }

    // Priority 3: Undefined territory
    const undefinedMatches = matches.filter(m => !m.territory);
    if (undefinedMatches.length > 0) {
      return undefinedMatches[0].iana;
    }

    // Fallback: first match
    return matches[0].iana;
  }

  /**
   * Get all timezone matches for a name (for debugging/UI)
   */
  getTimezoneMatches(name: string): TimezoneMatch[] {
    return this.timezoneByName.get(name.toLowerCase()) || [];
  }
}

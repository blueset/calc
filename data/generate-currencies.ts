/**
 * Script to generate currencies.json for the notepad calculator
 * Run with: npx ts-node generate-currencies.ts
 *
 * Requires CLDR_PATH environment variable pointing to CLDR database root
 */

import * as fs from "fs";
import * as path from "path";
import { XMLParser } from "fast-xml-parser";

// ============================================================================
// Type Definitions (from types.ts)
// ============================================================================

interface DisplayName {
  symbol: string;
  singular: string;
  plural?: string;
}

interface CurrenciesDatabase {
  unambiguous: UnambiguousCurrency[];
  ambiguous: AmbiguousCurrency[];
}

interface UnambiguousCurrency {
  code: string;
  minorUnits: number;
  displayName: Pick<DisplayName, "singular" | "plural">;
  names: string[];
}

interface AmbiguousCurrency {
  symbol: string;
  dimension: string;
}

// ============================================================================
// XML Parser Configuration
// ============================================================================

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  isArray: (name) => name === "id" || name === "currency" || name === "displayName" || name === "symbol",
});

// ============================================================================
// Helper Functions
// ============================================================================

function readXmlFile(filePath: string): any {
  const content = fs.readFileSync(filePath, "utf-8");
  return xmlParser.parse(content);
}

function getCldrPath(): string {
  const cldrPath = process.env.CLDR_PATH;
  if (!cldrPath) {
    throw new Error("CLDR_PATH environment variable is not set");
  }
  if (!fs.existsSync(cldrPath)) {
    throw new Error(`CLDR_PATH does not exist: ${cldrPath}`);
  }
  return cldrPath;
}

// ============================================================================
// Step 1: Load Currency Scope from validity/currency.xml
// ============================================================================

function loadCurrencyScope(cldrPath: string): Set<string> {
  const validityPath = path.join(cldrPath, "common", "validity", "currency.xml");
  const xml = readXmlFile(validityPath);

  const currencies = new Set<string>();

  const idStatusElements = xml?.supplementalData?.idValidity?.id;
  if (!idStatusElements) {
    throw new Error("Could not find id elements in currency.xml");
  }

  for (const idElement of idStatusElements) {
    if (idElement["@_idStatus"] === "regular") {
      const text = idElement["#text"] as string;
      // Parse space-separated currency codes, handling ranges like "AAA~AAZ"
      const tokens = text.trim().split(/\s+/);
      for (const token of tokens) {
        if (token.includes("~")) {
          // Range like "XBA~XBD"
          const [start, end] = token.split("~");
          const startCode = start.charCodeAt(2);
          const endCode = end.charCodeAt(2);
          for (let i = startCode; i <= endCode; i++) {
            currencies.add(start.slice(0, 2) + String.fromCharCode(i));
          }
        } else if (token.length === 3) {
          currencies.add(token);
        }
      }
    }
  }

  console.log(`Loaded ${currencies.size} regular currencies from validity/currency.xml`);
  return currencies;
}

// ============================================================================
// Step 2: Fetch Minor Units from ISO 4217 CSV
// ============================================================================

async function fetchMinorUnits(): Promise<Map<string, number>> {
  const url = "https://raw.githubusercontent.com/datasets/currency-codes/refs/heads/main/data/codes-all.csv";

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ISO 4217 CSV: ${response.status}`);
  }

  const csvText = await response.text();
  const lines = csvText.split("\n");

  // Parse header to find column indices
  const header = parseCSVLine(lines[0]);
  const codeIndex = header.indexOf("AlphabeticCode");
  const minorUnitIndex = header.indexOf("MinorUnit");

  if (codeIndex === -1 || minorUnitIndex === -1) {
    throw new Error("Could not find required columns in ISO 4217 CSV");
  }

  const minorUnits = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    const code = fields[codeIndex];
    const minorUnit = fields[minorUnitIndex];

    if (code && code.length === 3) {
      if (minorUnit === "N.A." || minorUnit === "") {
        minorUnits.set(code, 0);
      } else {
        const parsed = parseInt(minorUnit, 10);
        if (!isNaN(parsed)) {
          minorUnits.set(code, parsed);
        }
      }
    }
  }

  console.log(`Loaded ${minorUnits.size} minor units from ISO 4217 CSV`);
  return minorUnits;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ============================================================================
// Step 3: Load Display Names from en_001.xml / en.xml
// ============================================================================

interface DisplayNameResult {
  singular: string;
  plural?: string;
}

function loadDisplayNames(
  cldrPath: string,
  currencyCodes: Set<string>
): Map<string, DisplayNameResult> {
  const mainPath = path.join(cldrPath, "common", "main");
  const en001Path = path.join(mainPath, "en_001.xml");
  const enPath = path.join(mainPath, "en.xml");

  const en001Xml = fs.existsSync(en001Path) ? readXmlFile(en001Path) : null;
  const enXml = fs.existsSync(enPath) ? readXmlFile(enPath) : null;

  const displayNames = new Map<string, DisplayNameResult>();

  for (const code of currencyCodes) {
    const result = getDisplayNameFromXml(en001Xml, code) ?? getDisplayNameFromXml(enXml, code);
    if (result) {
      displayNames.set(code, result);
    } else {
      // Fallback to code itself
      displayNames.set(code, { singular: code });
    }
  }

  console.log(`Loaded display names for ${displayNames.size} currencies`);
  return displayNames;
}

function getDisplayNameFromXml(xml: any, code: string): DisplayNameResult | null {
  if (!xml) return null;

  const currencies = xml?.ldml?.numbers?.currencies?.currency;
  if (!currencies) return null;

  const currencyElement = currencies.find((c: any) => c["@_type"] === code);
  if (!currencyElement) return null;

  const displayNameElements = currencyElement.displayName;
  if (!displayNameElements) return null;

  let singular: string | undefined;
  let plural: string | undefined;

  for (const dn of displayNameElements) {
    const count = dn["@_count"];
    const text = typeof dn === "string" ? dn : dn["#text"];

    if (count === "one") {
      singular = text;
    } else if (count === "other") {
      plural = text;
    }
  }

  if (singular || plural) {
    return { singular: singular ?? plural!, plural };
  }
  return null;
}

// ============================================================================
// Step 4: Collect All Names/Symbols from en*.xml and root.xml
// ============================================================================

function collectAllNames(
  cldrPath: string,
  currencyCodes: Set<string>
): Map<string, Set<string>> {
  const mainPath = path.join(cldrPath, "common", "main");

  // Find all en*.xml files and root.xml
  const files = fs.readdirSync(mainPath);
  const targetFiles = files.filter(
    (f) => ((f.startsWith("en") && f.endsWith(".xml")) || f === "root.xml") && f !== "en_Shaw.xml"
  );

  const currencyNames = new Map<string, Set<string>>();
  for (const code of currencyCodes) {
    currencyNames.set(code, new Set<string>());
  }

  for (const file of targetFiles) {
    const filePath = path.join(mainPath, file);
    try {
      const xml = readXmlFile(filePath);
      extractNamesFromXml(xml, currencyCodes, currencyNames);
    } catch (e) {
      console.warn(`Warning: Could not parse ${file}: ${e}`);
    }
  }

  // Count total names collected
  let totalNames = 0;
  for (const names of currencyNames.values()) {
    totalNames += names.size;
  }
  console.log(`Collected ${totalNames} total names from ${targetFiles.length} files`);

  return currencyNames;
}

function extractNamesFromXml(
  xml: any,
  currencyCodes: Set<string>,
  currencyNames: Map<string, Set<string>>
): void {
  const currencies = xml?.ldml?.numbers?.currencies?.currency;
  if (!currencies) return;

  for (const currencyElement of currencies) {
    const code = currencyElement["@_type"];
    if (!currencyCodes.has(code)) continue;

    const names = currencyNames.get(code)!;

    // Collect displayName elements
    const displayNameElements = currencyElement.displayName;
    if (displayNameElements) {
      for (const dn of displayNameElements) {
        const text = typeof dn === "string" ? dn : dn["#text"];
        if (text && typeof text === "string") {
          names.add(text);
        }
      }
    }

    // Collect symbol elements
    const symbolElements = currencyElement.symbol;
    if (symbolElements) {
      for (const sym of symbolElements) {
        const text = typeof sym === "string" ? sym : sym["#text"];
        if (text && typeof text === "string") {
          names.add(text);
        }
      }
    }
  }
}

// ============================================================================
// Step 5: Detect and Separate Ambiguous Names
// ============================================================================

interface AmbiguityResult {
  unambiguousNames: Map<string, string[]>; // code -> unique names
  ambiguousSymbols: Set<string>; // symbols appearing in multiple currencies
}

function detectAmbiguousNames(
  currencyNames: Map<string, Set<string>>
): AmbiguityResult {
  // Build reverse map: name (lowercase) -> set of currency codes
  const nameToCodeMap = new Map<string, Set<string>>();
  const nameOriginalCase = new Map<string, string>(); // lowercase -> original

  for (const [code, names] of currencyNames) {
    for (const name of names) {
      const lower = name.toLowerCase();
      if (!nameToCodeMap.has(lower)) {
        nameToCodeMap.set(lower, new Set());
        nameOriginalCase.set(lower, name);
      }
      nameToCodeMap.get(lower)!.add(code);
    }
  }

  // Separate ambiguous from unambiguous
  const ambiguousSymbols = new Set<string>();
  const unambiguousNames = new Map<string, string[]>();

  for (const [code, names] of currencyNames) {
    const uniqueNames: string[] = [];
    const seenLower = new Set<string>();

    for (const name of names) {
      const lower = name.toLowerCase();
      if (seenLower.has(lower)) continue;
      seenLower.add(lower);

      const codesWithThisName = nameToCodeMap.get(lower)!;
      if (codesWithThisName.size > 1) {
        // Ambiguous - appears in multiple currencies
        ambiguousSymbols.add(nameOriginalCase.get(lower)!);
      } else {
        // Unique to this currency
        uniqueNames.push(name);
      }
    }

    unambiguousNames.set(code, uniqueNames);
  }

  console.log(`Found ${ambiguousSymbols.size} ambiguous symbols`);
  return { unambiguousNames, ambiguousSymbols };
}

// ============================================================================
// Step 6: Add Unicode Sc Category Symbols
// ============================================================================

// Unicode currency symbols (Sc category) from Unicode 17.0
const UNICODE_CURRENCY_SYMBOLS = [
  "\u0024", // $ DOLLAR SIGN
  "\u00A2", // ¢ CENT SIGN
  "\u00A3", // £ POUND SIGN
  "\u00A4", // ¤ CURRENCY SIGN
  "\u00A5", // ¥ YEN SIGN
  "\u058F", // ֏ ARMENIAN DRAM SIGN
  "\u060B", // ؋ AFGHANI SIGN
  "\u07FE", // ߾ NKO DOROME SIGN
  "\u07FF", // ߿ NKO TAMAN SIGN
  "\u09F2", // ৲ BENGALI RUPEE MARK
  "\u09F3", // ৳ BENGALI RUPEE SIGN
  "\u09FB", // ৻ BENGALI GANDA MARK
  "\u0AF1", // ૱ GUJARATI RUPEE SIGN
  "\u0BF9", // ௹ TAMIL RUPEE SIGN
  "\u0E3F", // ฿ THAI CURRENCY SYMBOL BAHT
  "\u17DB", // ៛ KHMER CURRENCY SYMBOL RIEL
  "\u20A0", // ₠ EURO-CURRENCY SIGN
  "\u20A1", // ₡ COLON SIGN
  "\u20A2", // ₢ CRUZEIRO SIGN
  "\u20A3", // ₣ FRENCH FRANC SIGN
  "\u20A4", // ₤ LIRA SIGN
  "\u20A5", // ₥ MILL SIGN
  "\u20A6", // ₦ NAIRA SIGN
  "\u20A7", // ₧ PESETA SIGN
  "\u20A8", // ₨ RUPEE SIGN
  "\u20A9", // ₩ WON SIGN
  "\u20AA", // ₪ NEW SHEQEL SIGN
  "\u20AB", // ₫ DONG SIGN
  "\u20AC", // € EURO SIGN
  "\u20AD", // ₭ KIP SIGN
  "\u20AE", // ₮ TUGRIK SIGN
  "\u20AF", // ₯ DRACHMA SIGN
  "\u20B0", // ₰ GERMAN PENNY SIGN
  "\u20B1", // ₱ PESO SIGN
  "\u20B2", // ₲ GUARANI SIGN
  "\u20B3", // ₳ AUSTRAL SIGN
  "\u20B4", // ₴ HRYVNIA SIGN
  "\u20B5", // ₵ CEDI SIGN
  "\u20B6", // ₶ LIVRE TOURNOIS SIGN
  "\u20B7", // ₷ SPESMILO SIGN
  "\u20B8", // ₸ TENGE SIGN
  "\u20B9", // ₹ INDIAN RUPEE SIGN
  "\u20BA", // ₺ TURKISH LIRA SIGN
  "\u20BB", // ₻ NORDIC MARK SIGN
  "\u20BC", // ₼ MANAT SIGN
  "\u20BD", // ₽ RUBLE SIGN
  "\u20BE", // ₾ LARI SIGN
  "\u20BF", // ₿ BITCOIN SIGN
  "\u20C0", // ⃀ SOM SIGN
  "\u20C1", // ⃁ SAUDI RIYAL SIGN
  "\uA838", // ꠸ NORTH INDIC RUPEE MARK
  "\uFDFC", // ﷼ RIAL SIGN
  "\uFE69", // ﹩ SMALL DOLLAR SIGN
  "\uFF04", // $ FULLWIDTH DOLLAR SIGN
  "\uFFE0", // ¢ FULLWIDTH CENT SIGN
  "\uFFE1", // £ FULLWIDTH POUND SIGN
  "\uFFE5", // ¥ FULLWIDTH YEN SIGN
  "\uFFE6", // ₩ FULLWIDTH WON SIGN
  // Supplementary characters (beyond BMP)
  "\u{11FDD}", // 𑿝 TAMIL SIGN KAACU
  "\u{11FDE}", // 𑿞 TAMIL SIGN PANAM
  "\u{11FDF}", // 𑿟 TAMIL SIGN PON
  "\u{11FE0}", // 𑿠 TAMIL SIGN VARAAKAN
  "\u{1E2FF}", // 𞋿 WANCHO NGUN SIGN
  "\u{1ECB0}", // 𞲰 INDIC SIYAQ RUPEE MARK
];

function addUnicodeCurrencySymbols(
  ambiguousSymbols: Set<string>,
  unambiguousNames: Map<string, string[]>
): void {
  // Build set of all existing symbols (from both ambiguous and unambiguous)
  const existingSymbols = new Set<string>();

  for (const sym of ambiguousSymbols) {
    existingSymbols.add(sym);
  }

  for (const names of unambiguousNames.values()) {
    for (const name of names) {
      existingSymbols.add(name);
    }
  }

  // Add missing Unicode currency symbols to ambiguous
  let added = 0;
  for (const symbol of UNICODE_CURRENCY_SYMBOLS) {
    if (!existingSymbols.has(symbol)) {
      ambiguousSymbols.add(symbol);
      added++;
    }
  }

  console.log(`Added ${added} Unicode currency symbols to ambiguous list`);
}

// ============================================================================
// Step 7: Generate and Write currencies.json
// ============================================================================

function generateDatabase(
  currencyCodes: Set<string>,
  minorUnits: Map<string, number>,
  displayNames: Map<string, DisplayNameResult>,
  unambiguousNames: Map<string, string[]>,
  ambiguousSymbols: Set<string>
): CurrenciesDatabase {
  const unambiguous: UnambiguousCurrency[] = [];

  for (const code of Array.from(currencyCodes).sort()) {
    const displayName = displayNames.get(code) ?? { singular: code };
    const names = unambiguousNames.get(code) ?? [];
    const minor = minorUnits.get(code) ?? 0;

    unambiguous.push({
      code,
      minorUnits: minor,
      displayName: {
        singular: displayName.singular,
        plural: displayName.plural,
      },
      names,
    });
  }

  const ambiguous: AmbiguousCurrency[] = [];
  for (const symbol of Array.from(ambiguousSymbols).sort()) {
    // Generate dimension ID from all codepoints in the symbol
    const codepoints = [...symbol].map((char) => {
      const cp = char.codePointAt(0)!;
      return cp.toString(16).toUpperCase().padStart(4, "0");
    });
    const dimension = `currency_symbol_${codepoints.join("_")}`;
    ambiguous.push({ symbol, dimension });
  }

  return { unambiguous, ambiguous };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log("Generating currencies.json...\n");

  const cldrPath = getCldrPath();
  console.log(`Using CLDR path: ${cldrPath}\n`);

  // Step 1: Load currency scope
  const currencyCodes = loadCurrencyScope(cldrPath);

  // Step 2: Fetch minor units
  const minorUnits = await fetchMinorUnits();

  // Step 3: Load display names
  const displayNames = loadDisplayNames(cldrPath, currencyCodes);

  // Step 4: Collect all names
  const currencyNames = collectAllNames(cldrPath, currencyCodes);

  // Step 5: Detect ambiguous names
  const { unambiguousNames, ambiguousSymbols } = detectAmbiguousNames(currencyNames);

  // Step 6: Add Unicode currency symbols
  addUnicodeCurrencySymbols(ambiguousSymbols, unambiguousNames);

  // Step 7: Generate database
  const database = generateDatabase(
    currencyCodes,
    minorUnits,
    displayNames,
    unambiguousNames,
    ambiguousSymbols
  );

  // Write output
  const outputPath = path.join(__dirname, "currencies.json");
  fs.writeFileSync(outputPath, JSON.stringify(database, null, 2), "utf-8");

  console.log(`\nWrote ${outputPath}`);
  console.log(`  - ${database.unambiguous.length} unambiguous currencies`);
  console.log(`  - ${database.ambiguous.length} ambiguous symbols`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});

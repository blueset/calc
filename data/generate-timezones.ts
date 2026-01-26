import * as fs from "fs";
import * as path from "path";
import tzdata from "tzdata";
import { XMLParser } from "fast-xml-parser";

interface Timezone {
  iana: string;
  names: TimezoneName[];
}

interface TimezoneName {
  name: string;
  territory?: string;
}

interface TimezonesDatabase {
  timezones: Timezone[];
}

// Verify environment variables
const CLDR_PATH = process.env.CLDR_PATH;
const TZDATA_PATH = process.env.TZDATA_PATH;
const CITIES_15000 = process.env.CITIES_15000;

if (!CLDR_PATH || !TZDATA_PATH || !CITIES_15000) {
  console.error("Missing environment variables:");
  if (!CLDR_PATH) console.error("  CLDR_PATH not set");
  if (!TZDATA_PATH) console.error("  TZDATA_PATH not set");
  if (!CITIES_15000) console.error("  CITIES_15000 not set");
  process.exit(1);
}

// XML Parser setup
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseAttributeValue: false,
});

// Step 1: Extract canonical timezones and aliases from tzdata
function extractCanonicalTimezones(): {
  canonical: Set<string>;
  aliases: Map<string, string>;
} {
  const canonical = new Set<string>();
  const aliases = new Map<string, string>();

  for (const [tz, data] of Object.entries(tzdata.zones)) {
    if (typeof data === "string") {
      // This is an alias pointing to the canonical zone
      aliases.set(tz, data);
    } else {
      // This is a canonical zone
      canonical.add(tz);
    }
  }

  return { canonical, aliases };
}

// Step 2: Parse CLDR timezone.xml for IANA timezone aliases
function parseCLDRTimezoneAliases(): Map<string, string> {
  const timezonePath = path.join(CLDR_PATH!, "common", "bcp47", "timezone.xml");
  const xmlContent = fs.readFileSync(timezonePath, "utf-8");
  const parsed = parser.parse(xmlContent);

  const tzAliasMap = new Map<string, string>();
  const types = parsed.ldmlBCP47.keyword.key.type;

  for (const type of Array.isArray(types) ? types : [types]) {
    const iana = type["@_iana"];
    const alias = type["@_alias"];

    if (iana && alias) {
      // The alias might be space-delimited list
      const aliases = alias.split(/\s+/);
      const cldrId = aliases[0]; // First alias is the CLDR identifier

      // Map IANA timezone to CLDR identifier
      tzAliasMap.set(iana, cldrId);

      // Also map all aliases to the CLDR identifier
      for (const a of aliases) {
        tzAliasMap.set(a, cldrId);
      }
    }
  }

  return tzAliasMap;
}

// Step 3: Parse metaZones.xml
interface MetazoneMapping {
  metazone: string;
  from?: string;
  to?: string;
}

interface MapZone {
  metazone: string;
  territory: string;
  type: string; // IANA timezone
}

function parseMetaZones(): {
  timezoneToMetazone: Map<string, MetazoneMapping[]>;
  metazoneToTimezone: Map<string, MapZone[]>;
  primaryZones: Map<string, string>; // timezone -> territory
} {
  const metaZonesPath = path.join(
    CLDR_PATH!,
    "common",
    "supplemental",
    "metaZones.xml"
  );
  const xmlContent = fs.readFileSync(metaZonesPath, "utf-8");
  const parsed = parser.parse(xmlContent);

  const timezoneToMetazone = new Map<string, MetazoneMapping[]>();
  const metazoneToTimezone = new Map<string, MapZone[]>();
  const primaryZones = new Map<string, string>();

  // Parse timezone -> metazone mappings (usesMetazone)
  const metazoneInfo = parsed.supplementalData.metaZones.metazoneInfo;
  if (metazoneInfo && metazoneInfo.timezone) {
    const timezones = Array.isArray(metazoneInfo.timezone)
      ? metazoneInfo.timezone
      : [metazoneInfo.timezone];

    for (const tz of timezones) {
      const tzName = tz["@_type"];
      const usesMetazone = Array.isArray(tz.usesMetazone)
        ? tz.usesMetazone
        : [tz.usesMetazone];

      const mappings: MetazoneMapping[] = [];
      for (const um of usesMetazone) {
        if (um) {
          mappings.push({
            metazone: um["@_mzone"],
            from: um["@_from"],
            to: um["@_to"],
          });
        }
      }

      timezoneToMetazone.set(tzName, mappings);
    }
  }

  // Parse metazone -> timezone mappings (mapZone)
  const mapTimezones = parsed.supplementalData.metaZones.mapTimezones;
  if (mapTimezones && mapTimezones.mapZone) {
    const mapZones = Array.isArray(mapTimezones.mapZone)
      ? mapTimezones.mapZone
      : [mapTimezones.mapZone];

    for (const mz of mapZones) {
      const metazone = mz["@_other"];
      const territory = mz["@_territory"];
      const type = mz["@_type"];

      if (!metazoneToTimezone.has(metazone)) {
        metazoneToTimezone.set(metazone, []);
      }
      metazoneToTimezone.get(metazone)!.push({ metazone, territory, type });
    }
  }

  // Parse primaryZone elements
  const primaryZonesData = parsed.supplementalData.primaryZones;
  if (primaryZonesData && primaryZonesData.primaryZone) {
    const primaryZoneArray = Array.isArray(primaryZonesData.primaryZone)
      ? primaryZonesData.primaryZone
      : [primaryZonesData.primaryZone];

    for (const pz of primaryZoneArray) {
      if (pz) {
        const territory = pz["@_iso3166"];
        const timezone = pz["#text"] || pz;
        if (territory && timezone) {
          primaryZones.set(timezone, territory);
        }
      }
    }
  }

  return { timezoneToMetazone, metazoneToTimezone, primaryZones };
}

// Helper: Get latest metazone for a timezone
function getLatestMetazone(
  tz: string,
  timezoneToMetazone: Map<string, MetazoneMapping[]>,
  aliases: Map<string, string>
): string | null {
  // First check the canonical timezone
  let mappings = timezoneToMetazone.get(tz);

  // If no mappings found, check aliases
  if (!mappings || mappings.length === 0) {
    for (const [aliasName, canonicalName] of aliases.entries()) {
      if (canonicalName === tz) {
        mappings = timezoneToMetazone.get(aliasName);
        if (mappings && mappings.length > 0) {
          break;
        }
      }
    }
  }

  if (!mappings || mappings.length === 0) return null;

  // Find the one without 'to' property (current/latest)
  const latest = mappings.find((m) => !m.to);
  return latest ? latest.metazone : mappings[mappings.length - 1].metazone;
}

// Step 4: Extract exemplar city names from en*.xml files
function extractExemplarCities(): Map<string, string> {
  const exemplarCities = new Map<string, string>();
  const mainPath = path.join(CLDR_PATH!, "common", "main");

  // Get all en*.xml files except en_Shaw.xml and en_Dsrt.xml
  const files = fs.readdirSync(mainPath).filter((f) => {
    return (
      f.startsWith("en") &&
      f.endsWith(".xml") &&
      f !== "en_Shaw.xml" &&
      f !== "en_Dsrt.xml"
    );
  });

  for (const file of files) {
    const filePath = path.join(mainPath, file);
    const xmlContent = fs.readFileSync(filePath, "utf-8");
    const parsed = parser.parse(xmlContent);

    const dates = parsed.ldml?.dates;
    if (!dates) continue;

    const timeZoneNames = dates.timeZoneNames;
    if (!timeZoneNames?.zone) continue;

    const zones = Array.isArray(timeZoneNames.zone)
      ? timeZoneNames.zone
      : [timeZoneNames.zone];

    for (const zone of zones) {
      const zoneType = zone["@_type"];
      if (!zoneType) continue;

      // Look for exemplarCity
      if (zone.exemplarCity) {
        const cityName =
          typeof zone.exemplarCity === "string"
            ? zone.exemplarCity
            : zone.exemplarCity["#text"];
        if (cityName && cityName !== "∅∅∅") {
          exemplarCities.set(zoneType, cityName);
        }
      }
    }
  }

  return exemplarCities;
}

// Step 5: Extract zone names and metazone names from en*.xml files
interface ZoneNames {
  long?: {
    generic?: string;
    standard?: string;
    daylight?: string;
  };
  short?: {
    generic?: string;
    standard?: string;
    daylight?: string;
  };
}

function extractZoneAndMetazoneNames(): {
  zoneNames: Map<string, Map<string, ZoneNames>>; // iana -> locale -> names
  metazoneNames: Map<string, Map<string, ZoneNames>>; // metazone -> locale -> names
} {
  const zoneNames = new Map<string, Map<string, ZoneNames>>();
  const metazoneNames = new Map<string, Map<string, ZoneNames>>();
  const mainPath = path.join(CLDR_PATH!, "common", "main");

  const files = fs.readdirSync(mainPath).filter((f) => {
    return (
      f.startsWith("en") &&
      f.endsWith(".xml") &&
      f !== "en_Shaw.xml" &&
      f !== "en_Dsrt.xml"
    );
  });

  for (const file of files) {
    const locale = file.replace(".xml", "");
    const filePath = path.join(mainPath, file);
    const xmlContent = fs.readFileSync(filePath, "utf-8");
    const parsed = parser.parse(xmlContent);

    const dates = parsed.ldml?.dates;
    if (!dates) continue;

    const timeZoneNames = dates.timeZoneNames;
    if (!timeZoneNames) continue;

    // Extract zone names
    if (timeZoneNames.zone) {
      const zones = Array.isArray(timeZoneNames.zone)
        ? timeZoneNames.zone
        : [timeZoneNames.zone];

      for (const zone of zones) {
        const zoneType = zone["@_type"];
        if (!zoneType) continue;

        if (!zoneNames.has(zoneType)) {
          zoneNames.set(zoneType, new Map());
        }

        const names: ZoneNames = {};
        if (zone.long) {
          names.long = extractNameSet(zone.long);
        }
        if (zone.short) {
          names.short = extractNameSet(zone.short);
        }

        if (Object.keys(names).length > 0) {
          zoneNames.get(zoneType)!.set(locale, names);
        }
      }
    }

    // Extract metazone names
    if (timeZoneNames.metazone) {
      const metazones = Array.isArray(timeZoneNames.metazone)
        ? timeZoneNames.metazone
        : [timeZoneNames.metazone];

      for (const metazone of metazones) {
        const metazoneType = metazone["@_type"];
        if (!metazoneType) continue;

        if (!metazoneNames.has(metazoneType)) {
          metazoneNames.set(metazoneType, new Map());
        }

        const names: ZoneNames = {};
        if (metazone.long) {
          names.long = extractNameSet(metazone.long);
        }
        if (metazone.short) {
          names.short = extractNameSet(metazone.short);
        }

        // Handle special case for "Hawaii"
        if (metazoneType === "Hawaii") {
          if (names.long?.standard) {
            names.long.standard = names.long.standard.replace("Hawaii-Aleutian Standard Time", "Hawaii Standard Time");
          }
        }

        if (Object.keys(names).length > 0) {
          metazoneNames.get(metazoneType)!.set(locale, names);
        }
      }
    }
  }

  return { zoneNames, metazoneNames };
}

function extractNameSet(nameSet: any): {
  generic?: string;
  standard?: string;
  daylight?: string;
} {
  const result: any = {};

  if (nameSet.generic) {
    const val =
      typeof nameSet.generic === "string"
        ? nameSet.generic
        : nameSet.generic["#text"];
    if (val && val !== "∅∅∅") {
      result.generic = val;
    }
  }

  if (nameSet.standard) {
    const val =
      typeof nameSet.standard === "string"
        ? nameSet.standard
        : nameSet.standard["#text"];
    if (val && val !== "∅∅∅") {
      result.standard = val;
    }
  }

  if (nameSet.daylight) {
    const val =
      typeof nameSet.daylight === "string"
        ? nameSet.daylight
        : nameSet.daylight["#text"];
    if (val && val !== "∅∅∅") {
      result.daylight = val;
    }
  }

  return result;
}

// Step 6: Humanify timezone names (convert "America/Los_Angeles" -> "Los Angeles")
function humanifyTimezoneName(tz: string): string {
  const parts = tz.split("/");
  const lastPart = parts[parts.length - 1];
  return lastPart.replace(/_/g, " ");
}

// Step 7: Extract territory names from CLDR
function extractTerritoryNames(): Map<string, string[]> {
  const territoryNames = new Map<string, string[]>();
  const territoryPath = path.join(CLDR_PATH!, "common", "main", "en.xml");
  const xmlContent = fs.readFileSync(territoryPath, "utf-8");
  const parsed = parser.parse(xmlContent);

  const territories =
    parsed.ldml.localeDisplayNames.territories.territory;
  const territoryArray = Array.isArray(territories)
    ? territories
    : [territories];

  for (const territory of territoryArray) {
    const code = territory["@_type"];
    const name =
      typeof territory === "object" ? territory["#text"] : territory;
    if (code && name && name !== "∅∅∅") {
      if (!territoryNames.has(code)) {
        territoryNames.set(code, []);
      }
      territoryNames.get(code)!.push(name);
    }
  }

  return territoryNames;
}

// Step 8: Parse zone1970.tab for country -> timezone mappings
function parseZone1970Tab(): Map<string, string[]> {
  const countryToTimezones = new Map<string, string[]>();
  const tabPath = path.join(TZDATA_PATH!, "zone1970.tab");
  const content = fs.readFileSync(tabPath, "utf-8");

  const lines = content.split("\n");
  for (const line of lines) {
    if (line.trim() === "" || line.startsWith("#")) continue;

    const parts = line.split("\t");
    if (parts.length < 3) continue;

    const countries = parts[0].split(",");
    const timezone = parts[2];

    for (const country of countries) {
      if (!countryToTimezones.has(country)) {
        countryToTimezones.set(country, []);
      }
      countryToTimezones.get(country)!.push(timezone);
    }
  }

  return countryToTimezones;
}

// Step 9: Parse cities15000.txt for major cities
interface City {
  name1: string;
  name2: string;
  attributionCode: string;
  population: number;
  timezone: string;
}

function parseCities15000(): City[] {
  const cities: City[] = [];
  const content = fs.readFileSync(CITIES_15000!, "utf-8");
  const lines = content.split("\n");

  for (const line of lines) {
    if (line.trim() === "") continue;

    const parts = line.split("\t");
    if (parts.length < 18) continue;

    const name1 = parts[1];
    const name2 = parts[2];
    const attributionCode = parts[7];
    const population = parseInt(parts[14], 10);
    const timezone = parts[17];

    // Filter: PPLC or population > 500,000
    if (
      attributionCode === "PPLC" ||
      population > 500000
    ) {
      cities.push({ name1, name2, attributionCode, population, timezone });
    }
  }

  return cities;
}

// Filter duplicate city names according to specified rules
function filterDuplicateCities(cities: City[]): City[] {
  // Group cities by name (case-insensitive)
  const cityGroups = new Map<string, City[]>();

  for (const city of cities) {
    // Consider both name1 and name2
    const names = [city.name1];
    if (city.name2 && city.name2 !== city.name1) {
      names.push(city.name2);
    }

    for (const name of names) {
      const nameLower = name.toLowerCase();
      if (!cityGroups.has(nameLower)) {
        cityGroups.set(nameLower, []);
      }
      cityGroups.get(nameLower)!.push(city);
    }
  }

  // Filter each group
  const filteredCities = new Set<City>();

  for (const [name, group] of cityGroups.entries()) {
    if (group.length === 1) {
      // Only one city with this name, keep it
      filteredCities.add(group[0]);
    } else {
      // Multiple cities with the same name
      const over1M = group.filter((c) => c.population > 1000000);
      const pplc = group.filter((c) => c.attributionCode === "PPLC");

      let selected: City | null = null;

      if (over1M.length === 1) {
        // Only one city has over 1M population
        selected = over1M[0];
      } else if (pplc.length === 1 && over1M.length === 0) {
        // Only one city is PPLC, and no cities over 1M
        selected = pplc[0];
      } else if (over1M.length > 1) {
        // Multiple cities have over 1M population, keep most populated
        selected = over1M.reduce((a, b) =>
          a.population > b.population ? a : b
        );
      } else if (pplc.length > 1) {
        // Multiple cities are PPLC, keep most populated
        selected = pplc.reduce((a, b) =>
          a.population > b.population ? a : b
        );
      }
      // else: drop all cities with this name (selected remains null)

      if (selected) {
        filteredCities.add(selected);
      }
    }
  }

  return Array.from(filteredCities);
}

// Main: Build the timezones database
async function buildTimezonesDatabase() {
  console.log("Step 1: Extracting canonical timezones from tzdata...");
  const { canonical, aliases } = extractCanonicalTimezones();
  console.log(`  Found ${canonical.size} canonical timezones`);
  console.log(`  Found ${aliases.size} timezone aliases`);

  console.log("\nStep 2: Parsing CLDR timezone.xml...");
  const cldrAliases = parseCLDRTimezoneAliases();
  console.log(`  Found ${cldrAliases.size} CLDR timezone aliases`);

  console.log("\nStep 3: Parsing metaZones.xml...");
  const { timezoneToMetazone, metazoneToTimezone, primaryZones } = parseMetaZones();
  console.log(`  Found ${timezoneToMetazone.size} timezone->metazone mappings`);
  console.log(`  Found ${metazoneToTimezone.size} metazone->timezone mappings`);
  console.log(`  Found ${primaryZones.size} primary zones`);

  console.log("\nStep 4: Extracting exemplar cities...");
  const exemplarCities = extractExemplarCities();
  console.log(`  Found ${exemplarCities.size} exemplar cities`);

  console.log("\nStep 5: Extracting zone and metazone names...");
  const { zoneNames, metazoneNames } = extractZoneAndMetazoneNames();
  console.log(`  Found names for ${zoneNames.size} zones`);
  console.log(`  Found names for ${metazoneNames.size} metazones`);

  console.log("\nStep 6: Extracting territory names...");
  const territoryNames = extractTerritoryNames();
  console.log(`  Found ${territoryNames.size} territory names`);

  console.log("\nStep 7: Parsing zone1970.tab...");
  const countryToTimezones = parseZone1970Tab();
  console.log(`  Found ${countryToTimezones.size} countries`);

  console.log("\nStep 8: Parsing cities15000.txt...");
  const allCities = parseCities15000();
  console.log(`  Found ${allCities.length} major cities`);

  console.log("\nStep 8a: Filtering duplicate city names...");
  const cities = filterDuplicateCities(allCities);
  console.log(`  Kept ${cities.length} cities after filtering`);

  console.log("\nStep 9: Building timezone database (phase 1: non-city names)...");
  const timezones: Timezone[] = [];

  // Phase 1: Build all timezones without city names
  for (const tz of Array.from(canonical).sort()) {
    const names: TimezoneName[] = [];

    // 1. Add exemplar city name or humanified name
    const exemplarCity = exemplarCities.get(tz);
    if (exemplarCity) {
      names.push({ name: exemplarCity });
    } else {
      // Check if timezone is primary zone for a territory
      const primaryTerritory = primaryZones.get(tz);
      if (primaryTerritory) {
        // Use territory names (all variants)
        const territoryNameList = territoryNames.get(primaryTerritory);
        if (territoryNameList && territoryNameList.length > 0) {
          for (const territoryName of territoryNameList) {
            names.push({ name: territoryName });
          }
        } else {
          // Fallback to humanified name
          names.push({ name: humanifyTimezoneName(tz) });
        }
      } else {
        // Humanify the timezone name
        names.push({ name: humanifyTimezoneName(tz) });
      }
    }

    // 2. Add timezone aliases from tzdata
    for (const [aliasName, canonicalName] of aliases.entries()) {
      if (canonicalName === tz) {
        // Add the IANA alias ID itself
        names.push({ name: aliasName });
      }
    }

    // 3. Add zone-specific names (like "British Summer Time" for Europe/London)
    const zoneNameMap = zoneNames.get(tz);
    if (zoneNameMap) {
      for (const [locale, nameSet] of zoneNameMap.entries()) {
        // Determine territory from locale (e.g., "en_GB" -> "GB")
        const territory = locale.includes("_")
          ? locale.split("_")[1]
          : undefined;

        if (nameSet.long) {
          if (nameSet.long.generic)
            names.push({ name: nameSet.long.generic, territory });
          if (nameSet.long.standard)
            names.push({ name: nameSet.long.standard, territory });
          if (nameSet.long.daylight)
            names.push({ name: nameSet.long.daylight, territory });
        }
        if (nameSet.short) {
          if (nameSet.short.generic)
            names.push({ name: nameSet.short.generic, territory });
          if (nameSet.short.standard)
            names.push({ name: nameSet.short.standard, territory });
          if (nameSet.short.daylight)
            names.push({ name: nameSet.short.daylight, territory });
        }
      }
    }

    // 3. Add metazone names
    const metazone = getLatestMetazone(tz, timezoneToMetazone, aliases);
    if (metazone) {
      const metazoneNameMap = metazoneNames.get(metazone);
      if (metazoneNameMap) {
        // Find territories where this metazone maps back to this timezone
        const mapZones = metazoneToTimezone.get(metazone) || [];

        // Check if mz.type matches tz or any of its aliases
        const tzAliases = new Set<string>();
        for (const [aliasName, canonicalName] of aliases.entries()) {
          if (canonicalName === tz) {
            tzAliases.add(aliasName);
          }
        }

        const mappedTerritories = mapZones
          .filter((mz) => mz.type === tz || tzAliases.has(mz.type))
          .map((mz) => mz.territory);

        // If no territories map back, add names without territory
        const hasMapping = mappedTerritories.length > 0;

        for (const [locale, nameSet] of metazoneNameMap.entries()) {

          for (const territory of hasMapping
            ? mappedTerritories
            : [undefined]) {
            if (nameSet.long) {
              if (nameSet.long.generic)
                names.push({
                  name: nameSet.long.generic,
                  territory: territory,
                });
              if (nameSet.long.standard)
                names.push({
                  name: nameSet.long.standard,
                  territory: territory,
                });
              if (nameSet.long.daylight)
                names.push({
                  name: nameSet.long.daylight,
                  territory: territory,
                });
            }
            if (nameSet.short) {
              if (nameSet.short.generic)
                names.push({
                  name: nameSet.short.generic,
                  territory: territory,
                });
              if (nameSet.short.standard)
                names.push({
                  name: nameSet.short.standard,
                  territory: territory,
                });
              if (nameSet.short.daylight)
                names.push({
                  name: nameSet.short.daylight,
                  territory: territory,
                });
            }
          }
        }
      }
    }

    // 4. Add country names for single-timezone countries
    for (const [country, tzs] of countryToTimezones.entries()) {
      if (tzs.length === 1 && tzs[0] === tz) {
        const countryNameList = territoryNames.get(country);
        if (countryNameList) {
          for (const countryName of countryNameList) {
            names.push({ name: countryName });
          }
        }
      }
    }

    // 5. Deduplicate names case-insensitively (without cities for now)
    const deduped = deduplicateNames(names);

    timezones.push({ iana: tz, names: deduped });
  }

  console.log(`  Phase 1 complete: ${timezones.length} timezones`);

  // Phase 2: Build global set of all existing timezone names
  console.log("\nStep 10: Building global name index...");
  const allExistingNames = new Set<string>();
  for (const tz of timezones) {
    for (const name of tz.names) {
      allExistingNames.add(name.name.toLowerCase());
    }
  }
  console.log(`  Found ${allExistingNames.size} unique names`);

  // Phase 3: Add city names that don't conflict with existing names
  console.log("\nStep 11: Adding city names...");
  let citiesAdded = 0;
  for (const tz of timezones) {
    const tzCities = cities.filter((c) => c.timezone === tz.iana);
    for (const city of tzCities) {
      // Check if city name already exists globally (case-insensitive)
      const cityNames = [city.name1];
      if (city.name2 && city.name2 !== city.name1) {
        cityNames.push(city.name2);
      }

      for (const cityName of cityNames) {
        if (!allExistingNames.has(cityName.toLowerCase())) {
          tz.names.push({ name: cityName });
          allExistingNames.add(cityName.toLowerCase());
          citiesAdded++;
        }
      }
    }

    // Deduplicate again after adding cities
    tz.names = deduplicateNames(tz.names);
  }

  console.log(`  Added ${citiesAdded} city names`);

  // Write output
  const output: TimezonesDatabase = { timezones };
  fs.writeFileSync(
    "timezones.json",
    JSON.stringify(output, null, 2),
    "utf-8"
  );
  console.log("\nSuccessfully wrote timezones.json");

  // Generate duplicate name report
  console.log("\n=== Duplicate Name Report ===\n");
  generateDuplicateNameReport(timezones);
}

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

// Generate report of duplicate names across timezones
function generateDuplicateNameReport(timezones: Timezone[]) {
  // Map: name (lowercase) -> Map<territory | null, iana[]>
  const nameMap = new Map<string, Map<string | null, string[]>>();

  for (const tz of timezones) {
    for (const name of tz.names) {
      const nameLower = name.name.toLowerCase();
      const territory = name.territory || null;

      if (!nameMap.has(nameLower)) {
        nameMap.set(nameLower, new Map());
      }

      const territoryMap = nameMap.get(nameLower)!;
      if (!territoryMap.has(territory)) {
        territoryMap.set(territory, []);
      }

      territoryMap.get(territory)!.push(tz.iana);
    }
  }

  // Find duplicates (names used across different timezones)
  const duplicates: Array<{
    name: string;
    territories: Map<string | null, string[]>;
  }> = [];

  for (const [name, territoryMap] of nameMap.entries()) {
    // Collect all unique timezones for this name
    const allTimezones = new Set<string>();
    for (const tzList of territoryMap.values()) {
      for (const tz of tzList) {
        allTimezones.add(tz);
      }
    }

    // If more than one timezone uses this name, it's a duplicate
    if (allTimezones.size > 1) {
      duplicates.push({ name, territories: territoryMap });
    }
  }

  // Sort by name
  duplicates.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`Found ${duplicates.length} duplicate names\n`);

  for (const dup of duplicates) {
    // Check for highlighting conditions
    const hasNonNullTerritory = Array.from(dup.territories.keys()).some(
      (t) => t !== null
    );
    const has001Territory = dup.territories.has("001");
    const nullTerritoryCount = dup.territories.get(null)?.length || 0;
    const hasOnlyNullTerritory = !hasNonNullTerritory;

    // Determine color
    let nameColor = "";
    if (hasOnlyNullTerritory && nullTerritoryCount > 1) {
      // Case 3: Name has no territory timezone but more than one null-territory timezones
      nameColor = colors.cyan;
    } else if (hasNonNullTerritory && !has001Territory) {
      // Case 2: Name has non-null territory but doesn't have territory "001"
      nameColor = colors.yellow;
    }

    console.log(`${nameColor}"${dup.name}"${colors.reset}`);

    // Sort territories: null last
    const territoryEntries = Array.from(dup.territories.entries()).sort(
      (a, b) => {
        if (a[0] === null && b[0] !== null) return 1;
        if (a[0] !== null && b[0] === null) return -1;
        if (a[0] === null && b[0] === null) return 0;
        return a[0]!.localeCompare(b[0]!);
      }
    );

    for (const [territory, tzList] of territoryEntries) {
      const territoryLabel = territory === null ? "(null)" : territory;
      const tzListStr = tzList.join(", ");

      // Case 1: Same name and non-null territory value assigned to 2+ timezones
      let lineColor = "";
      if (territory !== null && tzList.length >= 2) {
        lineColor = colors.red;
      }

      console.log(
        `${lineColor}- ${territoryLabel}: ${tzListStr}${colors.reset}`
      );
    }

    console.log("");
  }
}

// Deduplicate names case-insensitively, keeping the one with territory if exists
function deduplicateNames(names: TimezoneName[]): TimezoneName[] {
  const seen = new Map<string, TimezoneName>();

  for (const name of names) {
    const key = name.name.toLowerCase();
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, name);
    } else {
      // If existing has no territory but new one does, replace
      if (!existing.territory && name.territory) {
        seen.set(key, name);
      }
      // Otherwise keep existing
    }
  }

  return Array.from(seen.values());
}

// Run the script
buildTimezonesDatabase().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

/**
 * Formatter - converts evaluation results to formatted strings
 */

import type {
  Value,
  NumericValue,
  CompositeUnitValue,
  DateTimeValue,
  BooleanValue,
  ErrorValue,
  PresentationValue,
  PresentationFormat,
} from "./evaluator";
import { getUnit, isDimensionless } from "./evaluator";
import type { Settings } from "./settings";
import { defaultSettings } from "./settings";
import type { Unit } from "./types/types";
import { Temporal, Intl as TemporalIntl } from "@js-temporal/polyfill";
import {
  Duration,
  ZonedDateTime,
  toTemporalZonedDateTime,
  toTemporalPlainDateTime,
  toTemporalPlainDate,
  toTemporalPlainTime,
  toTemporalInstant,
} from "./date-time";
import type { DataLoader } from "./data-loader";
import { SUPERSCRIPTS } from "@/constants";

/**
 * Formatter class - formats values according to settings
 */
export class Formatter {
  private settings: Settings;
  private dataLoader: DataLoader | null;

  constructor(settings: Settings = defaultSettings, dataLoader?: DataLoader) {
    this.settings = settings;
    this.dataLoader = dataLoader || null;
  }

  /**
   * Main entry point: format any value to string
   */
  format(value: Value): string {
    // Handle presentation wrapper FIRST
    if (value.kind === "presentation") {
      if (
        value.format === 10 ||
        value.format === "decimal" ||
        value.format === "dec"
      ) {
        value = value.innerValue; // Unwrap for base 10 (default)
      } else {
        return this.formatPresentationValue(value);
      }
    }

    switch (value.kind) {
      case "presentation":
        return "this should never happen";
      case "value":
        return this.formatNumericValue(value);
      case "composite":
        return this.formatCompositeUnitValue(value);
      case "boolean":
        return this.formatBooleanValue(value);
      case "error":
        return this.formatErrorValue(value);
      // Date/time cases
      case "plainDate":
      case "plainTime":
      case "plainDateTime":
      case "instant":
      case "zonedDateTime":
      case "duration":
        return this.formatDateTimeValue(value);
      default: {
        const _exhaustive: never = value;
        return String(_exhaustive);
      }
    }
  }

  /**
   * Format a value with specific presentation format or base
   * Preserves units, derived units, and composite structures
   */
  private formatPresentationValue(value: PresentationValue): string {
    const innerValue = value.innerValue;
    const format = value.format;
    const formatName = typeof format === "number" ? `base ${format}` : format;

    // Handle date/time presentation formats
    if (
      format === "ISO 8601" ||
      format === "RFC 9557" ||
      format === "RFC 2822"
    ) {
      return this.formatDateTimePresentation(innerValue, format);
    }

    // Handle different value types
    if (innerValue.kind === "value") {
      const formattedNumber =
        typeof format === "number"
          ? this.formatBase(innerValue.value, format)
          : this.formatPresentation(innerValue.value, format);

      if (isDimensionless(innerValue)) {
        return formattedNumber;
      }

      const unitStr = this.formatDerivedUnit(innerValue.terms);
      return `${formattedNumber}${this.getUnitSeparator(unitStr)}${unitStr}`;
    }

    if (innerValue.kind === "composite") {
      // Composite: format each component's value, preserve units
      const parts: string[] = [];
      for (const comp of innerValue.components) {
        const formattedValue =
          typeof format === "number"
            ? this.formatBase(comp.value, format)
            : this.formatPresentation(comp.value, format);
        const unitStr = this.formatUnit(comp.unit);
        parts.push(
          `${formattedValue}${this.getUnitSeparator(unitStr)}${unitStr}`,
        );
      }
      return parts.join(" ");
    }

    return `Error: Cannot apply ${formatName} format to ${innerValue.kind}`;
  }

  /**
   * Format date/time value in specific presentation format
   */
  private formatDateTimePresentation(
    value: Value,
    format: "ISO 8601" | "RFC 9557" | "RFC 2822",
  ): string {
    // For RFC 2822, convert all date/time types to ZonedDateTime first
    if (format === "RFC 2822") {
      // Convert to ZonedDateTime with defaults
      let zdt: ReturnType<typeof Temporal.ZonedDateTime.from>;
      const systemTimeZone = Temporal.Now.timeZoneId();

      if (value.kind === "zonedDateTime") {
        zdt = toTemporalZonedDateTime(value.zonedDateTime);
      } else if (value.kind === "plainDateTime") {
        // Add local timezone
        const pdt = toTemporalPlainDateTime(value.dateTime);
        zdt = pdt.toZonedDateTime(systemTimeZone);
      } else if (value.kind === "plainDate") {
        // Add 00:00:00 time and local timezone
        const pd = toTemporalPlainDate(value.date);
        zdt = pd.toZonedDateTime({
          timeZone: systemTimeZone,
          plainTime: "00:00:00",
        });
      } else if (value.kind === "plainTime") {
        // Add today's date and local timezone
        const pt = toTemporalPlainTime(value.time);
        const now = Temporal.Now.zonedDateTimeISO(systemTimeZone);
        const pdt = now.toPlainDate().toPlainDateTime(pt);
        zdt = pdt.toZonedDateTime(systemTimeZone);
      } else if (value.kind === "instant") {
        // Convert instant to ZonedDateTime in local timezone
        const instant = toTemporalInstant(value.instant);
        zdt = instant.toZonedDateTimeISO(systemTimeZone);
      } else {
        return `Error: Cannot format ${value.kind} as RFC 2822`;
      }

      // RFC 2822 format: "Day, DD Mon YYYY HH:MM:SS +HHMM"
      const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const weekday = weekdays[zdt.dayOfWeek % 7]; // Temporal uses 1-7, array is 0-6
      const day = String(zdt.day).padStart(2, "0");
      const month = months[zdt.month - 1]; // Temporal months are 1-12
      const year = zdt.year;
      const hour = String(zdt.hour).padStart(2, "0");
      const minute = String(zdt.minute).padStart(2, "0");
      const second = String(zdt.second).padStart(2, "0");

      // Format timezone offset as +HHMM or -HHMM
      const offsetMinutes = zdt.offsetNanoseconds / (60 * 1e9);
      const offsetSign = offsetMinutes >= 0 ? "+" : "-";
      const absOffsetMinutes = Math.abs(offsetMinutes);
      const offsetHours = Math.floor(absOffsetMinutes / 60);
      const offsetMins = absOffsetMinutes % 60;
      const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, "0")}${String(offsetMins).padStart(2, "0")}`;

      return `${weekday}, ${day} ${month} ${year} ${hour}:${minute}:${second} ${offsetStr}`;
    }

    // For ISO 8601 and RFC 9557, handle each type individually
    // These formats don't require conversion to ZonedDateTime
    if (value.kind === "zonedDateTime") {
      const zdt = toTemporalZonedDateTime(value.zonedDateTime);
      let result = zdt.toString();
      if (format === "ISO 8601") {
        // Remove timezone annotation and convert +00:00 to Z
        result = result.replace(/\[.*?\]$/, "").replace(/\+00:00$/, "Z");
      }
      return result;
    }

    if (value.kind === "plainDateTime") {
      const pdt = toTemporalPlainDateTime(value.dateTime);
      return pdt.toString();
    }

    if (value.kind === "plainDate") {
      const pd = toTemporalPlainDate(value.date);
      return pd.toString();
    }

    if (value.kind === "plainTime") {
      const pt = toTemporalPlainTime(value.time);
      return pt.toString();
    }

    if (value.kind === "instant") {
      const instant = toTemporalInstant(value.instant);
      return instant.toString();
    }

    if (value.kind === "duration") {
      const duration = Temporal.Duration.from(value.duration);
      return duration.toString();
    }

    return `Error: Cannot format ${value.kind} as ${format}`;
  }

  /**
   * Format a numeric value (dimensionless, simple unit, or derived unit)
   */
  private formatNumericValue(value: NumericValue): string {
    const unit = getUnit(value);
    const numStr = this.formatNumericNumber(value, unit);
    return this.combineNumberAndUnit(numStr, value, unit);
  }

  /**
   * Format the numeric part of a NumericValue, choosing the right
   * precision / currency formatting strategy.
   */
  private formatNumericNumber(
    value: NumericValue,
    unit: Unit | undefined,
  ): string {
    // Precision metadata from conversion
    if (value.precision) {
      return this.formatNumberWithPrecision(
        value.value,
        value.precision.count,
        value.precision.mode,
      );
    }

    // Currency precision for simple unit
    if (unit) {
      const useCurrencyPrecision =
        this.settings.precision === -1 && this.isCurrencyUnit(unit);
      return useCurrencyPrecision
        ? this.formatCurrencyNumber(value.value, unit)
        : this.formatNumber(value.value);
    }

    // Currency precision for derived unit
    if (value.terms.length > 0) {
      const positiveTerms = value.terms.filter((t) => t.exponent > 0);
      const useCurrencyPrecision =
        this.settings.precision === -1 &&
        positiveTerms.length === 1 &&
        this.isCurrencyUnit(positiveTerms[0].unit);
      return useCurrencyPrecision
        ? this.formatCurrencyNumber(value.value, positiveTerms[0].unit)
        : this.formatNumber(value.value);
    }

    // Dimensionless
    return this.formatNumber(value.value);
  }

  /**
   * Combine a formatted number string with its unit representation.
   * Handles simple units (with ambiguous-currency prefix logic),
   * derived units, and dimensionless values.
   */
  private combineNumberAndUnit(
    numStr: string,
    value: NumericValue,
    unit: Unit | undefined,
  ): string {
    if (unit && this.isAmbiguousCurrency(unit)) {
      const unitStr = this.formatUnit(unit);
      return `${unitStr}${numStr}`;
    }

    if (value.terms.length > 0) {
      const unitStr = this.formatDerivedUnit(value.terms);
      return `${numStr}${this.getUnitSeparator(unitStr)}${unitStr}`;
    }

    return numStr;
  }

  /**
   * Format a composite unit value (e.g., "5 ft 7.32 in")
   */
  private formatCompositeUnitValue(value: CompositeUnitValue): string {
    const parts = value.components.map((comp) => {
      return this.formatNumericValue({
        kind: "value",
        value: comp.value,
        terms: comp.unit ? [{ unit: comp.unit, exponent: 1 }] : [],
        precision: comp.precision,
      });
    });
    return parts.join(" ");
  }

  /**
   * Format date/time values
   */
  private formatDateTimeValue(value: DateTimeValue): string {
    switch (value.kind) {
      case "plainDate":
        return this.formatPlainDate(
          value.date.year,
          value.date.month,
          value.date.day,
        );
      case "plainTime":
        return this.formatPlainTime(
          value.time.hour,
          value.time.minute,
          value.time.second,
          value.time.millisecond,
        );
      case "plainDateTime": {
        const dateStr = this.formatPlainDate(
          value.dateTime.date.year,
          value.dateTime.date.month,
          value.dateTime.date.day,
        );
        const timeStr = this.formatPlainTime(
          value.dateTime.time.hour,
          value.dateTime.time.minute,
          value.dateTime.time.second,
          value.dateTime.time.millisecond,
        );
        return this.formatDateTime(dateStr, timeStr);
      }
      case "instant":
        // Format as ISO 8601
        return this.formatInstant(value.instant.timestamp);
      case "zonedDateTime":
        return this.formatZonedDateTime(value.zonedDateTime);
      case "duration":
        return this.formatDuration(value.duration);
      default: {
        const _exhaustive: never = value;
        return String(_exhaustive);
      }
    }
  }

  /**
   * Format boolean value
   */
  private formatBooleanValue(value: BooleanValue): string {
    return value.value ? "true" : "false";
  }

  /**
   * Format error value
   */
  private formatErrorValue(value: ErrorValue): string {
    return `Error: ${value.error.message}`;
  }

  /**
   * Check if a unit represents a currency
   */
  private isCurrencyUnit(unit: Unit): boolean {
    if (!this.dataLoader) return false;

    // Check unambiguous currency
    if (
      unit.dimension === "currency" &&
      this.dataLoader.getCurrencyByCode(unit.id)
    ) {
      return true;
    }

    // Check ambiguous currency dimension
    if (
      unit.dimension === "currency" ||
      unit.dimension?.startsWith("currency_symbol_")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if a unit is an ambiguous currency (e.g., $, £, ¥)
   */
  private isAmbiguousCurrency(unit: Unit): boolean {
    return unit.dimension?.startsWith("currency_symbol_") || false;
  }

  /**
   * Format number with currency-specific decimal places
   */
  private formatCurrencyNumber(num: number, unit: Unit): string {
    const currency = this.dataLoader?.getCurrencyByCode(unit.id);

    // Use 2 decimal places for ambiguous currencies as a best effort guess.
    const decimalPlaces = currency?.minorUnits ?? 2;
    let formatted = num.toFixed(decimalPlaces);

    // Apply decimal separator (formatNumber uses '.' by default)
    const decimalSep = this.settings.decimalSeparator;
    if (decimalSep === ",") {
      formatted = formatted.replace(".", ",");
    }

    // Apply digit grouping if enabled
    if (
      this.settings.digitGroupingSeparator !== "" &&
      this.settings.digitGroupingSize !== "off"
    ) {
      formatted = this.applyDigitGrouping(formatted, decimalSep);
    }

    return formatted;
  }

  /**
   * Get display symbol for ambiguous currency
   */
  private getAmbiguousSymbol(dimension: string): string {
    if (!this.dataLoader) return dimension;

    const allAmbiguous = this.dataLoader.getAllAmbiguousCurrencies();
    return (
      [...allAmbiguous.symbolAdjacent, ...allAmbiguous.symbolSpaced].find(
        (amb) => amb.dimension === dimension,
      )?.symbol ?? dimension
    );
  }

  /**
   * Get the separator between number and unit
   * Returns space only if unit starts with a letter, otherwise empty string
   */
  private getUnitSeparator(unitStr: string): string {
    return /^[\p{Letter}]/u.test(unitStr) ? " " : "";
  }

  /**
   * Format a number with precision, decimal separator, and digit grouping
   */
  private formatNumber(num: number): string {
    // Handle special cases
    if (!isFinite(num)) {
      if (isNaN(num)) return "NaN";
      return num > 0 ? "Infinity" : "-Infinity";
    }

    // Apply precision
    let formatted: string;
    if (this.settings.precision === -1) {
      // Automatic precision
      formatted = this.formatNumberAutoPrecision(num);
    } else {
      // Fixed precision
      const absNum = Math.abs(num);
      // Use scientific notation for very large or very small numbers
      if (absNum >= 1e10 || (absNum < 1e-6 && absNum !== 0)) {
        // Use toExponential with precision (decimal places in mantissa)
        formatted = num.toExponential(this.settings.precision);
      } else {
        formatted = num.toFixed(this.settings.precision);
      }
    }

    // Apply decimal separator
    const decimalSep = this.settings.decimalSeparator;
    if (decimalSep === ",") {
      formatted = formatted.replace(".", ",");
    }

    // Apply digit grouping
    if (
      this.settings.digitGroupingSeparator !== "" &&
      this.settings.digitGroupingSize !== "off"
    ) {
      formatted = this.applyDigitGrouping(formatted, decimalSep);
    }

    return formatted;
  }

  /**
   * Format number with automatic precision based on magnitude
   * Uses significant figures approach with trailing zero stripping for clean output
   */
  private formatNumberAutoPrecision(num: number): string {
    const absNum = Math.abs(num);

    // Special case for zero
    if (absNum === 0) {
      return "0";
    }

    let formatted: string;

    // Use exponential notation for very large or very small numbers
    if (absNum >= 1e16 || absNum < 1e-6) {
      formatted = num.toExponential(8); // 9 significant figures
    } else {
      // Use significant figures for normal range
      if (absNum >= 1e10) {
        formatted = num.toPrecision(16); // 16 significant figures for large numbers
      } else {
        formatted = num.toPrecision(10); // 10 significant figures for typical numbers
      }
    }

    // Strip trailing zeros for clean output
    return this.stripTrailingZeros(formatted);
  }

  /**
   * Format number with specified precision (decimals or significant figures)
   */
  private formatNumberWithPrecision(
    num: number,
    precision: number,
    mode: "decimals" | "sigfigs",
  ): string {
    let formatted: string;

    if (mode === "decimals") {
      // Format with N decimal places
      formatted = num.toFixed(precision);
    } else {
      // Format with N significant figures
      if (num === 0) {
        formatted = "0";
      } else {
        // Use toPrecision for significant figures
        formatted = num.toPrecision(precision);

        // If toPrecision produced scientific notation, convert to regular notation
        // by parsing and using toFixed with appropriate decimal places
        if (formatted.includes("e")) {
          const parsedNum = parseFloat(formatted);
          // Determine decimal places needed to maintain precision
          const magnitude = Math.floor(Math.log10(Math.abs(parsedNum)));
          const decimalPlaces = Math.max(0, precision - magnitude - 1);
          formatted = parsedNum.toFixed(decimalPlaces);
        }
      }
    }

    // Apply decimal separator
    const decimalSep = this.settings.decimalSeparator;
    if (decimalSep === ",") {
      formatted = formatted.replace(".", ",");
    }

    // Apply digit grouping
    if (
      this.settings.digitGroupingSeparator !== "" &&
      this.settings.digitGroupingSize !== "off"
    ) {
      formatted = this.applyDigitGrouping(formatted, decimalSep);
    }

    return formatted;
  }

  /**
   * Strip trailing zeros from formatted number string
   * Uses parseFloat approach to leverage JavaScript's built-in zero stripping
   */
  private stripTrailingZeros(numStr: string): string {
    const parsed = parseFloat(numStr);

    // If original was in exponential notation, preserve that format
    if (numStr.includes("e")) {
      return parsed.toExponential(); // Automatically strips trailing zeros
    } else {
      return parsed.toString(); // Automatically strips trailing zeros
    }
  }

  /**
   * Apply digit grouping to a formatted number string
   */
  private applyDigitGrouping(numStr: string, decimalSep: string): string {
    // Handle exponential notation: only group the mantissa, not the exponent
    const expMatch = numStr.match(/^(.+?)([eE][+-]?\d+)$/);
    if (expMatch) {
      const mantissa = expMatch[1];
      const exponent = expMatch[2];
      // Recursively apply grouping to mantissa only
      const groupedMantissa = this.applyDigitGrouping(mantissa, decimalSep);
      return groupedMantissa + exponent;
    }

    // Get the grouping separator character (it's already the actual character)
    const groupSep = this.settings.digitGroupingSeparator;

    // Split into integer and decimal parts
    const parts = numStr.split(decimalSep);
    let integerPart = parts[0];
    const decimalPart = parts.length > 1 ? parts[1] : "";

    // Handle negative sign
    const isNegative = integerPart.startsWith("-");
    if (isNegative) {
      integerPart = integerPart.slice(1);
    }

    // Apply grouping based on size
    let grouped: string;
    const size = this.settings.digitGroupingSize;

    if (size === "3") {
      // European style: groups of 3 from right (1,234,567)
      grouped = this.groupBySize(integerPart, 3, groupSep);
    } else if (size === "2-3") {
      // South Asian style: first 3, then groups of 2 (12,34,567)
      grouped = this.groupBySouthAsian(integerPart, groupSep);
    } else if (size === "4") {
      // East Asian style: groups of 4 from right (1234,5678)
      grouped = this.groupBySize(integerPart, 4, groupSep);
    } else {
      grouped = integerPart; // 'off' - no grouping
    }

    // Reconstruct
    const result = isNegative ? "-" + grouped : grouped;
    return decimalPart ? result + decimalSep + decimalPart : result;
  }

  /**
   * Group digits by a specific size from right
   */
  private groupBySize(
    integerPart: string,
    size: number,
    groupSep: string,
  ): string {
    const reversed = integerPart.split("").reverse();
    const grouped: string[] = [];
    for (let i = 0; i < reversed.length; i++) {
      if (i > 0 && i % size === 0) {
        grouped.push(groupSep);
      }
      grouped.push(reversed[i]);
    }
    return grouped.reverse().join("");
  }

  /**
   * Group digits by South Asian numbering system
   * First group of 3 from right, then groups of 2
   */
  private groupBySouthAsian(integerPart: string, groupSep: string): string {
    if (integerPart.length <= 3) {
      return integerPart;
    }

    const reversed = integerPart.split("").reverse();
    const grouped: string[] = [];

    // First group of 3
    for (let i = 0; i < Math.min(3, reversed.length); i++) {
      grouped.push(reversed[i]);
    }

    // Remaining groups of 2
    for (let i = 3; i < reversed.length; i++) {
      if ((i - 3) % 2 === 0 && i > 3) {
        grouped.push(groupSep);
      }
      grouped.push(reversed[i]);
    }

    // Add separator after first group if there are more digits
    if (reversed.length > 3) {
      grouped.splice(3, 0, groupSep);
    }

    return grouped.reverse().join("");
  }

  /**
   * Get a unit by ID from the data loader
   */
  private getUnitById(id: string): Unit | null {
    if (!this.dataLoader) {
      return null;
    }
    return this.dataLoader.getUnitById(id) || null;
  }

  /**
   * Format a unit (display name based on settings)
   */
  private formatUnit(unit: Unit): string {
    // Check ambiguous currency first - display as symbol not dimension
    if (unit.dimension?.startsWith("currency_symbol_")) {
      return this.getAmbiguousSymbol(unit.dimension);
    }

    if (
      this.settings.unitDisplayStyle === "symbol" &&
      unit.displayName.symbol
    ) {
      return unit.displayName.symbol;
    } else {
      // Use singular or plural based on context (for now, always use singular)
      return unit.displayName.singular;
    }
  }

  /**
   * Format a unit by ID with optional count for pluralization
   */
  private formatUnitById(unitId: string, count: number): string {
    const unit = this.getUnitById(unitId);
    if (!unit) {
      // Fallback to the unit ID if not found
      return unitId;
    }
    return this.formatUnit(unit /* TODO: count */);
  }

  /**
   * Format derived unit (e.g., "km/h", "m²", "kg m/s²")
   * Uses signed exponents: positive for numerator, negative for denominator
   */
  private formatDerivedUnit(
    terms: Array<{ unit: Unit; exponent: number }>,
  ): string {
    // Separate into numerator and denominator
    const numerator = terms.filter((t) => t.exponent > 0);
    const denominator = terms.filter((t) => t.exponent < 0);

    // Format numerator
    const numParts = numerator.map((t) =>
      this.formatUnitTerm(t.unit, t.exponent),
    );
    const numStr = numParts.join(" ");

    // Format denominator
    if (denominator.length === 0) {
      return numStr || "1"; // dimensionless if empty
    }

    const denomParts = denominator.map((t) =>
      this.formatUnitTerm(t.unit, -t.exponent),
    );
    const denomStr = denomParts.join(" ");

    // If single term in denominator, use "/" notation without parentheses
    if (denominator.length === 1) {
      return `${numStr || "1"}/${denomStr}`;
    }

    // Multiple terms in denominator, use parentheses
    return `${numStr || "1"}/(${denomStr})`;
  }

  /**
   * Format a single unit term with exponent
   * Uses Unicode superscripts for exponents > 1
   */
  private formatUnitTerm(unit: Unit, exponent: number): string {
    const unitStr = this.formatUnit(unit);

    if (exponent === 1) {
      return unitStr;
    }

    // Use Unicode superscripts for common exponents
    // Convert exponent to superscript
    const expStr = String(exponent);
    let superscript = "";
    for (const char of expStr) {
      superscript += SUPERSCRIPTS[char] || char;
    }

    return `${unitStr}${superscript}`;
  }

  /**
   * Format a date and time according to dateTimeFormat setting
   */
  private formatDateTime(dateStr: string, timeStr: string): string {
    if (this.settings.dateTimeFormat === "{time} {date}") {
      return `${timeStr} ${dateStr}`;
    } else {
      return `${dateStr} ${timeStr}`;
    }
  }

  /**
   * Format a plain date
   * Supports tokens: YYYY (year), MM (month number), DD (day), MMM (month name), DDD (day of week)
   */
  private formatPlainDate(year: number, month: number, day: number): string {
    const format = this.settings.dateFormat;

    // Day of week using Temporal (Monday=1, Sunday=7)
    const temporalDate = Temporal.PlainDate.from({ year, month, day });
    const dateFormat = new TemporalIntl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    const { mmm, ddd, yyyy, dd } = dateFormat
      .formatToParts(temporalDate)
      .reduce(
        (acc, part) => {
          if (part.type === "month") acc.mmm = part.value;
          if (part.type === "weekday") acc.ddd = part.value;
          if (part.type === "year") acc.yyyy = part.value;
          if (part.type === "day") acc.dd = part.value;
          return acc;
        },
        { mmm: "", ddd: "", yyyy: "", dd: "" },
      );

    // Pad numbers
    const mm = String(temporalDate.month).padStart(2, "0");

    return format
      .replace("YYYY", yyyy)
      .replace("MMM", mmm)
      .replace("MM", mm)
      .replace("DDD", ddd)
      .replace("DD", dd);
  }

  /**
   * Format a plain time
   */
  private formatPlainTime(
    hour: number,
    minute: number,
    second: number,
    millisecond: number,
  ): string {
    if (this.settings.timeFormat === "h12") {
      return this.formatTime12Hour(hour, minute, second, millisecond);
    } else {
      return this.formatTime24Hour(hour, minute, second, millisecond);
    }
  }

  /**
   * Format time in 12-hour format with AM/PM
   */
  private formatTime12Hour(
    hour: number,
    minute: number,
    second: number,
    millisecond: number,
  ): string {
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12; // 0 becomes 12

    const hh = String(hour12);
    const mm = String(minute).padStart(2, "0");
    const ss = String(second).padStart(2, "0");

    // Include milliseconds if non-zero
    if (millisecond > 0) {
      const ms = String(millisecond).padStart(3, "0");
      return `${hh}:${mm}:${ss}.${ms} ${ampm}`;
    }

    // Include seconds if non-zero
    if (second > 0) {
      return `${hh}:${mm}:${ss} ${ampm}`;
    }

    return `${hh}:${mm} ${ampm}`;
  }

  /**
   * Format time in 24-hour format
   */
  private formatTime24Hour(
    hour: number,
    minute: number,
    second: number,
    millisecond: number,
  ): string {
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    const ss = String(second).padStart(2, "0");

    // Include milliseconds if non-zero
    if (millisecond > 0) {
      const ms = String(millisecond).padStart(3, "0");
      return `${hh}:${mm}:${ss}.${ms}`;
    }

    // Include seconds if non-zero
    if (second > 0) {
      return `${hh}:${mm}:${ss}`;
    }

    return `${hh}:${mm}`;
  }

  /**
   * Format an instant (epoch milliseconds) in local time
   * Shows date+time without UTC offset
   */
  private formatInstant(epochMs: number): string {
    const instant = Temporal.Instant.fromEpochMilliseconds(epochMs);
    const localTimeZone = Temporal.Now.timeZoneId();
    const zdt = instant.toZonedDateTimeISO(localTimeZone);

    const dateStr = this.formatPlainDate(zdt.year, zdt.month, zdt.day);
    const timeStr = this.formatPlainTime(
      zdt.hour,
      zdt.minute,
      zdt.second,
      zdt.millisecond,
    );
    return this.formatDateTime(dateStr, timeStr);
  }

  /**
   * Format a duration
   */
  private formatDuration(duration: Duration): string {
    const parts: string[] = [];

    // Date components
    if (duration.years) {
      parts.push(
        `${duration.years} ${this.formatUnitById("year", duration.years)}`,
      );
    }
    if (duration.months) {
      parts.push(
        `${duration.months} ${this.formatUnitById("month", duration.months)}`,
      );
    }
    if (duration.weeks) {
      parts.push(
        `${duration.weeks} ${this.formatUnitById("week", duration.weeks)}`,
      );
    }
    if (duration.days) {
      parts.push(
        `${duration.days} ${this.formatUnitById("day", duration.days)}`,
      );
    }

    // Time components
    if (duration.hours) {
      parts.push(
        `${duration.hours} ${this.formatUnitById("hour", duration.hours)}`,
      );
    }
    if (duration.minutes) {
      parts.push(
        `${duration.minutes} ${this.formatUnitById("minute", duration.minutes)}`,
      );
    }
    if (duration.seconds) {
      parts.push(
        `${duration.seconds} ${this.formatUnitById("second", duration.seconds)}`,
      );
    }
    if (duration.milliseconds) {
      parts.push(
        `${duration.milliseconds} ${this.formatUnitById("millisecond", duration.milliseconds)}`,
      );
    }

    // If no parts, find the smallest time unit with explicit zero value
    // For all-zero durations, use the smallest unit that's explicitly defined
    if (parts.length === 0) {
      // Collect all defined fields (even if zero)
      const definedFields: Array<{ field: string; unit: string }> = [];
      if (duration.years !== undefined)
        definedFields.push({ field: "years", unit: "year" });
      if (duration.months !== undefined)
        definedFields.push({ field: "months", unit: "month" });
      if (duration.weeks !== undefined)
        definedFields.push({ field: "weeks", unit: "week" });
      if (duration.days !== undefined)
        definedFields.push({ field: "days", unit: "day" });
      if (duration.hours !== undefined)
        definedFields.push({ field: "hours", unit: "hour" });
      if (duration.minutes !== undefined)
        definedFields.push({ field: "minutes", unit: "minute" });
      if (duration.seconds !== undefined)
        definedFields.push({ field: "seconds", unit: "second" });
      if (duration.milliseconds !== undefined)
        definedFields.push({ field: "milliseconds", unit: "millisecond" });

      // Use the smallest (last) defined field
      if (definedFields.length > 0) {
        const smallestField = definedFields[definedFields.length - 1];
        return `0 ${this.formatUnitById(smallestField.unit, 0)}`;
      }

      // Default to second if no fields are defined
      return `0 ${this.formatUnitById("second", 0)}`;
    }

    return parts.join(" ");
  }

  /**
   * Format a zoned date time
   * Follows SPECS.md timezone section:
   * - If the date is today in the specified timezone, render as `(settings time format) UTC±H(:MM)`
   * - Otherwise, render as `(settings date time format) UTC±H(:MM)`
   */
  private formatZonedDateTime(zonedDateTime: ZonedDateTime): string {
    const { dateTime, timezone } = zonedDateTime;
    const { date, time } = dateTime;

    // Create a Temporal.ZonedDateTime to get the offset
    const temporalZDT = Temporal.ZonedDateTime.from({
      year: date.year,
      month: date.month,
      day: date.day,
      hour: time.hour,
      minute: time.minute,
      second: time.second,
      millisecond: time.millisecond,
      timeZone: timezone,
    });

    // Get the offset in seconds and convert to hours/minutes
    const offsetNs = temporalZDT.offsetNanoseconds;
    const offsetSeconds = Math.floor(offsetNs / 1e9);
    const offsetMinutes = Math.abs(offsetSeconds / 60);
    const offsetHours = Math.floor(offsetMinutes / 60);
    const offsetMins = offsetMinutes % 60;

    // Format the offset as UTC, UTC±H, or UTC±H:MM
    let offsetStr: string;
    if (offsetSeconds === 0) {
      // Special case: UTC with no offset
      offsetStr = "UTC";
    } else {
      const offsetSign = offsetSeconds >= 0 ? "+" : "-";
      offsetStr =
        offsetMins === 0
          ? `UTC${offsetSign}${offsetHours}`
          : `UTC${offsetSign}${offsetHours}:${String(offsetMins).padStart(2, "0")}`;
    }

    // Get today's date in the local timezone
    const now = Temporal.Now.zonedDateTimeISO();
    const todayPlainDate = now.toPlainDate();
    const zdtPlainDate = temporalZDT.toPlainDate();

    // Check if the date is today, yesterday, or tomorrow in the timezone
    const isToday = todayPlainDate.equals(zdtPlainDate);
    const isYesterday = todayPlainDate
      .subtract({ days: 1 })
      .equals(zdtPlainDate);
    const isTomorrow = todayPlainDate.add({ days: 1 }).equals(zdtPlainDate);

    if (isToday) {
      // Render as time only
      const timeStr = this.formatPlainTime(
        time.hour,
        time.minute,
        time.second,
        time.millisecond,
      );
      return `${timeStr} ${offsetStr}`;
    } else if (isYesterday) {
      const timeStr = this.formatPlainTime(
        time.hour,
        time.minute,
        time.second,
        time.millisecond,
      );
      return `${this.formatDateTime("yesterday", timeStr)} ${offsetStr}`;
    } else if (isTomorrow) {
      const timeStr = this.formatPlainTime(
        time.hour,
        time.minute,
        time.second,
        time.millisecond,
      );
      return `${this.formatDateTime("tomorrow", timeStr)} ${offsetStr}`;
    } else {
      // Render as date + time
      const dateStr = this.formatPlainDate(date.year, date.month, date.day);
      const timeStr = this.formatPlainTime(
        time.hour,
        time.minute,
        time.second,
        time.millisecond,
      );
      return `${this.formatDateTime(dateStr, timeStr)} ${offsetStr}`;
    }
  }

  /**
   * Format a number in a specific presentation format
   */
  formatPresentation(value: number, format: PresentationFormat): string {
    // Handle infinity/NaN before format-specific logic
    if (!isFinite(value)) {
      if (isNaN(value)) return "NaN";
      if (
        format === "binary" ||
        format === "octal" ||
        format === "hex" ||
        format === "ordinal" ||
        format === "percentage"
      ) {
        return `Error: ${format} format requires finite integer value`;
      }
      // For fraction and scientific, show infinity
      return value > 0 ? "Infinity" : "-Infinity";
    }

    switch (format) {
      case "binary":
      case "bin":
        return this.formatBinary(value);
      case "octal":
      case "oct":
        return this.formatOctal(value);
      case "hex":
      case "hexadecimal":
        return this.formatHex(value);
      case "fraction":
        return this.formatFraction(value);
      case "scientific":
        return this.formatScientific(value);
      case "percentage":
        return this.formatPercentage(value);
      case "ordinal":
        return this.formatOrdinal(value);
      case "ISO 8601":
      case "RFC 9557":
      case "RFC 2822":
      case "unix":
      case "unixMilliseconds":
        return `Cannot convert ${value} to a date/time format`;
      case "decimal":
      case "dec":
        return "this should never happen";
      default: {
        const _exhaustive: never = format;
        return String(_exhaustive);
      }
    }
  }

  /**
   * Format as binary (0b...)
   */
  private formatBinary(value: number): string {
    return this.formatBase(value, 2);
  }

  /**
   * Format as octal (0o...)
   */
  private formatOctal(value: number): string {
    return this.formatBase(value, 8);
  }

  /**
   * Format as hexadecimal (0x...)
   */
  private formatHex(value: number): string {
    return this.formatBase(value, 16);
  }

  /**
   * Format as fraction (approximate for irrational numbers)
   */
  private formatFraction(value: number): string {
    // Handle special cases
    if (!isFinite(value)) return String(value);
    if (value === 0) return "0";

    // Handle negative
    const sign = value < 0 ? "-" : "";
    const absValue = Math.abs(value);

    // Extract integer part
    const intPart = Math.floor(absValue);
    const fracPart = absValue - intPart;

    if (fracPart < 1e-10) {
      return sign + String(intPart);
    }

    // Find best rational approximation using continued fractions
    const { numerator, denominator } = this.approximateFraction(fracPart, 1000);

    if (intPart === 0) {
      return `${sign}${numerator}⁄${denominator}`;
    } else {
      return `${sign}${intPart} ${numerator}⁄${denominator}`;
    }
  }

  /**
   * Approximate a decimal as a fraction using continued fractions
   */
  private approximateFraction(
    value: number,
    maxDenominator: number,
  ): { numerator: number; denominator: number } {
    let a = value;
    let h1 = 1,
      h2 = 0;
    let k1 = 0,
      k2 = 1;

    while (k1 <= maxDenominator) {
      const ai = Math.floor(a);
      const h = ai * h1 + h2;
      const k = ai * k1 + k2;

      if (k > maxDenominator) break;

      // Check if we're close enough
      if (Math.abs(value - h / k) < 1e-10) {
        return { numerator: h, denominator: k };
      }

      // Continue fraction
      const remainder = a - ai;
      if (remainder < 1e-10) break;

      a = 1 / remainder;
      h2 = h1;
      h1 = h;
      k2 = k1;
      k1 = k;
    }

    return { numerator: h1, denominator: k1 };
  }

  /**
   * Format in scientific notation
   */
  private formatScientific(value: number): string {
    // toExponential requires precision between 0 and 100
    // If precision is -1 (auto), use undefined to let JS choose
    const precision =
      this.settings.precision === -1 ? undefined : this.settings.precision;
    return value.toExponential(precision);
  }

  /**
   * Format as percentage (multiply by 100 and append %)
   */
  private formatPercentage(value: number): string {
    const percentValue = value * 100;
    const precision =
      this.settings.precision === -1 ? undefined : this.settings.precision;
    if (precision !== undefined) {
      return `${percentValue.toFixed(precision)}%`;
    }
    return `${parseFloat(percentValue.toPrecision(15))}%`;
  }

  /**
   * Format as ordinal (1st, 2nd, 3rd, etc.)
   * Uses Intl.PluralRules for proper ordinal suffix determination
   */
  private formatOrdinal(value: number): string {
    if (!Number.isInteger(value)) {
      return `Error: Ordinal format requires integer value`;
    }

    // Use Intl.PluralRules to determine the ordinal suffix
    const pluralRules = new Intl.PluralRules("en", { type: "ordinal" });
    const rule = pluralRules.select(value);

    // Map plural rule to ordinal suffix
    const suffixes: Record<string, string> = {
      one: "st",
      two: "nd",
      few: "rd",
      other: "th",
    };

    const suffix = suffixes[rule] || "th";
    return `${value}${suffix}`;
  }

  /**
   * Convert number to arbitrary base (2-36) with fractional part support
   *
   * Uses JavaScript's built-in Number.prototype.toString(base) which handles:
   *   - Integer and fractional parts
   *   - Negative numbers
   *   - Trailing zero removal
   *
   * Rendering rules:
   *   - Base 10: Render as-is (no prefix/suffix)
   *   - Base 2, 8, 16: Use prefixes 0b, 0o, 0x
   *   - Other bases: Use suffix " (base N)"
   *   - Negative sign with prefix: "0x-A" not "-0xA"
   *
   * Examples:
   *   formatBase(100, 10) → "100"
   *   formatBase(10.625, 2) → "0b1010.101"
   *   formatBase(255, 8) → "0o377"
   *   formatBase(255, 16) → "0xFF"
   *   formatBase(-10, 16) → "0x-A"
   *   formatBase(1000, 35) → "W93 (base 35)"
   */
  private formatBase(value: number, base: number): string {
    if (!isFinite(value)) {
      return isNaN(value) ? "NaN" : value > 0 ? "Infinity" : "-Infinity";
    }

    // JavaScript's toString(base) handles integers, fractions, and negatives correctly
    const digits = value.toString(base).toUpperCase();

    // Apply prefix or suffix based on base
    if (base === 10) {
      return digits; // "100"
    } else if (base === 2) {
      return "0b" + digits; // "0b1010.101" or "0b-A"
    } else if (base === 8) {
      return "0o" + digits; // "0o377"
    } else if (base === 16) {
      return "0x" + digits; // "0xFF" or "0x-A"
    } else {
      return digits + ` (base ${base})`; // "202 (base 7)"
    }
  }
}

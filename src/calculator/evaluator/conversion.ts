import * as NearleyAST from "../nearley/types";
import type { Unit } from "../types/types";
import type { PlainDateTime } from "../date-time";
import {
  resolveUnitFromNode,
  isDegreeUnit,
  UnitResolutionContext,
} from "../ast-helpers";
import { Temporal } from "@js-temporal/polyfill";
import {
  toTemporalZonedDateTime,
  toTemporalPlainDateTime,
  toTemporalPlainDate,
  toTemporalInstant,
} from "../date-time";
import type { EvaluatorDeps, ExprEvaluator } from "./eval-helpers";
import { createError } from "./eval-helpers";
import type {
  Value,
  DurationValue,
  PresentationFormat,
} from "./values";
import {
  numVal,
  numValUnit,
  numValTerms,
  getUnit,
  isDimensionless,
  isSimpleUnit,
  isDerived,
} from "./values";
import {
  resolveNearleyUnitTerms,
  resolveUnitById,
  computeDimension,
  areDimensionsCompatible,
  formatDimension,
} from "./unit-resolution";
import {
  durationToValue,
  convertTimeToDuration,
  convertCompositeToSingleUnit,
  convertCompositeTimeToDuration,
} from "./datetime";

// ── Entry points ────────────────────────────────────────────────────

/**
 * Evaluate a conversion expression (Nearley AST)
 */
export function evaluateConversion(
  deps: EvaluatorDeps,
  evalExpr: ExprEvaluator,
  expr: NearleyAST.ConversionNode,
  context: import("./values").EvaluationContext,
): Value {
  const value = evalExpr(
    expr.expression as NearleyAST.ExpressionNode,
    context,
  );

  if (value.kind === "error") {
    return value;
  }

  const target = expr.target as NearleyAST.ConversionTargetNode;
  return evaluateConversionTarget(deps, value, target);
}

/**
 * Evaluate a Nearley conversion target
 */
export function evaluateConversionTarget(
  deps: EvaluatorDeps,
  value: Value,
  target: NearleyAST.ConversionTargetNode,
): Value {
  // Units target (simple unit, derived unit, or composite unit)
  if (target.type === "Units") {
    return convertToNearleyUnit(deps, value, target as NearleyAST.UnitsNode);
  }

  // Presentation format target
  if (target.type === "PresentationFormat") {
    return convertToPresentationFormat(
      deps,
      value,
      target as NearleyAST.PresentationFormatNode,
    );
  }

  // Property target (year, month, day, etc.)
  if (target.type === "PropertyTarget") {
    const propTarget = target as NearleyAST.PropertyTargetNode;
    return extractProperty(deps, value, propTarget.property);
  }

  // Timezone target
  if (target.type === "UTCOffset" || target.type === "TimezoneName") {
    const tz = target as NearleyAST.TimezoneNode;
    const rawTz =
      tz.type === "TimezoneName"
        ? tz.zoneName
        : (tz as NearleyAST.UTCOffsetNode).offsetStr;
    const timezone = deps.dataLoader.resolveTimezone(rawTz) || rawTz;
    return convertToTimezone(deps, value, timezone);
  }

  return createError(
    `Unknown conversion target: ${(target as any).type}`,
  );
}

// ── Unit conversion ─────────────────────────────────────────────────

/**
 * Convert value to Nearley unit target (handles simple, derived, and composite)
 */
export function convertToNearleyUnit(
  deps: EvaluatorDeps,
  value: Value,
  unitsNode: NearleyAST.UnitsNode,
): Value {
  // Convert Duration source to numeric value first, then delegate
  if (value.kind === "duration") {
    const asValue = durationToValue(deps, value.duration);
    if (asValue.kind === "error") return asValue;
    return convertToNearleyUnit(deps, asValue, unitsNode);
  }

  const terms = unitsNode.terms as NearleyAST.UnitWithExponentNode[];

  // Check if this is a composite unit target (multiple simple units with exponent 1)
  // e.g., "to ft in" → composite conversion
  const isComposite =
    terms.length > 1 && terms.every((t) => t.exponent === 1);

  if (isComposite) {
    // Resolve each unit for composite conversion with context-aware prime/doublePrime
    const resolvedUnits: Unit[] = [];
    let hasDegreeInTarget = false;
    for (const term of terms) {
      if (isDegreeUnit(term.unit.name)) {
        hasDegreeInTarget = true;
      }
      const unitContext: UnitResolutionContext = {
        hasDegreeUnit: hasDegreeInTarget,
      };
      const resolved = resolveUnitFromNode(
        term.unit,
        deps.dataLoader,
        unitContext,
      );
      const unit = resolveUnitById(deps, resolved.id, resolved.displayName);
      if (!unit) {
        return createError(
          `Unknown unit "${term.unit.name}" in composite target`,
        );
      }
      resolvedUnits.push(unit);
    }

    // Handle composite source → composite target: flatten to single unit first
    if (value.kind === "composite") {
      const flattened = convertCompositeToSingleUnit(deps, value);
      if (flattened.kind === "error") return flattened;
      return convertToNearleyUnit(deps, flattened, unitsNode);
    }

    // Check if all targets have same dimension as source (true composite)
    if (value.kind === "value" && isSimpleUnit(value)) {
      const srcUnit = getUnit(value)!;
      const allSameDimension = resolvedUnits.every(
        (u) => u.dimension === srcUnit.dimension,
      );
      if (allSameDimension) {
        return convertToCompositeUnitResolved(deps, value, resolvedUnits);
      }
    }

    // Handle derived unit source → composite target (e.g. GiB/Mbps to minutes seconds)
    if (value.kind === "value") {
      const sourceDim = computeDimension(deps, value.terms);
      const allSameDimension = resolvedUnits.every((u) => {
        const uDim = computeDimension(deps, [{ unit: u, exponent: 1 }]);
        return areDimensionsCompatible(sourceDim, uDim);
      });
      if (allSameDimension) {
        const asSimple = convertToSimpleUnit(deps, value, resolvedUnits[0]);
        if (asSimple.kind === "error") return asSimple;
        return convertToCompositeUnitResolved(deps, asSimple, resolvedUnits);
      }
    }

    // Fall through to derived unit conversion
    return convertToDerivedUnitNearley(deps, value, unitsNode);
  }

  // Single term or derived unit
  if (terms.length === 1 && terms[0].exponent === 1) {
    // Simple unit target
    const resolved = resolveUnitFromNode(terms[0].unit, deps.dataLoader);
    const targetUnit = resolveUnitById(
      deps,
      resolved.id,
      resolved.displayName,
    );
    if (!targetUnit) {
      return createError(`Unknown target unit "${terms[0].unit.name}"`);
    }
    return convertToSimpleUnit(deps, value, targetUnit);
  }

  // Derived unit target
  return convertToDerivedUnitNearley(deps, value, unitsNode);
}

/**
 * Convert value to a simple (single) unit
 */
export function convertToSimpleUnit(
  deps: EvaluatorDeps,
  value: Value,
  targetUnit: Unit,
): Value {
  // Handle composite source
  if (value.kind === "composite") {
    for (const component of value.components) {
      if (component.unit.dimension !== targetUnit.dimension) {
        return createError(
          `Cannot convert from dimension ${component.unit.dimension} to ${targetUnit.dimension}`,
        );
      }
    }
    let totalInBase = 0;
    for (const component of value.components) {
      totalInBase += deps.unitConverter.toBaseUnit(
        component.value,
        component.unit,
      );
    }
    const result = deps.unitConverter.fromBaseUnit(totalInBase, targetUnit);
    return numValUnit(result, targetUnit);
  }

  // Derived unit → simple unit conversion (factor-based)
  if (value.kind === "value" && isDerived(value)) {
    const sourceTerms = value.terms;
    const targetTerms: Array<{ unit: Unit; exponent: number }> = [
      { unit: targetUnit, exponent: 1 },
    ];

    const sourceDim = computeDimension(deps, sourceTerms);
    const targetDim = computeDimension(deps, targetTerms);

    if (!areDimensionsCompatible(sourceDim, targetDim)) {
      return createError(
        `Cannot convert from dimensions ${formatDimension(sourceDim)} to ${formatDimension(targetDim)}`,
      );
    }

    let valueInBase = value.value;
    for (const term of sourceTerms) {
      const factorToBase = deps.unitConverter.toBaseUnit(1, term.unit);
      valueInBase *= Math.pow(factorToBase, term.exponent);
    }

    const result = deps.unitConverter.fromBaseUnit(valueInBase, targetUnit);
    return numValUnit(result, targetUnit);
  }

  // Duration → implicit conversion to number/composite, then convert to target unit
  if (value.kind === "duration" && targetUnit.dimension === "time") {
    const asValue = durationToValue(deps, value.duration);
    if (asValue.kind === "error") return asValue;
    return convertToSimpleUnit(deps, asValue, targetUnit);
  }

  if (value.kind !== "value") {
    return createError(
      `Cannot convert ${value.kind} to unit ${targetUnit.displayName.symbol}`,
    );
  }

  if (isDimensionless(value)) {
    return createError(
      `Cannot convert dimensionless value to unit ${targetUnit.displayName.symbol}`,
    );
  }

  // Simple unit → simple unit conversion (handles affine conversions like temperature)
  const srcUnit = getUnit(value);
  if (!srcUnit || srcUnit.dimension !== targetUnit.dimension) {
    return createError(
      `Cannot convert from dimension ${srcUnit?.dimension ?? "dimensionless"} to ${targetUnit.dimension} for unit ${targetUnit.displayName.symbol}`,
    );
  }

  try {
    const converted = deps.unitConverter.convert(
      value.value,
      srcUnit,
      targetUnit,
    );
    return numValUnit(converted, targetUnit);
  } catch (e) {
    return createError(`Conversion error: ${e}`);
  }
}

/**
 * Convert value to derived unit using Nearley UnitsNode
 */
export function convertToDerivedUnitNearley(
  deps: EvaluatorDeps,
  value: Value,
  targetNode: NearleyAST.UnitsNode,
): Value {
  // Resolve target terms
  const targetTerms = resolveNearleyUnitTerms(deps, targetNode);
  if (!targetTerms) {
    return createError("Unknown unit in target");
  }

  // Extract source info
  let sourceValue: number;
  let sourceTerms: Array<{ unit: Unit; exponent: number }>;

  if (value.kind === "value") {
    if (isDimensionless(value)) {
      return createError(
        "Cannot convert dimensionless value to derived unit",
      );
    }
    sourceValue = value.value;
    sourceTerms = value.terms;
  } else {
    return createError(`Cannot convert ${value.kind} to derived unit`);
  }

  // Check dimensional compatibility
  const sourceDimension = computeDimension(deps, sourceTerms);
  const targetDimension = computeDimension(deps, targetTerms);

  if (!areDimensionsCompatible(sourceDimension, targetDimension)) {
    const sourceDimStr = formatDimension(sourceDimension);
    const targetDimStr = formatDimension(targetDimension);
    return createError(
      `Cannot convert from dimensions ${sourceDimStr} to ${targetDimStr}`,
    );
  }

  // Convert through base units
  let valueInBase = sourceValue;
  for (const term of sourceTerms) {
    const factorToBase = deps.unitConverter.toBaseUnit(1, term.unit);
    valueInBase *= Math.pow(factorToBase, term.exponent);
  }

  let result = valueInBase;
  for (const term of targetTerms) {
    const factorFromBase = deps.unitConverter.fromBaseUnit(1, term.unit);
    result *= Math.pow(factorFromBase, term.exponent);
  }

  return numValTerms(result, targetTerms);
}

/**
 * Convert value to composite unit using resolved Unit objects
 */
export function convertToCompositeUnitResolved(
  deps: EvaluatorDeps,
  value: Value,
  resolvedUnits: Unit[],
): Value {
  if (value.kind !== "value" || !isSimpleUnit(value)) {
    return createError("Cannot convert to composite unit");
  }
  const compSrcUnit = getUnit(value)!;

  try {
    const result = deps.unitConverter.convertComposite(
      [{ value: value.value, unitId: compSrcUnit.id }],
      resolvedUnits.map((u) => u.id),
    );

    const components = result.components.map((comp) => {
      const unit = deps.dataLoader.getUnitById(comp.unitId);
      if (!unit) throw new Error(`Unit not found: ${comp.unitId}`);
      return { value: comp.value, unit };
    });

    return { kind: "composite", components };
  } catch (e) {
    return createError(`Composite conversion error: ${e}`);
  }
}

// ── Format conversion ───────────────────────────────────────────────

/**
 * Convert Nearley PresentationFormatNode to presentation value
 */
export function convertToPresentationFormat(
  deps: EvaluatorDeps,
  value: Value,
  node: NearleyAST.PresentationFormatNode,
): Value {
  switch (node.format) {
    case "value":
      // "to value" - unwrap presentation, identity otherwise
      return value;

    case "base": {
      const baseNode = node as NearleyAST.BaseFormatNode;
      return convertToPresentation(deps, value, baseNode.base);
    }

    case "sigFigs": {
      const sfNode = node as NearleyAST.SigFigsFormatNode;
      return applyPrecision(sfNode.sigFigs, "sigfigs", value);
    }

    case "decimals": {
      const decNode = node as NearleyAST.DecimalsFormatNode;
      return applyPrecision(decNode.decimals, "decimals", value);
    }

    case "scientific":
      return convertToPresentation(deps, value, "scientific");

    case "fraction":
      return convertToPresentation(deps, value, "fraction");

    case "percentage":
      return convertToPresentation(deps, value, "percentage");

    case "unix": {
      const unixNode = node as NearleyAST.UnixFormatNode;
      if (
        unixNode.unit === "millisecond" ||
        unixNode.unit === "milliseconds" ||
        unixNode.unit === "ms"
      ) {
        return convertToPresentation(deps, value, "unixMilliseconds");
      }
      return convertToPresentation(deps, value, "unix");
    }

    case "namedFormat": {
      const namedNode = node as NearleyAST.NamedFormatNode;
      const formatName = namedNode.name.toLowerCase();
      // Map named formats to PresentationFormat strings
      const formatMap: Record<string, PresentationFormat> = {
        binary: "binary",
        bin: "bin",
        octal: "octal",
        oct: "oct",
        decimal: "decimal",
        dec: "dec",
        hex: "hex",
        hexadecimal: "hexadecimal",
        fraction: "fraction",
        scientific: "scientific",
        ordinal: "ordinal",
      };
      const mapped = formatMap[formatName];
      if (mapped) {
        return convertToPresentation(deps, value, mapped);
      }
      return createError(
        `Unknown presentation format: ${namedNode.name}`,
      );
    }

    default: {
      // Handle formats not in the TypeScript type system (ISO 8601, RFC 9557, RFC 2822)
      const rawFormat = (node as any).format as string;
      const normalizedFormat = rawFormat.toLowerCase().replace(/\s+/g, "");
      if (normalizedFormat === "iso8601")
        return convertToPresentation(deps, value, "ISO 8601");
      if (normalizedFormat === "rfc9557")
        return convertToPresentation(deps, value, "RFC 9557");
      if (normalizedFormat === "rfc2822")
        return convertToPresentation(deps, value, "RFC 2822");
      return createError(`Unknown presentation format: ${rawFormat}`);
    }
  }
}

/**
 * Convert value to presentation format or base
 * Accepts format string (binary, hex, etc.) OR numeric base (2-36)
 * Preserves units - only formats the numeric value(s)
 */
export function convertToPresentation(
  deps: EvaluatorDeps,
  value: Value,
  format: PresentationFormat | number,
): Value {
  // Don't wrap error values
  if (value.kind === "error") {
    return value;
  }

  // Handle date/time presentation formats
  const dateTimeFormats: PresentationFormat[] = [
    "ISO 8601",
    "RFC 9557",
    "RFC 2822",
    "unix",
    "unixMilliseconds",
  ];
  if (typeof format === "string" && dateTimeFormats.includes(format)) {
    // Unix timestamps: convert date/time to numeric value (seconds or milliseconds since epoch)
    if (format === "unix" || format === "unixMilliseconds") {
      return convertToUnixTimestamp(
        value,
        format === "unixMilliseconds",
      );
    }

    // String formats (ISO 8601, RFC 9557, RFC 2822): wrap date/time value for special formatting
    if (
      value.kind === "plainDate" ||
      value.kind === "plainTime" ||
      value.kind === "plainDateTime" ||
      value.kind === "zonedDateTime" ||
      value.kind === "instant"
    ) {
      return {
        kind: "presentation",
        format,
        innerValue: value,
      };
    }

    // Duration → ISO 8601 / RFC 9557 (formatter already handles it; RFC 2822 has no duration format)
    if (value.kind === "duration" && format !== "RFC 2822") {
      return {
        kind: "presentation",
        format,
        innerValue: value,
      };
    }

    // NumericValue with time unit → convert to Duration for ISO 8601 / RFC 9557
    if (
      value.kind === "value" &&
      isSimpleUnit(value) &&
      format !== "RFC 2822"
    ) {
      const unit = getUnit(value)!;
      if (unit.dimension === "time") {
        const duration = convertTimeToDuration(deps, value.value, unit);
        return {
          kind: "presentation",
          format,
          innerValue: { kind: "duration", duration } as DurationValue,
        };
      }
    }

    // CompositeUnitValue with all time components → convert to Duration for ISO 8601 / RFC 9557
    if (value.kind === "composite" && format !== "RFC 2822") {
      const allTime = value.components.every(
        (comp) => comp.unit.dimension === "time",
      );
      if (allTime) {
        const duration = convertCompositeTimeToDuration(deps, value);
        return {
          kind: "presentation",
          format,
          innerValue: { kind: "duration", duration } as DurationValue,
        };
      }
    }

    return createError(
      `${format} format requires a date/time value, got ${value.kind}`,
    );
  }

  // Validate that value is numeric type (number, derivedUnit, or composite)
  if (value.kind !== "value" && value.kind !== "composite") {
    const formatName = typeof format === "number" ? `base ${format}` : format;
    return createError(
      `${formatName} format requires a numeric value, got ${value.kind}`,
    );
  }

  // Validate base range for numeric base conversions
  if (typeof format === "number") {
    if (format < 2 || format > 36) {
      return createError(`Base must be between 2 and 36, got ${format}`);
    }
  }

  // Percentage format requires unitless numeric value
  if (format === "percentage") {
    if (value.kind !== "value") {
      return createError(
        `percentage format requires a unitless numeric value, got ${value.kind}`,
      );
    }
    if (!isDimensionless(value)) {
      return createError(
        `percentage format requires a unitless numeric value`,
      );
    }
  }

  // Ordinal format requires integers
  if (format === "ordinal") {
    if (value.kind === "value" && !Number.isInteger(value.value)) {
      return createError(
        `ordinal format requires integer values, got ${value.value}`,
      );
    } else if (value.kind === "composite") {
      for (const comp of value.components) {
        if (!Number.isInteger(comp.value)) {
          return createError(
            `ordinal format requires integer values, got ${comp.value}`,
          );
        }
      }
    }
  }

  // Wrap the value with presentation format
  return {
    kind: "presentation",
    format,
    innerValue: value,
  };
}

/**
 * Convert date/time value to Unix timestamp (seconds or milliseconds since epoch)
 */
export function convertToUnixTimestamp(value: Value, milliseconds: boolean): Value {
  let instant: Temporal.Instant;

  if (value.kind === "zonedDateTime") {
    const zdt = toTemporalZonedDateTime(value.zonedDateTime);
    instant = zdt.toInstant();
  } else if (value.kind === "instant") {
    instant = toTemporalInstant(value.instant);
  } else if (value.kind === "plainDateTime") {
    const systemTimeZone = Temporal.Now.timeZoneId();
    const pdt = toTemporalPlainDateTime(value.dateTime);
    const zdt = pdt.toZonedDateTime(systemTimeZone);
    instant = zdt.toInstant();
  } else if (value.kind === "plainDate") {
    const systemTimeZone = Temporal.Now.timeZoneId();
    const pd = toTemporalPlainDate(value.date);
    const zdt = pd.toZonedDateTime({
      timeZone: systemTimeZone,
      plainTime: "00:00:00",
    });
    instant = zdt.toInstant();
  } else {
    return createError(`Cannot convert ${value.kind} to Unix timestamp`);
  }

  // Convert to seconds or milliseconds since epoch
  const epochNanoseconds = instant.epochNanoseconds;
  const result = milliseconds
    ? Number(epochNanoseconds / 1_000_000n) // Convert to milliseconds
    : Number(epochNanoseconds / 1_000_000_000n); // Convert to seconds

  return numVal(result);
}

// ── Property extraction ─────────────────────────────────────────────

/**
 * Extract property from date/time value
 */
export function extractProperty(
  deps: EvaluatorDeps,
  value: Value,
  property: string,
): Value {
  // Map Nearley property names to internal names
  if (property === "weekday") property = "dayOfWeek";
  property = property.replace(/s$/, ""); // Remove plural 's' if present
  if (value.kind === "plainDate") {
    const date = value.date;
    const temporal = Temporal.PlainDate.from({
      year: date.year,
      month: date.month,
      day: date.day,
    });

    switch (property) {
      case "year":
        return numVal(date.year);
      case "month":
        return numVal(date.month);
      case "day":
        return numVal(date.day);
      case "dayOfWeek":
        return numVal(temporal.dayOfWeek);
      case "dayOfYear":
        return numVal(temporal.dayOfYear);
      case "weekOfYear":
        return numVal(temporal.weekOfYear ?? 0);
      default:
        return createError(`Cannot extract ${property} from PlainDate`);
    }
  }

  if (value.kind === "plainTime") {
    const time = value.time;
    switch (property) {
      case "hour":
        return numVal(time.hour);
      case "minute":
        return numVal(time.minute);
      case "second":
        return numVal(time.second);
      case "millisecond":
        return numVal(time.millisecond || 0);
      default:
        return createError(`Cannot extract ${property} from PlainTime`);
    }
  }

  if (value.kind === "plainDateTime") {
    const dt = value.dateTime;
    const temporal = Temporal.PlainDateTime.from({
      year: dt.date.year,
      month: dt.date.month,
      day: dt.date.day,
      hour: dt.time.hour,
      minute: dt.time.minute,
      second: dt.time.second,
      millisecond: dt.time.millisecond || 0,
    });

    switch (property) {
      case "year":
        return numVal(dt.date.year);
      case "month":
        return numVal(dt.date.month);
      case "day":
        return numVal(dt.date.day);
      case "hour":
        return numVal(dt.time.hour);
      case "minute":
        return numVal(dt.time.minute);
      case "second":
        return numVal(dt.time.second);
      case "millisecond":
        return numVal(dt.time.millisecond || 0);
      case "dayOfWeek":
        return numVal(temporal.dayOfWeek);
      case "dayOfYear":
        return numVal(temporal.dayOfYear);
      case "weekOfYear":
        return numVal(temporal.weekOfYear ?? 0);
      default:
        return createError(
          `Cannot extract ${property} from PlainDateTime`,
        );
    }
  }

  if (value.kind === "zonedDateTime") {
    const zdt = value.zonedDateTime;
    const temporal = Temporal.ZonedDateTime.from({
      year: zdt.dateTime.date.year,
      month: zdt.dateTime.date.month,
      day: zdt.dateTime.date.day,
      hour: zdt.dateTime.time.hour,
      minute: zdt.dateTime.time.minute,
      second: zdt.dateTime.time.second,
      millisecond: zdt.dateTime.time.millisecond || 0,
      timeZone: zdt.timezone,
    });

    switch (property) {
      case "year":
        return numVal(zdt.dateTime.date.year);
      case "month":
        return numVal(zdt.dateTime.date.month);
      case "day":
        return numVal(zdt.dateTime.date.day);
      case "hour":
        return numVal(zdt.dateTime.time.hour);
      case "minute":
        return numVal(zdt.dateTime.time.minute);
      case "second":
        return numVal(zdt.dateTime.time.second);
      case "millisecond":
        return numVal(zdt.dateTime.time.millisecond || 0);
      case "dayOfWeek":
        return numVal(temporal.dayOfWeek);
      case "dayOfYear":
        return numVal(temporal.dayOfYear);
      case "weekOfYear":
        return numVal(temporal.weekOfYear ?? 0);
      case "offset": {
        const offsetNanoseconds = temporal.offsetNanoseconds;
        if (offsetNanoseconds === 0) {
          const minuteUnit = deps.dataLoader.getUnitById("minute");
          if (!minuteUnit) {
            return createError("Minute unit not found");
          }
          return numValUnit(0, minuteUnit);
        }
        try {
          const duration = Temporal.Duration.from({
            nanoseconds: offsetNanoseconds,
          });
          const rounded = duration.round({
            largestUnit: "hour",
            smallestUnit: "minute",
          });
          return { kind: "duration", duration: rounded };
        } catch (error) {
          return createError(
            `Error creating duration for offset: ${error}`,
          );
        }
      }
      default:
        return createError(
          `Cannot extract ${property} from ZonedDateTime`,
        );
    }
  }

  if (value.kind === "instant") {
    // Convert instant to ZonedDateTime in system timezone to extract properties
    const systemTimezone = Temporal.Now.timeZoneId();
    const temporal = toTemporalInstant(value.instant).toZonedDateTimeISO(
      systemTimezone,
    );

    switch (property) {
      case "year":
        return numVal(temporal.year);
      case "month":
        return numVal(temporal.month);
      case "day":
        return numVal(temporal.day);
      case "hour":
        return numVal(temporal.hour);
      case "minute":
        return numVal(temporal.minute);
      case "second":
        return numVal(temporal.second);
      case "millisecond":
        return numVal(temporal.millisecond);
      case "dayOfWeek":
        return numVal(temporal.dayOfWeek);
      case "dayOfYear":
        return numVal(temporal.dayOfYear);
      case "weekOfYear":
        return numVal(temporal.weekOfYear ?? 0);
      case "offset": {
        const offsetNanoseconds = temporal.offsetNanoseconds;
        if (offsetNanoseconds === 0) {
          const minuteUnit = deps.dataLoader.getUnitById("minute");
          if (!minuteUnit) {
            return createError("Minute unit not found");
          }
          return numValUnit(0, minuteUnit);
        }
        try {
          const duration = Temporal.Duration.from({
            nanoseconds: offsetNanoseconds,
          });
          const rounded = duration.round({
            largestUnit: "hour",
            smallestUnit: "minute",
          });
          return { kind: "duration", duration: rounded };
        } catch (error) {
          return createError(
            `Error creating duration for offset: ${error}`,
          );
        }
      }
      default:
        return createError(`Cannot extract ${property} from Instant`);
    }
  }

  return createError(`Cannot extract property from ${value.kind}`);
}

// ── Timezone conversion ─────────────────────────────────────────────

/**
 * Convert value to timezone using Temporal polyfill
 * Plain values (PlainTime, PlainDateTime) are interpreted as being in the system's local timezone
 */
export function convertToTimezone(
  deps: EvaluatorDeps,
  value: Value,
  timezone: string,
): Value {
  // Get system's local timezone using Temporal
  const systemTimezone = Temporal.Now.timeZoneId();

  // Convert PlainTime to ZonedDateTime
  if (value.kind === "plainTime") {
    const now = Temporal.Now.plainDateTimeISO(systemTimezone);
    const plainDateTime: PlainDateTime = {
      date: { year: now.year, month: now.month, day: now.day },
      time: value.time,
    };
    const instant = deps.dateTimeEngine.toInstant(
      plainDateTime,
      systemTimezone,
    );
    const zonedDateTime = deps.dateTimeEngine.toZonedDateTime(
      instant,
      timezone,
    );
    return { kind: "zonedDateTime", zonedDateTime };
  }

  // Convert PlainDateTime to ZonedDateTime
  if (value.kind === "plainDateTime") {
    const instant = deps.dateTimeEngine.toInstant(
      value.dateTime,
      systemTimezone,
    );
    const zonedDateTime = deps.dateTimeEngine.toZonedDateTime(
      instant,
      timezone,
    );
    return { kind: "zonedDateTime", zonedDateTime };
  }

  // Convert Instant to ZonedDateTime in target timezone
  if (value.kind === "instant") {
    const zonedDateTime = deps.dateTimeEngine.toZonedDateTime(
      value.instant,
      timezone,
    );
    return { kind: "zonedDateTime", zonedDateTime };
  }

  // Convert ZonedDateTime from one timezone to another
  if (value.kind === "zonedDateTime") {
    const instant = deps.dateTimeEngine.toInstant(
      value.zonedDateTime.dateTime,
      value.zonedDateTime.timezone,
    );
    const zonedDateTime = deps.dateTimeEngine.toZonedDateTime(
      instant,
      timezone,
    );
    return { kind: "zonedDateTime", zonedDateTime };
  }

  return createError(`Cannot convert ${value.kind} to timezone`);
}

// ── Precision ───────────────────────────────────────────────────────

export function applyPrecisionToNumber(
  value: number,
  precision: number,
  mode: "decimals" | "sigfigs",
): number {
  if (mode === "decimals") {
    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
  } else {
    if (value === 0) {
      return 0;
    } else {
      const magnitude = Math.floor(Math.log10(Math.abs(value)));
      const scale = Math.pow(10, magnitude - precision + 1);
      return Math.round(value / scale) * scale;
    }
  }
}

/**
 * Apply precision specification (decimals or significant figures)
 */
export function applyPrecision(
  precision: number,
  mode: "decimals" | "sigfigs",
  value: Value,
): Value {
  if (value.kind === "value") {
    return numValTerms(
      applyPrecisionToNumber(value.value, precision, mode),
      value.terms,
      { count: precision, mode },
    );
  } else if (value.kind === "composite") {
    const adjustedComponents = value.components.map((comp) => ({
      value: applyPrecisionToNumber(comp.value, precision, mode),
      unit: comp.unit,
      precision: { count: precision, mode },
    }));
    return { kind: "composite", components: adjustedComponents };
  } else {
    return createError(`Cannot apply precision to ${value.kind}`);
  }
}

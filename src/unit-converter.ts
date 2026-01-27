import type { Unit, LinearConversion, AffineConversion, VariantConversion } from '../types/types';
import type { DataLoader } from './data-loader';

/**
 * Settings for unit conversion
 */
export interface ConversionSettings {
  variant: 'us' | 'uk'; // Which variant to use for variant conversions
}

/**
 * Result of a composite unit conversion
 */
export interface CompositeConversionResult {
  components: Array<{
    value: number;
    unitId: string;
  }>;
}

/**
 * Unit converter class
 * Handles conversions between units, including linear, affine, and variant types
 */
export class UnitConverter {
  constructor(
    private dataLoader: DataLoader,
    private settings: ConversionSettings = { variant: 'us' }
  ) {}

  /**
   * Convert a value to the base unit of its dimension
   *
   * @param value The value to convert
   * @param unit The unit the value is in
   * @returns The value in the base unit
   */
  toBaseUnit(value: number, unit: Unit): number {
    const conversion = unit.conversion;

    switch (conversion.type) {
      case 'linear':
        return this.linearToBase(value, conversion);

      case 'affine':
        return this.affineToBase(value, conversion);

      case 'variant':
        // Use the appropriate variant based on settings
        const variantConv = conversion.variants[this.settings.variant];
        if (variantConv.type === 'linear') {
          return this.linearToBase(value, variantConv);
        } else {
          return this.affineToBase(value, variantConv);
        }

      default:
        throw new Error(`Unknown conversion type: ${(conversion as any).type}`);
    }
  }

  /**
   * Convert a value from the base unit to a target unit
   *
   * @param baseValue The value in the base unit
   * @param unit The target unit
   * @returns The value in the target unit
   */
  fromBaseUnit(baseValue: number, unit: Unit): number {
    const conversion = unit.conversion;

    switch (conversion.type) {
      case 'linear':
        return this.linearFromBase(baseValue, conversion);

      case 'affine':
        return this.affineFromBase(baseValue, conversion);

      case 'variant':
        // Use the appropriate variant based on settings
        const variantConv = conversion.variants[this.settings.variant];
        if (variantConv.type === 'linear') {
          return this.linearFromBase(baseValue, variantConv);
        } else {
          return this.affineFromBase(baseValue, variantConv);
        }

      default:
        throw new Error(`Unknown conversion type: ${(conversion as any).type}`);
    }
  }

  /**
   * Convert a value from one unit to another
   *
   * @param value The value to convert
   * @param fromUnit The unit to convert from
   * @param toUnit The unit to convert to
   * @returns The converted value
   * @throws Error if units have different dimensions
   */
  convert(value: number, fromUnit: Unit, toUnit: Unit): number {
    // Check dimension compatibility
    if (fromUnit.dimension !== toUnit.dimension) {
      throw new Error(
        `Cannot convert between different dimensions: ${fromUnit.dimension} and ${toUnit.dimension}`
      );
    }

    // If same unit, no conversion needed
    if (fromUnit.id === toUnit.id) {
      return value;
    }

    // Convert: value → base → target
    const baseValue = this.toBaseUnit(value, fromUnit);
    return this.fromBaseUnit(baseValue, toUnit);
  }

  /**
   * Convert a composite unit value to another composite unit
   *
   * Example: 5 ft 7.32 in → cm (returns all in cm)
   * Example: 171 cm → [ft, in] (returns 5 ft 7.32 in)
   *
   * Algorithm:
   * 1. Convert all source components to base unit and sum
   * 2. Distribute to target units (largest to smallest)
   * 3. Integer parts for all except last unit
   *
   * @param components Source components with values and units
   * @param targetUnitIds Target unit IDs (in order: largest to smallest)
   * @returns Array of {value, unitId} for each target unit
   */
  convertComposite(
    components: Array<{ value: number; unitId: string }>,
    targetUnitIds: string[]
  ): CompositeConversionResult {
    // Validate that all components have same dimension
    const sourceUnits = components.map(c => {
      const unit = this.dataLoader.getUnitById(c.unitId);
      if (!unit) {
        throw new Error(`Unknown unit ID: ${c.unitId}`);
      }
      return unit;
    });

    const dimension = sourceUnits[0].dimension;
    for (const unit of sourceUnits) {
      if (unit.dimension !== dimension) {
        throw new Error(
          `All composite unit components must have same dimension. Found: ${unit.dimension}, expected: ${dimension}`
        );
      }
    }

    // Get target units
    const targetUnits = targetUnitIds.map(id => {
      const unit = this.dataLoader.getUnitById(id);
      if (!unit) {
        throw new Error(`Unknown unit ID: ${id}`);
      }
      if (unit.dimension !== dimension) {
        throw new Error(
          `Target unit ${id} has wrong dimension: ${unit.dimension}, expected: ${dimension}`
        );
      }
      return unit;
    });

    // Step 1: Convert all source components to base unit and sum
    let totalInBaseUnit = 0;
    for (let i = 0; i < components.length; i++) {
      const baseValue = this.toBaseUnit(components[i].value, sourceUnits[i]);
      totalInBaseUnit += baseValue;
    }

    // Step 2: Distribute to target units (largest to smallest)
    const result: CompositeConversionResult = { components: [] };
    let remaining = totalInBaseUnit;

    for (let i = 0; i < targetUnits.length; i++) {
      const targetUnit = targetUnits[i];
      const isLastUnit = i === targetUnits.length - 1;

      // Convert remaining base value to this unit
      const valueInTargetUnit = this.fromBaseUnit(remaining, targetUnit);

      if (isLastUnit) {
        // Last unit: use all remaining value (with decimals)
        result.components.push({
          value: valueInTargetUnit,
          unitId: targetUnit.id
        });
        remaining = 0;
      } else {
        // Not last unit: take integer part only
        const integerPart = Math.floor(valueInTargetUnit);
        result.components.push({
          value: integerPart,
          unitId: targetUnit.id
        });

        // Update remaining by converting integer part back to base and subtracting
        const usedInBaseUnit = this.toBaseUnit(integerPart, targetUnit);
        remaining -= usedInBaseUnit;
      }
    }

    return result;
  }

  // Private helper methods for conversion formulas

  private linearToBase(value: number, conversion: LinearConversion): number {
    return value * conversion.factor;
  }

  private linearFromBase(baseValue: number, conversion: LinearConversion): number {
    return baseValue / conversion.factor;
  }

  private affineToBase(value: number, conversion: AffineConversion): number {
    return (value + conversion.offset) * conversion.factor;
  }

  private affineFromBase(baseValue: number, conversion: AffineConversion): number {
    return baseValue / conversion.factor - conversion.offset;
  }

  /**
   * Update conversion settings
   */
  setSettings(settings: Partial<ConversionSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get current settings
   */
  getSettings(): ConversionSettings {
    return { ...this.settings };
  }
}

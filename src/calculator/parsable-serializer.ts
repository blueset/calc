/**
 * Parsable serializer (issue #2).
 *
 * Produces a grammar-parsable string for a {@link Value} such that parsing and
 * evaluating it yields the same underlying value (round-trip identity). The
 * heavy lifting lives in {@link Formatter.formatParsable}; this module just
 * constructs a Formatter with parsability-canonicalized settings.
 */

import type { Value } from "./evaluator";
import type { Settings } from "./settings";
import type { DataLoader } from "./data-loader";
import { Formatter } from "./formatter";

/**
 * Override the settings that must be canonicalized for parsable output:
 * decimal separator ".", digit grouping separator "_", and date format
 * "YYYY-MM-DD" (no weekday). All other style settings (grouping size, time
 * format, date-time order, unit style, precision) are respected.
 */
export function parsableSettings(settings: Settings): Settings {
  return {
    ...settings,
    decimalSeparator: ".",
    digitGroupingSeparator: "_",
    dateFormat: "YYYY-MM-DD",
  };
}

/** Serialize a value to a parsable string under the given user settings. */
export function serializeParsable(
  value: Value,
  settings: Settings,
  dataLoader?: DataLoader,
): string {
  const formatter = new Formatter(parsableSettings(settings), dataLoader);
  return formatter.formatParsable(value);
}

import { Value } from "@/calculator/evaluator";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Temporal } from "@js-temporal/polyfill";

interface ResultRawValueProps {
  rawValue: Value;
}

function PricisionBadge({
  precision,
}: {
  precision: { count: number; mode: "decimals" | "sigfigs" };
}) {
  return (
    <Badge className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
      Precision: {precision.count}{" "}
      {precision.mode === "decimals" ? "decimal" : "significant figure"}
      {precision.count > 1 ? "s" : ""}
    </Badge>
  );
}

function RawValueInfo({ rawValue }: { rawValue: Value }) {
  switch (rawValue.kind) {
    case "number": {
      console.log(rawValue);
      return (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
              Number
            </Badge>
            {rawValue.value}
            {!!rawValue.unit && (
              <Badge className="bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                {rawValue.unit.displayName.singular}
                {rawValue.unit.id.startsWith("currency_symbol_")
                  ? " (ambiguous currency)"
                  : rawValue.unit.dimension.startsWith("user_defined_")
                    ? " (user defined)"
                    : null}
              </Badge>
            )}
            {!!rawValue.precision && (
              <PricisionBadge precision={rawValue.precision} />
            )}
          </div>
        </>
      );
    }
    case "derivedUnit": {
      return (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Derived Unit
            </Badge>
            {rawValue.value}
            {rawValue.terms.map((term) => (
              <Badge className="gap-0 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                {term.unit.displayName.singular}
                {term.exponent !== 1 && <sup>{term.exponent}</sup>}
                {term.unit.id.startsWith("currency_symbol_")
                  ? " (ambiguous currency)"
                  : term.unit.dimension.startsWith("user_defined_")
                    ? " (user defined)"
                    : null}
              </Badge>
            ))}
            {!!rawValue.precision && (
              <PricisionBadge precision={rawValue.precision} />
            )}
          </div>
        </>
      );
    }
    case "composite": {
      return (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300">
              Composite
            </Badge>
          </div>
          {rawValue.components.map((comp, index) => (
            <RawValueInfo key={index} rawValue={{ kind: "number", ...comp }} />
          ))}
        </>
      );
    }
    case "presentation": {
      return (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
              Presentation:{" "}
              {typeof rawValue.format === "number"
                ? `Base ${rawValue.format}`
                : rawValue.format
                    .replace(/(^[a-z])/, (m) => m.toUpperCase())
                    .replace(/(?<=[a-z])([A-Z])/g, " $1")
                    .replace(/^Unix$/, "Unix Seconds")}
            </Badge>
          </div>
          <RawValueInfo rawValue={rawValue.innerValue} />
        </>
      );
    }
    case "boolean": {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
            Boolean
          </Badge>
          <Badge
            className={
              rawValue.value
                ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
            }
          >
            {rawValue.value.toString()}
          </Badge>
        </div>
      );
    }
    case "error": {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="destructive">{rawValue.error.type}</Badge>
        </div>
      );
    }
    case "plainDate": {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
            Plain Date
          </Badge>
          {rawValue.date.year}-{rawValue.date.month.toString().padStart(2, "0")}
          -{rawValue.date.day.toString().padStart(2, "0")}
        </div>
      );
    }
    case "plainTime": {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
            Plain Time
          </Badge>
          {rawValue.time.hour.toString().padStart(2, "0")}:
          {rawValue.time.minute.toString().padStart(2, "0")}:
          {rawValue.time.second.toString().padStart(2, "0")}.
          {rawValue.time.millisecond.toString().padStart(3, "0")}
        </div>
      );
    }
    case "instant": {
      const date = Temporal.Instant.fromEpochMilliseconds(
        rawValue.instant.timestamp,
      ).toString();
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
            Instant
          </Badge>
          {date}
        </div>
      );
    }
    case "plainDateTime": {
      return (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Plain Date Time
            </Badge>
          </div>
          <RawValueInfo
            rawValue={{
              kind: "plainDate",
              date: rawValue.dateTime.date,
            }}
          />
          <RawValueInfo
            rawValue={{
              kind: "plainTime",
              time: rawValue.dateTime.time,
            }}
          />
        </>
      );
    }
    case "zonedDateTime": {
      return (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-300">
              Zoned Date Time
            </Badge>
            <Badge className="bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300">
              {rawValue.zonedDateTime.timezone}
            </Badge>
          </div>
          <RawValueInfo
            rawValue={{
              kind: "plainDateTime",
              dateTime: rawValue.zonedDateTime.dateTime,
            }}
          />
        </>
      );
    }
    case "duration": {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
            Duration
          </Badge>
          P{rawValue.duration.years > 0 && `${rawValue.duration.years}Y`}
          {rawValue.duration.months > 0 && `${rawValue.duration.months}M`}
          {rawValue.duration.weeks > 0 && `${rawValue.duration.weeks}W`}
          {rawValue.duration.days > 0 && `${rawValue.duration.days}D`}
          {rawValue.duration.hours > 0 ||
          rawValue.duration.minutes > 0 ||
          rawValue.duration.seconds > 0
            ? "T"
            : ""}
          {rawValue.duration.hours > 0 && `${rawValue.duration.hours}H`}
          {rawValue.duration.minutes > 0 && `${rawValue.duration.minutes}M`}
          {rawValue.duration.seconds > 0 && `${rawValue.duration.seconds}S`}
          {rawValue.duration.milliseconds > 0 &&
            `${rawValue.duration.milliseconds}MS`}
        </div>
      );
    }
    default:
      const _exhaustiveCheck: never = rawValue;
      return <>{_exhaustiveCheck}</>;
  }
}

export function ResultRawValue({ rawValue }: ResultRawValueProps) {
  return (
    <div className="space-y-2">
      <Separator />
      <div className="text-muted-foreground text-xs">Value:</div>
      <RawValueInfo rawValue={rawValue} />
    </div>
  );
}

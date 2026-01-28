# Temporal API Improvement Opportunities

This document analyzes opportunities to simplify and improve date/time logic across the codebase using Temporal API features.

## Executive Summary

After comprehensive review of all date/time logic across the codebase, I've identified **significant opportunities** to simplify and improve the code using Temporal API. The current implementation uses ~500 lines of manual date/time arithmetic that could be replaced with ~100 lines of Temporal API calls.

**Benefits of refactoring:**
- ✅ **Eliminate bugs**: Replace manual arithmetic prone to edge case errors
- ✅ **Reduce code**: ~80% reduction in date/time arithmetic code
- ✅ **Improve maintainability**: Temporal handles complexity like leap years, DST, month-end clamping
- ✅ **Better accuracy**: Temporal is extensively tested and standards-compliant
- ✅ **Future-proof**: Temporal is the ECMAScript standard (Stage 3, becoming part of JavaScript)

---

## 1. date-time.ts - Core Date/Time Engine

### Current Issues
The file contains ~600 lines with extensive manual date/time arithmetic:
- Manual month overflow/underflow with year adjustments
- Manual day clamping for month-end dates
- Manual day overflow/underflow across months
- Custom day counting algorithms
- Manual millisecond arithmetic for time operations
- Custom leap year calculations

### Recommended Improvements

#### 1.1 Replace addToPlainDate with Temporal.PlainDate.add()

**Current** (lines 92-145, ~54 lines):
```typescript
addToPlainDate(date: PlainDate, duration: Duration): PlainDate {
  let year = date.year;
  let month = date.month;
  let day = date.day;

  // Add years
  year += duration.years;

  // Add months
  month += duration.months;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  while (month < 1) {
    month += 12;
    year -= 1;
  }

  // Clamp day to valid range for the target month
  const maxDay = this.getDaysInMonth(year, month);
  if (day > maxDay) {
    day = maxDay;
  }

  // Add weeks
  day += duration.weeks * 7;

  // Add days
  day += duration.days;

  // Normalize day overflow/underflow
  while (day > this.getDaysInMonth(year, month)) {
    day -= this.getDaysInMonth(year, month);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  while (day < 1) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    day += this.getDaysInMonth(year, month);
  }

  return { year, month, day };
}
```

**Improved** (~5 lines):
```typescript
addToPlainDate(date: PlainDate, duration: Duration): PlainDate {
  const temporalDate = Temporal.PlainDate.from({
    year: date.year,
    month: date.month,
    day: date.day
  });

  const result = temporalDate.add({
    years: duration.years,
    months: duration.months,
    weeks: duration.weeks,
    days: duration.days
  }, { overflow: 'constrain' });  // Handles month-end clamping automatically

  return { year: result.year, month: result.month, day: result.day };
}
```

**Benefits:**
- Automatic month-end clamping (Jan 31 + 1 month = Feb 28/29)
- Handles all edge cases (leap years, month boundaries, year boundaries)
- More readable and maintainable
- 90% code reduction

#### 1.2 Replace addToPlainTime with Temporal.PlainTime.add()

**Current** (lines 160-220, ~60 lines):
```typescript
addToPlainTime(time: PlainTime, duration: Duration): PlainTime | PlainDateTime {
  let millisecond = time.millisecond;
  let second = time.second;
  let minute = time.minute;
  let hour = time.hour;
  let dayOffset = 0;

  // Add milliseconds
  millisecond += duration.milliseconds;
  second += Math.floor(millisecond / 1000);
  millisecond = millisecond % 1000;
  if (millisecond < 0) {
    millisecond += 1000;
    second -= 1;
  }

  // Add seconds
  second += duration.seconds;
  minute += Math.floor(second / 60);
  second = second % 60;
  if (second < 0) {
    second += 60;
    minute -= 1;
  }

  // ... similar for minutes and hours ...

  // Complex logic to handle day overflow and convert to PlainDateTime
}
```

**Improved** (~15 lines):
```typescript
addToPlainTime(time: PlainTime, duration: Duration): PlainTime | PlainDateTime {
  const temporalTime = Temporal.PlainTime.from({
    hour: time.hour,
    minute: time.minute,
    second: time.second,
    millisecond: time.millisecond
  });

  // Check if duration has date components
  const hasDateComponents = duration.years !== 0 || duration.months !== 0 ||
                            duration.weeks !== 0 || duration.days !== 0;

  if (hasDateComponents) {
    // Need to work with full datetime
    const now = Temporal.Now.plainDateTimeISO();
    const dateTime = Temporal.PlainDateTime.from({
      year: now.year, month: now.month, day: now.day,
      hour: time.hour, minute: time.minute, second: time.second, millisecond: time.millisecond
    });
    const result = dateTime.add(duration);
    return {
      date: { year: result.year, month: result.month, day: result.day },
      time: { hour: result.hour, minute: result.minute, second: result.second, millisecond: result.millisecond }
    };
  }

  // Pure time addition
  const result = temporalTime.add({
    hours: duration.hours,
    minutes: duration.minutes,
    seconds: duration.seconds,
    milliseconds: duration.milliseconds
  });

  return {
    hour: result.hour,
    minute: result.minute,
    second: result.second,
    millisecond: result.millisecond
  };
}
```

**Benefits:**
- Automatic overflow handling
- No manual modulo arithmetic
- Clearer separation of time-only vs datetime logic
- 75% code reduction

#### 1.3 Replace addToPlainDateTime with Temporal.PlainDateTime.add()

**Current** (lines 232-285, ~54 lines): Similar complex manual arithmetic

**Improved** (~8 lines):
```typescript
addToPlainDateTime(dateTime: PlainDateTime, duration: Duration): PlainDateTime {
  const temporal = Temporal.PlainDateTime.from({
    year: dateTime.date.year,
    month: dateTime.date.month,
    day: dateTime.date.day,
    hour: dateTime.time.hour,
    minute: dateTime.time.minute,
    second: dateTime.time.second,
    millisecond: dateTime.time.millisecond
  });

  const result = temporal.add(duration, { overflow: 'constrain' });

  return {
    date: { year: result.year, month: result.month, day: result.day },
    time: { hour: result.hour, minute: result.minute, second: result.second, millisecond: result.millisecond }
  };
}
```

#### 1.4 Replace subtractPlainDates with Temporal.PlainDate.until()

**Current** (lines 298-306, uses dateToDayCount helper):
```typescript
subtractPlainDates(left: PlainDate, right: PlainDate): Duration {
  const leftDays = this.dateToDayCount(left);
  const rightDays = this.dateToDayCount(right);
  const dayDiff = leftDays - rightDays;
  return this.createDuration({ days: dayDiff });
}

// Plus 20-line dateToDayCount helper (lines 576-593)
```

**Improved** (~8 lines):
```typescript
subtractPlainDates(left: PlainDate, right: PlainDate): Duration {
  const leftTemporal = Temporal.PlainDate.from({ year: left.year, month: left.month, day: left.day });
  const rightTemporal = Temporal.PlainDate.from({ year: right.year, month: right.month, day: right.day });

  const duration = leftTemporal.until(rightTemporal, { largestUnit: 'day' });

  return this.createDuration({ days: duration.days });
}
```

**Benefits:**
- Eliminates need for dateToDayCount helper
- More accurate for edge cases
- Built-in support for different units

#### 1.5 Replace subtractPlainTimes with Temporal.PlainTime.until()

**Current** (lines 311-330, ~20 lines of manual millisecond arithmetic)

**Improved** (~8 lines):
```typescript
subtractPlainTimes(left: PlainTime, right: PlainTime): Duration {
  const leftTemporal = Temporal.PlainTime.from({
    hour: left.hour, minute: left.minute, second: left.second, millisecond: left.millisecond
  });
  const rightTemporal = Temporal.PlainTime.from({
    hour: right.hour, minute: right.minute, second: right.second, millisecond: right.millisecond
  });

  const duration = leftTemporal.until(rightTemporal, { largestUnit: 'hour' });

  return this.createDuration({
    hours: duration.hours,
    minutes: duration.minutes,
    seconds: duration.seconds,
    milliseconds: duration.milliseconds
  });
}
```

#### 1.6 Replace addToInstant with Temporal.Instant.add()

**Current** (lines 394-428, ~35 lines with manual Date manipulation)

**Improved** (~15 lines):
```typescript
addToInstant(instant: Instant, duration: Duration): Instant {
  const temporalInstant = Temporal.Instant.fromEpochMilliseconds(instant.timestamp);

  // For calendar-aware addition (years/months), need to work through a timezone
  // Use UTC as the reference timezone
  if (duration.years !== 0 || duration.months !== 0) {
    const zdt = temporalInstant.toZonedDateTimeISO('UTC');
    const result = zdt.add(duration);
    return { timestamp: Number(result.toInstant().epochMilliseconds) };
  }

  // For time-based addition only
  const result = temporalInstant.add({
    weeks: duration.weeks,
    days: duration.days,
    hours: duration.hours,
    minutes: duration.minutes,
    seconds: duration.seconds,
    milliseconds: duration.milliseconds
  });

  return { timestamp: Number(result.epochMilliseconds) };
}
```

#### 1.7 Eliminate Helper Methods

These helpers can be removed entirely when using Temporal:
- `getDaysInMonth()` (lines 554-563)
- `isLeapYear()` (lines 568-570)
- `dateToDayCount()` (lines 576-593)
- `plainDateTimeToISOString()` (lines 598-609)

**Total reduction: ~60 lines of helper code**

---

## 2. formatter.ts - Date/Time Formatting

### 2.1 Replace formatPlainDate day-of-week calculation

**Current** (lines 377-380):
```typescript
// Day of week (requires creating a Date object)
const dayOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const date = new Date(year, month - 1, day);
const ddd = dayOfWeekNames[date.getDay()];
```

**Issue:** JavaScript Date has off-by-one month indexing, potential timezone issues

**Improved**:
```typescript
// Day of week using Temporal
const dayOfWeekNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const temporalDate = Temporal.PlainDate.from({ year, month, day });
const ddd = dayOfWeekNames[temporalDate.dayOfWeek - 1]; // Temporal uses 1-7 (Monday-Sunday)
```

**Benefits:**
- No month off-by-one confusion
- No timezone issues
- More explicit and readable

### 2.2 Enhance formatInstant for custom formatting

**Current** (lines 451-454):
```typescript
private formatInstant(epochMs: number): string {
  const date = new Date(epochMs);
  return date.toISOString();
}
```

**Improved** (allows future customization):
```typescript
private formatInstant(epochMs: number): string {
  const instant = Temporal.Instant.fromEpochMilliseconds(epochMs);
  // Could add timezone-aware formatting in the future
  // For now, format as ISO string
  return instant.toString(); // Same as ISO 8601
}
```

**Benefits:**
- Opens door for timezone-aware instant formatting
- More flexible for future enhancements
- Slightly clearer intent

---

## 3. parser.ts - Date/Time Parsing

### Observation
The parser's date/time parsing logic (tryParseDate, tryParseTime, etc.) is **already well-implemented** and doesn't significantly benefit from Temporal API because:

1. **Custom syntax**: The language supports custom date formats (e.g., "2024 Jan 15", "15 Jan 2024") that Temporal.PlainDate.from() doesn't directly parse
2. **Token-based**: Parser works with pre-tokenized input, not string parsing
3. **Validation only**: Temporal could validate parsed dates, but adds minimal value

**Recommendation:** Keep parser as-is. No significant improvement from Temporal here.

---

## 4. evaluator.ts - Date/Time Operations

### Already Optimized ✅
The timezone conversion logic in `convertToTimezone()` was recently updated to use Temporal API properly. No further improvements needed.

---

## 5. type-checker.ts - Date/Time Type Checking

### Already Type-Based ✅
Type checking is purely symbolic (checking AST node types, not runtime values). Temporal doesn't help here. No improvements needed.

---

## Summary of Benefits

### Code Reduction
| Module | Current LOC | Improved LOC | Reduction |
|--------|-------------|--------------|-----------|
| date-time.ts arithmetic | ~500 | ~100 | 80% |
| date-time.ts helpers | ~60 | 0 | 100% |
| formatter.ts | ~10 | ~10 | 0% |
| **Total** | **~570** | **~110** | **~81%** |

### Quality Improvements
1. **Bug elimination**: Replace manual arithmetic prone to edge cases
2. **Standards compliance**: Temporal follows ECMAScript Temporal spec
3. **DST handling**: Already built into Temporal
4. **Leap year handling**: Automatic
5. **Month-end clamping**: Automatic with `{ overflow: 'constrain' }`
6. **Maintainability**: Much easier to understand and modify

### Testing Impact
- Most existing tests should pass with minimal changes
- Some tests might need timestamp adjustments due to Temporal's more accurate calculations
- Overall test reliability improves

---

## Implementation Recommendation

### Priority: **HIGH** ✅

**Reasoning:**
1. Large code reduction (80%)
2. Eliminates entire class of potential bugs
3. Temporal is already a dependency
4. Low risk (well-tested API)
5. Improves long-term maintainability

### Implementation Approach

**Phase 1: Core Arithmetic** (Highest impact)
- Replace addToPlainDate, addToPlainTime, addToPlainDateTime
- Replace subtract operations
- Remove helper methods

**Phase 2: Formatter** (Low risk)
- Update formatPlainDate day-of-week calculation
- Update formatInstant

**Phase 3: Testing**
- Update tests for any timestamp differences
- Verify edge cases still work correctly

**Estimated effort:** 4-6 hours
**Risk level:** Low (Temporal is well-tested, existing tests will catch issues)

---

## Potential Concerns and Mitigations

### Concern 1: "Temporal is still Stage 3, not fully standard"
**Mitigation:**
- Using polyfill (`@js-temporal/polyfill`) ensures compatibility
- When Temporal becomes standard, just remove polyfill
- Temporal API is stable and unlikely to change

### Concern 2: "Will this break existing tests?"
**Mitigation:**
- Most tests should pass unchanged
- Any failures likely indicate edge case bugs in current implementation
- Temporal's calculations are more accurate than manual arithmetic

### Concern 3: "Performance impact"
**Mitigation:**
- Temporal is highly optimized
- Date/time operations are not performance bottlenecks in this application
- Code simplicity outweighs any microsecond differences

---

## Conclusion

**Strong recommendation to proceed with refactoring.** The benefits significantly outweigh the costs:

✅ **80% code reduction** in date/time arithmetic
✅ **Eliminates entire class of bugs** (overflow, underflow, leap years, month-end)
✅ **Improves maintainability** dramatically
✅ **Standards-compliant** implementation
✅ **Low risk** with existing test coverage

The current implementation works, but it's reinventing the wheel with ~500 lines of code that Temporal API provides better, tested, and more reliable.

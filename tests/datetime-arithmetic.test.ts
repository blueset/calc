import { describe, it, expect, beforeAll } from 'vitest';
import { Evaluator, Value, PlainDateValue, PlainTimeValue, PlainDateTimeValue, InstantValue, ZonedDateTimeValue, DurationValue } from '../src/evaluator';
import { DataLoader } from '../src/data-loader';
import { Calculator } from '../src/calculator';
import * as path from 'path';

/**
 * Test suite for the new datetime/duration arithmetic operations
 * Implements functionality from SPECS.md lines 841-945
 */

let dataLoader: DataLoader;
let evaluator: Evaluator;

beforeAll(async () => {
  dataLoader = new DataLoader();
  dataLoader.load();
  evaluator = new Evaluator(dataLoader, { variant: 'us', angleUnit: 'radian' });
});

// Helper to parse and evaluate an expression string
function evaluate(input: string): Value {
  const calculator = new Calculator(dataLoader);
  const result = calculator.parse(input);
  const document = result.ast;

  const results = evaluator.evaluateDocument(document);

  // Get the first line's result
  const firstLine = document.lines[0];
  return results.get(firstLine) || { kind: 'error', error: { type: 'RuntimeError', message: 'No result' } };
}

describe('DateTime Arithmetic - New Operations', () => {
  describe('PlainDate + PlainTime → PlainDateTime', () => {
    it('should combine PlainDate and PlainTime into PlainDateTime', () => {
      const result = evaluate('Jan 15 2024 + 12:30:00') as PlainDateTimeValue;
      expect(result.kind).toBe('plainDateTime');
      expect(result.dateTime.date.year).toBe(2024);
      expect(result.dateTime.date.month).toBe(1);
      expect(result.dateTime.date.day).toBe(15);
      expect(result.dateTime.time.hour).toBe(12);
      expect(result.dateTime.time.minute).toBe(30);
      expect(result.dateTime.time.second).toBe(0);
    });

    it('should combine PlainDate with afternoon time', () => {
      const result = evaluate('Jun 20 2024 + 18:45:30') as PlainDateTimeValue;
      expect(result.kind).toBe('plainDateTime');
      expect(result.dateTime.date.year).toBe(2024);
      expect(result.dateTime.date.month).toBe(6);
      expect(result.dateTime.date.day).toBe(20);
      expect(result.dateTime.time.hour).toBe(18);
      expect(result.dateTime.time.minute).toBe(45);
      expect(result.dateTime.time.second).toBe(30);
    });
  });

  describe('PlainDateTime - PlainDateTime → Duration', () => {
    it('should subtract two PlainDateTimes to get duration', () => {
      const result = evaluate('Jan 15 2024 12:00:00 - Jan 15 2024 08:00:00') as DurationValue;
      expect(result.kind).toBe('duration');
      expect(result.duration.hours).toBe(4);
      expect(result.duration.minutes).toBe(0);
    });

    it('should handle PlainDateTime subtraction across dates', () => {
      const result = evaluate('Jan 16 2024 02:00:00 - Jan 15 2024 22:00:00') as DurationValue;
      expect(result.kind).toBe('duration');
      expect(result.duration.hours).toBe(4);
    });

    it('should handle PlainDateTime subtraction with negative result', () => {
      const result = evaluate('Jan 15 2024 08:00:00 - Jan 15 2024 12:00:00') as DurationValue;
      expect(result.kind).toBe('duration');
      expect(result.duration.hours).toBe(-4);
    });
  });

  describe('Instant Arithmetic', () => {
    it('should add duration to instant', () => {
      const result = evaluate('now + 5 days') as InstantValue;
      expect(result.kind).toBe('instant');
    });

    it('should subtract duration from instant', () => {
      const result = evaluate('today - 5 days') as InstantValue;
      expect(result.kind).toBe('instant');
    });

    it('should subtract two instants to get duration', () => {
      const result = evaluate('5 days from now - now') as DurationValue;
      expect(result.kind).toBe('duration');
      expect(result.duration.days).toBe(5);
    });

    it('should handle instant created with ago', () => {
      const result = evaluate('now - 3 hours ago') as DurationValue;
      expect(result.kind).toBe('duration');
      expect(result.duration.hours).toBe(3);
    });
  });

  describe('ZonedDateTime Arithmetic', () => {
    it('should add duration to ZonedDateTime', () => {
      const result = evaluate('Jan 15 2024 10:00:00 America/New_York + 5 hours') as ZonedDateTimeValue;
      expect(result.kind).toBe('zonedDateTime');
      expect(result.zonedDateTime.dateTime.time.hour).toBe(15);
    });

    it('should subtract duration from ZonedDateTime', () => {
      const result = evaluate('Jan 15 2024 10:00:00 America/New_York - 2 hours') as ZonedDateTimeValue;
      expect(result.kind).toBe('zonedDateTime');
      expect(result.zonedDateTime.dateTime.time.hour).toBe(8);
    });

    it('should subtract two ZonedDateTimes', () => {
      const result = evaluate('Jan 15 2024 15:00:00 America/New_York - Jan 15 2024 10:00:00 America/New_York') as DurationValue;
      expect(result.kind).toBe('duration');
      expect(result.duration.hours).toBe(5);
    });
  });

  describe('Cross-Type Subtraction - PlainDateTime from Plain types', () => {
    it('should subtract PlainDate from PlainDateTime', () => {
      const result = evaluate('Jan 15 2024 12:00:00 - Jan 15 2024') as DurationValue;
      expect(result.kind).toBe('duration');
      expect(result.duration.hours).toBe(12);
    });

    it('should subtract PlainTime from PlainDateTime', () => {
      const result = evaluate('Jan 15 2024 12:00:00 - 08:00:00') as DurationValue;
      expect(result.kind).toBe('duration');
    });

    it('should subtract PlainDateTime from PlainDate', () => {
      const result = evaluate('Jan 16 2024 - Jan 15 2024 12:00:00') as DurationValue;
      expect(result.kind).toBe('duration');
      expect(result.duration.hours).toBe(12);
    });

    it('should subtract PlainDateTime from PlainTime', () => {
      const result = evaluate('12:00:00 - Jan 1 2024 08:00:00') as DurationValue;
      expect(result.kind).toBe('duration');
    });
  });

  describe('Cross-Type Subtraction - PlainDate and PlainTime', () => {
    it('should subtract PlainDate from PlainTime', () => {
      const result = evaluate('12:30:00 - Jan 1 2024') as DurationValue;
      expect(result.kind).toBe('duration');
    });

    it('should subtract PlainTime from PlainDate', () => {
      const result = evaluate('Jan 15 2024 - 08:00:00') as DurationValue;
      expect(result.kind).toBe('duration');
    });
  });

  describe('Cross-Type Subtraction - Instant and Plain types', () => {
    it('should subtract PlainDate from Instant', () => {
      const result = evaluate('5 days from now - Jan 15 2024') as DurationValue;
      expect(result.kind).toBe('duration');
    });

    it('should subtract PlainTime from Instant', () => {
      const result = evaluate('now - 08:00:00') as DurationValue;
      expect(result.kind).toBe('duration');
    });

    it('should subtract PlainDateTime from Instant', () => {
      const result = evaluate('now - Jan 15 2024 00:00:00') as DurationValue;
      expect(result.kind).toBe('duration');
    });

    it('should subtract Instant from PlainDate', () => {
      const result = evaluate('Jan 20 2024 - yesterday') as DurationValue;
      expect(result.kind).toBe('duration');
    });

    it('should subtract Instant from PlainTime', () => {
      const result = evaluate('12:00:00 - 3 hours ago') as DurationValue;
      expect(result.kind).toBe('duration');
    });

    it('should subtract Instant from PlainDateTime', () => {
      const result = evaluate('Jan 20 2024 00:00:00 - yesterday') as DurationValue;
      expect(result.kind).toBe('duration');
    });
  });

  describe('Cross-Type Subtraction - ZonedDateTime and Plain types', () => {
    it('should subtract PlainDate from ZonedDateTime', () => {
      const result = evaluate('Jan 20 2024 12:00:00 UTC - Jan 15 2024') as DurationValue;
      expect(result.kind).toBe('duration');
    });

    it('should subtract PlainDateTime from ZonedDateTime', () => {
      const result = evaluate('Jan 20 2024 12:00:00 UTC - Jan 15 2024 08:00:00') as DurationValue;
      expect(result.kind).toBe('duration');
    });

    it('should subtract Instant from ZonedDateTime', () => {
      const result = evaluate('Jan 20 2024 00:00:00 UTC - yesterday') as DurationValue;
      expect(result.kind).toBe('duration');
    });

    it('should subtract ZonedDateTime from PlainDate', () => {
      const result = evaluate('Jan 20 2024 - Jan 15 2024 00:00:00 UTC') as DurationValue;
      expect(result.kind).toBe('duration');
    });

    it('should subtract ZonedDateTime from PlainTime', () => {
      const result = evaluate('12:00:00 - Jan 15 2024 08:00:00 UTC') as DurationValue;
      expect(result.kind).toBe('duration');
    });

    it('should subtract ZonedDateTime from PlainDateTime', () => {
      const result = evaluate('Jan 20 2024 00:00:00 - Jan 15 2024 00:00:00 UTC') as DurationValue;
      expect(result.kind).toBe('duration');
    });
  });

  describe('Duration Semantic Combinations', () => {
    it('should combine date and time durations via datetime operations', () => {
      // Time units are added as regular numbers, converting to a common unit
      const result = evaluate('Jan 15 2024 + (1 day + 2 hours)') as PlainDateTimeValue;
      expect(result.kind).toBe('plainDateTime');
      expect(result.dateTime.date.day).toBe(16);
      expect(result.dateTime.time.hour).toBe(2);
    });

    it('should handle duration arithmetic with date operations', () => {
      // Adding duration to date creates datetime when there are time components
      const result = evaluate('Jan 15 2024 + 1 day + 5 hours') as PlainDateTimeValue;
      expect(result.kind).toBe('plainDateTime');
      expect(result.dateTime.date.day).toBe(16);
      expect(result.dateTime.time.hour).toBe(5);
    });

    it('should handle multiple duration additions to datetime', () => {
      const result = evaluate('Jan 15 2024 12:00:00 + 1 day + 2 hours') as PlainDateTimeValue;
      expect(result.kind).toBe('plainDateTime');
      expect(result.dateTime.date.day).toBe(16);
      expect(result.dateTime.time.hour).toBe(14);
    });

    it('should handle subtraction of durations from datetime', () => {
      const result = evaluate('Jan 15 2024 12:00:00 - 5 hours - 30 minutes') as PlainDateTimeValue;
      expect(result.kind).toBe('plainDateTime');
      expect(result.dateTime.time.hour).toBe(6);
      expect(result.dateTime.time.minute).toBe(30);
    });
  });

  describe('Edge Cases', () => {
    it('should handle adding PlainDate to Duration', () => {
      const result = evaluate('Jan 15 2024 + (5 days)') as PlainDateValue;
      expect(result.kind).toBe('plainDate');
      expect(result.date.year).toBe(2024);
      expect(result.date.month).toBe(1);
      expect(result.date.day).toBe(20);
    });

    it('should handle negative durations in date arithmetic', () => {
      const result = evaluate('Jan 15 2024 + (-5 days)') as PlainDateValue;
      expect(result.kind).toBe('plainDate');
      expect(result.date.year).toBe(2024);
      expect(result.date.month).toBe(1);
      expect(result.date.day).toBe(10);
    });

    it('should error on unsupported operation: PlainDate + PlainDate', () => {
      const result = evaluate('Jan 15 2024 + Jan 20 2024');
      expect(result.kind).toBe('error');
    });
  });
});

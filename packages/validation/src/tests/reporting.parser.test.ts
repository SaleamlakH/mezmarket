import { describe, it, expect } from 'vitest';
import {
  validateMemberPerformanceQuery,
  validatePaymentSummaryQuery,
  validatePeriodQuery,
  validateTrendQuery,
} from '../parser.js';

const FROM = '2026-01-01T00:00:00.000Z';
const TO = '2026-01-02T00:00:00.000Z';

describe('validatePeriodQuery', () => {
  it('parses both bounds into Dates', () => {
    const result = validatePeriodQuery({ from: FROM, to: TO });

    expect(result.errors).toBeNull();
    expect(result.data?.from).toEqual(new Date(FROM));
    expect(result.data?.to).toEqual(new Date(TO));
  });

  it('accepts an explicit numeric offset', () => {
    const result = validatePeriodQuery({ from: '2026-01-01T03:00:00.000+03:00', to: TO });

    expect(result.errors).toBeNull();
    expect(result.data?.from).toEqual(new Date(FROM));
  });

  it('rejects a period whose start is not before its end', () => {
    expect(validatePeriodQuery({ from: FROM, to: FROM }).errors).toEqual({
      from: expect.any(String),
    });
    expect(validatePeriodQuery({ from: TO, to: FROM }).errors).toEqual({
      from: expect.any(String),
    });
  });

  it('rejects a period wider than 366 days', () => {
    const result = validatePeriodQuery({ from: FROM, to: '2027-01-03T00:00:00.000Z' });

    expect(result.errors).toEqual({ to: expect.any(String) });
  });

  it('accepts a period of exactly 366 days', () => {
    const result = validatePeriodQuery({ from: FROM, to: '2027-01-02T00:00:00.000Z' });

    expect(result.errors).toBeNull();
  });

  it('rejects a date-only bound that names no instant', () => {
    expect(validatePeriodQuery({ from: '2026-01-01', to: TO }).errors).toEqual({
      from: expect.any(String),
    });
  });

  it('requires both bounds', () => {
    expect(validatePeriodQuery({ to: TO }).errors).toEqual({ from: expect.any(String) });
    expect(validatePeriodQuery({ from: FROM }).errors).toEqual({ to: expect.any(String) });
  });
});

describe('validateTrendQuery', () => {
  it('defaults to an hourly bucket for a window of 48 hours or less', () => {
    const result = validateTrendQuery({ from: FROM, to: '2026-01-03T00:00:00.000Z' });

    expect(result.errors).toBeNull();
    expect(result.data?.bucket).toBe('hour');
  });

  it('defaults to a daily bucket for a window wider than 48 hours', () => {
    const result = validateTrendQuery({ from: FROM, to: '2026-01-04T00:00:00.000Z' });

    expect(result.errors).toBeNull();
    expect(result.data?.bucket).toBe('day');
  });

  it('keeps an explicit hourly bucket within 48 hours', () => {
    const result = validateTrendQuery({ from: FROM, to: TO, bucket: 'hour' });

    expect(result.errors).toBeNull();
    expect(result.data?.bucket).toBe('hour');
  });

  it('rejects an explicit hourly bucket beyond 48 hours', () => {
    const result = validateTrendQuery({
      from: FROM,
      to: '2026-01-04T00:00:00.000Z',
      bucket: 'hour',
    });

    expect(result.errors).toEqual({ bucket: expect.any(String) });
  });

  it('rejects a bucket wider than 366 days', () => {
    const result = validateTrendQuery({
      from: FROM,
      to: '2027-01-03T00:00:00.000Z',
      bucket: 'day',
    });

    expect(result.errors).toEqual({ to: expect.any(String) });
  });

  it('rejects an unknown bucket', () => {
    const result = validateTrendQuery({ from: FROM, to: TO, bucket: 'week' });

    expect(result.errors).toEqual({ bucket: expect.any(String) });
  });
});

describe('validatePaymentSummaryQuery', () => {
  it('defaults groupBy to method', () => {
    const result = validatePaymentSummaryQuery({ from: FROM, to: TO });

    expect(result.errors).toBeNull();
    expect(result.data?.groupBy).toBe('method');
  });

  it('keeps an explicit method grouping', () => {
    const result = validatePaymentSummaryQuery({ from: FROM, to: TO, groupBy: 'method' });

    expect(result.errors).toBeNull();
    expect(result.data?.groupBy).toBe('method');
  });

  it('rejects an unknown grouping', () => {
    const result = validatePaymentSummaryQuery({ from: FROM, to: TO, groupBy: 'date' });

    expect(result.errors).toEqual({ groupBy: expect.any(String) });
  });
});

describe('validateMemberPerformanceQuery', () => {
  it('reads the same reporting window as the other period reads', () => {
    const result = validateMemberPerformanceQuery({ from: FROM, to: TO });

    expect(result.errors).toBeNull();
    expect(result.data?.from).toEqual(new Date(FROM));
    expect(result.data?.to).toEqual(new Date(TO));
  });

  it('rejects a reversed window', () => {
    expect(validateMemberPerformanceQuery({ from: TO, to: FROM }).errors).toEqual({
      from: expect.any(String),
    });
  });
});

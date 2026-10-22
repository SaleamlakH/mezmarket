import { describe, expect, it } from 'vitest';
import {
  dashboardCustomRangeDefaults,
  dashboardPeriodRange,
  dashboardTrendBucket,
  parseLocalDateInputValue,
  toLocalDateInputValue,
} from '../period';

const NOW = new Date(2026, 9, 21, 15, 30);

function localMidnight(year: number, month: number, day: number): string {
  return new Date(year, month, day).toISOString();
}

describe('dashboardPeriodRange', () => {
  it('turns today into the local day as a half-open UTC range', () => {
    expect(dashboardPeriodRange('today', { start: '', end: '' }, NOW)).toEqual({
      from: localMidnight(2026, 9, 21),
      to: localMidnight(2026, 9, 22),
    });
  });

  it('turns 7 days into the last seven local days, today included', () => {
    expect(dashboardPeriodRange('week', { start: '', end: '' }, NOW)).toEqual({
      from: localMidnight(2026, 9, 15),
      to: localMidnight(2026, 9, 22),
    });
  });

  it('turns Month into the current calendar month', () => {
    expect(dashboardPeriodRange('month', { start: '', end: '' }, NOW)).toEqual({
      from: localMidnight(2026, 9, 1),
      to: localMidnight(2026, 10, 1),
    });
  });

  it('turns a custom range into a half-open range ending the day after the chosen end', () => {
    expect(dashboardPeriodRange('custom', { start: '2026-10-01', end: '2026-10-03' }, NOW)).toEqual(
      {
        from: localMidnight(2026, 9, 1),
        to: localMidnight(2026, 9, 4),
      },
    );
  });

  it('swaps a custom range whose start is after its end', () => {
    expect(dashboardPeriodRange('custom', { start: '2026-10-05', end: '2026-10-02' }, NOW)).toEqual(
      {
        from: localMidnight(2026, 9, 2),
        to: localMidnight(2026, 9, 6),
      },
    );
  });

  it('falls back to today when the custom values cannot be read', () => {
    expect(dashboardPeriodRange('custom', { start: '', end: '' }, NOW)).toEqual({
      from: localMidnight(2026, 9, 21),
      to: localMidnight(2026, 9, 22),
    });
  });
});

describe('date input helpers', () => {
  it('round-trips a local calendar day', () => {
    expect(toLocalDateInputValue(NOW)).toBe('2026-10-21');
    expect(parseLocalDateInputValue('2026-10-21')).toEqual(new Date(2026, 9, 21));
  });

  it('rejects an impossible calendar day', () => {
    expect(parseLocalDateInputValue('2026-02-30')).toBeNull();
    expect(parseLocalDateInputValue('not-a-day')).toBeNull();
  });

  it('defaults a custom range to today', () => {
    expect(dashboardCustomRangeDefaults(NOW)).toEqual({
      start: '2026-10-21',
      end: '2026-10-21',
    });
  });
});

describe('dashboardTrendBucket', () => {
  it('uses hourly points only for today', () => {
    expect(dashboardTrendBucket('today')).toBe('hour');
    expect(dashboardTrendBucket('week')).toBe('day');
    expect(dashboardTrendBucket('month')).toBe('day');
    expect(dashboardTrendBucket('custom')).toBe('day');
  });
});

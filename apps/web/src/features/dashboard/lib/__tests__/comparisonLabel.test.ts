import { describe, expect, it } from 'vitest';
import { comparisonLabel, grossProfitComparisonLabel } from '../comparisonLabel';

const FROM = '2026-10-01T00:00:00.000Z';

describe('comparisonLabel', () => {
  it('names today against yesterday', () => {
    expect(comparisonLabel('today', FROM, '2026-10-02T00:00:00.000Z')).toBe('vs yesterday');
  });

  it('names the seven-day filter against last week', () => {
    expect(comparisonLabel('week', FROM, '2026-10-08T00:00:00.000Z')).toBe('vs last week');
  });

  it('names the month filter against last month', () => {
    expect(comparisonLabel('month', FROM, '2026-11-01T00:00:00.000Z')).toBe('vs last month');
  });

  it('names a one-day custom range', () => {
    expect(comparisonLabel('custom', FROM, '2026-10-02T00:00:00.000Z')).toBe('vs previous 1 day');
  });

  it('names a multi-day custom range', () => {
    expect(comparisonLabel('custom', FROM, '2026-10-04T00:00:00.000Z')).toBe('vs previous 3 days');
  });

  it('names an hourly custom range', () => {
    expect(comparisonLabel('custom', FROM, '2026-10-01T12:00:00.000Z')).toBe(
      'vs previous 12 hours',
    );
    expect(comparisonLabel('custom', FROM, '2026-10-01T01:00:00.000Z')).toBe('vs previous 1 hour');
  });

  it('falls back when the custom range is invalid or empty', () => {
    expect(comparisonLabel('custom', 'not-a-date', FROM)).toBe('vs previous period');
    expect(comparisonLabel('custom', FROM, FROM)).toBe('vs previous period');
    expect(comparisonLabel('custom', FROM, '2026-09-30T00:00:00.000Z')).toBe('vs previous period');
  });
});

describe('grossProfitComparisonLabel', () => {
  it('returns null when there is no percentage change to show', () => {
    expect(
      grossProfitComparisonLabel(
        { deltaPercent: null, previous: 100 },
        'today',
        FROM,
        '2026-10-02T00:00:00.000Z',
      ),
    ).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePeriodFilter } from '../usePeriodFilter';

describe('usePeriodFilter', () => {
  it('defaults to today and makes a custom range active', () => {
    const now = new Date(2026, 9, 21, 15, 30);
    const { result } = renderHook(() => usePeriodFilter(now));

    expect(result.current.period).toBe('today');
    expect(result.current.range.from).toBe(new Date(2026, 9, 21).toISOString());

    act(() => result.current.selectPeriod('week'));
    expect(result.current.period).toBe('week');
    expect(result.current.range.from).toBe(new Date(2026, 9, 15).toISOString());

    act(() => result.current.setCustomRange({ start: '2026-10-01', end: '2026-10-03' }));
    expect(result.current.period).toBe('custom');
    expect(result.current.range).toEqual({
      from: new Date(2026, 9, 1).toISOString(),
      to: new Date(2026, 9, 4).toISOString(),
    });
  });
});

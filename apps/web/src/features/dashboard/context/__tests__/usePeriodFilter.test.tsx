import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePeriodFilter } from '../usePeriodFilter';

const NOW = new Date(2026, 9, 21, 15, 30);

describe('usePeriodFilter', () => {
  it('starts on today with a one-day custom range', () => {
    const { result } = renderHook(() => usePeriodFilter(NOW));

    expect(result.current.period).toBe('today');
    expect(result.current.customRange).toEqual({ start: '2026-10-21', end: '2026-10-21' });
    expect(result.current.range).toEqual({
      from: new Date(2026, 9, 21).toISOString(),
      to: new Date(2026, 9, 22).toISOString(),
    });
  });

  it('switches between preset periods and recomputes the range', () => {
    const { result } = renderHook(() => usePeriodFilter(NOW));

    act(() => result.current.selectPeriod('week'));
    expect(result.current.period).toBe('week');
    expect(result.current.range).toEqual({
      from: new Date(2026, 9, 15).toISOString(),
      to: new Date(2026, 9, 22).toISOString(),
    });

    act(() => result.current.selectPeriod('month'));
    expect(result.current.period).toBe('month');
    expect(result.current.range).toEqual({
      from: new Date(2026, 9, 1).toISOString(),
      to: new Date(2026, 10, 1).toISOString(),
    });

    act(() => result.current.selectPeriod('today'));
    expect(result.current.period).toBe('today');
    expect(result.current.range).toEqual({
      from: new Date(2026, 9, 21).toISOString(),
      to: new Date(2026, 9, 22).toISOString(),
    });
  });

  it('stores a custom range and makes it active', () => {
    const { result } = renderHook(() => usePeriodFilter(NOW));

    act(() => result.current.setCustomRange({ start: '2026-10-01', end: '2026-10-03' }));

    expect(result.current.period).toBe('custom');
    expect(result.current.customRange).toEqual({ start: '2026-10-01', end: '2026-10-03' });
    expect(result.current.range).toEqual({
      from: new Date(2026, 9, 1).toISOString(),
      to: new Date(2026, 9, 4).toISOString(),
    });
  });

  it('keeps the custom dates when switching away and back', () => {
    const { result } = renderHook(() => usePeriodFilter(NOW));

    act(() => result.current.setCustomRange({ start: '2026-10-01', end: '2026-10-03' }));
    act(() => result.current.selectPeriod('week'));
    act(() => result.current.selectPeriod('custom'));

    expect(result.current.period).toBe('custom');
    expect(result.current.customRange).toEqual({ start: '2026-10-01', end: '2026-10-03' });
    expect(result.current.range).toEqual({
      from: new Date(2026, 9, 1).toISOString(),
      to: new Date(2026, 9, 4).toISOString(),
    });
  });

  it('swaps reversed custom dates and falls back to today when they are invalid', () => {
    const { result } = renderHook(() => usePeriodFilter(NOW));

    act(() => result.current.setCustomRange({ start: '2026-10-05', end: '2026-10-02' }));
    expect(result.current.customRange).toEqual({ start: '2026-10-05', end: '2026-10-02' });
    expect(result.current.range).toEqual({
      from: new Date(2026, 9, 2).toISOString(),
      to: new Date(2026, 9, 6).toISOString(),
    });

    act(() => result.current.setCustomRange({ start: '2026-02-30', end: '' }));
    expect(result.current.period).toBe('custom');
    expect(result.current.range).toEqual({
      from: new Date(2026, 9, 21).toISOString(),
      to: new Date(2026, 9, 22).toISOString(),
    });
  });

  it('keeps using the reference time after a rerender', () => {
    const { result, rerender } = renderHook(({ now }: { now: Date }) => usePeriodFilter(now), {
      initialProps: { now: NOW },
    });

    rerender({ now: new Date(2026, 10, 15, 9) });

    expect(result.current.customRange).toEqual({ start: '2026-10-21', end: '2026-10-21' });
    expect(result.current.range).toEqual({
      from: new Date(2026, 9, 21).toISOString(),
      to: new Date(2026, 9, 22).toISOString(),
    });

    act(() => result.current.selectPeriod('today'));
    expect(result.current.range).toEqual({
      from: new Date(2026, 9, 21).toISOString(),
      to: new Date(2026, 9, 22).toISOString(),
    });
  });
});

import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { useSaleListFilter } from '../useSaleListFilter';

function wrapperAt(entry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>;
  };
}

function renderFilter(entry: string) {
  return renderHook(() => ({ ...useSaleListFilter(), location: useLocation() }), {
    wrapper: wrapperAt(entry),
  });
}

describe('useSaleListFilter', () => {
  it('reads outstanding from the dashboard unpaid deep link', () => {
    const { result } = renderFilter('/sales/all?unpaid=true');

    expect(result.current.filter).toBe('outstanding');
    expect(result.current.filters).toEqual({ unpaid: true });
  });

  it('reads overdue from the documented unpaid and overdue deep link', () => {
    const { result } = renderFilter('/sales/all?unpaid=true&overdue=true');

    expect(result.current.filter).toBe('overdue');
    expect(result.current.filters).toEqual({ overdue: true });
  });

  it('reads a payment status from the query', () => {
    const { result } = renderFilter('/sales/all?status=PARTIALLY_PAID');

    expect(result.current.filter).toBe('PARTIALLY_PAID');
    expect(result.current.filters).toEqual({ status: 'PARTIALLY_PAID' });
  });

  it('falls back to all for an unknown status', () => {
    const { result } = renderFilter('/sales/all?status=CANCELLED');

    expect(result.current.filter).toBe('all');
    expect(result.current.filters).toEqual({});
  });

  it('writes a status to the URL and drops the unpaid flag', async () => {
    const { result } = renderFilter('/sales/all?unpaid=true');

    act(() => result.current.setFilter('PENDING'));

    await waitFor(() => expect(result.current.location.search).toBe('?status=PENDING'));
    expect(result.current.filter).toBe('PENDING');
  });

  it('writes outstanding as unpaid and preserves unrelated parameters', async () => {
    const { result } = renderFilter('/sales/all?status=PAID&tab=recent');

    act(() => result.current.setFilter('outstanding'));

    await waitFor(() => expect(result.current.location.search).toBe('?tab=recent&unpaid=true'));
  });

  it('writes overdue and preserves unrelated parameters', async () => {
    const { result } = renderFilter('/sales/all?unpaid=true&tab=recent');

    act(() => result.current.setFilter('overdue'));

    await waitFor(() => expect(result.current.location.search).toBe('?tab=recent&overdue=true'));
    expect(result.current.filter).toBe('overdue');
  });

  it('drops overdue when outstanding is selected', async () => {
    const { result } = renderFilter('/sales/all?overdue=true');

    act(() => result.current.setFilter('outstanding'));

    await waitFor(() => expect(result.current.location.search).toBe('?unpaid=true'));
  });

  it('clears the filter keys when all is selected', async () => {
    const { result } = renderFilter('/sales/all?status=PAID&tab=recent');

    act(() => result.current.setFilter('all'));

    await waitFor(() => expect(result.current.location.search).toBe('?tab=recent'));
    expect(result.current.filter).toBe('all');
  });
});

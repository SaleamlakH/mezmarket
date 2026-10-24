import { describe, expect, it } from 'vitest';
import {
  inventoryFilterKindOf,
  inventoryFiltersForKind,
  inventoryFiltersFromParams,
} from '../inventoryFilters';

const NOW = new Date('2026-10-24T00:00:00.000Z');
const THIRTY_DAYS_LATER = new Date('2026-11-23T00:00:00.000Z');

describe('inventoryFiltersForKind', () => {
  it('shows the active products for All', () => {
    expect(inventoryFiltersForKind('all', NOW)).toEqual({ status: 'active' });
  });

  it('shows the active products at or under their threshold for Low & out', () => {
    expect(inventoryFiltersForKind('low', NOW)).toEqual({
      status: 'active',
      stockStatus: ['LOW_STOCK', 'OUT_OF_STOCK'],
    });
  });

  it('reads the soon group over 30 days and includes inactive products', () => {
    expect(inventoryFiltersForKind('expiring', NOW)).toEqual({
      status: 'all',
      expiryStatus: ['soon'],
      expiryBefore: THIRTY_DAYS_LATER,
    });
  });

  it('reads every expired lot regardless of the product status', () => {
    expect(inventoryFiltersForKind('expired', NOW)).toEqual({
      status: 'all',
      expiryStatus: ['expired'],
    });
  });
});

describe('inventoryFilterKindOf', () => {
  it.each(['all', 'low', 'expiring', 'expired'] as const)('recognizes the %s preset', (kind) => {
    expect(inventoryFilterKindOf(inventoryFiltersForKind(kind, NOW))).toBe(kind);
  });

  it('does not care which bound the soon group used', () => {
    expect(
      inventoryFilterKindOf({
        status: 'all',
        expiryStatus: ['soon'],
        expiryBefore: new Date('2026-12-31T00:00:00.000Z'),
      }),
    ).toBe('expiring');
  });

  it('has no chip for a combined expired and soon link', () => {
    expect(inventoryFilterKindOf({ status: 'all', expiryStatus: ['expired', 'soon'] })).toBeNull();
  });

  it('has no chip for a stock filter the chips do not offer', () => {
    expect(inventoryFilterKindOf({ status: 'active', stockStatus: ['IN_STOCK'] })).toBeNull();
  });
});

describe('inventoryFiltersFromParams', () => {
  it('returns null when the link carries no inventory filter', () => {
    expect(inventoryFiltersFromParams(new URLSearchParams(''), NOW)).toBeNull();
    expect(inventoryFiltersFromParams(new URLSearchParams('tab=batches'), NOW)).toBeNull();
  });

  it('reads the dashboard stock deep link', () => {
    const filters = inventoryFiltersFromParams(
      new URLSearchParams('status=active&stockStatus=low_stock,out_of_stock'),
      NOW,
    );

    expect(filters).toEqual({
      status: 'active',
      stockStatus: ['LOW_STOCK', 'OUT_OF_STOCK'],
    });
  });

  it('reads the dashboard expiry deep link and bounds the soon group', () => {
    const filters = inventoryFiltersFromParams(
      new URLSearchParams('status=all&expiryStatus=expired,soon'),
      NOW,
    );

    expect(filters).toEqual({
      status: 'all',
      expiryStatus: ['expired', 'soon'],
      expiryBefore: THIRTY_DAYS_LATER,
    });
  });

  it('keeps an explicit soon bound', () => {
    const filters = inventoryFiltersFromParams(
      new URLSearchParams('expiryStatus=soon&expiryBefore=2026-11-01T00:00:00.000Z'),
      NOW,
    );

    expect(filters?.expiryBefore).toEqual(new Date('2026-11-01T00:00:00.000Z'));
  });

  it('normalizes case and whitespace', () => {
    const filters = inventoryFiltersFromParams(
      new URLSearchParams('status=ALL&stockStatus= Low_Stock , out_of_stock '),
      NOW,
    );

    expect(filters).toEqual({
      status: 'all',
      stockStatus: ['LOW_STOCK', 'OUT_OF_STOCK'],
    });
  });

  it('falls back to active and drops unknown members', () => {
    const filters = inventoryFiltersFromParams(
      new URLSearchParams('status=archived&stockStatus=plenty,low_stock'),
      NOW,
    );

    expect(filters).toEqual({ status: 'active', stockStatus: ['LOW_STOCK'] });
  });

  it('reads both filter kinds when they are present', () => {
    const filters = inventoryFiltersFromParams(
      new URLSearchParams('status=active&stockStatus=low_stock&expiryStatus=soon'),
      NOW,
    );

    expect(filters).toEqual({
      status: 'active',
      stockStatus: ['LOW_STOCK'],
      expiryStatus: ['soon'],
      expiryBefore: THIRTY_DAYS_LATER,
    });
  });
});

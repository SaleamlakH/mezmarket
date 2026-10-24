import { describe, it, expect } from 'vitest';
import type { ProductInventorySummary } from '../../batches.types.js';
import {
  displayExpiryCutoff,
  filterSummariesByStockStatus,
  productInventoryDetailExpiryBefore,
  productInventoryListQueryOf,
  soonExpiryCutoff,
} from '../filter.js';

const AS_OF = new Date('2026-06-01T00:00:00.000Z');
const DISPLAY_BEFORE = new Date('2026-06-08T00:00:00.000Z');
const SOON_BEFORE = new Date('2026-07-01T00:00:00.000Z');

describe('expiry cutoffs', () => {
  it('reports a fixed 7-day display window from the request instant', () => {
    expect(displayExpiryCutoff(AS_OF)).toEqual(DISPLAY_BEFORE);
  });

  it('defaults the soon filter to a 30-day window from the request instant', () => {
    expect(soonExpiryCutoff(AS_OF)).toEqual(SOON_BEFORE);
  });
});

describe('productInventoryListQueryOf', () => {
  it('reads active products with no expiry range by default', () => {
    expect(productInventoryListQueryOf({}, AS_OF)).toEqual({
      repositoryFilters: { active: true },
      summaryExpiryBefore: DISPLAY_BEFORE,
    });
  });

  it('maps expired to an exclusive upper bound at the request instant', () => {
    expect(productInventoryListQueryOf({ expiryStatus: ['expired'] }, AS_OF)).toEqual({
      repositoryFilters: { active: true, to: AS_OF },
      summaryExpiryBefore: DISPLAY_BEFORE,
    });
  });

  it('maps soon to an inclusive request instant and the default upper bound', () => {
    expect(productInventoryListQueryOf({ expiryStatus: ['soon'] }, AS_OF)).toEqual({
      repositoryFilters: { active: true, from: AS_OF, to: SOON_BEFORE },
      summaryExpiryBefore: DISPLAY_BEFORE,
    });
  });

  it('uses a caller soon bound', () => {
    const bound = new Date('2026-06-15T00:00:00.000Z');

    expect(
      productInventoryListQueryOf({ expiryStatus: ['soon'], expiryBefore: bound }, AS_OF)
        .repositoryFilters,
    ).toEqual({ active: true, from: AS_OF, to: bound });
  });

  it('maps expired and soon to one upper bound', () => {
    const bound = new Date('2026-06-15T00:00:00.000Z');

    expect(
      productInventoryListQueryOf({ expiryStatus: ['expired', 'soon'], expiryBefore: bound }, AS_OF)
        .repositoryFilters,
    ).toEqual({ active: true, to: bound });
  });

  it('keeps expired before the request instant when the soon bound is earlier', () => {
    const bound = new Date('2026-05-01T00:00:00.000Z');

    expect(
      productInventoryListQueryOf({ expiryStatus: ['expired', 'soon'], expiryBefore: bound }, AS_OF)
        .repositoryFilters,
    ).toEqual({ active: true, to: AS_OF });
  });

  it('maps the product status to the active predicate', () => {
    expect(productInventoryListQueryOf({ status: 'inactive' }, AS_OF).repositoryFilters).toEqual({
      active: false,
    });
    expect(productInventoryListQueryOf({ status: 'all' }, AS_OF).repositoryFilters).toEqual({});
  });

  it('keeps the summary window fixed regardless of the request bound', () => {
    expect(
      productInventoryListQueryOf(
        { expiryStatus: ['expired'], expiryBefore: new Date('2026-06-20T00:00:00.000Z') },
        AS_OF,
      ).summaryExpiryBefore,
    ).toEqual(DISPLAY_BEFORE);
  });
});

describe('productInventoryDetailExpiryBefore', () => {
  it('defaults to the 7-day display window', () => {
    expect(productInventoryDetailExpiryBefore({}, AS_OF)).toEqual(DISPLAY_BEFORE);
  });

  it('uses a caller override', () => {
    const bound = new Date('2026-06-20T00:00:00.000Z');

    expect(productInventoryDetailExpiryBefore({ expiryBefore: bound }, AS_OF)).toEqual(bound);
  });
});

describe('filterSummariesByStockStatus', () => {
  const summaries = [
    { id: 'in', stockStatus: 'IN_STOCK' },
    { id: 'low', stockStatus: 'LOW_STOCK' },
    { id: 'out', stockStatus: 'OUT_OF_STOCK' },
  ] as ProductInventorySummary[];

  it('returns every summary when no status is asked for', () => {
    expect(filterSummariesByStockStatus(summaries, undefined)).toBe(summaries);
  });

  it('keeps only the requested statuses', () => {
    expect(
      filterSummariesByStockStatus(summaries, ['LOW_STOCK', 'OUT_OF_STOCK']).map(
        (summary) => summary.id,
      ),
    ).toEqual(['low', 'out']);
  });
});

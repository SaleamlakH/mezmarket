import type {
  ProductInventoryDetailFilters,
  ProductInventoryListFilters,
  ProductInventoryStockFilters,
  ProductInventorySummary,
  StockStatus,
} from '../batches.types.js';

/** How far ahead the product list and detail report expiring stock. */
export const DISPLAY_EXPIRY_WINDOW_DAYS = 7;
/** How far ahead a request without `expiryBefore` reads the soon group. */
export const SOON_FILTER_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The display cutoff: lots expiring before this are reported in the summary. */
export function displayExpiryCutoff(asOf: Date): Date {
  return new Date(asOf.getTime() + DISPLAY_EXPIRY_WINDOW_DAYS * DAY_MS);
}

/** The default upper bound of the soon group when the caller sends none. */
export function soonExpiryCutoff(asOf: Date): Date {
  return new Date(asOf.getTime() + SOON_FILTER_WINDOW_DAYS * DAY_MS);
}

type ProductInventoryListQuery = {
  repositoryFilters: ProductInventoryStockFilters;
  summaryExpiryBefore: Date;
};

/**
 * Turns the list filters into the flat repository predicate and the fixed
 * display cutoff the summary reports against.
 */
export function productInventoryListQueryOf(
  filters: ProductInventoryListFilters,
  asOf: Date,
): ProductInventoryListQuery {
  const status = filters.status ?? 'active';
  const active = status === 'all' ? undefined : status === 'active';
  const expiryStatus = filters.expiryStatus;

  let from: Date | undefined;
  let to: Date | undefined;

  if (expiryStatus) {
    const expired = expiryStatus.includes('expired');
    const soon = expiryStatus.includes('soon');
    const filterBefore = filters.expiryBefore ?? soonExpiryCutoff(asOf);

    if (soon) {
      if (!expired) from = asOf;
      to = expired ? laterOf(asOf, filterBefore) : filterBefore;
    } else if (expired) {
      to = asOf;
    }
  }

  return {
    repositoryFilters: {
      ...(active !== undefined && { active }),
      ...(from !== undefined && { from }),
      ...(to !== undefined && { to }),
    },
    summaryExpiryBefore: displayExpiryCutoff(asOf),
  };
}

/** The cutoff the detail summary reports against. */
export function productInventoryDetailExpiryBefore(
  filters: ProductInventoryDetailFilters,
  asOf: Date,
): Date {
  return filters.expiryBefore ?? displayExpiryCutoff(asOf);
}

/** The stock status is computed from the summary, so it selects after shaping. */
export function filterSummariesByStockStatus(
  summaries: ProductInventorySummary[],
  statuses: StockStatus[] | undefined,
): ProductInventorySummary[] {
  if (!statuses) return summaries;
  return summaries.filter((summary) => statuses.includes(summary.stockStatus));
}

function laterOf(a: Date, b: Date): Date {
  return a >= b ? a : b;
}

import type {
  InventoryExpiryStatus,
  ProductInventoryListFilters,
  ProductListStatus,
  StockStatus,
} from '@mez/types';

/** The chips the inventory page offers. */
export type InventoryFilterKind = 'all' | 'low' | 'expiring' | 'expired';

export interface InventoryFilterOption {
  kind: InventoryFilterKind;
  label: string;
}

export const INVENTORY_FILTER_OPTIONS: readonly InventoryFilterOption[] = [
  { kind: 'all', label: 'All' },
  { kind: 'low', label: 'Low & out' },
  { kind: 'expiring', label: 'Expiring (30 days)' },
  { kind: 'expired', label: 'Expired' },
];

/** How far ahead the expiring chip reads. */
export const INVENTORY_SOON_WINDOW_DAYS = 30;

const DAY_MS = 1000 * 60 * 60 * 24;

const PRODUCT_STATUSES: readonly ProductListStatus[] = ['active', 'inactive', 'all'];
const EXPIRY_STATUSES: readonly InventoryExpiryStatus[] = ['expired', 'soon'];

const STOCK_STATUS_BY_PARAM: Record<string, StockStatus> = {
  low_stock: 'LOW_STOCK',
  out_of_stock: 'OUT_OF_STOCK',
  in_stock: 'IN_STOCK',
};

const ATTENTION_STOCK_STATUSES: readonly StockStatus[] = ['LOW_STOCK', 'OUT_OF_STOCK'];

function expiryCutoff(now: Date): Date {
  return new Date(now.getTime() + INVENTORY_SOON_WINDOW_DAYS * DAY_MS);
}

/** The filters a chip asks the API for. */
export function inventoryFiltersForKind(
  kind: InventoryFilterKind,
  now: Date,
): ProductInventoryListFilters {
  switch (kind) {
    case 'low':
      return { status: 'active', stockStatus: [...ATTENTION_STOCK_STATUSES] };
    case 'expiring':
      return { status: 'all', expiryStatus: ['soon'], expiryBefore: expiryCutoff(now) };
    case 'expired':
      return { status: 'all', expiryStatus: ['expired'] };
    default:
      return { status: 'active' };
  }
}

function sameSet<T>(left: readonly T[] | undefined, right: readonly T[]): boolean {
  if (!left || left.length !== right.length) return false;
  return right.every((value) => left.includes(value));
}

/** The chip a filter set belongs to, or null for a combination no chip shows. */
export function inventoryFilterKindOf(
  filters: ProductInventoryListFilters,
): InventoryFilterKind | null {
  if (filters.stockStatus) {
    return filters.status === 'active' &&
      !filters.expiryStatus &&
      sameSet(filters.stockStatus, ATTENTION_STOCK_STATUSES)
      ? 'low'
      : null;
  }

  if (filters.expiryStatus) {
    if (filters.status !== 'all') return null;
    if (sameSet(filters.expiryStatus, ['soon'])) return 'expiring';
    if (sameSet(filters.expiryStatus, ['expired'])) return 'expired';
    return null;
  }

  return filters.status === 'active' ? 'all' : null;
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
}

function productStatusOf(value: string | null): ProductListStatus {
  const status = value?.trim().toLowerCase();

  return PRODUCT_STATUSES.find((candidate) => candidate === status) ?? 'active';
}

function stockStatusesOf(value: string | null): StockStatus[] | undefined {
  if (!value) return undefined;

  const statuses = splitCsv(value)
    .map((part) => STOCK_STATUS_BY_PARAM[part])
    .filter((status): status is StockStatus => status !== undefined);

  return statuses.length > 0 ? statuses : undefined;
}

function expiryStatusesOf(value: string | null): InventoryExpiryStatus[] | undefined {
  if (!value) return undefined;

  const statuses = splitCsv(value).filter((status): status is InventoryExpiryStatus =>
    EXPIRY_STATUSES.some((candidate) => candidate === status),
  );

  return statuses.length > 0 ? statuses : undefined;
}

function boundOf(value: string | null): Date | undefined {
  if (!value) return undefined;

  const bound = new Date(value);
  return Number.isNaN(bound.getTime()) ? undefined : bound;
}

/**
 * Reads the filters an inventory deep link carries. A link with no inventory
 * filter parameter returns null, so a navigation without one keeps the filter
 * the page already has. Stock and expiry filters are kept together and applied
 * as an AND filter.
 */
export function inventoryFiltersFromParams(
  params: URLSearchParams,
  now: Date,
): ProductInventoryListFilters | null {
  if (
    !params.has('status') &&
    !params.has('stockStatus') &&
    !params.has('expiryStatus') &&
    !params.has('expiryBefore')
  ) {
    return null;
  }

  const status = productStatusOf(params.get('status'));
  const stockStatus = stockStatusesOf(params.get('stockStatus'));
  const expiryStatus = expiryStatusesOf(params.get('expiryStatus'));
  const expiryBefore = expiryStatus?.includes('soon')
    ? (boundOf(params.get('expiryBefore')) ?? expiryCutoff(now))
    : undefined;

  return {
    status,
    ...(stockStatus && { stockStatus }),
    ...(expiryStatus && { expiryStatus }),
    ...(expiryBefore && { expiryBefore }),
  };
}

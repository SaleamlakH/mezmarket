import type { PaymentStatus, SaleListFilters } from '@mez/types';
import { PAYMENT_STATUSES } from '@mez/validation';
import type { BadgeTone } from '@/components/Badge';
import { PAYMENT_LABELS } from './saleDisplay';

/**
 * The chip a sale-history list is narrowed by. `outstanding` is the balance
 * state the API calls `unpaid`, `overdue` is unpaid and older than the server's
 * seven-day cutoff, `paidOrPartial` is both settled statuses at once, and the
 * rest are single payment statuses.
 *
 * App-internal filter state with no canonical equivalent, so it is deliberately
 * local rather than a `@mez/types` contract.
 */
export type SaleHistoryFilter = 'all' | 'outstanding' | 'overdue' | 'paidOrPartial' | PaymentStatus;

export interface SaleHistoryFilterOption {
  value: SaleHistoryFilter;
  label: string;
  tone: BadgeTone;
}

/** The chips a sale-history list offers, in display order. */
export const SALE_HISTORY_FILTERS: readonly SaleHistoryFilterOption[] = [
  { value: 'all', label: 'All', tone: 'accent' },
  { value: 'outstanding', label: 'Outstanding', tone: 'warning' },
  // Mirrors the server's seven-day overdue cutoff, which is not returned.
  { value: 'overdue', label: 'Overdue (7+ days)', tone: 'danger' },
  { value: 'paidOrPartial', label: 'Paid & partial', tone: 'positive' },
  { value: 'PAID', label: PAYMENT_LABELS.PAID, tone: 'positive' },
  { value: 'PENDING', label: PAYMENT_LABELS.PENDING, tone: 'warning' },
  { value: 'PARTIALLY_PAID', label: PAYMENT_LABELS.PARTIALLY_PAID, tone: 'warning' },
];

/** The API filters a chosen chip stands for. */
export function toSaleListFilters(filter: SaleHistoryFilter): SaleListFilters {
  if (filter === 'all') return {};
  if (filter === 'outstanding') return { unpaid: true };
  if (filter === 'overdue') return { overdue: true };
  if (filter === 'paidOrPartial') return { status: ['PAID', 'PARTIALLY_PAID'] };
  return { status: [filter] };
}

export interface SaleListDateFilters {
  from?: string;
  to?: string;
  paymentFrom?: string;
  paymentTo?: string;
}

/** The date bounds a dashboard link carries, if any. */
export function dateFiltersFromParams(params: URLSearchParams): SaleListDateFilters {
  const from = params.get('from');
  const to = params.get('to');
  const paymentFrom = params.get('paymentFrom');
  const paymentTo = params.get('paymentTo');

  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(paymentFrom ? { paymentFrom } : {}),
    ...(paymentTo ? { paymentTo } : {}),
  };
}

/**
 * Adds the date bounds a dashboard link carries to the chip's filters. The sale
 * range and the payment range are independent, so both can be present.
 */
export function withListDateFilters(
  filters: SaleListFilters,
  params: URLSearchParams,
): SaleListFilters {
  return { ...filters, ...dateFiltersFromParams(params) };
}

function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

/**
 * Reads the chosen chip back from a URL query. `overdue=true` wins first, so
 * the documented `?unpaid=true&overdue=true` deep link selects Overdue; then
 * `unpaid=true` keeps the dashboard's existing links working; then the
 * comma-separated `status` values select that status or the paid-and-partial
 * pair, and anything else falls back to the unfiltered list.
 */
export function fromSearchParams(params: URLSearchParams): SaleHistoryFilter {
  if (params.get('overdue') === 'true') return 'overdue';
  if (params.get('unpaid') === 'true') return 'outstanding';

  const statuses = [
    ...new Set(
      params
        .getAll('status')
        .flatMap((value) => value.split(','))
        .map((value) => value.trim().toUpperCase())
        .filter(isPaymentStatus),
    ),
  ];
  const only = statuses[0];
  if (statuses.length === 1 && only !== undefined) return only;
  if (statuses.length === 2 && statuses.includes('PAID') && statuses.includes('PARTIALLY_PAID')) {
    return 'paidOrPartial';
  }
  return 'all';
}

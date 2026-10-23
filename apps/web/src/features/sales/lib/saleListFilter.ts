import type { PaymentStatus, SaleListFilters } from '@mez/types';
import { PAYMENT_STATUSES } from '@mez/validation';
import type { BadgeTone } from '@/components/Badge';
import { PAYMENT_LABELS } from './saleDisplay';

/**
 * The chip a sale-history list is narrowed by. `outstanding` is the balance
 * state the API calls `unpaid`, `overdue` is unpaid and older than the server's
 * seven-day cutoff, and the rest are payment statuses.
 *
 * App-internal filter state with no canonical equivalent, so it is deliberately
 * local rather than a `@mez/types` contract.
 */
export type SaleHistoryFilter = 'all' | 'outstanding' | 'overdue' | PaymentStatus;

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
  { value: 'PAID', label: PAYMENT_LABELS.PAID, tone: 'positive' },
  { value: 'PENDING', label: PAYMENT_LABELS.PENDING, tone: 'warning' },
  { value: 'PARTIALLY_PAID', label: PAYMENT_LABELS.PARTIALLY_PAID, tone: 'warning' },
];

/** The API filters a chosen chip stands for. */
export function toSaleListFilters(filter: SaleHistoryFilter): SaleListFilters {
  if (filter === 'all') return {};
  if (filter === 'outstanding') return { unpaid: true };
  if (filter === 'overdue') return { overdue: true };
  return { status: filter };
}

function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

/**
 * Reads the chosen chip back from a URL query. `overdue=true` wins first, so
 * the documented `?unpaid=true&overdue=true` deep link selects Overdue; then
 * `unpaid=true` keeps the dashboard's existing links working; a recognized
 * `status` wins next, and anything else falls back to the unfiltered list.
 */
export function fromSearchParams(params: URLSearchParams): SaleHistoryFilter {
  if (params.get('overdue') === 'true') return 'overdue';
  if (params.get('unpaid') === 'true') return 'outstanding';

  const status = params.get('status');
  return status !== null && isPaymentStatus(status) ? status : 'all';
}

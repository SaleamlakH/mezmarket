import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { SaleListFilters } from '@mez/types';
import {
  dateFiltersFromParams,
  fromSearchParams,
  toSaleListFilters,
  withListDateFilters,
  type SaleHistoryFilter,
  type SaleListDateFilters,
} from '../lib/saleListFilter';

export interface UseSaleListFilterReturn {
  /** The chip currently selected. */
  filter: SaleHistoryFilter;
  /** The API filters that chip stands for. */
  filters: SaleListFilters;
  /** Date bounds carried by a dashboard link. */
  dateFilters: SaleListDateFilters;
  setFilter: (filter: SaleHistoryFilter) => void;
  clearDateFilters: () => void;
}

/**
 * Keeps the sale-history chip in the URL, so a deep link, a reload and the
 * browser's back button all land on the same list. Date bounds carried by a
 * dashboard link are forwarded to the API and left untouched when the chip
 * changes.
 */
export function useSaleListFilter(): UseSaleListFilterReturn {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filter = fromSearchParams(searchParams);
  const filters = useMemo(
    () => withListDateFilters(toSaleListFilters(filter), searchParams),
    [filter, searchParams],
  );
  const dateFilters = useMemo(() => dateFiltersFromParams(searchParams), [searchParams]);

  const setFilter = (next: SaleHistoryFilter) => {
    const params = new URLSearchParams(searchParams);
    params.delete('unpaid');
    params.delete('overdue');
    params.delete('status');

    const nextFilters = toSaleListFilters(next);
    if (nextFilters.unpaid !== undefined) {
      params.set('unpaid', String(nextFilters.unpaid));
    }
    if (nextFilters.overdue !== undefined) {
      params.set('overdue', String(nextFilters.overdue));
    }
    if (nextFilters.status !== undefined) {
      params.set('status', nextFilters.status.join(',').toLowerCase());
    }

    const search = params.toString().replace(/%2C/gi, ',');
    navigate({ search: search ? `?${search}` : '' });
  };

  const clearDateFilters = () => {
    const params = new URLSearchParams(searchParams);
    for (const key of ['from', 'to', 'paymentFrom', 'paymentTo']) {
      params.delete(key);
    }

    const search = params.toString();
    navigate({ search: search ? `?${search}` : '' });
  };

  return { filter, filters, dateFilters, setFilter, clearDateFilters };
}

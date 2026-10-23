import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { SaleListFilters } from '@mez/types';
import { fromSearchParams, toSaleListFilters, type SaleHistoryFilter } from '../lib/saleListFilter';

export interface UseSaleListFilterReturn {
  /** The chip currently selected. */
  filter: SaleHistoryFilter;
  /** The API filters that chip stands for. */
  filters: SaleListFilters;
  setFilter: (filter: SaleHistoryFilter) => void;
}

/**
 * Keeps the sale-history chip in the URL, so a deep link, a reload and the
 * browser's back button all land on the same list. Other query parameters are
 * left untouched for filters added later.
 */
export function useSaleListFilter(): UseSaleListFilterReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = fromSearchParams(searchParams);
  const filters = useMemo(() => toSaleListFilters(filter), [filter]);

  const setFilter = (next: SaleHistoryFilter) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
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
        params.set('status', nextFilters.status);
      }

      return params;
    });
  };

  return { filter, filters, setFilter };
}

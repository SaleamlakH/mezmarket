import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { ProductInventoryListFilters } from '@mez/types';
import {
  inventoryFilterKindOf,
  inventoryFiltersForKind,
  inventoryFiltersFromParams,
  type InventoryFilterKind,
} from '../lib/inventoryFilters';
import type { InventoryFilterValue } from './types';

export function useInventoryFilter(now?: Date): InventoryFilterValue {
  const [referenceNow] = useState(() => now ?? new Date());
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  const [lastSearch, setLastSearch] = useState(search);
  const [filters, setFilters] = useState<ProductInventoryListFilters>(
    () =>
      inventoryFiltersFromParams(searchParams, referenceNow) ??
      inventoryFiltersForKind('all', referenceNow),
  );

  // A deep link carries its filters in the query string; a navigation without
  // one keeps whatever the page already showed. Adjusting during render is the
  // supported way to follow a prop change without an effect.
  if (search !== lastSearch) {
    setLastSearch(search);

    const fromUrl = inventoryFiltersFromParams(new URLSearchParams(search), referenceNow);
    if (fromUrl) setFilters(fromUrl);
  }

  const selectFilter = useCallback(
    (kind: InventoryFilterKind) => {
      setFilters(inventoryFiltersForKind(kind, referenceNow));
    },
    [referenceNow],
  );

  const removeFilter = useCallback((kind: Exclude<InventoryFilterKind, 'all'>) => {
    setFilters((current) => {
      const next = { ...current };

      if (kind === 'low') {
        delete next.stockStatus;
        return {
          ...next,
          status: next.expiryStatus?.length ? (next.status ?? 'active') : 'active',
        };
      }

      const expiryStatus = next.expiryStatus?.filter((status) =>
        kind === 'expiring' ? status !== 'soon' : status !== 'expired',
      );

      if (!expiryStatus || expiryStatus.length === 0) {
        delete next.expiryStatus;
        delete next.expiryBefore;
        return {
          ...next,
          status: next.stockStatus?.length ? (next.status ?? 'active') : 'active',
        };
      }

      next.expiryStatus = expiryStatus;
      if (!expiryStatus.includes('soon')) delete next.expiryBefore;
      return next;
    });
  }, []);

  const activeKind = useMemo(() => inventoryFilterKindOf(filters), [filters]);

  return useMemo(
    () => ({ filters, activeKind, selectFilter, removeFilter }),
    [filters, activeKind, selectFilter, removeFilter],
  );
}

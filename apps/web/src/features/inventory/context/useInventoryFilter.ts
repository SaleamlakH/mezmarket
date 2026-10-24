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

  const activeKind = useMemo(() => inventoryFilterKindOf(filters), [filters]);

  return useMemo(
    () => ({ filters, activeKind, selectFilter }),
    [filters, activeKind, selectFilter],
  );
}

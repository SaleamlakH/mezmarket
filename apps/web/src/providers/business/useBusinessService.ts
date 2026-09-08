import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BusinessResponse } from '@mez/types';
import type { BusinessContextValue, BusinessService, BusinessStatus } from './types';

function storageKeyFor(userId: string) {
  return `mezmarket:business:${userId}`;
}

function readStoredBusinessId(storageKey: string | null): string | null {
  if (!storageKey) return null;
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function storeBusinessId(storageKey: string, businessId: string) {
  try {
    localStorage.setItem(storageKey, businessId);
  } catch {
    // ignore persistence failures
  }
}

export function useBusinessService(
  userId: string | null,
  businessService: BusinessService,
): BusinessContextValue {
  const storageKey = userId ? storageKeyFor(userId) : null;

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['businesses', userId],
    queryFn: () => businessService.listBusinesses(),
    enabled: Boolean(userId),
  });

  // Only the id is real state. `currentBusiness` is derived from this by
  // looking it up in `data`, so it can never go stale. null means "no
  // explicit pick yet" — fall back to storage, then data[0].
  const [explicitId, setExplicitId] = useState<string | null>(null);

  const currentBusiness = useMemo<BusinessResponse | null>(() => {
    if (!data?.length) return null;
    const candidateId = explicitId ?? readStoredBusinessId(storageKey);
    return data.find((b) => b.id === candidateId) ?? data[0] ?? null;
  }, [data, storageKey, explicitId]);

  const setCurrentBusiness = useCallback(
    (businessId: string) => {
      if (storageKey) storeBusinessId(storageKey, businessId);
      setExplicitId(businessId);
    },
    [storageKey],
  );

  const status: BusinessStatus = isError ? 'error' : isPending ? 'loading' : 'ready';

  return {
    status,
    businesses: data ?? [],
    currentBusiness,
    setCurrentBusiness,
    refetch: () => {
      void refetch();
    },
  };
}

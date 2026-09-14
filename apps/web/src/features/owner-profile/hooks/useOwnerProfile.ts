import { useState, useEffect, useCallback } from 'react';
import type { OwnerResponse } from '@mez/types';
import type { OwnerApi } from '../api/ownerApi';

export function useOwnerProfile(ownerApi: OwnerApi) {
  const [profile, setProfile] = useState<OwnerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await ownerApi.getOwnerProfile();
      return { ok: true as const, profile: data };
    } catch (err) {
      return { ok: false as const, error: (err as Error).message };
    }
  }, [ownerApi]);

  useEffect(() => {
    let cancelled = false;

    fetchProfile().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setProfile(result.profile);
      } else {
        setError(result.error);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  const applyProfile = useCallback((updated: OwnerResponse) => {
    setProfile(updated);
    setError(null);
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await fetchProfile();
    if (result.ok) {
      setProfile(result.profile);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  }, [fetchProfile]);

  return { profile, isLoading, error, applyProfile, refetch };
}

/**
 * Reference data is fetched once per session and then read from the cache —
 * never refetched on mount, focus or reconnect; invalidations from mutations
 * that own the data are what refresh it.
 */
export const referenceQueryPolicy = {
  staleTime: 5 * 60 * 1000,
  gcTime: Infinity,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

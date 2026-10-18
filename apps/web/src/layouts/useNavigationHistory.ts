import { useLocation } from 'react-router';

export interface NavigationHistoryState {
  from: string[];
}

function trailFrom(state: unknown): string[] {
  const from = (state as { from?: unknown } | null)?.from;

  return Array.isArray(from)
    ? from.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

export function forwardNavigationState(state: unknown, pathname: string): NavigationHistoryState {
  return { from: [...trailFrom(state), pathname] };
}

export interface BackNavigation {
  to: string;
  state: NavigationHistoryState;
}

export function backNavigation(state: unknown, fallback: string): BackNavigation {
  const trail = trailFrom(state);

  return {
    to: trail[trail.length - 1] ?? fallback,
    state: { from: trail.slice(0, -1) },
  };
}

export function useForwardNavigationState(): NavigationHistoryState {
  const { pathname, state } = useLocation();

  return forwardNavigationState(state, pathname);
}

export function useBackNavigation(fallback: string): BackNavigation {
  const { state } = useLocation();

  return backNavigation(state, fallback);
}

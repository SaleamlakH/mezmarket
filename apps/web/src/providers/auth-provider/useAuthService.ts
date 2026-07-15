import { useState, useEffect, useMemo } from 'react';
import type { AuthContextValue } from './types';
import type { AuthService, AuthSession } from '@mez/types';

export function useAuthService(authService: AuthService): AuthContextValue {
  const [session, setSession] = useState<AuthSession>({ user: null, status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    authService.getSession().then((session) => {
      if (cancelled) return;
      setSession(session);
    });

    return () => {
      cancelled = true;
    };
  }, [authService]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      ...authService,
    }),
    [session, authService],
  );

  return value;
}

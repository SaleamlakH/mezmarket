import { useState, useEffect, useMemo } from 'react';
import type { AuthContextValue, AuthService, Session } from './types';

export function useAuthService(authService: AuthService): AuthContextValue {
  const [session, setSession] = useState<Session>({
    status: 'loading',
    sessionToken: null,
    user: null,
  });

  useEffect(() => {
    let cancelled = false;

    authService
      .getSession()
      .then((session) => {
        if (cancelled) return;

        setSession((prevSession) =>
          session
            ? { status: 'authed', sessionToken: session.sessionToken, user: session.user }
            : { ...prevSession, status: 'guest' },
        );
      })
      .catch(() => {
        if (cancelled) return;

        setSession((prevSession) => ({ ...prevSession, status: 'guest' }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      ...authService,
    }),
    [session, authService],
  );

  return value;
}

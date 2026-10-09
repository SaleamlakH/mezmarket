import type { AuthService, AuthSession, LoginCredentials, SignupCredentials } from '@mez/types';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

function toAuthSession(session: Session | null): AuthSession {
  if (!session) return { user: null, status: 'guest' };

  const { id, email, email_confirmed_at } = session.user;

  return {
    status: 'authenticated',
    user: {
      id,
      ...(email && { email }),
      ...(email_confirmed_at && { emailVerifiedAt: email_confirmed_at }),
    },
  };
}

export function createSupabaseAuthService(client: SupabaseClient): AuthService {
  return {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw new Error(error.message);

      return toAuthSession(data.session);
    },

    onAuthStateChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        listener(toAuthSession(session));
      });

      return () => data.subscription.unsubscribe();
    },

    async signInWithEmail({ email, password }: LoginCredentials) {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw Error(error.message);
    },

    async signUpWithEmail({ email, password }: SignupCredentials) {
      const { error } = await client.auth.signUp({ email, password });
      if (error) throw Error(error.message);
    },
  };
}

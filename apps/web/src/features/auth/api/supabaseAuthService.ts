import type { AuthService, AuthSession, LoginCredentials, SignupCredentials } from '@mez/types';
import type { SupabaseClient } from '@supabase/supabase-js';

export function createSupabaseAuthService(client: SupabaseClient): AuthService {
  return {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw new Error(error.message);
      if (!data.session) return { user: null, status: 'guest' };

      const { id, email, email_confirmed_at } = data.session.user;

      const session: AuthSession = {
        status: 'authenticated',
        user: {
          id,
          ...(email && { email }),
          ...(email_confirmed_at && { emailVerifiedAt: email_confirmed_at }),
        },
      };

      return session;
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

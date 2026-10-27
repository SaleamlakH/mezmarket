import type { LoginCredentials, SignupCredentials } from '@mez/types';
import type {
  AuthService,
  AuthSession,
  User,
  VerifyOtpInput,
} from '@/providers/auth-provider/types';
import type { Session, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { AuthFlowError, toAuthFlowError } from '../lib/authErrors';

function toUser(user: SupabaseUser): User {
  const { id, email, email_confirmed_at } = user;

  return {
    id,
    ...(email && { email }),
    emailVerifiedAt: email_confirmed_at ?? null,
  };
}

function toAuthSession(session: Session | null): AuthSession {
  if (!session) return { user: null, status: 'guest' };

  return {
    status: 'authenticated',
    user: toUser(session.user),
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
      if (error) throw toAuthFlowError(error);
    },

    async signUpWithEmail({ email, password }: SignupCredentials) {
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw toAuthFlowError(error);
      if (!data.user) throw new Error('We could not create your account. Try again.');

      if (data.user.identities?.length === 0) {
        throw new AuthFlowError(
          'An account with this email already exists. Log in instead.',
          'email_exists',
        );
      }

      return toUser(data.user);
    },

    async verifyOtp({ email, token, type }: VerifyOtpInput) {
      const { error } = await client.auth.verifyOtp({ email, token, type });
      if (error) throw toAuthFlowError(error);
    },

    async resendSignupOtp(email: string) {
      const { error } = await client.auth.resend({ type: 'signup', email });
      if (error) throw toAuthFlowError(error);
    },

    async signOut(scope = 'local') {
      const { error } = await client.auth.signOut({ scope });

      if (
        error &&
        error.name !== 'AuthSessionMissingError' &&
        error.message !== 'Auth session missing!'
      ) {
        throw new Error(error.message);
      }
    },
  };
}

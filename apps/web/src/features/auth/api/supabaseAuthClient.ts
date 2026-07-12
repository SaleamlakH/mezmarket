import { supabaseClient } from '@/lib/supabase';
import type { AuthService } from '@/providers/auth-provider/types';

export const supabaseAuthClient: AuthService = {
  async getSession() {
    const { data } = await supabaseClient.auth.getSession();
    const session = data.session;

    if (session === null) return null;

    const sessionToken = session.access_token;
    const { id, email } = session.user;

    return { sessionToken: sessionToken, user: { id, email: email as string } };
  },
};

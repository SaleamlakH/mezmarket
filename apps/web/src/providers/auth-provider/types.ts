import type { AuthService, AuthSession } from '@mez/types';

export interface AuthContextValue extends AuthService {
  session: AuthSession;
}

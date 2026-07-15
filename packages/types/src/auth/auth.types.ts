export interface User {
  /**
   * The auth PROVIDER'S subject id.
   */
  id: string;

  /** user may not registered with email*/
  email?: string | null;

  /**
   * may not have email verification
   * null = not yet confirmed
   */
  emailVerifiedAt?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type SignupCredentials = LoginCredentials;

export interface AuthSession {
  status: 'loading' | 'authenticated' | 'guest';
  user: User | null;
}

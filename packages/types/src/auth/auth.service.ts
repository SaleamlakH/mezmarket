import type { AuthSession, LoginCredentials, SignupCredentials } from './auth.types.js';

export interface AuthService {
  /**
   * Retrieve the current active session
   * user Data and status, it doesn't include tokens
   */
  getSession(): Promise<AuthSession>;

  /**
   * Authenticates an existing user with email and password.
   * throws on invalid credential, network error or other
   */
  signInWithEmail(credentials: LoginCredentials): Promise<void>;

  /**
   * Registers a new user with email and password.
   */
  signUpWithEmail(credentials: SignupCredentials): Promise<void>;
}

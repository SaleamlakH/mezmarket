import type { AuthSession, LoginCredentials, SignupCredentials } from './auth.types.js';

export type AuthStateListener = (session: AuthSession) => void;

export interface AuthService {
  /**
   * Retrieve the current active session
   * user Data and status, it doesn't include tokens
   */
  getSession(): Promise<AuthSession>;

  /**
   * Notifies the listener whenever the session changes (sign in, sign out,
   * token refresh) and returns a function that stops the notifications.
   */
  onAuthStateChange(listener: AuthStateListener): () => void;

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

import type { LoginCredentials, SignupCredentials } from '@mez/types';

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

export interface AuthSession {
  status: 'loading' | 'authenticated' | 'guest';
  user: User | null;
}

export type AuthStateListener = (session: AuthSession) => void;

export type OtpVerificationType = 'email' | 'recovery';

export interface VerifyOtpInput {
  email: string;
  token: string;
  type: OtpVerificationType;
}

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
  signUpWithEmail(credentials: SignupCredentials): Promise<User>;

  /**
   * Confirms an email OTP, either for signup or password recovery.
   */
  verifyOtp(input: VerifyOtpInput): Promise<void>;

  /**
   * Requests a new signup verification code for the given email.
   */
  resendSignupOtp(email: string): Promise<void>;

  /**
   * Ends the current session. Defaults to the local session only.
   */
  signOut(scope?: 'local' | 'global'): Promise<void>;
}

export interface AuthContextValue extends AuthService {
  session: AuthSession;
}

export interface User {
  id: string;
  email: string;
}

export interface Session {
  status: 'loading' | 'authed' | 'guest';
  sessionToken: string | null;
  user: User | null;
}

export interface AuthService {
  getSession(): Promise<{ sessionToken: string; user: User } | null>;
}

export interface AuthContextValue extends AuthService {
  session: Session;
}

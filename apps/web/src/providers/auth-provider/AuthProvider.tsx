import type { AuthService } from '@mez/types';
import { AuthContext } from './context';
import { useAuthService } from './useAuthService';

export function AuthProvider({
  authService,
  children,
}: {
  authService: AuthService;
  children: React.ReactNode;
}) {
  const contextValue = useAuthService(authService);
  return <AuthContext value={contextValue}>{children}</AuthContext>;
}

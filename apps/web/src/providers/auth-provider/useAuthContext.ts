import { useContext } from 'react';
import { AuthContext } from './context';
import type { AuthContextValue } from './types';

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside a global AuthProvider wrapper');
  }

  return context;
}

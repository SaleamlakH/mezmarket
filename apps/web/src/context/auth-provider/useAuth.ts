import { AuthContext } from '@/context/auth-provider/context';
import type { AuthContextValue } from '@/context/auth-provider/types';
import { useContext } from 'react';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside a global AuthProvider wrapper');
  }

  return context;
}

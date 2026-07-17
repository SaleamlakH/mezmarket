import { useContext } from 'react';
import { AuthContext } from './context';
import type { AuthContextValue } from './types';

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}

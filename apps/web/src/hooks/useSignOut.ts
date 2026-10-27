import { useState } from 'react';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';

export function useSignOut() {
  const { signOut } = useAuthContext();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOutLocally() {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setError(null);

    try {
      await signOut('local');
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Could not log out');
    } finally {
      setIsSigningOut(false);
    }
  }

  return {
    signOut: signOutLocally,
    isSigningOut,
    error,
    clearError: () => setError(null),
  };
}

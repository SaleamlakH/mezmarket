import { Brand } from '@/components/Brand';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { Navigate, Outlet } from 'react-router';

export function ProtectedRoute() {
  const {
    session: { status, user },
  } = useAuthContext();

  if (status === 'loading') {
    return (
      <main className="h-full flex items-center justify-center">
        <Brand size="lg" />
      </main>
    );
  }

  if (status === 'guest') return <Navigate to="/login" replace />;

  if (!user?.emailVerifiedAt) return <Navigate to="/verify-email" replace />;

  return <Outlet />;
}

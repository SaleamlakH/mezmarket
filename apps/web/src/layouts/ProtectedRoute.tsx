import { Brand } from '@/components/Brand';
import { useAuth } from '@/context/auth-provider/useAuth';
import { Navigate, Outlet } from 'react-router';

export function ProtectedRoute() {
  const {
    session: { status },
  } = useAuth();

  if (status === 'loading') {
    return (
      <main className="h-full flex items-center justify-center">
        <Brand size="lg" />
      </main>
    );
  }

  if (status === 'guest') return <Navigate to="/login" replace />;

  return <Outlet />;
}

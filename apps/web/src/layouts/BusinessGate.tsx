import { Navigate, Outlet } from 'react-router';
import { Brand } from '@/components/Brand';
import { Button } from '@/components/Button';
import { useBusinessContext } from '@/providers/business/useBusinessContext';

export function BusinessGate() {
  const { status, currentBusiness, refetch } = useBusinessContext();

  if (status === 'loading') {
    return (
      <main className="h-full flex items-center justify-center">
        <Brand size="lg" />
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="min-h-svh flex flex-col items-center justify-center gap-4 p-5">
        <p className="text-md text-(--text-muted)">Could not load your business.</p>
        <Button onClick={refetch} variant="outline">
          Retry
        </Button>
      </main>
    );
  }

  if (!currentBusiness) {
    return <Navigate to="/businesses/new" replace />;
  }

  return <Outlet />;
}

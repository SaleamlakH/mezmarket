import { Brand } from '@/components/Brand';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { Navigate, Outlet } from 'react-router';

interface RegistrationLayoutProps {
  guestOnly?: boolean;
}

export function RegistrationLayout({ guestOnly = false }: RegistrationLayoutProps) {
  const {
    session: { status },
  } = useAuthContext();

  if (guestOnly && status === 'loading') {
    return (
      <main className="h-full flex items-center justify-center">
        <Brand size="lg" />
      </main>
    );
  }

  if (guestOnly && status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  // Mobile: full-screen bg. Desktop: centers the card.
  return (
    <div className="md:py-5 w-full m-h-full flex self-stretch items-center justify-center">
      <div className="w-full h-full flex flex-col justify-center gap-2 p-4 py-3 sm:p-5 sm:bg-(--surface-primary) sm:h-auto sm:max-w-sm sm:rounded-2xl sm:gap-0 sm:border sm:border-(--border) sm:shadow-md">
        <div className="flex items-center justify-between">
          <Brand size="md" />
          <ThemeToggle />
        </div>

        <main className="flex-1 flex flex-col justify-center ">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

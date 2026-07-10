import { Outlet } from 'react-router';
import { Brand } from '../components/Brand';
import { ThemeToggle } from '../components/ThemeToggle';

export function AuthLayout() {
  // Mobile: full-screen bg. Desktop: centers the card.
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full h-full flex flex-col justify-center gap-2 p-5 sm:bg-(--surface-primary) sm:h-auto sm:max-w-sm sm:rounded-2xl sm:gap-0 sm:border sm:border-(--border) sm:shadow-md">
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

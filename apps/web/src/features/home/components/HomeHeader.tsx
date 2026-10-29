import { LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router';
import { Brand } from '@/components/Brand';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';

const NAV_LINKS = [
  { label: 'Products', href: '#products' },
  { label: 'Selling', href: '#selling' },
  { label: 'Inventory', href: '#inventory' },
  { label: 'Costs', href: '#costs' },
  { label: 'Overview', href: '#overview' },
  { label: 'Contact', href: '#contact' },
];

export function HomeHeader() {
  const {
    session: { status },
  } = useAuthContext();
  const isAuthenticated = status === 'authenticated';

  return (
    <header className="sticky top-0 z-40 border-b border-(--border) bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Brand size="md" />

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="focus-ring rounded-md px-2 py-1.5 text-[13px] font-semibold text-(--text-muted) transition-colors hover:text-(--text)"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-(--accent) px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-(--accent-hover)"
            >
              <LayoutDashboard size={15} className="my-1" aria-hidden />
              <span className="sr-only sm:not-sr-only">Dashboard</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="focus-ring hidden rounded-lg px-3 py-2 text-sm font-semibold text-(--text-muted) transition-colors hover:text-(--text) sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-(--accent) px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-(--accent-hover)"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

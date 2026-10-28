import { Link } from 'react-router';
import { ChevronRight, LogOut, Store, UserRound } from 'lucide-react';
import { Button } from '@/components/Button';
import { ListCard } from '@/components/ListCard';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { SectionHeader } from '@/components/SectionHeader';
import { Banner } from '@/components/Banner';
import { Toast } from '@/components/Toast';
import { DASHBOARD_PATH } from '@/layouts/navigation';
import { useSignOut } from '@/hooks/useSignOut';

export function SettingsPage() {
  const { signOut, isSigningOut, error, clearError } = useSignOut();

  return (
    <PageShell>
      {error && (
        <Toast position="top-right" duration={5000} onDismiss={clearError}>
          <Banner tone="danger" title={error} onDismiss={clearError} />
        </Toast>
      )}

      <PageHeader
        title="Settings"
        subtitle="Manage your account, shop and preferences."
        backTo={DASHBOARD_PATH}
      />

      <div className="grid gap-5 md:grid-cols-2 md:gap-x-6">
        <section>
          <SectionHeader title="Account" />

          <Link
            to="/settings/profile"
            className="focus-ring block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
          >
            <ListCard
              surface="primary"
              icon={<UserRound size={20} />}
              title="Profile"
              meta="Manage your account information"
              trailing={<ChevronRight size={16} className="text-(--text-muted)" />}
            />
          </Link>

          <Button
            type="button"
            variant="secondary"
            className="mt-2 w-full justify-start"
            onClick={signOut}
            isLoading={isSigningOut}
          >
            <span className="flex items-center gap-1.5 text-(--danger)">
              <LogOut size={18} aria-hidden />
              Logout
            </span>
          </Button>
        </section>

        <section>
          <SectionHeader title="Business" />

          <Link
            to="business"
            className="focus-ring block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
          >
            <ListCard
              surface="primary"
              icon={<Store size={20} />}
              title="Business profile"
              meta="Name, currency, tax and stock preferences"
              trailing={<ChevronRight size={16} className="text-(--text-muted)" />}
            />
          </Link>
        </section>
      </div>
    </PageShell>
  );
}

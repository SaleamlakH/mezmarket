import { Link } from 'react-router';
import { ChevronRight, Store, UserRound } from 'lucide-react';
import { ListCard } from '@/components/ListCard';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { SectionHeader } from '@/components/SectionHeader';
import { DASHBOARD_PATH } from '@/layouts/navigation';

export function SettingsPage() {
  return (
    <PageShell>
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

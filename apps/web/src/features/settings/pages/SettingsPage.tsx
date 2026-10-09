import { Link } from 'react-router';
import { ChevronRight, Store, UserRound } from 'lucide-react';
import { ListCard } from '@/components/ListCard';
import { SectionHeader } from '@/components/SectionHeader';

export function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-xl font-extrabold tracking-tight text-(--text)">Settings</h1>
      <p className="mt-1 text-sm text-(--text-muted)">Manage your account, shop and preferences.</p>

      <SectionHeader title="Account" />

      <Link
        to="/settings/profile"
        className="focus-ring block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
      >
        <ListCard
          icon={<UserRound size={20} />}
          title="Profile"
          meta="Manage your account information"
          trailing={<ChevronRight size={16} className="text-(--text-muted)" />}
        />
      </Link>

      <SectionHeader title="Business" />

      <Link to="business" className="group block focus-ring rounded-xl">
        <ListCard
          icon={<Store size={20} />}
          title="Business profile"
          meta="Name, currency, tax and stock preferences"
          trailing={
            <span className="text-[13px] text-(--text-muted) transition-colors group-hover:text-(--accent)">
              ›
            </span>
          }
        />
      </Link>
    </div>
  );
}

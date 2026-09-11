import { Link } from 'react-router';
import { ChevronRight, UserRound } from 'lucide-react';
import { ListCard } from '@/components/ListCard';
import { SectionHeader } from '@/components/SectionHeader';

export function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl">
      <h2 className="hidden sm:block mb-4 text-lg font-bold text-(--text)">Settings</h2>

      <SectionHeader title="Account" />

      <Link
        to="/settings/profile"
        className="focus-ring block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
      >
        <ListCard
          thumb={
            <span className="flex h-full w-full items-center justify-center text-(--text-muted)">
              <UserRound size={20} />
            </span>
          }
          title="Profile"
          meta="Manage your account information"
          tag={<ChevronRight size={16} className="text-(--text-muted)" />}
        />
      </Link>
    </main>
  );
}

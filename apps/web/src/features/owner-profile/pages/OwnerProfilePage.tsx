import { useState } from 'react';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Loader } from '@/components/Loader';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { Toast } from '@/components/Toast';
import { SETTINGS_PATH } from '@/layouts/navigation';
import type { OwnerApi } from '../api/ownerApi';
import { ProfileEditForm } from '../components/ProfileEditForm';
import { useOwnerProfile } from '../hooks/useOwnerProfile';

export function OwnerProfilePage({ ownerApi }: { ownerApi: OwnerApi }) {
  const { profile, isLoading, error, applyProfile, refetch } = useOwnerProfile(ownerApi);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  );

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Profile" backTo={SETTINGS_PATH} />
        <div className="flex justify-center py-20">
          <Loader size={28} />
        </div>
      </PageShell>
    );
  }

  if (error || !profile) {
    return (
      <PageShell>
        <PageHeader title="Profile" backTo={SETTINGS_PATH} />
        <EmptyState
          title="Unable to load profile"
          description={error ?? 'Failed to load profile'}
          action={
            <Button variant="secondary" onClick={refetch}>
              Retry
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          duration={3000}
          position="top-right"
          onDismiss={() => setToast(null)}
        />
      )}

      <PageHeader title="Profile" backTo={SETTINGS_PATH} />

      <ProfileEditForm
        ownerApi={ownerApi}
        profile={profile}
        editing={editing}
        onEdit={() => setEditing(true)}
        onCancel={() => setEditing(false)}
        onSaved={(updated) => {
          applyProfile(updated);
          setEditing(false);
          setToast({ message: 'Profile updated', variant: 'success' });
        }}
      />
    </PageShell>
  );
}

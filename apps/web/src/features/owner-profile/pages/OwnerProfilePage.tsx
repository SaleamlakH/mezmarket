import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Loader } from '@/components/Loader';
import { Toast } from '@/components/Toast';
import type { OwnerApi } from '../api/ownerApi';
import { ProfileDetails } from '../components/ProfileDetails';
import { ProfileEditForm } from '../components/ProfileEditForm';
import { useOwnerProfile } from '../hooks/useOwnerProfile';

export function OwnerProfilePage({ ownerApi }: { ownerApi: OwnerApi }) {
  const { profile, isLoading, error, applyProfile, refetch } = useOwnerProfile(ownerApi);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  );

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl justify-center py-20">
        <Loader size={28} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          title="Unable to load profile"
          description={error ?? 'Failed to load profile'}
          action={
            <Button variant="secondary" onClick={refetch}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          duration={3000}
          position="top-right"
          onDismiss={() => setToast(null)}
        />
      )}

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-(--text)">
          {mode === 'edit' ? 'Edit Profile' : 'Profile'}
        </h2>
        {mode === 'view' && (
          <Button variant="secondary" onClick={() => setMode('edit')}>
            <Pencil size={14} />
            Edit
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-(--border) bg-(--surface-primary)">
        {mode === 'view' ? (
          <ProfileDetails profile={profile} />
        ) : (
          <ProfileEditForm
            ownerApi={ownerApi}
            profile={profile}
            onCancel={() => setMode('view')}
            onSaved={(updated) => {
              applyProfile(updated);
              setMode('view');
              setToast({ message: 'Profile updated', variant: 'success' });
            }}
          />
        )}
      </div>
    </div>
  );
}

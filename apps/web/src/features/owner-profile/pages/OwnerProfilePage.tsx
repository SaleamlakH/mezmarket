import { useState } from 'react';
import { Button } from '@/components/Button';
import { Dialog, DialogHeader } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { Loader } from '@/components/Loader';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { Banner } from '@/components/Banner';
import { SectionCard } from '@/components/SectionCard';
import { Toast } from '@/components/Toast';
import { SETTINGS_PATH } from '@/layouts/navigation';
import { formatDate } from '@/lib/format';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import type { OwnerApi } from '../api/ownerApi';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { ProfileEditForm } from '../components/ProfileEditForm';
import { useChangePasswordForm } from '../hooks/useChangePasswordForm';
import { useOwnerProfile } from '../hooks/useOwnerProfile';

export function OwnerProfilePage({ ownerApi }: { ownerApi: OwnerApi }) {
  const { session } = useAuthContext();
  const { profile, isLoading, error, applyProfile, refetch } = useOwnerProfile(ownerApi);
  const changePassword = useChangePasswordForm();
  const [editing, setEditing] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  );

  const passwordLastChanged = session.user?.updatedAt ? formatDate(session.user.updatedAt) : null;

  function dismissToast() {
    setToast(null);
  }

  function closePasswordDialog() {
    setPasswordDialogOpen(false);
    changePassword.form.reset();
    changePassword.clearError();
  }

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
        <Toast position="top-right" duration={3000} onDismiss={dismissToast}>
          <Banner
            tone={toast.variant === 'error' ? 'danger' : 'success'}
            title={toast.message}
            onDismiss={dismissToast}
          />
        </Toast>
      )}

      <PageHeader title="Profile" backTo={SETTINGS_PATH} />

      <div className="flex flex-col gap-5">
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

        <SectionCard
          title="Security"
          subtitle="Manage your password and how you sign in."
          editing={false}
          onEdit={() => {}}
          showEdit={false}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-xs font-semibold text-(--text)">Password</p>
              <p className="m-0 mt-0.5 text-[11px] text-(--text-muted)">
                {passwordLastChanged
                  ? `Last changed ${passwordLastChanged}`
                  : 'Last change date unavailable'}
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setPasswordDialogOpen(true)}>
              Change password
            </Button>
          </div>
        </SectionCard>
      </div>

      <Dialog open={passwordDialogOpen} onClose={closePasswordDialog} size="md">
        <DialogHeader title="Change password" onClose={closePasswordDialog} />
        <ChangePasswordForm flow={changePassword} onCancel={closePasswordDialog} />
      </Dialog>
    </PageShell>
  );
}

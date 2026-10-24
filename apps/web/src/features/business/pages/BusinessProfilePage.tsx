import { useState } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { Toast } from '@/components/Toast';
import { SETTINGS_PATH } from '@/layouts/navigation';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import type { BusinessResponse } from '@mez/types';
import { BusinessEditForm } from '../components/BusinessEditForm';

function createdDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB');
}

function BusinessProfileContent({ business }: { business: BusinessResponse }) {
  const [editing, setEditing] = useState(false);
  const [displayed, setDisplayed] = useState<BusinessResponse>(business);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  );

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

      <PageHeader
        title={displayed.name}
        subtitle={`Registered ${createdDate(displayed.createdAt)}`}
        backTo={SETTINGS_PATH}
      />

      <BusinessEditForm
        business={displayed}
        editing={editing}
        onEdit={() => setEditing(true)}
        onCancel={() => setEditing(false)}
        onSaved={(updated) => {
          setDisplayed(updated);
          setEditing(false);
          setToast({ message: 'Business profile updated', variant: 'success' });
        }}
      />
    </PageShell>
  );
}

export function BusinessProfilePage() {
  const { currentBusiness } = useBusinessContext();

  if (!currentBusiness) {
    return (
      <PageShell>
        <PageHeader title="Business profile" backTo={SETTINGS_PATH} />
        <EmptyState
          title="No business selected"
          description="Pick a business to view and update its profile."
        />
      </PageShell>
    );
  }

  return <BusinessProfileContent key={currentBusiness.id} business={currentBusiness} />;
}

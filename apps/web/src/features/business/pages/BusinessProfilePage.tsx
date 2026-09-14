import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Toast } from '@/components/Toast';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import type { BusinessResponse } from '@mez/types';
import { BusinessDetails } from '../components/BusinessDetails';
import { BusinessEditForm } from '../components/BusinessEditForm';

function createdDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB');
}

function BusinessProfileContent({ business }: { business: BusinessResponse }) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [displayed, setDisplayed] = useState<BusinessResponse>(business);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          duration={3000}
          position="top-right"
          onDismiss={() => setToast(null)}
        />
      )}

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold leading-tighter tracking-tight text-(--text)">
            {displayed.name}
          </h1>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
            Registered {createdDate(displayed.createdAt)}
          </p>
        </div>
        {mode === 'view' && (
          <Button variant="secondary" type="button" onClick={() => setMode('edit')}>
            <Pencil aria-hidden size={14} />
            Edit
          </Button>
        )}
      </header>

      {mode === 'view' ? (
        <BusinessDetails business={displayed} />
      ) : (
        <BusinessEditForm
          business={displayed}
          onCancel={() => setMode('view')}
          onSaved={(updated) => {
            setDisplayed(updated);
            setMode('view');
            setToast({ message: 'Business profile updated', variant: 'success' });
          }}
        />
      )}
    </div>
  );
}

export function BusinessProfilePage() {
  const { currentBusiness } = useBusinessContext();

  if (!currentBusiness) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <EmptyState
          title="No business selected"
          description="Pick a business to view and update its profile."
        />
      </div>
    );
  }

  return <BusinessProfileContent key={currentBusiness.id} business={currentBusiness} />;
}

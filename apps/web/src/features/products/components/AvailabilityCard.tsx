import { AlertTriangle } from 'lucide-react';
import type { ProductWithUnitsResponse } from '@mez/types';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Dialog, DialogHeader } from '@/components/Dialog';
import { useProductActiveForm } from '../hooks/useProductActiveForm';

interface AvailabilityCardProps {
  businessId: string;
  product: ProductWithUnitsResponse;
  onSaved: (message: string) => void;
}

/** Whether the product can be picked in inventory and sales, with its confirmation. */
export function AvailabilityCard({ businessId, product, onSaved }: AvailabilityCardProps) {
  const { active, isSaving, error, confirmOpen, requestToggle, cancelToggle, confirm } =
    useProductActiveForm({ businessId, product, onSaved });

  return (
    <>
      <section className="mt-4 rounded-xl border border-(--danger) bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface-primary))] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-(--danger)" />
            <div className="min-w-0">
              <h2 className="m-0 text-[13px] font-bold text-(--danger)">Availability</h2>
              <p className="m-0 mt-0.5 text-[11px] text-(--text-muted)">
                Whether this product can be picked in inventory and sales.
              </p>
            </div>
          </div>
          <Badge tone={active ? 'positive' : 'neutral'}>{active ? 'Active' : 'Inactive'}</Badge>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="m-0 min-w-0 text-[11px] text-(--text-muted)">
            {active
              ? 'Deactivating hides it from pickers. Existing stock and history stay put.'
              : 'Hidden from pickers until reactivated.'}
          </p>
          <Button
            type="button"
            variant={active ? 'danger' : 'primary'}
            size="lg"
            className="shrink-0"
            onClick={requestToggle}
            isLoading={isSaving}
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </Button>
        </div>

        {error && (
          <p role="alert" className="m-0 mt-2 text-[11px] font-semibold text-(--danger)">
            {error}
          </p>
        )}
      </section>

      <Dialog open={confirmOpen} onClose={cancelToggle}>
        <DialogHeader
          title={active ? 'Deactivate product' : 'Reactivate product'}
          onClose={cancelToggle}
        />
        <p className="m-0 text-[13px] text-(--text)">
          {active
            ? 'It will be hidden from sales and inventory pickers. Existing stock and history stay put.'
            : 'It will be available again in sales and inventory pickers.'}
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant={active ? 'danger' : 'primary'}
            size="lg"
            onClick={() => void confirm()}
            isLoading={isSaving}
            className="flex-1"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={cancelToggle}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </Dialog>
    </>
  );
}

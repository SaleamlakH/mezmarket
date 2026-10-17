import type { CustomerSummaryResponse } from '@mez/types';
import { UserPlus, X } from 'lucide-react';
import { Button } from '@/components/Button';

export interface SaleCustomerActionProps {
  customer: CustomerSummaryResponse | null;
  /** Opens the customer picker. */
  onAttach: () => void;
  /** Detaches the current customer. */
  onClear: () => void;
}

/** Attaches or clears the sale's customer. */
export function SaleCustomerAction({ customer, onAttach, onClear }: SaleCustomerActionProps) {
  if (!customer) {
    return (
      <Button type="button" variant="secondary" size="md" onClick={onAttach}>
        <UserPlus size={14} aria-hidden /> Attach customer
      </Button>
    );
  }

  return (
    <span className="inline-flex items-stretch overflow-hidden rounded-lg border border-(--accent) bg-(--accent) text-white">
      <button
        type="button"
        onClick={onAttach}
        title="Change customer"
        className="focus-ring inline-flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold"
      >
        <UserPlus size={13} aria-hidden /> {customer.name}
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label="Remove customer"
        title="Remove customer"
        className="focus-ring inline-flex cursor-pointer items-center border-l border-white/30 px-1.5 transition-colors hover:bg-white/15"
      >
        <X size={13} aria-hidden />
      </button>
    </span>
  );
}

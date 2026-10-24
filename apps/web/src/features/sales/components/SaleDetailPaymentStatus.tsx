import { useState } from 'react';
import type { SaleDetailResponse } from '@mez/types';
import { Button } from '@/components/Button';
import { StatusToggle } from '@/components/StatusToggle';
import type { PaymentMode } from '../hooks/usePaymentForm';
import { RecordPaymentForm } from './RecordPaymentForm';

const PAID_ACTIVE =
  'aria-pressed:border-(--positive) aria-pressed:bg-(--positive) aria-pressed:text-white aria-pressed:hover:border-(--positive) aria-pressed:hover:bg-(--positive)';
const PARTIAL_ACTIVE =
  'aria-pressed:border-(--warning) aria-pressed:bg-(--warning) aria-pressed:text-white aria-pressed:hover:border-(--warning) aria-pressed:hover:bg-(--warning)';

export interface SaleDetailPaymentStatusProps {
  sale: SaleDetailResponse;
}

/** The payment buttons and the form for the chosen one. */
export function SaleDetailPaymentStatus({ sale }: SaleDetailPaymentStatusProps) {
  const [mode, setMode] = useState<PaymentMode | null>(null);

  return (
    <>
      <p className="m-0 mb-2 text-xs text-(--text-muted)">Payment status</p>
      <StatusToggle value={mode} onChange={setMode}>
        <Button value="paid" variant="secondary" className={`flex-1 ${PAID_ACTIVE}`}>
          Mark as paid
        </Button>
        <Button value="partial" variant="secondary" className={`flex-1 ${PARTIAL_ACTIVE}`}>
          Partially paid
        </Button>
      </StatusToggle>
      {mode && (
        <RecordPaymentForm key={mode} sale={sale} mode={mode} onClose={() => setMode(null)} />
      )}
    </>
  );
}

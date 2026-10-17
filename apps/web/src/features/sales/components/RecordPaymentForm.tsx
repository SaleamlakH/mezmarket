import type { PaymentMethod, SaleDetailResponse } from '@mez/types';
import { Button } from '@/components/Button';
import { usePaymentForm, type PaymentMode } from '../hooks/usePaymentForm';
import { PaymentFields } from './PaymentFields';

export interface RecordPaymentFormProps {
  sale: SaleDetailResponse;
  /** `paid` settles the balance; `partial` records an amount. */
  mode: PaymentMode;
  onClose: () => void;
}

/** The form shown under the payment buttons to record a payment. */
export function RecordPaymentForm({ sale, mode, onClose }: RecordPaymentFormProps) {
  const form = usePaymentForm(sale.id, mode, onClose);
  const values = form.watch();

  const amountEditable = mode === 'partial';
  const showDetail = values.method !== undefined && values.method !== 'CASH';

  return (
    <form onSubmit={form.submit} className="mt-3 flex flex-col gap-2.5">
      <PaymentFields
        value={values}
        errors={form.paymentErrors}
        amountEditable={amountEditable}
        amountDisplay={String(sale.balanceDue)}
        showDetail={showDetail}
        idPrefix="record-payment"
        onChange={(field, value) => {
          if (field === 'method') {
            form.setValue('method', value === '' ? undefined : (value as PaymentMethod), {
              shouldValidate: true,
            });
          } else {
            form.setValue(field, value, { shouldValidate: true });
          }
        }}
      />

      {form.serverError && (
        <p className="m-0 text-[11px] font-semibold text-(--danger)" role="alert">
          {form.serverError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={form.isPending}>
          {amountEditable ? 'Record payment' : 'Mark as paid'}
        </Button>
      </div>
    </form>
  );
}

import { useState, type FormEvent } from 'react';
import type { PaymentMethod, RecordPaymentInput, SaleDetailResponse } from '@mez/types';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { useRecordPayment } from '../hooks/useSalesApi';
import { PAYMENT_METHOD_OPTIONS } from '../lib/saleDisplay';

export interface RecordPaymentFormProps {
  sale: SaleDetailResponse;
  /** `paid` settles the balance; `partial` records an amount. */
  mode: 'paid' | 'partial';
  onClose: () => void;
}

/** The form shown under the payment buttons to record a payment. */
export function RecordPaymentForm({ sale, mode, onClose }: RecordPaymentFormProps) {
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [amount, setAmount] = useState(mode === 'paid' ? String(sale.balanceDue) : '');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending, error: mutationError } = useRecordPayment(sale.id);

  const remaining = sale.balanceDue;
  const isPartial = mode === 'partial';

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (!method) {
      setError('Select a payment method');
      return;
    }

    const value = Number(amount);
    const coversBalance = isPartial && Number.isFinite(value) && value > 0 && value < remaining;

    let input: RecordPaymentInput;
    if (coversBalance) {
      input = { status: 'PARTIALLY_PAID', amount: value, method };
    } else {
      input = { status: 'PAID', method };
    }
    if (details.trim()) {
      input.methodDetail = details.trim();
    }

    setError(null);
    mutate(input, { onSuccess: onClose });
  };

  const submitLabel = isPartial ? 'Record payment' : 'Mark as paid';
  const serverError = mutationError instanceof Error ? mutationError.message : null;

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Field id="record-payment-amount" label="Amount paid" compact>
          <Input
            id="record-payment-amount"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0"
            value={amount}
            onChange={(event) => setAmount(event.currentTarget.value)}
          />
        </Field>

        <Field id="record-payment-method" label="Payment method" compact>
          <Select
            id="record-payment-method"
            value={method}
            placeholder="Select"
            onChange={(event) => setMethod(event.currentTarget.value as PaymentMethod | '')}
            options={PAYMENT_METHOD_OPTIONS}
          />
        </Field>
      </div>

      <Field id="record-payment-details" label="Payment details" compact>
        <Input
          id="record-payment-details"
          type="text"
          placeholder="Reference, last four digits…"
          value={details}
          onChange={(event) => setDetails(event.currentTarget.value)}
        />
      </Field>

      {(error || serverError) && (
        <p className="m-0 text-[11px] font-semibold text-(--danger)" role="alert">
          {error ?? serverError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

import type { PaymentMethod, PaymentStatus } from '@mez/types';
import { Chip } from '@/components/Chip';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { PAYMENT_LABELS, PAYMENT_METHOD_OPTIONS, PAYMENT_TONES } from '../lib/saleDisplay';
import { useSaleDraft } from '../state/useSaleDraft';

const STATUSES: PaymentStatus[] = ['PAID', 'PENDING', 'PARTIALLY_PAID'];

export interface SalePaymentControlProps {
  /** The sale's running total. */
  total: number;
}

/** The sale panel's payment section: status, amount, method and detail. */
export function SalePaymentControl({ total }: SalePaymentControlProps) {
  const { payment, setPaymentStatus, setPaymentAmount, setPaymentMethod, setPaymentDetail } =
    useSaleDraft();

  const isPending = payment.status === 'PENDING';
  // Only a partial payment is keyed in.
  const amountEditable = payment.status === 'PARTIALLY_PAID';
  // The detail applies to non-cash methods.
  const showDetail = payment.method !== '' && payment.method !== 'CASH';

  const paidDefault = total > 0 ? total.toFixed(2) : '';
  const amountValue = amountEditable ? payment.amount : paidDefault;

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Payment status" className="flex flex-wrap gap-2 pt-1">
        {STATUSES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setPaymentStatus(option)}
            aria-pressed={payment.status === option}
            className="focus-ring cursor-pointer rounded-lg"
          >
            <Chip
              active={payment.status === option}
              tone={PAYMENT_TONES[option]}
              variant={option === 'PARTIALLY_PAID' ? 'outline' : 'solid'}
            >
              {PAYMENT_LABELS[option]}
            </Chip>
          </button>
        ))}
      </div>

      {isPending ? (
        <p className="m-0 text-[11px] text-(--text-muted)">A pending sale records no payment</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Field id="sale-payment-amount" label="Amount" compact muted={!amountEditable}>
              <Input
                id="sale-payment-amount"
                size="lg"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                placeholder="0"
                value={amountValue}
                disabled={!amountEditable}
                onChange={(event) => setPaymentAmount(event.currentTarget.value)}
              />
            </Field>

            <Field id="sale-payment-method" label="Method" compact>
              <Select
                id="sale-payment-method"
                size="lg"
                value={payment.method}
                placeholder="Select"
                onChange={(event) =>
                  setPaymentMethod(event.currentTarget.value as PaymentMethod | '')
                }
                options={PAYMENT_METHOD_OPTIONS}
              />
            </Field>
          </div>

          {showDetail && (
            <Field id="sale-payment-detail" label="Payment detail" compact>
              <Input
                id="sale-payment-detail"
                size="lg"
                value={payment.methodDetail}
                placeholder="Reference, cheque no., etc."
                onChange={(event) => setPaymentDetail(event.currentTarget.value)}
              />
            </Field>
          )}
        </div>
      )}
    </div>
  );
}

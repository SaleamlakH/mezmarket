import type { FieldErrors } from '@mez/validation';
import type { PaymentFormValues, PaymentMethod, PaymentStatus } from '@mez/types';
import { Chip } from '@/components/Chip';
import { PAYMENT_LABELS, PAYMENT_TONES } from '../lib/saleDisplay';
import { useSaleDraft } from '../state/useSaleDraft';
import { PaymentFields } from './PaymentFields';

const STATUSES: PaymentStatus[] = ['PAID', 'PENDING', 'PARTIALLY_PAID'];

export interface SalePaymentControlProps {
  /** The sale's running total. */
  total: number;
  /** The checkout's errors for the draft's payment. */
  errors: FieldErrors<PaymentFormValues>;
}

/** The sale panel's payment section: status, amount, method and detail. */
export function SalePaymentControl({ total, errors }: SalePaymentControlProps) {
  const { payment, setPaymentStatus, setPaymentAmount, setPaymentMethod, setPaymentDetail } =
    useSaleDraft();

  const isPending = payment.status === 'PENDING';
  // Only a partial payment is keyed in.
  const amountEditable = payment.status === 'PARTIALLY_PAID';
  // The detail applies to non-cash methods.
  const showDetail = payment.method !== '' && payment.method !== 'CASH';

  const paidDefault = total > 0 ? total.toFixed(2) : '';

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
        <PaymentFields
          value={{
            status: payment.status,
            amount: payment.amount,
            methodDetail: payment.methodDetail,
            ...(payment.method ? { method: payment.method } : {}),
          }}
          errors={errors}
          amountEditable={amountEditable}
          amountDisplay={paidDefault}
          showDetail={showDetail}
          idPrefix="sale-payment"
          onChange={(field, value) => {
            if (field === 'amount') setPaymentAmount(value);
            else if (field === 'method') setPaymentMethod(value as PaymentMethod | '');
            else setPaymentDetail(value);
          }}
        />
      )}
    </div>
  );
}

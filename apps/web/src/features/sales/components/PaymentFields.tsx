import type { PaymentFormValues } from '@mez/types';
import type { FieldErrors } from '@mez/validation';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { PAYMENT_METHOD_OPTIONS } from '../lib/saleDisplay';

export interface PaymentFieldsProps {
  value: PaymentFormValues;
  onChange: (field: 'amount' | 'method' | 'methodDetail', value: string) => void;
  /** Whether the amount is keyed in; otherwise it shows `amountDisplay` read-only. */
  amountEditable: boolean;
  /** The amount shown while the field is not editable. */
  amountDisplay: string;
  /** The detail applies to non-cash methods. */
  showDetail: boolean;
  errors: FieldErrors<PaymentFormValues>;
  /** Prefix for the fields' element ids. */
  idPrefix: string;
}

/** The amount, method and detail every payment form shares. */
export function PaymentFields({
  value,
  onChange,
  amountEditable,
  amountDisplay,
  showDetail,
  errors,
  idPrefix,
}: PaymentFieldsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Field
          id={`${idPrefix}-amount`}
          label="Amount"
          compact
          muted={!amountEditable}
          error={errors.amount}
        >
          <Input
            id={`${idPrefix}-amount`}
            size="lg"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0"
            value={amountEditable ? (value.amount ?? '') : amountDisplay}
            disabled={!amountEditable}
            error={errors.amount}
            onChange={(event) => onChange('amount', event.currentTarget.value)}
          />
        </Field>

        <Field id={`${idPrefix}-method`} label="Method" compact error={errors.method}>
          <Select
            id={`${idPrefix}-method`}
            size="lg"
            value={value.method ?? ''}
            placeholder="Select"
            error={Boolean(errors.method)}
            options={PAYMENT_METHOD_OPTIONS}
            onChange={(event) => onChange('method', event.currentTarget.value)}
          />
        </Field>
      </div>

      {showDetail && (
        <Field id={`${idPrefix}-detail`} label="Payment detail" compact error={errors.methodDetail}>
          <Input
            id={`${idPrefix}-detail`}
            size="lg"
            type="text"
            placeholder="Reference, cheque no., etc."
            value={value.methodDetail ?? ''}
            error={errors.methodDetail}
            onChange={(event) => onChange('methodDetail', event.currentTarget.value)}
          />
        </Field>
      )}
    </div>
  );
}

import type { BatchFormValues, CreateBatchInput } from '@mez/types';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { dateInputToInstant, instantToDateInputValue } from '@/lib/format';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';

export interface BatchHeaderFormProps {
  form: UseFormReturn<BatchFormValues, unknown, CreateBatchInput>;
}

/**
 * The batch's own fields: when the stock arrived, and who supplied it.
 * Only the date is required — a supplier is unknown for plenty of real
 * deliveries, so both the supplier and the reference number stay optional.
 */
export function BatchHeaderForm({ form }: BatchHeaderFormProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <div className="flex flex-col gap-4">
      <Controller
        control={control}
        name="batchDate"
        render={({ field, fieldState }) => (
          <Field
            id="batchDate"
            label="Batch date"
            hint="The day this stock was received"
            error={fieldState.error?.message}
          >
            <Input
              id="batchDate"
              type="date"
              ref={field.ref}
              value={typeof field.value === 'string' ? instantToDateInputValue(field.value) : ''}
              onChange={(event) => field.onChange(dateInputToInstant(event.target.value))}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          </Field>
        )}
      />

      <Field id="supplierName" label="Supplier" optional error={errors.supplierName?.message}>
        <Input
          id="supplierName"
          placeholder="e.g. Mango Wholesale"
          error={errors.supplierName?.message}
          {...register('supplierName')}
        />
      </Field>

      <Field
        id="referenceNumber"
        label="Reference number"
        optional
        hint="The invoice or receipt number, if you have it"
        error={errors.referenceNumber?.message}
      >
        <Input
          id="referenceNumber"
          placeholder="e.g. INV-4482"
          error={errors.referenceNumber?.message}
          {...register('referenceNumber')}
        />
      </Field>
    </div>
  );
}

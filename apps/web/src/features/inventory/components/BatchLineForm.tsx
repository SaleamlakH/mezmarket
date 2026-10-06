import type { BatchLineFormValues, ProductSummaryResponse } from '@mez/types';
import { Controller } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import {
  dateInputToInstant,
  formatMoney,
  formatQuantity,
  instantToDateInputValue,
} from '@/lib/format';
import type { PurchasableUnit } from '../data/fixtures';
import { useBatchLineForm } from '../hooks/useBatchLineForm';
import { ProductImage } from './ProductImage';

export interface BatchLineFormProps {
  product: ProductSummaryResponse;
  units: PurchasableUnit[];
  initialLine?: BatchLineFormValues | undefined;
  currency: string;
  submitLabel: string;
  onSave: (line: BatchLineFormValues) => void;
  onCancel: () => void;
}

/**
 * The line's own fields, once its product has been picked. The product
 * itself is fixed here — changing it means going back to the picker, so it
 * is shown as a read-only summary rather than another control.
 */
export function BatchLineForm({
  product,
  units,
  initialLine,
  currency,
  submitLabel,
  onSave,
  onCancel,
}: BatchLineFormProps) {
  const { form, errors, submit, total } = useBatchLineForm({ product, initialLine, onSave });
  const { register, control } = form;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border border-(--border) bg-(--field) px-3 py-2.5">
        <ProductImage size={40} />
        <div className="min-w-0">
          <p className="m-0 truncate text-sm font-semibold text-(--text)">{product.name}</p>
          <p className="m-0 mt-1 truncate text-xs text-(--text-muted)">
            {product.brand ?? 'No brand'} · {formatQuantity(product.currentSealedStock)}{' '}
            {product.baseUnitLabel} on hand
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          id="productUnitId"
          label="Bought in"
          hint="Only units this product is purchased in are listed"
          error={errors.productUnitId?.message}
        >
          <Select
            id="productUnitId"
            placeholder="Select the unit"
            error={Boolean(errors.productUnitId)}
            {...register('productUnitId')}
            options={units.map((unit) => ({ value: unit.id, label: unit.name }))}
          />
        </Field>

        <Field id="purchaseQuantity" label="Quantity" error={errors.purchaseQuantity?.message}>
          <Input
            id="purchaseQuantity"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0"
            error={errors.purchaseQuantity?.message}
            {...register('purchaseQuantity')}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          id="purchaseUnitCost"
          label="Unit cost"
          hint="Per that unit"
          error={errors.purchaseUnitCost?.message}
        >
          <Input
            id="purchaseUnitCost"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0.00"
            error={errors.purchaseUnitCost?.message}
            {...register('purchaseUnitCost')}
          />
        </Field>

        <Field id="lineTotal" label="Line total" muted>
          <output
            id="lineTotal"
            htmlFor="purchaseQuantity purchaseUnitCost"
            className="flex w-full items-center rounded-[13px] border border-(--border) bg-(--surface-secondary) px-3.5 py-3 font-mono text-sm font-semibold tabular-nums text-(--text-muted)"
          >
            {total === null ? '—' : formatMoney(total, currency)}
          </output>
        </Field>
      </div>

      <Controller
        control={control}
        name="expiryDate"
        render={({ field, fieldState }) => (
          <Field
            id="expiryDate"
            label="Expiry date"
            optional
            hint="Only for products that expire"
            error={fieldState.error?.message}
          >
            <Input
              id="expiryDate"
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

      <div className="flex gap-3 pt-1">
        <Button variant="secondary" type="button" onClick={onCancel} className="flex-1">
          Back
        </Button>
        <Button type="submit" className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

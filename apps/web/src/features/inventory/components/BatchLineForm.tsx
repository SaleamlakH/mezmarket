import type { BatchLineFormValues, ProductSummaryResponse } from '@mez/types';
import { Controller } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { ListCard } from '@/components/ListCard';
import { Loader } from '@/components/Loader';
import { Select } from '@/components/Select';
import { useProductUnits } from '@/hooks/useCatalogApi';
import {
  datetimeLocalToInstant,
  formatMoney,
  formatQuantity,
  instantToDatetimeLocalValue,
} from '@/lib/format';
import { useBatchLineForm } from '../hooks/useBatchLineForm';

export interface BatchLineFormProps {
  product: ProductSummaryResponse;
  initialLine?: BatchLineFormValues | undefined;
  currency: string;
  submitLabel: string;
  onSave: (line: BatchLineFormValues) => void;
  onCancel: () => void;
}

/**
 * The line's own fields, once its product has been picked. The product
 * itself is fixed here — changing it means going back to the picker, so it
 * is shown as a read-only summary rather than another control. The product's
 * purchasable units are fetched here too, so the request only starts once
 * this form is opened.
 */
export function BatchLineForm({
  product,
  initialLine,
  currency,
  submitLabel,
  onSave,
  onCancel,
}: BatchLineFormProps) {
  const { form, errors, submit, total } = useBatchLineForm({ product, initialLine, onSave });
  const { register, control } = form;
  const {
    isPending: unitsPending,
    isError: unitsError,
    refetch: retryUnits,
    data: units = [],
  } = useProductUnits(product.id);
  const activeUnits = units.filter((unit) => unit.purchaseCapable);

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <ListCard
        title={product.name}
        meta={`${product.brand ?? 'No brand'} · ${formatQuantity(product.currentSealedStock)} ${product.baseUnitLabel} on hand`}
        className="shadow-(--shadow-md)"
      />

      <div className="grid grid-cols-2 gap-3">
        <Field
          id="productUnitId"
          label="Bought in"
          hint="Only units this product is purchased in are listed"
          error={errors.productUnitId?.message}
        >
          {unitsPending ? (
            <div
              role="status"
              aria-label="Loading units…"
              className="flex w-full items-center gap-2 rounded-[13px] border border-(--border) bg-(--field) px-3.5 py-3"
            >
              <Loader size={16} />
              <span className="text-sm text-(--text-muted)">Loading units…</span>
            </div>
          ) : unitsError ? (
            <div
              role="alert"
              className="flex w-full items-center justify-between gap-2 rounded-[13px] border border-(--border) bg-(--field) px-3.5 py-3"
            >
              <span className="text-sm text-(--text-muted)">Could not load units.</span>
              <button
                type="button"
                onClick={() => void retryUnits()}
                className="focus-ring cursor-pointer rounded-md text-[13px] font-semibold text-(--accent) transition-colors hover:text-(--accent-hover)"
              >
                Retry
              </button>
            </div>
          ) : (
            <Select
              id="productUnitId"
              placeholder={activeUnits.length === 0 ? 'No units available' : 'Select the unit'}
              error={Boolean(errors.productUnitId)}
              disabled={activeUnits.length === 0}
              {...register('productUnitId')}
              options={activeUnits.map((unit) => ({ value: unit.id, label: unit.name }))}
            />
          )}
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
              type="datetime-local"
              ref={field.ref}
              value={
                typeof field.value === 'string' ? instantToDatetimeLocalValue(field.value) : ''
              }
              onChange={(event) => field.onChange(datetimeLocalToInstant(event.target.value))}
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

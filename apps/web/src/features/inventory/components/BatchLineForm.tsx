import { useState } from 'react';
import type { BatchLineFormValues, ProductSummaryResponse } from '@mez/types';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import { formatMoney, formatQuantity } from '@/lib/format';
import type { PurchasableUnit } from '../data/fixtures';
import { lineTotal } from '../lib/lineTotal';
import { ProductImage } from './ProductImage';

export interface BatchLineFormProps {
  product: ProductSummaryResponse;
  /** Only the units this product can be bought in. */
  units: PurchasableUnit[];
  /** The line being changed; omitted when adding a new one. */
  initialLine?: BatchLineFormValues | undefined;
  /** Used to show what the line comes to. */
  currency: string;
  submitLabel: string;
  onSave: (line: BatchLineFormValues) => void;
  onCancel: () => void;
}

const emptyLineFor = (productId: string): BatchLineFormValues => ({
  productId,
  productUnitId: '',
  purchaseQuantity: '',
  purchaseUnitCost: '',
});

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
  const [line, setLine] = useState<BatchLineFormValues>(
    () => initialLine ?? emptyLineFor(product.id),
  );

  const setField = <K extends keyof BatchLineFormValues>(
    field: K,
    value: BatchLineFormValues[K],
  ) => {
    setLine((previous) => ({ ...previous, [field]: value }));
  };

  const total = lineTotal(line);

  const canSave =
    line.productUnitId !== '' &&
    line.purchaseQuantity.trim() !== '' &&
    line.purchaseUnitCost.trim() !== '';

  return (
    <div className="flex flex-col gap-4">
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
        >
          <Select
            id="productUnitId"
            name="productUnitId"
            placeholder="Select the unit"
            value={line.productUnitId}
            onChange={(event) => setField('productUnitId', event.target.value)}
            options={units.map((unit) => ({ value: unit.id, label: unit.name }))}
          />
        </Field>

        <Field id="purchaseQuantity" label="Quantity">
          <Input
            id="purchaseQuantity"
            name="purchaseQuantity"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0"
            value={line.purchaseQuantity}
            onChange={(event) => setField('purchaseQuantity', event.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field id="purchaseUnitCost" label="Unit cost" hint="Per that unit">
          <Input
            id="purchaseUnitCost"
            name="purchaseUnitCost"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0.00"
            value={line.purchaseUnitCost}
            onChange={(event) => setField('purchaseUnitCost', event.target.value)}
          />
        </Field>

        {/* Not an input: this is read back from the two fields beside it, so
            there is nothing to type here. An output is labelable, so it still
            takes its place in the form's field order. */}
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

      <Field id="expiryDate" label="Expiry date" optional hint="Only for products that expire">
        <Input
          id="expiryDate"
          name="expiryDate"
          type="date"
          value={line.expiryDate ?? ''}
          onChange={(event) => setField('expiryDate', event.target.value)}
        />
      </Field>

      <div className="flex gap-3 pt-1">
        <Button variant="secondary" type="button" onClick={onCancel} className="flex-1">
          Back
        </Button>
        <Button type="button" onClick={() => onSave(line)} disabled={!canSave} className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

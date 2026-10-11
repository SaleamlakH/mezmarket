import type {
  DownloadUrlsResponse,
  ProductSummaryResponse,
  ProductUnitOptionResponse,
  SaleLineFormValues,
} from '@mez/types';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { ListCard } from '@/components/ListCard';
import { Select } from '@/components/Select';
import { useProductImage } from '@/hooks/useProductImage';
import { formatMoney, formatQuantity } from '@/lib/format';
import { useSaleLineForm } from '../hooks/useSaleLineForm';

export interface SaleLineFormProps {
  product: ProductSummaryResponse;
  units: ProductUnitOptionResponse[];
  currency: string;
  businessId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  initialLine?: SaleLineFormValues | undefined;
  submitLabel: string;
  onSave: (line: SaleLineFormValues) => void;
  onCancel: () => void;
}

/** A picked product's line fields — the unit sold in and the quantity. The product is fixed here. */
export function SaleLineForm({
  product,
  units,
  currency,
  businessId,
  uploadUrls,
  initialLine,
  submitLabel,
  onSave,
  onCancel,
}: SaleLineFormProps) {
  const {
    errors,
    submit,
    productUnitId,
    setProductUnitId,
    quantity,
    setQuantity,
    unitPrice,
    total,
  } = useSaleLineForm({ product, units, initialLine, onSave });
  const imageUrl = useProductImage(businessId, product.uploadId ?? undefined, uploadUrls);

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <ListCard
        title={product.name}
        meta={`${product.brand ?? 'No brand'} · ${formatQuantity(product.currentSealedStock)} ${product.baseUnitLabel} on hand`}
        thumb={{ imageUrl: imageUrl ?? null, imageAlt: product.name }}
        className="shadow-(--shadow-md)"
      />

      <div className="grid grid-cols-2 gap-3">
        <Field
          id="sale-unit"
          label="Sold in"
          hint="Only units this product sells in are listed"
          error={errors.productUnitId?.message}
        >
          <Select
            id="sale-unit"
            value={productUnitId}
            placeholder={units.length === 0 ? 'No units available' : 'Select the unit'}
            disabled={units.length === 0}
            onChange={(event) => setProductUnitId(event.currentTarget.value)}
            error={Boolean(errors.productUnitId)}
            options={units.map((unit) => ({ value: unit.id, label: unit.name }))}
          />
        </Field>

        <Field id="sale-quantity" label="Quantity" error={errors.quantity?.message}>
          <Input
            id="sale-quantity"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0"
            value={quantity}
            onChange={(event) => setQuantity(event.currentTarget.value)}
            error={errors.quantity?.message}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field id="sale-unit-price" label="Unit price" muted>
          <output
            id="sale-unit-price"
            htmlFor="sale-unit"
            className="flex w-full items-center rounded-[13px] border border-(--border) bg-(--surface-secondary) px-3.5 py-3 font-mono text-sm font-semibold tabular-nums text-(--text-muted)"
          >
            {unitPrice === null ? '—' : formatMoney(unitPrice, currency)}
          </output>
        </Field>

        <Field id="sale-line-total" label="Line total" muted>
          <output
            id="sale-line-total"
            htmlFor="sale-quantity sale-unit"
            className="flex w-full items-center rounded-[13px] border border-(--border) bg-(--surface-secondary) px-3.5 py-3 font-mono text-sm font-semibold tabular-nums text-(--text-muted)"
          >
            {total === null ? '—' : formatMoney(total, currency)}
          </output>
        </Field>
      </div>

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

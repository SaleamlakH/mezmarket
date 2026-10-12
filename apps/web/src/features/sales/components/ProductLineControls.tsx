import { useId } from 'react';
import type {
  DownloadUrlsResponse,
  ProductSummaryResponse,
  ProductUnitOptionResponse,
} from '@mez/types';
import { X } from 'lucide-react';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ProductThumb } from '@/components/ProductThumb';
import { Select } from '@/components/Select';
import { Stepper } from '@/components/Stepper';
import { formatMoney, formatQuantity } from '@/lib/format';
import type { SaleDraftLine } from '../state/saleDraft';
import { ProductLinesSummary } from './ProductLinesSummary';

export interface ProductLineControlsProps {
  product: ProductSummaryResponse;
  units: ProductUnitOptionResponse[];
  /** Every line held for this product; those with a quantity show as text. */
  lines: SaleDraftLine[];
  /** The line the selector and stepper edit. */
  activeLine: SaleDraftLine | undefined;
  currency: string;
  businessId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  onUnitChange: (unitId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onLineQuantityChange?: ((lineId: string, quantity: number) => void) | undefined;
  onClose: () => void;
}

/**
 * The unit and quantity controls for one product, plus the list of the lines
 * it has built. Rendered inline on large screens and inside the mobile sheet —
 * the same markup in both.
 */
export function ProductLineControls({
  product,
  units,
  lines,
  activeLine,
  currency,
  businessId,
  uploadUrls,
  onUnitChange,
  onQuantityChange,
  onLineQuantityChange,
  onClose,
}: ProductLineControlsProps) {
  const selectId = useId();
  const activeUnit = units.find((unit) => unit.id === activeLine?.productUnitId);

  return (
    <>
      <div className="flex items-center gap-3 pt-1 pb-3 md:hidden">
        <ProductThumb
          businessId={businessId}
          uploadId={product.uploadId ?? undefined}
          uploadUrls={uploadUrls}
          alt={product.name}
          size={48}
        />
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[15px] font-bold text-(--text)">{product.name}</p>
          <p className="m-0 mt-0.5 truncate font-mono text-[11px] text-(--text-muted)">
            {product.brand ?? 'No brand'} · {formatQuantity(product.currentSealedStock)}{' '}
            {product.baseUnitLabel}
            <span className="sr-only"> in stock</span>
          </p>
        </div>
        <IconButton label="Close" icon={<X size={15} aria-hidden />} size="sm" onClick={onClose} />
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <Select
          id={selectId}
          value={activeLine?.productUnitId ?? ''}
          placeholder={units.length === 0 ? 'No units available' : 'Select the unit'}
          disabled={units.length === 0}
          onChange={(event) => onUnitChange(event.currentTarget.value)}
          options={units.map((unit) => ({ value: unit.id, label: unit.name }))}
        />

        {activeUnit?.price != null && (
          <p
            className="m-0 text-right font-mono text-[11px] text-(--text-muted)"
            aria-label={`Unit price of ${activeUnit.name}`}
          >
            {formatMoney(activeUnit.price, currency)} / {activeUnit.name}
          </p>
        )}

        <Stepper value={activeLine?.quantity ?? 0} onChange={onQuantityChange} />

        <ProductLinesSummary
          units={units}
          lines={lines}
          currency={currency}
          onQuantityChange={onLineQuantityChange}
        />

        <Button type="button" className="w-full md:hidden" onClick={onClose}>
          Done
        </Button>
      </div>
    </>
  );
}

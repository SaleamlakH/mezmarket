import { useId } from 'react';
import type {
  DownloadUrlsResponse,
  ProductSummaryResponse,
  ProductUnitOptionResponse,
} from '@mez/types';
import { X } from 'lucide-react';
import { Button } from '@/components/Button';
import { ProductThumb } from '@/components/ProductThumb';
import { formatQuantity } from '@/lib/format';
import { isCommitted, type SaleDraftLine } from '../state/saleDraft';
import { CartItemLines } from './CartItemLines';
import { ProductQuantityControl } from './ProductQuantityControl';

export interface CartItemEditorProps {
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
  onLineRemove?: ((lineId: string) => void) | undefined;
  onClose: () => void;
}

/**
 * The editor for one cart item: its header, the unit and quantity control, and
 * the list of lines it has built. Rendered inline on large screens and inside
 * the grid card's dialog on mobile — the same markup in both.
 */
export function CartItemEditor({
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
  onLineRemove,
  onClose,
}: CartItemEditorProps) {
  const selectId = useId();
  const activeUnit = units.find((unit) => unit.id === activeLine?.productUnitId);
  const hasCommitted = lines.some(isCommitted);

  return (
    <>
      <div className="flex items-center gap-3 pt-1 pb-3">
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
        <Button
          type="button"
          shape="square"
          size="sm"
          variant="field"
          aria-label="Close"
          title="Close"
          onClick={onClose}
        >
          <X size={15} aria-hidden />
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <ProductQuantityControl
          selectId={selectId}
          units={units}
          unitId={activeLine?.productUnitId ?? ''}
          onUnitChange={onUnitChange}
          quantity={activeLine?.quantity ?? 0}
          onQuantityChange={onQuantityChange}
          currency={currency}
          activeUnit={activeUnit}
        />

        <CartItemLines
          units={units}
          lines={lines}
          currency={currency}
          onQuantityChange={onLineQuantityChange}
          onRemove={onLineRemove}
        />

        {!hasCommitted && (
          <Button type="button" className="w-full" onClick={onClose}>
            Done
          </Button>
        )}
      </div>
    </>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DownloadUrlsResponse, ProductSummaryResponse } from '@mez/types';
import { Eye, Plus } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { RailCard } from '@/components/RailCard';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useProductImage } from '@/hooks/useProductImage';
import { formatMoney, formatQuantity } from '@/lib/format';
import { useProductDraftView } from '../hooks/useProductDraftView';
import { formatLineCount } from '../lib/saleDisplay';
import { useSaleDraft } from '../state/useSaleDraft';
import { CartItemEditor } from './CartItemEditor';
import { CartItemLines } from './CartItemLines';
import { ProductQuantityControl } from './ProductQuantityControl';
import { ProductReviewPopover } from './ProductReviewPopover';

export interface ProductSaleCardProps {
  product: ProductSummaryResponse;
  currency: string;
  businessId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
}

export function ProductSaleCard({
  product,
  currency,
  businessId,
  uploadUrls,
}: ProductSaleCardProps) {
  const imageUrl = useProductImage(businessId, product.uploadId ?? undefined, uploadUrls);

  const {
    openProduct,
    closeProduct,
    setUnit,
    setQuantity,
    setUnitForProduct,
    setQuantityForProduct,
    removeLine,
  } = useSaleDraft();

  const {
    units,
    unitsLoading,
    unitsReady,
    requestUnits,
    lines: productLines,
    cartItem,
    activeLine,
    isActive,
  } = useProductDraftView(product.id);
  const committedCount = cartItem.lines.length;
  const committedTotal = cartItem.total;

  const [reviewOpen, setReviewOpen] = useState(false);
  const isMobile = useIsMobile();
  const cardRef = useRef<HTMLDivElement>(null);

  const thisPopoverOpen = reviewOpen && isActive;

  const isLow =
    product.lowStockThreshold != null && product.currentSealedStock <= product.lowStockThreshold;

  // The first unit stands in when a line was opened before its units arrived.
  useEffect(() => {
    if (isActive && activeLine && !activeLine.productUnitId && units[0]) {
      setUnitForProduct(product.id, units[0].id);
    }
  }, [isActive, activeLine, units, product.id, setUnitForProduct]);

  const handleClose = useCallback(() => {
    setReviewOpen(false);
    closeProduct();
  }, [closeProduct]);

  const handleReview = () => {
    requestUnits();
    if (!isActive) openProduct(product.id, units[0]?.id ?? '');
    setReviewOpen(true);
  };

  const chipLabel =
    committedCount > 0
      ? `${formatLineCount(committedCount)}${
          committedTotal > 0 ? ` · ${formatMoney(committedTotal, currency)}` : ''
        }`
      : '';

  // The line the quick-edit controller edits.
  const quickLine = isActive ? activeLine : cartItem.lines.at(-1)?.line;

  const quickController = (
    <div
      role="group"
      aria-label={`Adjust ${product.name}`}
      className="absolute inset-x-1.5 bottom-1.5 hidden flex-col gap-1.5 rounded-xl border border-(--border-strong) bg-(--surface-primary)/95 p-1.5 opacity-0 shadow-(--shadow-md) transition-[opacity,transform] duration-150 pointer-events-none group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto group-focus:translate-y-0 group-focus:opacity-100 group-focus:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-focus-within:pointer-events-auto md:flex"
    >
      <ProductQuantityControl
        size="md"
        units={units}
        unitsLoading={unitsLoading}
        unitsReady={unitsReady}
        onUnitsRequested={requestUnits}
        unitId={quickLine?.productUnitId ?? units[0]?.id ?? ''}
        placeholder="Unit"
        onUnitChange={(unitId) => setUnitForProduct(product.id, unitId)}
        quantity={quickLine?.quantity ?? 0}
        onQuantityChange={(quantity) => {
          setQuantityForProduct(product.id, units[0]?.id ?? '', quantity);
          if (quantity > (quickLine?.quantity ?? 0)) setReviewOpen(true);
        }}
      />
    </div>
  );

  return (
    <>
      <div
        ref={cardRef}
        tabIndex={0}
        className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
      >
        <RailCard
          variant="thumbnail"
          thumbVariant="wide"
          className="shadow-(--shadow-md)"
          thumb={{ imageUrl: imageUrl ?? null, imageAlt: product.name }}
          badge={
            chipLabel ? (
              <Badge tone="accent">
                <span className="block max-w-[8rem] truncate min-[480px]:max-w-[8rem] md:max-w-[10.5rem]">
                  {chipLabel}
                </span>
              </Badge>
            ) : undefined
          }
          badgePosition="overlay"
          thumbOverlay={quickController}
        >
          <div className="min-w-0">
            <p className="m-0 truncate text-[15px] font-semibold text-(--text)">{product.name}</p>
            <div className="mt-0.5 flex flex-1 justify-between">
              <div className="mt-0.5 flex flex-1 min-w-0 flex-col gap-0.5">
                <p className="m-0 truncate font-mono text-[11px] text-(--text-muted)">
                  {product.brand ?? 'No brand'}
                </p>
                <p
                  className={`m-0 truncate font-mono text-[11px] ${
                    isLow ? 'text-(--warning)' : 'text-(--text-muted)'
                  }`}
                >
                  {formatQuantity(product.currentSealedStock)} {product.baseUnitLabel}
                  <span className="sr-only"> in stock</span>
                </p>
              </div>

              <Button
                type="button"
                shape="pill"
                size="md"
                variant={committedCount > 0 ? 'outline' : 'secondary'}
                onClick={handleReview}
                aria-label={committedCount > 0 ? `Review ${product.name}` : `Add ${product.name}`}
                title={committedCount > 0 ? `Review ${product.name}` : `Add ${product.name}`}
                className="self-end shrink-0 md:h-auto md:w-auto md:whitespace-nowrap"
              >
                {committedCount > 0 ? (
                  <Eye size={16} aria-hidden />
                ) : (
                  <Plus size={16} aria-hidden />
                )}
                <span className="hidden md:inline">{committedCount > 0 ? 'Review' : 'Add'}</span>
              </Button>
            </div>
          </div>
        </RailCard>
      </div>

      {isActive && isMobile && (
        <Dialog open onClose={handleClose} size="md">
          <CartItemEditor
            product={product}
            units={units}
            unitsLoading={unitsLoading}
            unitsReady={unitsReady}
            onUnitsRequested={requestUnits}
            lines={productLines}
            activeLine={activeLine}
            currency={currency}
            businessId={businessId}
            uploadUrls={uploadUrls}
            onUnitChange={setUnit}
            onQuantityChange={(quantity) => {
              if (activeLine) setQuantity(activeLine.id, quantity);
            }}
            onLineQuantityChange={(lineId, quantity) => setQuantity(lineId, quantity)}
            onLineRemove={removeLine}
            onClose={handleClose}
          />
        </Dialog>
      )}

      <div className="hidden md:contents">
        {thisPopoverOpen && (
          <ProductReviewPopover triggerRef={cardRef} onClose={handleClose}>
            <CartItemLines
              units={units}
              lines={productLines}
              currency={currency}
              onQuantityChange={(lineId, quantity) => setQuantity(lineId, quantity)}
              onRemove={removeLine}
            />
          </ProductReviewPopover>
        )}
      </div>
    </>
  );
}

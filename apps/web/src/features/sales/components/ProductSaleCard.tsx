import { useCallback, useEffect, useRef, useState } from 'react';
import type { DownloadUrlsResponse, ProductSummaryResponse } from '@mez/types';
import { Eye, Plus } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { RailCard } from '@/components/RailCard';
import { Select } from '@/components/Select';
import { Stepper } from '@/components/Stepper';
import { useProductImage } from '@/hooks/useProductImage';
import { formatMoney, formatQuantity, pluralize } from '@/lib/format';
import { getSaleProductUnits } from '../fixtures/saleFlow';
import { useSaleDraft } from '../state/useSaleDraft';
import { ProductLineControls } from './ProductLineControls';
import { ProductLinesSummary } from './ProductLinesSummary';
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
  // The card owns its image request, so it fills in as soon as this one download
  // lands and the placeholder above covers the gap until then.
  const imageUrl = useProductImage(businessId, product.uploadId ?? undefined, uploadUrls);

  const {
    activeProductId,
    activeLineId,
    openProduct,
    closeProduct,
    setUnit,
    setQuantity,
    setUnitForProduct,
    setQuantityForProduct,
    linesForProduct,
  } = useSaleDraft();

  const units = getSaleProductUnits(product.id);
  const productLines = linesForProduct(product.id);
  const committed = productLines.filter((line) => line.quantity > 0);
  const committedCount = committed.length;
  const committedTotal = committed.reduce((sum, line) => {
    const unit = units.find((entry) => entry.id === line.productUnitId);
    return unit?.price != null ? sum + unit.price * line.quantity : sum;
  }, 0);

  const isOpen = activeProductId === product.id;
  const activeLine = productLines.find((line) => line.id === activeLineId);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  // The popover only stands while this product is the one being worked on, and
  // only renders visibly at `md`+, so touching any other product's quick-edit
  // controller retires it.
  const thisPopoverOpen = reviewOpen && activeProductId === product.id;

  const isLow =
    product.lowStockThreshold != null && product.currentSealedStock <= product.lowStockThreshold;

  const handleClose = useCallback(() => {
    setReviewOpen(false);
    closeProduct();
  }, [closeProduct, setReviewOpen]);

  // One handler for both breakpoints: it activates the product and
  // flags the review popover, so the two UIs share a single control.
  const handleReview = () => {
    if (activeProductId !== product.id) {
      openProduct(product.id, units[0]?.id ?? '');
    }
    setReviewOpen(true);
  };

  const chipLabel =
    committedCount > 0
      ? `${committedCount} ${pluralize(committedCount, 'line')}${
          committedTotal > 0 ? ` · ${formatMoney(committedTotal, currency)}` : ''
        }`
      : '';

  // What the inline quick-edit controller operates on: the product's active
  // line when it is the one being edited, otherwise its last committed line, so
  // the controller reflects what is already in the sale before any interaction.
  const quickLine = isOpen ? activeLine : committed.at(-1);

  const quickController = (
    <div
      role="group"
      aria-label={`Adjust ${product.name}`}
      className="absolute inset-x-1.5 bottom-1.5 hidden flex-col gap-1.5 rounded-xl border border-(--border-strong) bg-(--surface-primary)/95 p-1.5 opacity-0 shadow-(--shadow-md) transition-[opacity,transform] duration-150 pointer-events-none group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto group-focus:translate-y-0 group-focus:opacity-100 group-focus:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-focus-within:pointer-events-auto md:flex"
    >
      <Select
        value={quickLine?.productUnitId ?? units[0]?.id ?? ''}
        placeholder={units.length === 0 ? 'No units available' : 'Unit'}
        disabled={units.length === 0}
        onChange={(event) => setUnitForProduct(product.id, event.currentTarget.value)}
        options={units.map((unit) => ({ value: unit.id, label: unit.name }))}
        className="[&>select]:px-2.5 [&>select]:py-[7px] [&>select]:text-[13px]"
      />
      <Stepper
        value={quickLine?.quantity ?? 0}
        onChange={(quantity) => {
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
          {/* <div className="flex items-end justify-between gap-2"> */}
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
                size="sm"
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

      {isOpen && isMobile && (
        <Dialog open onClose={handleClose} size="md">
          <ProductLineControls
            product={product}
            units={units}
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
            onClose={handleClose}
          />
        </Dialog>
      )}

      <div className="hidden md:contents">
        {thisPopoverOpen && (
          <ProductReviewPopover triggerRef={cardRef} onClose={handleClose}>
            <ProductLinesSummary
              units={units}
              lines={productLines}
              currency={currency}
              onQuantityChange={(lineId, quantity) => setQuantity(lineId, quantity)}
            />
          </ProductReviewPopover>
        )}
      </div>
    </>
  );
}

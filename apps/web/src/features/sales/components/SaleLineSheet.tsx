import type { DownloadUrlsResponse } from '@mez/types';
import { useCurrency } from '@/hooks/useCurrency';
import { getSaleProductUnits, saleProductsFixture } from '../fixtures/saleFlow';
import { useSaleDraft } from '../state/useSaleDraft';
import { ProductLineControls } from './ProductLineControls';

export interface SaleLineSheetProps {
  productId: string;
  businessId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  onClose: () => void;
}

/**
 * The docked line editor for a product, pinned above the sale panel's footer on
 * desktop. Mobile reuses the product picker's edit dialog instead, so this is
 * only rendered at `md`+.
 */
export function SaleLineSheet({ productId, businessId, uploadUrls, onClose }: SaleLineSheetProps) {
  const currency = useCurrency();
  const {
    activeProductId,
    activeLineId,
    closeProduct,
    linesForProduct,
    setUnitForProduct,
    setQuantityForProduct,
    setQuantity,
  } = useSaleDraft();

  const product = saleProductsFixture.find((entry) => entry.id === productId);
  const units = getSaleProductUnits(productId);
  const lines = linesForProduct(productId);
  const defaultUnitId = units[0]?.id ?? '';

  const activeLine =
    activeProductId === productId ? lines.find((line) => line.id === activeLineId) : undefined;
  const quickLine = activeLine ?? lines.at(-1);

  const handleClose = () => {
    closeProduct();
    onClose();
  };

  if (!product) return null;

  return (
    <section className="flex shrink-0 flex-col rounded-t-2xl border-x border-t border-(--border) bg-(--surface-primary) p-2 shadow-(--shadow-lg)">
      <ProductLineControls
        product={product}
        units={units}
        lines={lines}
        activeLine={quickLine}
        currency={currency}
        businessId={businessId}
        uploadUrls={uploadUrls}
        onUnitChange={(unitId) => setUnitForProduct(productId, unitId)}
        onQuantityChange={(quantity) => setQuantityForProduct(productId, defaultUnitId, quantity)}
        onLineQuantityChange={(lineId, quantity) => setQuantity(lineId, quantity)}
        onClose={handleClose}
      />
    </section>
  );
}

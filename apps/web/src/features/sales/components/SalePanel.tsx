import type { DownloadUrlsResponse } from '@mez/types';
import { useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { useCurrency } from '@/hooks/useCurrency';
import { useIsMobile } from '@/hooks/useIsMobile';
import { pluralize } from '@/lib/format';
import { getSaleProductUnits } from '../fixtures/saleFlow';
import { useSaleDraftTotals } from '../hooks/useSaleDraftTotals';
import { useSaleDraftView } from '../hooks/useSaleDraftView';
import { useSaleDraft } from '../state/useSaleDraft';
import { SaleLineRows } from './SaleLineRows';
import { SaleLineSheet } from './SaleLineSheet';
import { SaleTotalsCard } from './SaleTotalsCard';

export interface SalePanelProps {
  businessId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  /** Confirm the draft sale — wired up in a later step. */
  onConfirm: () => void;
  /** Container styles — supplied by whichever host renders the panel. */
  className?: string;
  /** Dismisses the panel; renders a close control when given (mobile sheet). */
  onClose?: (() => void) | undefined;
}

/**
 * The sale sheet: every committed line of the draft, grouped by product and
 * editable in place, with the running totals and a confirm button. It owns no
 * outer container — the host supplies the class that docks it beside the page
 * or embeds it in the mobile review dialog.
 */
export function SalePanel({
  businessId,
  uploadUrls,
  onConfirm,
  className,
  onClose,
}: SalePanelProps) {
  const currency = useCurrency();
  const { itemCount, hasLines } = useSaleDraftView();
  const totals = useSaleDraftTotals();
  const { clear, openProduct, removeProduct } = useSaleDraft();
  const isMobile = useIsMobile();
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  if (!hasLines) return null;

  // Mobile reviews in the picker's product dialog; desktop edits inline in the
  // docked sheet — driven by the shared draft state either way.
  const handleEdit = (productId: string) => {
    if (isMobile) {
      openProduct(productId, getSaleProductUnits(productId)[0]?.id ?? '');
    } else {
      setEditingProductId(productId);
    }
  };

  // Dropping a product also retires its docked editor, since the lines the
  // editor was working on are gone with it.
  const handleRemove = (productId: string) => {
    removeProduct(productId);
    if (editingProductId === productId) setEditingProductId(null);
  };

  return (
    <div className={`flex min-h-0 flex-col md:mr-3.5 ${className ?? ''}`}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-(--border) py-2 md:px-2">
        <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-(--text)">
          <ShoppingCart size={16} aria-hidden /> Current sale
          <Badge tone="accent">
            {itemCount} {pluralize(itemCount, 'line')}
          </Badge>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="text"
            size="sm"
            onClick={() => {
              clear();
              setEditingProductId(null);
            }}
          >
            Clear
          </Button>
          {onClose && (
            <IconButton
              label="Close"
              icon={<X size={15} aria-hidden />}
              size="sm"
              onClick={onClose}
            />
          )}
        </span>
      </header>

      <div className="min-h-0 grow overflow-y-auto py-2 md:px-2">
        <SaleLineRows
          businessId={businessId}
          uploadUrls={uploadUrls}
          onEdit={handleEdit}
          onRemove={handleRemove}
          editingProductId={editingProductId}
        />
      </div>

      {editingProductId && (
        <SaleLineSheet
          productId={editingProductId}
          businessId={businessId}
          uploadUrls={uploadUrls}
          onClose={() => setEditingProductId(null)}
        />
      )}

      <footer className="flex shrink-0 flex-col gap-2 border-t border-(--border) py-2 md:px-2">
        <SaleTotalsCard totals={totals} currency={currency} />
        <Button type="button" className="w-full" onClick={onConfirm}>
          Confirm sale
        </Button>
      </footer>
    </div>
  );
}

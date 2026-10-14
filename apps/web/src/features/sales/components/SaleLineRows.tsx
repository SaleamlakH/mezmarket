import type { DownloadUrlsResponse } from '@mez/types';
import { Trash2 } from 'lucide-react';
import { ProductThumb } from '@/components/ProductThumb';
import { useCurrency } from '@/hooks/useCurrency';
import { formatMoney, formatQuantity } from '@/lib/format';
import { useSaleDraftView, type SaleDraftViewGroup } from '../hooks/useSaleDraftView';

export interface SaleLineRowsProps {
  businessId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  /** Opens the docked editor for a product's lines. */
  onEdit: (productId: string) => void;
  /** Drops the product from the sale. */
  onRemove: (productId: string) => void;
  /** The product whose editor is open, kept highlighted in the list. */
  editingProductId?: string | null;
}

/**
 * The committed lines of the draft sale, one card per product. Each card reads
 * the product photo, its name, the running total for the product and the units
 * it is sold in with their quantities; tapping it opens the docked line editor
 * for that product, and its trash control drops the product from the sale.
 * Shared by the desktop sale panel and the mobile review sheet.
 */
export function SaleLineRows({
  businessId,
  uploadUrls,
  onEdit,
  onRemove,
  editingProductId,
}: SaleLineRowsProps) {
  const { groups } = useSaleDraftView();

  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {groups.map((group) => (
        <li key={group.productId}>
          <SaleProductCard
            group={group}
            businessId={businessId}
            uploadUrls={uploadUrls}
            onEdit={onEdit}
            onRemove={onRemove}
            isEditing={editingProductId === group.productId}
          />
        </li>
      ))}
    </ul>
  );
}

interface SaleProductCardProps {
  group: SaleDraftViewGroup;
  businessId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  onEdit: (productId: string) => void;
  onRemove: (productId: string) => void;
  isEditing: boolean;
}

function SaleProductCard({
  group,
  businessId,
  uploadUrls,
  onEdit,
  onRemove,
  isEditing,
}: SaleProductCardProps) {
  const currency = useCurrency();
  const productName = group.product?.name ?? 'Unknown product';

  return (
    <div
      className={`rounded-[13px] border bg-(--surface-secondary) transition-colors hover:border-(--border-strong) hover:bg-(--surface-primary) ${
        isEditing ? 'border-(--accent)' : 'border-(--border)'
      }`}
    >
      <div className="flex items-center gap-1.5 p-2">
        <button
          type="button"
          onClick={() => onEdit(group.productId)}
          aria-pressed={isEditing}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-(--accent) focus-visible:-outline-offset-2"
        >
          <ProductThumb
            businessId={businessId}
            uploadId={group.product?.uploadId}
            uploadUrls={uploadUrls}
            alt={productName}
            width={48}
            height={64}
          />

          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-semibold text-(--text)">{productName}</span>
            <span className="mt-0.5 font-mono text-[11px] tabular-nums text-(--text-muted)">
              {formatMoney(group.productTotal, currency)}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-(--text-muted)">
              {group.lines.map(({ line, unit }, index) => (
                <span key={line.id} className="inline-flex items-center gap-1.5">
                  {index > 0 && <span aria-hidden>&middot;</span>}
                  <span className="truncate">
                    {formatQuantity(line.quantity)} {unit?.name ?? 'unit'}
                  </span>
                </span>
              ))}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onRemove(group.productId)}
          aria-label={`Remove ${productName} from the sale`}
          className="self-start shrink-0 cursor-pointer rounded-md p-1.5 text-(--danger) transition-colors hover:outline-1"
        >
          <Trash2 size={15} aria-hidden />
        </button>
      </div>
    </div>
  );
}

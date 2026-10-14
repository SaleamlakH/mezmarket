import type { DownloadUrlsResponse } from '@mez/types';
import { Trash2 } from 'lucide-react';
import { ProductThumb } from '@/components/ProductThumb';
import { useCurrency } from '@/hooks/useCurrency';
import { formatMoney, formatQuantity } from '@/lib/format';
import type { CartItem as CartItemModel } from '../lib/saleDraftView';

export interface CartItemProps {
  cartItem: CartItemModel;
  businessId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  /** Opens the editor for the product's lines. */
  onEdit: (productId: string) => void;
  /** Drops the product from the sale. */
  onRemove: (productId: string) => void;
  /** The product whose editor is open, kept highlighted in the list. */
  isEditing: boolean;
}

/**
 * One product in the cart: its running total and the units it is sold in with
 * their quantities. Tapping the body opens the editor for that product, and the
 * trash control drops the product from the sale.
 */
export function CartItem({
  cartItem,
  businessId,
  uploadUrls,
  onEdit,
  onRemove,
  isEditing,
}: CartItemProps) {
  const currency = useCurrency();
  const productName = cartItem.product?.name ?? 'Unknown product';

  return (
    <div
      className={`rounded-[13px] border bg-(--surface-secondary) transition-colors hover:border-(--border-strong) hover:bg-(--surface-primary) ${
        isEditing ? 'border-(--accent)' : 'border-(--border)'
      }`}
    >
      <div className="flex items-center gap-1.5 p-2">
        <button
          type="button"
          onClick={() => onEdit(cartItem.productId)}
          aria-pressed={isEditing}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-(--accent) focus-visible:-outline-offset-2"
        >
          <ProductThumb
            businessId={businessId}
            uploadId={cartItem.product?.uploadId}
            uploadUrls={uploadUrls}
            alt={productName}
            width={48}
            height={64}
          />

          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-semibold text-(--text)">{productName}</span>
            <span className="mt-0.5 font-mono text-[11px] tabular-nums text-(--text-muted)">
              {formatMoney(cartItem.total, currency)}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-(--text-muted)">
              {cartItem.lines.map(({ line, unit }, index) => (
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
          onClick={() => onRemove(cartItem.productId)}
          aria-label={`Remove ${productName} from the sale`}
          className="self-start shrink-0 cursor-pointer rounded-md p-1.5 text-(--danger) transition-colors hover:outline-1"
        >
          <Trash2 size={15} aria-hidden />
        </button>
      </div>
    </div>
  );
}

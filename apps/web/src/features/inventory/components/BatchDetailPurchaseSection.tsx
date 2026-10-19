import type { StockBatchDetailResponse } from '@mez/types';
import { Badge } from '@/components/Badge';
import { Banner } from '@/components/Banner';
import { formatDate, formatMoney, formatQuantity, pluralize } from '@/lib/format';
import { lineAmount } from '@/lib/lineTotal';
import { batchTotal } from '../lib/batchTotal';
import { expiredLineCount, isLineExpired } from '../lib/expiredLines';
import { groupLinesByProduct } from '../lib/groupLinesByProduct';

export interface BatchDetailPurchaseSectionProps {
  batch: StockBatchDetailResponse;
  currency: string;
}

/** What was received, what it cost, and what stock is left of it. */
export function BatchDetailPurchaseSection({ batch, currency }: BatchDetailPurchaseSectionProps) {
  const groups = groupLinesByProduct(batch.lines);
  const expiredCount = expiredLineCount(batch.lines, batch.batchDate);

  return (
    <section aria-labelledby="batch-purchase-title">
      <h2 id="batch-purchase-title" className="m-0 mb-2 text-base font-medium text-(--text)">
        Purchase
      </h2>

      {expiredCount > 0 && (
        <div className="mb-3">
          <Banner
            tone="danger"
            title={`${expiredCount} ${pluralize(expiredCount, 'line')} ${expiredCount === 1 ? 'was' : 'were'} expired when this batch was received.`}
            description="Review before selling."
          />
        </div>
      )}

      {groups.map((group) => (
        <div key={group.productId} className="border-b border-(--border) py-3 first:border-t">
          <h3 className="m-0 mb-1 text-sm font-medium text-(--text)">
            {group.productName}
            {group.productBrand && (
              <span className="ml-1 text-xs font-normal text-(--text-muted)">
                {group.productBrand}
              </span>
            )}
          </h3>
          {group.lines.map((line) => {
            const expired = isLineExpired(line, batch.batchDate);
            return (
              <div key={line.id} className="py-1 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-(--text)">
                    {formatQuantity(line.purchaseQuantity)} {line.purchaseUnit}
                    {' × '}
                    {formatMoney(line.purchaseUnitCost, currency, line.purchaseUnit)}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-(--text)">
                    {formatMoney(
                      lineAmount(line.purchaseQuantity, line.purchaseUnitCost),
                      currency,
                    )}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-md border border-(--border) bg-(--surface-secondary) px-2.5 py-1 text-xs font-semibold tabular-nums text-(--text)">
                    {formatQuantity(line.quantityRemaining)} of{' '}
                    {formatQuantity(line.standardQuantity)} {line.standardUnit} remaining
                  </span>
                  {line.expiryDate &&
                    (expired ? (
                      <Badge tone="danger">Expired · {formatDate(line.expiryDate)}</Badge>
                    ) : (
                      <Badge tone="neutral">Expires · {formatDate(line.expiryDate)}</Badge>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="ml-auto max-w-xs pt-3">
        <div className="flex items-baseline justify-between gap-3 pt-2 text-base font-medium text-(--text)">
          <span>Total</span>
          <span className="font-mono tabular-nums">
            {formatMoney(batchTotal(batch.lines), currency)}
          </span>
        </div>
      </div>
    </section>
  );
}

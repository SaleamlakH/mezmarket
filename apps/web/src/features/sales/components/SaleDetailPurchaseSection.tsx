import type { SaleDetailResponse, SaleLineDetailResponse } from '@mez/types';
import { formatMoney } from '@/lib/format';

export interface SaleDetailPurchaseSectionProps {
  sale: SaleDetailResponse;
  currency: string;
}

interface ProductGroup {
  productId: string;
  productName: string;
  lines: SaleLineDetailResponse[];
}

/** Groups the sale's lines by product. */
function groupLinesByProduct(lines: SaleLineDetailResponse[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();
  for (const line of lines) {
    const group = groups.get(line.productId) ?? {
      productId: line.productId,
      productName: line.productName,
      lines: [],
    };
    group.lines.push(line);
    groups.set(line.productId, group);
  }
  return [...groups.values()];
}

/** What was bought, and the money owed. */
export function SaleDetailPurchaseSection({ sale, currency }: SaleDetailPurchaseSectionProps) {
  const groups = groupLinesByProduct(sale.lines);
  const taxLabel = `Sales tax${
    sale.taxRateApplied > 0 ? ` (${(sale.taxRateApplied * 100).toFixed(0)}%)` : ''
  }`;

  return (
    <section aria-labelledby="sale-purchase-title">
      <h2 id="sale-purchase-title" className="m-0 mb-2 text-base font-medium text-(--text)">
        Purchase - {groups.length} {groups.length === 1 ? 'product' : 'products'}
      </h2>

      {groups.map((group) => {
        const subtotal = group.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

        return (
          <div key={group.productId} className="border-b border-(--border) py-3 first:border-t">
            <h3 className="m-0 mb-1 text-sm font-medium text-(--text)">{group.productName}</h3>
            {group.lines.map((line) => (
              <div key={line.id} className="flex items-start justify-between gap-3 py-1 text-sm">
                <div className="min-w-0 text-(--text)">
                  <span>
                    {line.quantity} {line.soldUnit}
                  </span>{' '}
                  <span className="block text-xs text-(--text-muted) md:inline md:text-sm">
                    ({formatMoney(line.unitPrice, currency)} / u)
                  </span>
                </div>
                <span className="shrink-0 font-mono tabular-nums text-(--text)">
                  {formatMoney(line.quantity * line.unitPrice, currency)}
                </span>
              </div>
            ))}
            {group.lines.length > 1 && (
              <div className="mt-1 flex justify-between gap-3 border-t border-dashed border-(--border) pt-1.5 text-xs text-(--text-muted) md:text-sm">
                <span>{group.productName} subtotal</span>
                <span className="font-mono tabular-nums">{formatMoney(subtotal, currency)}</span>
              </div>
            )}
          </div>
        );
      })}

      <div className="pt-3 ml-auto max-w-xs">
        <div className="flex items-baseline justify-between gap-3 py-0.5 text-sm text-(--text-muted)">
          <span>Subtotal</span>
          <span className="font-mono tabular-nums">{formatMoney(sale.subtotal, currency)}</span>
        </div>
        {sale.discount != null && sale.discount > 0 && (
          <div className="flex items-baseline justify-between gap-3 py-0.5 text-sm text-(--text-muted)">
            <span>Discount</span>
            <span className="font-mono tabular-nums">{formatMoney(sale.discount, currency)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3 py-0.5 text-sm text-(--text-muted)">
          <span>{taxLabel}</span>
          <span className="font-mono tabular-nums">{formatMoney(sale.taxAmount, currency)}</span>
        </div>
        <div className="mt-2 border-t border-(--border) pt-2">
          <div className="flex items-baseline justify-between gap-3 text-base font-medium text-(--text)">
            <span>Total</span>
            <span className="font-mono tabular-nums">{formatMoney(sale.total, currency)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

import type { ProductInventorySummaryResponse, StockStatus } from '@mez/types';
import { Badge, type BadgeTone } from '@/components/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from '@/components/Table';
import { formatDate, formatMoney, formatQuantity } from '@/lib/format';
import { ProductImage } from './ProductImage';

const STATUS_PRESENTATION: Record<StockStatus, { label: string; tone: BadgeTone }> = {
  OUT_OF_STOCK: { label: 'Out of stock', tone: 'danger' },
  LOW_STOCK: { label: 'Low stock', tone: 'warning' },
  IN_STOCK: { label: 'In stock', tone: 'positive' },
};

/** How close an expiry has to be before the date is worth drawing the eye to. */
const EXPIRY_HORIZON_DAYS = 30;

function ExpiryDate({ expiryDate }: { expiryDate: string }) {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + EXPIRY_HORIZON_DAYS);
  const isSoon = new Date(expiryDate) <= horizon;

  return (
    <span className={isSoon ? 'font-semibold text-(--warning)' : undefined}>
      {formatDate(expiryDate)}
      {isSoon && <span className="sr-only"> — expiring soon</span>}
    </span>
  );
}

/** What is on hand, in standard unit */
function OnHand({ product }: { product: ProductInventorySummaryResponse }) {
  return (
    <span className="font-mono whitespace-nowrap">
      {formatQuantity(product.currentSealedStock)} {product.baseUnitLabel}
    </span>
  );
}

function StatusBadge({ product }: { product: ProductInventorySummaryResponse }) {
  const { label, tone } = STATUS_PRESENTATION[product.stockStatus];

  return <Badge tone={tone}>{label}</Badge>;
}

function StatusCell({ product }: { product: ProductInventorySummaryResponse }) {
  const threshold = product.stockStatus === 'LOW_STOCK' ? product.lowStockThreshold : null;

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <StatusBadge product={product} />
      {threshold !== null && (
        <span className="text-xs whitespace-nowrap text-(--text-muted)">
          Min. {formatQuantity(threshold)}
          <span className="sr-only"> — low stock threshold</span>
        </span>
      )}
    </span>
  );
}

export interface ProductStockListProps {
  products: ProductInventorySummaryResponse[];
  currency: string;
}

export function ProductStockList({ products, currency }: ProductStockListProps) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>Product</TableHeadCell>
              <TableHeadCell>On hand</TableHeadCell>
              <TableHeadCell className="text-right">Value</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Expires</TableHeadCell>
              <TableHeadCell className="text-right">Batches</TableHeadCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <span className="block font-semibold text-(--text)">{product.name}</span>
                  <span className="mt-1 block text-xs text-(--text-muted)">
                    {product.brand ?? 'No brand'}
                  </span>
                </TableCell>
                <TableCell>
                  <OnHand product={product} />
                </TableCell>
                <TableCell className="text-right font-mono whitespace-nowrap tabular-nums">
                  {formatMoney(product.totalCost, currency)}
                </TableCell>
                <TableCell>
                  <StatusCell product={product} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {product.earliestExpiry ? (
                    <span className="inline-flex items-baseline gap-1.5">
                      <ExpiryDate expiryDate={product.earliestExpiry} />
                      {product.expiryCount > 1 && (
                        <span className="text-xs text-(--text-muted)">
                          +{product.expiryCount}
                          <span className="sr-only"> more lots expiring</span>
                        </span>
                      )}
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {product.numberOfBatches}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-2 gap-2.5 min-[480px]:grid-cols-3 min-[640px]:grid-cols-4 md:hidden">
        {products.map((product) => (
          <article
            key={product.id}
            className="relative flex flex-col overflow-hidden rounded-xl border border-(--border) bg-(--surface-primary)"
          >
            <div className="flex aspect-square items-center justify-center bg-(--surface-secondary)">
              <ProductImage size={40} />
            </div>

            <div className="absolute top-2 right-2">
              <StatusBadge product={product} />
            </div>

            <div className="flex flex-1 flex-col p-3">
              <p className="m-0 line-clamp-2 text-balance text-sm leading-5 font-semibold text-(--text)">
                {product.name}
              </p>
              <p className="m-0 mt-0.5 truncate text-xs text-(--text-muted)">
                {product.brand ?? 'No brand'}
              </p>

              <div className="mt-auto pt-3">
                <p className="m-0 truncate font-mono text-sm font-semibold tabular-nums text-(--text)">
                  {formatMoney(product.totalCost, currency)}
                </p>
                <div className="mt-1 text-xs text-(--text-muted)">
                  <OnHand product={product} />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

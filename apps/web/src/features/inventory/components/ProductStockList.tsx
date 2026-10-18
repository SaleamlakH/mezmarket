import type {
  DownloadUrlsResponse,
  ProductInventorySummaryResponse,
  StockStatus,
} from '@mez/types';
import type { KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Badge, type BadgeTone } from '@/components/Badge';
import { ProductThumb } from '@/components/ProductThumb';
import { RailCard } from '@/components/RailCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from '@/components/Table';
import { useProductImage } from '@/hooks/useProductImage';
import { formatDate, formatMoney, formatQuantity, pluralize } from '@/lib/format';
import { productInventoryPath } from '@/layouts/navigation';

const STATUS_PRESENTATION: Record<StockStatus, { label: string; tone: BadgeTone }> = {
  OUT_OF_STOCK: { label: 'Out of stock', tone: 'danger' },
  LOW_STOCK: { label: 'Low stock', tone: 'warning' },
  IN_STOCK: { label: 'In stock', tone: 'positive' },
};

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

interface ProductImageContext {
  businessId: string | undefined;
  uploadUrls: DownloadUrlsResponse | undefined;
}

function ProductStockCard({
  product,
  currency,
  businessId,
  uploadUrls,
}: { product: ProductInventorySummaryResponse; currency: string } & ProductImageContext) {
  // The card owns its image request, so it fills in as soon as this one download
  // lands and the placeholder covers the gap until then.
  const imageUrl = useProductImage(businessId, product.uploadId ?? undefined, uploadUrls);
  const { pathname } = useLocation();

  return (
    <Link to={productInventoryPath(product.id)} state={{ from: pathname }} className="block h-full">
      <RailCard
        variant="thumbnail"
        thumbVariant="wide"
        className="h-full shadow-(--shadow-md)"
        badge={<StatusBadge product={product} />}
        badgePosition="overlay"
        thumb={{ imageUrl: imageUrl ?? null, imageAlt: product.name }}
      >
        <p className="m-0 truncate text-[15px] font-semibold text-(--text)">{product.name}</p>
        <p className="m-0 truncate font-mono text-[11px] text-(--text-muted)">
          {product.brand ?? 'No brand'}
        </p>
        <p className="m-0 truncate font-mono text-[13px] font-semibold tabular-nums text-(--text)">
          {formatMoney(product.totalCost, currency)}
        </p>
        <p className="m-0 truncate font-mono text-[11px] text-(--text-muted)">
          <OnHand product={product} />
        </p>
      </RailCard>
    </Link>
  );
}

export interface ProductStockListProps extends ProductImageContext {
  products: ProductInventorySummaryResponse[];
  currency: string;
  /** The last moment a lot may expire and still be listed as expiring. */
  expiryBefore: Date;
}

export function ProductStockList({
  products,
  currency,
  businessId,
  uploadUrls,
  expiryBefore,
}: ProductStockListProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const openProduct = (productId: string) => {
    void navigate(productInventoryPath(productId), { state: { from: pathname } });
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, productId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openProduct(productId);
    }
  };

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
              <TableHeadCell>Expiry by {formatDate(expiryBefore)}</TableHeadCell>
              <TableHeadCell className="text-right">Batches</TableHeadCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {products.map((product) => (
              <TableRow
                key={product.id}
                role="link"
                tabIndex={0}
                aria-label={`View ${product.name} inventory`}
                className="cursor-pointer transition-colors hover:bg-(--field)"
                onClick={() => openProduct(product.id)}
                onKeyDown={(event) => handleRowKeyDown(event, product.id)}
              >
                <TableCell>
                  <span className="flex items-center gap-2.5">
                    <ProductThumb
                      businessId={businessId}
                      uploadId={product.uploadId}
                      uploadUrls={uploadUrls}
                      alt={product.name}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-(--text)">
                        {product.name}
                      </span>
                      <span className="mt-1 block text-xs text-(--text-muted)">
                        {product.brand ?? 'No brand'}
                      </span>
                    </span>
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
                  {product.expiry.lotCount > 0 ? (
                    <span className="font-mono tabular-nums text-(--warning)">
                      {product.expiry.lotCount} {pluralize(product.expiry.lotCount, 'lot')} ·{' '}
                      {formatQuantity(product.expiry.quantity)} {product.baseUnitLabel}
                    </span>
                  ) : (
                    <span className="text-(--text-muted)">—</span>
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
          <ProductStockCard
            key={product.id}
            product={product}
            currency={currency}
            businessId={businessId}
            uploadUrls={uploadUrls}
          />
        ))}
      </div>
    </>
  );
}

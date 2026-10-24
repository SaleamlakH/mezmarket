import type {
  DownloadUrlsResponse,
  ProductInventorySummaryResponse,
  StockStatus,
} from '@mez/types';
import type { KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router';
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
import { useForwardNavigationState } from '@/layouts/useNavigationHistory';

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

function expiryTitle(group: ProductInventorySummaryResponse['expiry']['expired']): string {
  const parts = [`${group.lotCount} ${pluralize(group.lotCount, 'lot')}`];
  if (group.earliestExpiryDate) parts.push(`Earliest ${formatDate(group.earliestExpiryDate)}`);
  return parts.join(' · ');
}

function ExpiryCell({ product }: { product: ProductInventorySummaryResponse }) {
  const { expired, soon } = product.expiry;
  if (expired.lotCount === 0 && soon.lotCount === 0) {
    return <span className="text-(--text-muted)">—</span>;
  }

  return (
    <span className="flex flex-col items-start gap-1">
      {expired.lotCount > 0 && (
        <span title={expiryTitle(expired)}>
          <Badge tone="danger">
            Expired · {expired.lotCount} {pluralize(expired.lotCount, 'lot')}
          </Badge>
        </span>
      )}
      {soon.lotCount > 0 && (
        <span title={expiryTitle(soon)}>
          <Badge tone="warning">
            Expiring · {soon.lotCount} {pluralize(soon.lotCount, 'lot')}
          </Badge>
        </span>
      )}
    </span>
  );
}

function ExpiryQuantities({
  product,
  className = '',
}: {
  product: ProductInventorySummaryResponse;
  className?: string;
}) {
  const { expired, soon } = product.expiry;
  if (expired.lotCount === 0 && soon.lotCount === 0) return null;

  return (
    <span className={`flex flex-col items-start gap-0.5 text-[11px] font-bold ${className}`}>
      {expired.lotCount > 0 && (
        <span
          className="whitespace-nowrap text-(--badge-danger-text)"
          title={`${expired.lotCount} ${pluralize(expired.lotCount, 'lot')} expired`}
        >
          Expired · {expired.lotCount} {pluralize(expired.lotCount, 'lot')}
        </span>
      )}
      {soon.lotCount > 0 && (
        <span
          className="whitespace-nowrap text-(--badge-warning-text)"
          title={`${soon.lotCount} ${pluralize(soon.lotCount, 'lot')} expiring in 7 days`}
        >
          Expiring · {soon.lotCount} {pluralize(soon.lotCount, 'lot')}
        </span>
      )}
    </span>
  );
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
  const forwardState = useForwardNavigationState();

  return (
    <Link to={productInventoryPath(product.id)} state={forwardState} className="block h-full">
      <RailCard
        variant="thumbnail"
        thumbVariant="wide"
        className="h-full shadow-(--shadow-md)"
        badge={<StatusBadge product={product} />}
        badgePosition="overlay"
        thumb={{ imageUrl: imageUrl ?? null, imageAlt: product.name }}
      >
        <p className="m-0 truncate text-[15px] font-semibold text-(--text)">{product.name}</p>
        <div className="mt-1 flex min-w-0 flex-col leading-tight">
          <p className="m-0 truncate font-mono text-[13px] font-semibold tabular-nums text-(--text)">
            {formatMoney(product.totalCost, currency)}
          </p>
          <p className="m-0 truncate font-mono text-[13px] tabular-nums text-(--text-muted)">
            {formatQuantity(product.currentSealedStock)} {product.baseUnitLabel}
          </p>
        </div>
        <ExpiryQuantities product={product} className="mt-2" />
      </RailCard>
    </Link>
  );
}

export interface ProductStockListProps extends ProductImageContext {
  products: ProductInventorySummaryResponse[];
  currency: string;
}

export function ProductStockList({
  products,
  currency,
  businessId,
  uploadUrls,
}: ProductStockListProps) {
  const navigate = useNavigate();
  const forwardState = useForwardNavigationState();

  const openProduct = (productId: string) => {
    void navigate(productInventoryPath(productId), { state: forwardState });
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
              <TableHeadCell>Expiry</TableHeadCell>
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
                  <ExpiryCell product={product} />
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

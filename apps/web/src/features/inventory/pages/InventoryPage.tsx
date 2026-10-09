import { useState } from 'react';
import { ClipboardList, Package, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { Toast } from '@/components/Toast';
import { BATCHES_PATH } from '@/layouts/navigation';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { AddBatchSheet } from '../components/AddBatchSheet';
import { BatchSummaryCard } from '../components/BatchSummaryCard';
import { ProductStockList } from '../components/ProductStockList';
import { useCurrency } from '../hooks/useCurrency';
import { useInventoryBatches, useInventoryProducts } from '../hooks/useInventoryApi';

/** How many batches the page leads with before "See all" takes over. */
const BATCH_PREVIEW_COUNT = 4;

/**
 * Which of those tiles each width has room for. Below `sm` the rail scrolls
 * horizontally, so every preview tile shows; from `sm` it becomes a single-row
 * grid — three tiles, four from `lg` — hiding the overflow rather than letting
 * it wrap onto a second row.
 */
const TILE_VISIBILITY = ['block', 'block', 'block', 'block sm:hidden lg:block'];

export function InventoryPage() {
  const {
    isPending: batchesPending,
    isError: batchesError,
    refetch: refetchBatches,
    data: batches = [],
  } = useInventoryBatches();
  const {
    isPending: productsPending,
    isError: productsError,
    refetch: refetchProducts,
    data: products = [],
  } = useInventoryProducts();
  const currency = useCurrency();
  const navigate = useNavigate();
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const previewBatches = batches.slice(0, BATCH_PREVIEW_COUNT);

  return (
    <div className="mx-auto max-w-5xl pb-4">
      <div className="flex items-center justify-between gap-3 pt-1">
        <h2 className="m-0 text-lg font-bold text-(--text)">Inventory</h2>
        <Button type="button" onClick={() => setIsAddingBatch(true)}>
          <Plus size={14} aria-hidden /> Add batch
        </Button>
      </div>

      <SectionHeader
        icon={<ClipboardList size={14} aria-hidden />}
        title="Recent batches"
        onSeeMore={() => navigate(BATCHES_PATH)}
        seeMoreLabel="See all"
      />

      {batchesPending ? (
        <LoadingState label="Loading batches…" />
      ) : batchesError ? (
        <ErrorState
          title="Could not load batches"
          description="Something went wrong while fetching your recent batches."
          onRetry={() => void refetchBatches()}
        />
      ) : batches.length === 0 ? (
        <EmptyState
          title="No batches recorded yet"
          description="Record what you receive and it shows up here."
          action={
            <Button type="button" variant="primary" onClick={() => setIsAddingBatch(true)}>
              <Plus size={14} aria-hidden /> Add batch
            </Button>
          }
        />
      ) : (
        <div className="scrollbar-none flex gap-2.5 overflow-x-auto pb-1.5 md:grid md:grid-cols-3 md:gap-3 md:overflow-visible md:pb-0 lg:grid-cols-4">
          {previewBatches.map((batch, index) => (
            <BatchSummaryCard
              key={batch.id}
              batch={batch}
              currency={currency}
              className={`w-[150px] shrink-0 md:w-full ${TILE_VISIBILITY[index]}`}
            />
          ))}
        </div>
      )}

      <SectionHeader icon={<Package size={14} aria-hidden />} title="Products" />

      {productsPending ? (
        <LoadingState label="Loading products…" />
      ) : productsError ? (
        <ErrorState
          title="Could not load products"
          description="Something went wrong while fetching your products."
          onRetry={() => void refetchProducts()}
        />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Products you add to the catalog will show their stock here."
        />
      ) : (
        <ProductStockList products={products} currency={currency} />
      )}

      <AddBatchSheet
        open={isAddingBatch}
        onClose={() => setIsAddingBatch(false)}
        onRecorded={() => setSuccessMessage('Batch recorded')}
      />

      {successMessage && (
        <Toast
          message={successMessage}
          variant="success"
          duration={3000}
          position="top-center"
          onDismiss={() => setSuccessMessage(null)}
        />
      )}
    </div>
  );
}

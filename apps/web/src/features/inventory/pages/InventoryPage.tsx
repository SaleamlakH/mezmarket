import { ClipboardList, Package, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { BATCHES_PATH } from '@/layouts/navigation';
import { BatchSummaryCard } from '../components/BatchSummaryCard';
import { ProductStockList } from '../components/ProductStockList';
import { useCurrency } from '../hooks/useCurrency';
import { useInventoryData } from '../hooks/useInventoryData';

/** How many batches the page leads with before "See all" takes over. */
const BATCH_PREVIEW_COUNT = 4;

/**
 * Which of those tiles each width has room for. The section stays a single row
 * at every size — two tiles on a phone, three from `sm`, four from `lg` — so
 * the remaining tiles are hidden rather than left to wrap onto a second row.
 */
const TILE_VISIBILITY = ['block', 'block', 'hidden sm:block', 'hidden lg:block'];

export function InventoryPage() {
  const { batches, products } = useInventoryData();
  const currency = useCurrency();
  const navigate = useNavigate();

  const previewBatches = batches.slice(0, BATCH_PREVIEW_COUNT);

  return (
    <div className="mx-auto max-w-5xl pb-4">
      <div className="flex items-center justify-between gap-3 pt-1">
        <h2 className="m-0 text-lg font-bold text-(--text)">Inventory</h2>
        <Button type="button">
          <Plus size={14} aria-hidden /> Add batch
        </Button>
      </div>

      <SectionHeader
        icon={<ClipboardList size={14} aria-hidden />}
        title="Recent batches"
        onSeeMore={() => navigate(BATCHES_PATH)}
        seeMoreLabel="See all"
      />

      {previewBatches.length === 0 ? (
        <EmptyState
          title="No batches recorded yet"
          description="Record what you receive and it shows up here."
          action={
            <Button type="button" variant="primary">
              <Plus size={14} aria-hidden /> Add batch
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {previewBatches.map((batch, index) => (
            <BatchSummaryCard
              key={batch.id}
              batch={batch}
              currency={currency}
              className={TILE_VISIBILITY[index]}
            />
          ))}
        </div>
      )}

      <SectionHeader icon={<Package size={14} aria-hidden />} title="Products" />

      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Products you add to the catalog will show their stock here."
        />
      ) : (
        <ProductStockList products={products} currency={currency} />
      )}
    </div>
  );
}

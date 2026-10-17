import type { ProductInventoryDetailResponse } from '@mez/types';
import { formatMoney, formatQuantity, pluralize } from '@/lib/format';

export interface ProductInventoryMetricsProps {
  product: ProductInventoryDetailResponse;
  currency: string;
  /** How many lots still holding stock expire within the soon horizon. */
  expiringSoonCount: number;
}

type MetricTone = 'danger' | 'warning';

interface Metric {
  label: string;
  value: string;
  tone?: MetricTone | undefined;
}

const TONE_CLASS: Record<MetricTone, string> = {
  danger: 'text-(--danger)',
  warning: 'text-(--warning)',
};

function MetricCard({ label, value, tone }: Metric) {
  return (
    <div className="rounded-xl border border-(--border) bg-(--surface-primary) p-3">
      <p className="m-0 text-xs text-(--text-muted)">{label}</p>
      <p
        className={`m-0 mt-1 truncate font-mono text-lg font-semibold tabular-nums ${
          tone ? TONE_CLASS[tone] : 'text-(--text)'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/** The four numbers worth checking at a glance when opening a product. */
export function ProductInventoryMetrics({
  product,
  currency,
  expiringSoonCount,
}: ProductInventoryMetricsProps) {
  const averageCost =
    product.currentSealedStock > 0 ? product.totalCost / product.currentSealedStock : null;

  const metrics: Metric[] = [
    {
      label: 'On hand',
      value: `${formatQuantity(product.currentSealedStock)} ${product.baseUnitLabel}`,
    },
    { label: 'Stock value', value: formatMoney(product.totalCost, currency) ?? '—' },
    {
      label: `Avg cost/${product.baseUnitLabel}`,
      value: formatMoney(averageCost, currency) ?? '—',
    },
    {
      label: 'Expiring soon',
      value:
        expiringSoonCount > 0
          ? `${expiringSoonCount} ${pluralize(expiringSoonCount, 'lot')}`
          : 'None',
      tone: expiringSoonCount > 0 ? 'warning' : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </div>
  );
}

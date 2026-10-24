import type { ProductInventoryDetailResponse, ProductInventoryExpiry } from '@mez/types';
import { formatDate, formatMoney, formatQuantity, pluralize } from '@/lib/format';

export interface ProductInventoryMetricsProps {
  product: ProductInventoryDetailResponse;
  currency: string;
  /** The lots still on hand that expire before the cutoff. */
  expiry: ProductInventoryExpiry;
  /** The last moment a lot may expire and still be counted. */
  expiryBefore: Date;
}

type MetricTone = 'danger' | 'warning';

interface Metric {
  label: string;
  value: string;
  /** A second line under the value, for figures that do not fit beside it. */
  secondary?: string | undefined;
  tone?: MetricTone | undefined;
}

const TONE_CLASS: Record<MetricTone, string> = {
  danger: 'text-(--danger)',
  warning: 'text-(--warning)',
};

function MetricCard({ label, value, secondary, tone }: Metric) {
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
      {secondary && (
        <p
          className={`m-0 truncate font-mono text-lg font-semibold tabular-nums ${
            tone ? TONE_CLASS[tone] : 'text-(--text)'
          }`}
        >
          {secondary}
        </p>
      )}
    </div>
  );
}

/** The numbers worth checking at a glance when opening a product. */
export function ProductInventoryMetrics({
  product,
  currency,
  expiry,
  expiryBefore,
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
      label: `Expiring by ${formatDate(expiryBefore)}`,
      value:
        expiry.soon.lotCount > 0
          ? `${expiry.soon.lotCount} ${pluralize(expiry.soon.lotCount, 'lot')}`
          : 'None',
      secondary:
        expiry.soon.lotCount > 0
          ? `${formatQuantity(expiry.soon.quantity)} ${product.baseUnitLabel}`
          : undefined,
      tone: expiry.soon.lotCount > 0 ? 'warning' : undefined,
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

import { Link } from 'react-router';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { DashboardPeriodBucket, DashboardSummaryResponse, ReportingPeriod } from '@mez/types';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useCurrency } from '@/hooks/useCurrency';
import type { NavigationHistoryState } from '@/layouts/useNavigationHistory';
import { SALES_ALL_PATH } from '@/layouts/navigation';
import { formatQuantity, pluralize } from '@/lib/format';
import type { DashboardPreviewContext } from '../fixtures/dashboardPreview';
import { useDashboardSummary, useDashboardTrend } from '../hooks/useDashboardApi';
import { grossProfitComparisonLabel } from '../lib/comparisonLabel';
import type { DashboardPeriodKey } from '../lib/period';
import { buildSparklinePath } from '../lib/sparkline';
import { DevFixtureBadge } from './DevFixtureBadge';

export interface SummarySectionProps {
  period: ReportingPeriod;
  periodKey: DashboardPeriodKey;
  bucket: DashboardPeriodBucket;
  navigationState: NavigationHistoryState;
  previewContext?: DashboardPreviewContext | undefined;
}

type GrossProfit = NonNullable<DashboardSummaryResponse['grossProfit']>;
type ChangeDirection = 'up' | 'down' | 'flat';

const CHANGE_TONE: Record<ChangeDirection, string> = {
  up: 'text-(--positive)',
  down: 'text-(--danger)',
  flat: 'text-(--text-muted)',
};

const percentFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

function changeDirection(grossProfit: GrossProfit): ChangeDirection {
  if (grossProfit.value > grossProfit.previous) return 'up';
  if (grossProfit.value < grossProfit.previous) return 'down';
  return 'flat';
}

function periodSearch(period: ReportingPeriod): string {
  return new URLSearchParams({ from: period.from, to: period.to }).toString();
}

function ChangeIndicator({
  grossProfit,
  periodKey,
  period,
}: {
  grossProfit: GrossProfit;
  periodKey: DashboardPeriodKey;
  period: ReportingPeriod;
}) {
  const { deltaPercent } = grossProfit;
  const comparison = grossProfitComparisonLabel(grossProfit, periodKey, period.from, period.to);
  if (!comparison || deltaPercent === null) return null;

  const direction = changeDirection(grossProfit);
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${CHANGE_TONE[direction]}`}
    >
      <Icon size={13} aria-hidden />
      {percentFormatter.format(Math.abs(deltaPercent))}% {comparison}
    </span>
  );
}

function GrossProfitBlock({
  grossProfit,
  currency,
  sparklinePath,
  periodKey,
  period,
}: {
  grossProfit: GrossProfit;
  currency: string;
  sparklinePath: string;
  periodKey: DashboardPeriodKey;
  period: ReportingPeriod;
}) {
  return (
    <div className="flex flex-col justify-between gap-2 px-0 py-1 md:rounded-2xl md:border md:border-(--border) md:bg-(--surface-primary) md:p-4">
      <div>
        <p className="m-0 text-[11px] font-medium text-(--text-muted)">Gross profit</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-3xl font-bold tracking-tight text-(--text)">
            {formatQuantity(grossProfit.value)}
          </span>
          <span className="text-[11px] font-semibold text-(--text-muted)">{currency}</span>
          <span className="ml-1">
            <ChangeIndicator grossProfit={grossProfit} periodKey={periodKey} period={period} />
          </span>
        </div>
      </div>

      <svg
        viewBox="0 0 100 28"
        preserveAspectRatio="none"
        aria-hidden
        className="mt-1 h-9 w-full overflow-visible text-(--accent)"
      >
        <path
          d={sparklinePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subline,
  href,
  navigationState,
}: {
  label: string;
  value: string;
  subline: string;
  href: string;
  navigationState: NavigationHistoryState;
}) {
  return (
    <Link
      to={href}
      state={navigationState}
      className="focus-ring flex h-full min-h-[6.25rem] flex-col justify-between gap-3 rounded-2xl border border-(--border) bg-(--surface-primary) p-3.5 transition-colors hover:border-(--border-strong) hover:bg-(--surface-secondary)"
    >
      <span className="text-[11px] font-medium text-(--text-muted)">{label}</span>
      <span className="min-w-0">
        <span className="block truncate text-xl font-bold tracking-tight text-(--text)">
          {value}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-(--text-muted)">{subline}</span>
      </span>
    </Link>
  );
}

export function SummarySection({
  period,
  periodKey,
  bucket,
  navigationState,
  previewContext,
}: SummarySectionProps) {
  const currency = useCurrency();
  const preview = previewContext?.mode === 'preview' ? previewContext : null;
  const summaryQuery = useDashboardSummary(period, preview === null);
  const trendQuery = useDashboardTrend(period, bucket, preview === null);

  const summary = preview ? preview.fixture?.summary : summaryQuery.data;
  const trend = preview ? preview.fixture?.trend : trendQuery.data;
  const isError = preview ? preview.state === 'error' : summaryQuery.isError;
  const retry = preview ? preview?.reset : summaryQuery.refetch;

  const showFixtureBadge = preview?.fixture != null;

  if (!summary) {
    return (
      <section aria-label="Summary">
        {isError ? (
          <ErrorState
            title="Could not load summary"
            description="Something went wrong while fetching your summary."
            onRetry={() => retry()}
          />
        ) : (
          <LoadingState label="Loading summary…" />
        )}
      </section>
    );
  }

  const grossProfit = summary.grossProfit;
  const search = periodSearch(period);
  const metrics = [
    {
      key: 'sales',
      label: 'Sales',
      value: formatQuantity(summary.sales.total),
      subline: `${summary.sales.count} ${pluralize(summary.sales.count, 'sale')}`,
      href: `${SALES_ALL_PATH}?${search}`,
    },
    {
      key: 'cash',
      label: 'Cash collected',
      value: formatQuantity(summary.cashCollected.total),
      subline: `${summary.cashCollected.paymentCount} ${pluralize(
        summary.cashCollected.paymentCount,
        'payment',
      )}`,
      href: `${SALES_ALL_PATH}?${search}`,
    },
    ...(summary.outstanding
      ? [
          {
            key: 'outstanding',
            label: 'Outstanding now',
            value: formatQuantity(summary.outstanding.total),
            subline: `${formatQuantity(summary.outstanding.overdue.total)} older than 7 days`,
            href: `${SALES_ALL_PATH}?unpaid=true`,
          },
        ]
      : []),
    ...(summary.losses
      ? [
          {
            key: 'losses',
            label: 'Losses',
            value: formatQuantity(summary.losses.total),
            subline: `${summary.losses.count} ${pluralize(summary.losses.count, 'record')}`,
            href: `${SALES_ALL_PATH}?${search}`,
          },
        ]
      : []),
  ];

  const metricCards = metrics.map((metric) => (
    <MetricCard
      key={metric.key}
      label={metric.label}
      value={metric.value}
      subline={metric.subline}
      href={metric.href}
      navigationState={navigationState}
    />
  ));

  return (
    <section aria-label="Summary">
      {showFixtureBadge && (
        <div className="mb-2 flex justify-end">
          <DevFixtureBadge />
        </div>
      )}

      {grossProfit ? (
        <div className="grid gap-3 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-stretch">
          <GrossProfitBlock
            grossProfit={grossProfit}
            currency={currency}
            periodKey={periodKey}
            period={period}
            sparklinePath={buildSparklinePath(
              trend?.points.map((point) => point.grossProfit) ?? [],
            )}
          />
          <div className="grid grid-cols-2 gap-2 sm:gap-3">{metricCards}</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">{metricCards}</div>
      )}
    </section>
  );
}

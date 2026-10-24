import type { ReportingPeriod } from '@mez/types';
import { Badge } from '@/components/Badge';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { formatQuantity } from '@/lib/format';
import type { DashboardPreviewContext } from '../fixtures/dashboardPreview';
import { useDashboardPerformance } from '../hooks/useDashboardApi';
import { ROLE_LABELS } from '../lib/roles';
import { DashboardSectionHeading } from './DashboardSectionHeading';
import { DevFixtureBadge } from './DevFixtureBadge';

export interface PerformanceSectionProps {
  period: ReportingPeriod;
  previewContext?: DashboardPreviewContext | undefined;
}

export function PerformanceSection({ period, previewContext }: PerformanceSectionProps) {
  const preview = previewContext?.mode === 'preview' ? previewContext : null;
  const performanceQuery = useDashboardPerformance(period, preview === null);

  const performance = preview ? preview.fixture?.memberPerformance : performanceQuery.data;
  const isError = preview ? preview.state === 'error' : performanceQuery.isError;
  const retry = preview ? preview?.reset : performanceQuery.refetch;
  const showFixtureBadge = preview?.fixture != null;

  return (
    <section aria-label="Your performance" className="min-w-0">
      <DashboardSectionHeading trailing={showFixtureBadge ? <DevFixtureBadge /> : undefined}>
        Your performance
      </DashboardSectionHeading>

      {!performance ? (
        isError ? (
          <ErrorState
            title="Could not load your performance"
            description="Something went wrong while fetching your figures."
            onRetry={() => retry()}
          />
        ) : (
          <LoadingState label="Loading your performance…" />
        )
      ) : (
        <div className="rounded-2xl border border-(--border) bg-(--surface-primary) p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="m-0 truncate text-[13px] font-semibold text-(--text)">
              {performance.member.name}
            </p>
            <Badge tone="accent">{ROLE_LABELS[performance.member.role]}</Badge>
          </div>

          <p className="m-0 mt-3 text-[11px] font-medium text-(--text-muted)">Your sales</p>
          <p className="m-0 mt-0.5 text-2xl font-bold tracking-tight text-(--text)">
            {formatQuantity(performance.sales.total)}
          </p>

          <dl className="m-0 mt-4">
            <div className="flex items-baseline justify-between gap-3 border-t border-(--border) pt-2.5 pb-2.5">
              <dt className="text-[12px] text-(--text-muted)">Sales count</dt>
              <dd className="m-0 text-[13px] font-semibold text-(--text)">
                {performance.sales.count}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-(--border) pt-2.5 pb-2.5">
              <dt className="text-[12px] text-(--text-muted)">Cash collected by you</dt>
              <dd className="m-0 text-[13px] font-semibold text-(--text)">
                {formatQuantity(performance.cashCollected)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-(--border) pt-2.5 pb-0">
              <dt className="text-[12px] text-(--text-muted)">Unpaid sales you made</dt>
              <dd className="m-0 text-[13px] font-semibold text-(--text)">
                {performance.unpaidSalesCount}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}

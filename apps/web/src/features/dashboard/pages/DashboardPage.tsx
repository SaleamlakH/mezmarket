import { useForwardNavigationState } from '@/layouts/useNavigationHistory';
import { DevPreviewControls } from '../components/DevPreviewControls';
import { NeedsAttentionSection } from '../components/NeedsAttentionSection';
import { PaymentMethodsSection } from '../components/PaymentMethodsSection';
import { PerformanceSection } from '../components/PerformanceSection';
import { PeriodFilter } from '../components/PeriodFilter';
import { SummarySection } from '../components/SummarySection';
import { useDashboardPreview } from '../fixtures/useDashboardPreview';
import { usePeriodFilter } from '../hooks/usePeriodFilter';
import { dashboardTrendBucket } from '../lib/period';

export function DashboardPage() {
  const navigationState = useForwardNavigationState();
  const { period, range, customRange, selectPeriod, setCustomRange } = usePeriodFilter();
  const bucket = dashboardTrendBucket(period);
  const preview = useDashboardPreview();

  return (
    <div className="mx-auto w-full max-w-6xl pb-4">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 md:items-center">
        <h1 className="m-0 text-2xl font-bold tracking-tight text-(--text)">Dashboard</h1>
        <PeriodFilter
          period={period}
          customRange={customRange}
          onPeriodChange={selectPeriod}
          onCustomRangeChange={setCustomRange}
        />
      </header>

      {import.meta.env.DEV && <DevPreviewControls preview={preview} />}

      {/*
        Mobile reads in DOM order: summary, needs attention, performance,
        payments. From md up the explicit row/column placement below makes the
        summary its own row and puts payments under attention on the left.
      */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
        <div className="order-1 min-w-0 md:col-span-2 md:order-1">
          <SummarySection
            period={range}
            periodKey={period}
            bucket={bucket}
            navigationState={navigationState}
            previewContext={preview}
          />
        </div>

        <div className="order-2 min-w-0 md:order-2 md:col-start-1 md:row-start-2 md:self-stretch">
          <NeedsAttentionSection navigationState={navigationState} previewContext={preview} />
        </div>

        <div className="order-3 min-w-0 md:order-3 md:col-start-2 md:row-start-2">
          <PerformanceSection period={range} previewContext={preview} />
        </div>

        <div className="order-4 min-w-0 md:order-4 md:col-start-1 md:row-start-3">
          <PaymentMethodsSection period={range} previewContext={preview} />
        </div>
      </div>
    </div>
  );
}

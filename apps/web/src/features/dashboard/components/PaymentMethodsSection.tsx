import type { PaymentMethod, ReportingPeriod } from '@mez/types';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { formatQuantity } from '@/lib/format';
import type { DashboardPreviewContext } from '../fixtures/dashboardPreview';
import { usePaymentSummary } from '../hooks/useDashboardApi';
import { DashboardSectionHeading } from './DashboardSectionHeading';
import { DevFixtureBadge } from './DevFixtureBadge';

export interface PaymentMethodsSectionProps {
  period: ReportingPeriod;
  previewContext?: DashboardPreviewContext | undefined;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank transfer',
  MOBILE_MONEY: 'Mobile money',
  OTHER: 'Other',
};

function shareWidth(sharePercent: number): string {
  const clamped = Math.min(Math.max(sharePercent, 0), 100);
  return `${clamped}%`;
}

export function PaymentMethodsSection({ period, previewContext }: PaymentMethodsSectionProps) {
  const preview = previewContext?.mode === 'preview' ? previewContext : null;
  const paymentSummaryQuery = usePaymentSummary(period, preview === null);

  const paymentSummary = preview ? preview.fixture?.paymentSummary : paymentSummaryQuery.data;
  const isError = preview ? preview.state === 'error' : paymentSummaryQuery.isError;
  const retry = preview ? preview?.reset : paymentSummaryQuery.refetch;
  const showFixtureBadge = preview?.fixture != null;

  return (
    <section aria-label="Payment methods" className="min-w-0">
      <DashboardSectionHeading trailing={showFixtureBadge ? <DevFixtureBadge /> : undefined}>
        Payment methods
      </DashboardSectionHeading>

      {!paymentSummary ? (
        isError ? (
          <ErrorState
            title="Could not load payment methods"
            description="Something went wrong while fetching payment methods."
            onRetry={() => retry()}
          />
        ) : (
          <LoadingState label="Loading payment methods…" />
        )
      ) : paymentSummary.methods.length === 0 ? (
        <div className="rounded-2xl border border-(--border) bg-(--surface-primary) px-4 py-5">
          <p className="m-0 text-[13px] font-semibold text-(--text)">No sales in this period</p>
          <p className="m-0 mt-0.5 text-[11px] text-(--text-muted)">
            Payment methods will appear once sales are recorded.
          </p>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-(--border) bg-(--surface-primary) p-4">
          {paymentSummary.methods.map((method) => (
            <div key={method.method}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-semibold text-(--text)">
                  {PAYMENT_METHOD_LABELS[method.method]}
                </span>
                <span className="text-[11px] text-(--text-muted)">
                  {formatQuantity(method.total)}
                </span>
              </div>
              <div
                role="img"
                aria-label={`${PAYMENT_METHOD_LABELS[method.method]} share ${method.sharePercent}%`}
                className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-(--surface-secondary)"
              >
                <div
                  className="h-full rounded-full bg-(--accent)"
                  style={{ width: shareWidth(method.sharePercent) }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

import { Link } from 'react-router';
import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  Clock,
  Package,
} from 'lucide-react';
import type { AttentionResponse } from '@mez/types';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import type { NavigationHistoryState } from '@/layouts/useNavigationHistory';
import { BATCHES_PATH, INVENTORY_PATH, SALES_ALL_PATH } from '@/layouts/navigation';
import { formatQuantity, pluralize } from '@/lib/format';
import type { DashboardPreviewContext } from '../fixtures/dashboardPreview';
import { useDashboardAttention } from '../hooks/useDashboardApi';
import { DashboardSectionHeading } from './DashboardSectionHeading';
import { DevFixtureBadge } from './DevFixtureBadge';

export interface NeedsAttentionSectionProps {
  navigationState: NavigationHistoryState;
  previewContext?: DashboardPreviewContext | undefined;
}

type AttentionTone = 'urgent' | 'caution' | 'info';

const TONE_TILE: Record<AttentionTone, string> = {
  urgent: 'bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-(--danger)',
  caution: 'bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-(--warning)',
  info: 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-(--accent)',
};

function RowIcon({ tone, rowKey }: { tone: AttentionTone; rowKey: string }) {
  const Icon = rowKey === 'expiry' ? Clock : rowKey === 'unpaid' ? CircleAlert : Package;

  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_TILE[tone]}`}
    >
      <Icon size={16} aria-hidden />
    </span>
  );
}

function AlertRow({
  rowKey,
  tone,
  primary,
  secondary,
  href,
  first,
  navigationState,
}: {
  rowKey: string;
  tone: AttentionTone;
  primary: string;
  secondary: string;
  href: string;
  first: boolean;
  navigationState: NavigationHistoryState;
}) {
  return (
    <Link
      to={href}
      state={navigationState}
      className={`focus-ring flex items-center gap-3 px-4 py-3 transition-colors hover:bg-(--surface-secondary) ${
        first ? '' : 'border-t border-(--border)'
      }`}
    >
      <RowIcon tone={tone} rowKey={rowKey} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-(--text)">{primary}</span>
        <span className="mt-0.5 block truncate text-[11px] text-(--text-muted)">{secondary}</span>
      </span>
      <ChevronRight size={16} aria-hidden className="shrink-0 text-(--text-muted)" />
    </Link>
  );
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

function expirySecondary(
  earliest: { productName: string; expiryDate: string },
  asOf: string,
): string {
  const days = daysBetween(asOf, earliest.expiryDate);
  if (days === 0) return `${earliest.productName}, today`;
  if (days < 0) {
    const elapsed = Math.abs(days);
    return `${earliest.productName}, ${elapsed} ${pluralize(elapsed, 'day')} ago`;
  }
  return `${earliest.productName}, in ${days} ${pluralize(days, 'day')}`;
}

function stockSecondary(stock: AttentionResponse['stock']): string {
  if (stock.preview.length === 0) return 'Tap to review stock';
  const names = stock.preview.slice(0, 2).join(', ');
  const remaining = stock.count - Math.min(stock.preview.length, 2);
  return remaining > 0 ? `${names}, and ${remaining} more` : names;
}

export function NeedsAttentionSection({
  navigationState,
  previewContext,
}: NeedsAttentionSectionProps) {
  const preview = previewContext?.mode === 'preview' ? previewContext : null;
  const attentionQuery = useDashboardAttention(preview === null);

  const showFixtureBadge = preview?.fixture != null;

  const isError = preview ? preview.state === 'error' : attentionQuery.isError;
  const retry = preview ? preview?.reset : attentionQuery.refetch;
  const attention = preview ? preview.fixture?.attention : attentionQuery.data;

  if (!attention) {
    return (
      <section aria-label="Needs attention" className="min-w-0">
        <DashboardSectionHeading>Needs attention</DashboardSectionHeading>
        {isError ? (
          <ErrorState
            title="Could not load needs attention"
            description="Something went wrong while fetching your alerts."
            onRetry={() => retry()}
          />
        ) : (
          <LoadingState label="Loading alerts…" />
        )}
      </section>
    );
  }

  const hasStock = attention.stock.count > 0;
  const hasExpiry = attention.expiring.lotCount > 0;
  const hasUnpaid = attention.unpaid.count > 0;
  const draftBatch =
    attention.draftBatches && attention.draftBatches.count > 0 ? attention.draftBatches : null;
  const allClear = !hasStock && !hasExpiry && !hasUnpaid && !draftBatch;
  const age = draftBatch?.oldest
    ? Math.max(daysBetween(draftBatch.oldest.createdAt, attention.asOf), 0)
    : 0;
  const supplier = draftBatch?.oldest?.supplierName ?? 'Unknown supplier';

  return (
    <section aria-label="Needs attention" className="min-w-0 md:flex md:h-full md:flex-col">
      <DashboardSectionHeading trailing={showFixtureBadge ? <DevFixtureBadge /> : undefined}>
        Needs attention
      </DashboardSectionHeading>

      {(hasStock || hasExpiry || hasUnpaid) && (
        <div className="overflow-hidden rounded-2xl border border-(--border) bg-(--surface-primary)">
          {hasStock && (
            <AlertRow
              rowKey="lowStock"
              tone="urgent"
              primary={`${attention.stock.count} ${pluralize(
                attention.stock.count,
                'product',
              )} low or out of stock`}
              secondary={stockSecondary(attention.stock)}
              href={`${INVENTORY_PATH}?status=active&stockStatus=low_stock,out_of_stock`}
              first
              navigationState={navigationState}
            />
          )}

          {hasExpiry && (
            <AlertRow
              rowKey="expiry"
              tone="caution"
              primary={`${attention.expiring.lotCount} ${pluralize(
                attention.expiring.lotCount,
                'lot',
              )} expired or expiring in 30 days`}
              secondary={
                attention.expiring.earliest
                  ? expirySecondary(attention.expiring.earliest, attention.asOf)
                  : 'No lot details available'
              }
              href={`${INVENTORY_PATH}?status=all&expiryStatus=expired,soon`}
              first={!hasStock}
              navigationState={navigationState}
            />
          )}

          {hasUnpaid && (
            <AlertRow
              rowKey="unpaid"
              tone="caution"
              primary={`${attention.unpaid.count} ${pluralize(
                attention.unpaid.count,
                'unpaid sale',
              )}`}
              secondary={`${formatQuantity(attention.unpaid.total)} due, ${
                attention.unpaid.overdue.count
              } overdue`}
              href={`${SALES_ALL_PATH}?unpaid=true`}
              first={!hasStock && !hasExpiry}
              navigationState={navigationState}
            />
          )}
        </div>
      )}

      {allClear && (
        <div className="flex flex-col justify-center flex-1 items-center gap-2.5 rounded-2xl border border-dashed border-(--border) bg-(--surface-primary)/60 px-4 py-4">
          <p className="flex gap-2.5 m-0 text-[13px] font-semibold text-(--text)">
            <CircleCheck size={18} aria-hidden className="shrink-0 text-(--positive)" />
            All clear
          </p>
          <p className="m-0 text-[11px] text-(--text-muted)">
            Nothing needs your attention right now.
          </p>
        </div>
      )}

      {draftBatch && (
        <Link
          to={`${BATCHES_PATH}?status=draft`}
          state={navigationState}
          className="focus-ring mt-2.5 flex items-center gap-3 rounded-2xl border border-dashed border-(--border-strong) bg-(--surface-primary)/60 px-4 py-3 transition-colors hover:bg-(--surface-secondary)"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-(--accent)">
            <ClipboardList size={16} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-(--text)">
              {draftBatch.count}{' '}
              {draftBatch.count === 1 ? 'draft stock batch' : 'draft stock batches'}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-(--text-muted)">
              Oldest: {supplier}, {age} {pluralize(age, 'day')}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-(--accent)">
            Continue
            <ChevronRight size={14} aria-hidden />
          </span>
        </Link>
      )}
    </section>
  );
}

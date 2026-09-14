import { SectionHeader } from '@/components/SectionHeader';
import type { BusinessResponse, TaxDisplayMode } from '@mez/types';

const TAX_MODE_LABELS: Record<TaxDisplayMode, string> = {
  EXCLUSIVE: 'Tax never added',
  INCLUSIVE: 'Prices include tax',
};

function formatRate(value: number | string | null): string {
  if (value === '' || value === null) return 'Not set';
  return `${value}%`;
}

function formatThreshold(value: number | string | null): string {
  if (value === '' || value === null) return 'Not set';
  return `${value} units`;
}

function ViewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-(--border) px-5 py-4 last:border-b-0">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
        {label}
      </p>
      <p className="text-base text-(--text)">{children}</p>
    </div>
  );
}

function ViewCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-(--border) bg-(--surface-primary)">
      {children}
    </div>
  );
}

export function BusinessDetails({ business }: { business: BusinessResponse }) {
  const showEmpty = (value: string) => (value.trim() === '' ? 'Not set' : value);

  return (
    <>
      <SectionHeader title="Business" />
      <ViewCard>
        <ViewRow label="Name">{showEmpty(business.name)}</ViewRow>
        <ViewRow label="Currency">{showEmpty(business.currencyCode)}</ViewRow>
      </ViewCard>

      <SectionHeader title="Taxes & selling" />
      <ViewCard>
        <ViewRow label="Default tax rate">{formatRate(business.defaultTaxRate)}</ViewRow>
        <ViewRow label="Tax display">
          {TAX_MODE_LABELS[business.taxDisplayMode as TaxDisplayMode]}
        </ViewRow>
        <ViewRow label="Allow sales beyond stock">
          {business.allowNegativeStock ? 'On' : 'Off'}
        </ViewRow>
      </ViewCard>

      <SectionHeader title="Stock" />
      <ViewCard>
        <ViewRow label="Low-stock alert">
          {formatThreshold(business.lowStockDefaultThreshold)}
        </ViewRow>
      </ViewCard>
    </>
  );
}

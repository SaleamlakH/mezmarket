import type { ReactNode } from 'react';
import { ArrowRight, Package, Receipt, Scale, ShoppingCart, TrendingUp } from 'lucide-react';

function Frame({
  label,
  caption,
  children,
}: {
  label: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className="relative m-0">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border border-(--border) bg-(--surface-primary) p-4 shadow-(--shadow-lg) transition duration-300 hover:-translate-y-1 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-(--text-muted)">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-(--accent)" />
            {label}
          </span>
          <span aria-hidden className="h-px flex-1 bg-(--border)" />
        </div>
        {children}
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}

function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'warning';
}) {
  const tones = {
    neutral: 'border-(--border) bg-(--bg) text-(--text-muted)',
    accent:
      'border-(--accent) bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-(--accent)',
    warning:
      'border-(--warning) bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-(--warning)',
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Bar({ width, tone = 'muted' }: { width: string; tone?: 'muted' | 'accent' | 'warning' }) {
  const tones = {
    muted: 'bg-(--border)',
    accent: 'bg-(--accent)',
    warning: 'bg-(--warning)',
  };

  return (
    <span aria-hidden className={`block h-1.5 rounded-full ${tones[tone]}`} style={{ width }} />
  );
}

const CUSTOM_UNITS = [
  { name: 'Piece', price: '80.00', base: true },
  { name: 'Shot', price: '25.00', base: false },
  { name: 'Bottle', price: '450.00', base: false },
];

export function ProductIllustration() {
  return (
    <Frame
      label="Products"
      caption="Illustrative product definition with units and prices you set yourself"
    >
      <div className="rounded-xl border border-(--border) bg-(--bg) p-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-(--border) bg-(--surface-secondary) text-(--accent)"
          >
            <Package size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-[12px] font-bold text-(--text)">Your product</p>
            <p className="m-0 text-[10px] text-(--text-muted)">Name · brand · photo</p>
          </div>
          <Tag tone="accent">Active</Tag>
        </div>

        <div className="mt-3 space-y-1.5">
          {CUSTOM_UNITS.map((unit) => (
            <div
              key={unit.name}
              className="flex items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--surface-primary) px-2.5 py-2"
            >
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-(--text)">
                {unit.base ? (
                  <Scale size={12} aria-hidden className="text-(--accent)" />
                ) : (
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-(--accent)" />
                )}
                {unit.name}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-(--text-muted)">
                {unit.price} ETB
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="m-0 mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-(--text-muted)">
        <Scale size={11} aria-hidden />
        Your units · Your prices
      </p>
    </Frame>
  );
}

const SALE_LINES = ['72%', '90%', '54%'];

export function SaleIllustration() {
  return (
    <Frame
      label="A sale"
      caption="Illustrative sale card showing flexible units and payment states"
    >
      <div className="rounded-xl border border-(--border) bg-(--bg) p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-(--text-muted)">
              Today’s sale
            </p>
            <p className="m-0 mt-1 font-mono text-2xl font-bold tabular-nums text-(--text)">
              1,107.50
            </p>
            <p className="m-0 text-[11px] font-semibold text-(--text-muted)">ETB · 3 lines</p>
          </div>
          <span
            aria-hidden
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-(--border) bg-(--surface-secondary) text-(--accent)"
          >
            <ShoppingCart size={18} />
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {SALE_LINES.map((width) => (
            <div key={width} className="flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--accent)" />
              <Bar width={width} />
              <span aria-hidden className="ml-auto h-1.5 w-9 shrink-0 rounded-full bg-(--border)" />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-(--border) pt-3">
          <Tag tone="accent">Paid</Tag>
          <Tag>Cash</Tag>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Tag>Piece</Tag>
        <Tag>Kilo</Tag>
        <Tag>Shot</Tag>
        <Tag>Bottle</Tag>
      </div>
    </Frame>
  );
}

const RECENT_SALES = [
  { amount: '360.00', lines: '1 item', status: 'Paid', tone: 'accent' as const },
  { amount: '240.00', lines: '2 items', status: 'Part-paid', tone: 'warning' as const },
  { amount: '287.50', lines: '1 item', status: 'Pending', tone: 'neutral' as const },
];

export function SellingIllustration() {
  return (
    <Frame
      label="Sales"
      caption="Illustrative sale cards showing paid, part-paid, and pending states"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {RECENT_SALES.map((sale) => (
          <div
            key={sale.amount}
            className="flex h-full flex-col rounded-xl border border-(--border) bg-(--bg) p-3"
          >
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-(--surface-secondary) text-(--accent)"
            >
              <Receipt size={13} />
            </span>
            <p className="m-0 mt-2 font-mono text-sm font-bold tabular-nums text-(--text)">
              {sale.amount}
            </p>
            <p className="m-0 text-[10px] text-(--text-muted)">{sale.lines}</p>
            <span className="mt-auto pt-2">
              <Tag tone={sale.tone}>{sale.status}</Tag>
            </span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

const STOCK_ITEMS = [
  { name: 'Staples', level: '78%', status: 'In stock', tone: 'accent' as const },
  { name: 'Coffee', level: '24%', status: 'Running low', tone: 'warning' as const },
  { name: 'Cooking oil', level: '64%', status: 'In stock', tone: 'accent' as const },
];

export function InventoryIllustration() {
  return (
    <Frame label="Inventory" caption="Illustrative stock cards showing levels and low-stock states">
      <div className="space-y-2">
        {STOCK_ITEMS.map((item) => (
          <div key={item.name} className="rounded-xl border border-(--border) bg-(--bg) p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold text-(--text)">{item.name}</span>
              <Tag tone={item.tone}>{item.status}</Tag>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-(--surface-secondary)">
              <span
                aria-hidden
                className={`block h-full rounded-full ${
                  item.tone === 'warning' ? 'bg-(--warning)' : 'bg-(--accent)'
                }`}
                style={{ width: item.level }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="m-0 mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-(--text-muted)">
        Stock on hand · What it is worth
      </p>
    </Frame>
  );
}

const LOTS = [
  { cost: '92.00 / kg', remaining: '12.5 kg left', level: '50%', next: true },
  { cost: '88.00 / kg', remaining: '3 kg left', level: '12%', next: false },
];

export function CostsIllustration() {
  return (
    <Frame
      label="Costs"
      caption="Illustrative purchase lots showing cost per lot and remaining stock"
    >
      <div className="space-y-2">
        {LOTS.map((lot) => (
          <div key={lot.cost} className="rounded-xl border border-(--border) bg-(--bg) p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] font-semibold text-(--text)">{lot.cost}</span>
              {lot.next ? <Tag tone="accent">Sells first</Tag> : <Tag>Older lot</Tag>}
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-(--surface-secondary)">
              <span
                aria-hidden
                className="block h-full rounded-full bg-(--accent)"
                style={{ width: lot.level }}
              />
            </div>
            <p className="m-0 mt-1.5 text-[10px] text-(--text-muted)">{lot.remaining}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-(--border) bg-(--surface-secondary) px-3 py-2.5">
        <ArrowRight size={13} aria-hidden className="shrink-0 text-(--accent)" />
        <p className="m-0 text-[10px] leading-relaxed text-(--text-muted)">
          Oldest stock is costed and sold first.
        </p>
      </div>
    </Frame>
  );
}

const METRICS = [
  { label: 'Sales', value: '2,340', detail: '14 sales', tone: 'text-(--text)' },
  { label: 'Cash', value: '2,100', detail: '12 payments', tone: 'text-(--text)' },
  { label: 'Owed', value: '240', detail: '1 unpaid sale', tone: 'text-(--warning)' },
  { label: 'Profit', value: '449', detail: 'From real costs', tone: 'text-(--accent)' },
];

export function OverviewIllustration() {
  return (
    <Frame
      label="Overview"
      caption="Illustrative shop overview with sales, cash, unpaid sales, and profit"
    >
      <div className="rounded-xl border border-(--border) bg-(--bg) p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-(--text-muted)">
            This week
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-(--positive)">
            <TrendingUp size={11} aria-hidden />
            12.4%
          </span>
        </div>
        <svg
          viewBox="0 0 200 24"
          preserveAspectRatio="none"
          aria-hidden
          className="mt-2 h-7 w-full text-(--accent)"
        >
          <path
            d="M0 19 L34 17 L62 18 L86 8 L108 15 L146 9 L174 11 L200 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {METRICS.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-(--border) bg-(--bg) p-3">
            <p className="m-0 text-[10px] font-semibold text-(--text-muted)">{metric.label}</p>
            <p className={`m-0 mt-1 font-mono text-sm font-bold tabular-nums ${metric.tone}`}>
              {metric.value}
            </p>
            <p className="m-0 text-[10px] text-(--text-muted)">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-2 rounded-xl border border-(--border) bg-(--bg) p-3">
        <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-(--text-muted)">
          Needs attention
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Tag tone="warning">Low stock</Tag>
          <Tag tone="warning">Expiring lots</Tag>
          <Tag tone="warning">Outstanding</Tag>
        </div>
      </div>
    </Frame>
  );
}

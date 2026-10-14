import { ShoppingCart } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { formatMoney, pluralize } from '@/lib/format';
import { useSaleDraftView } from '../hooks/useSaleDraftView';

export interface SaleCartTriggerProps {
  /** Opens the full review sheet. */
  onReview: () => void;
}

/**
 * The mobile trigger for the sale sheet. While the draft holds a line, it floats
 * in the bottom-right corner just above the tab bar with the running line count
 * and total; tapping anywhere on it opens the review sheet. Desktop keeps the
 * docked panel instead, so this never renders at `md`+.
 */
export function SaleCartTrigger({ onReview }: SaleCartTriggerProps) {
  const currency = useCurrency();
  const { itemCount, hasLines, total } = useSaleDraftView();

  if (!hasLines) return null;

  const count = `${itemCount} ${pluralize(itemCount, 'line')}`;
  const amount = formatMoney(total, currency);

  return (
    <button
      type="button"
      onClick={onReview}
      aria-label={`Review sale — ${count}, ${amount}`}
      className="focus-ring fixed right-4 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-40 flex cursor-pointer items-center gap-2.5 rounded-full border border-(--border) bg-(--surface-primary) py-2 pr-4 pl-2 shadow-(--shadow-lg) md:hidden"
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--accent) text-white">
        <ShoppingCart size={17} aria-hidden />
        <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-(--surface-primary) px-1 text-center text-[10px] font-bold text-(--accent)">
          {itemCount}
        </span>
      </span>

      <span className="flex flex-col items-start">
        <span className="text-[10px] font-semibold text-(--text-muted)">{count}</span>
        <span className="font-mono text-sm font-bold tabular-nums text-(--text)">{amount}</span>
      </span>
    </button>
  );
}

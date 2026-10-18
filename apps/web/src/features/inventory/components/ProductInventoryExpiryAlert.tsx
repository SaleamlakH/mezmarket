import { Banner } from '@/components/Banner';
import { formatDate, formatQuantity } from '@/lib/format';
import type { ExpiryAlertTotals } from '../lib/productExpiry';

export interface ProductInventoryExpiryAlertProps {
  totals: ExpiryAlertTotals;
  baseUnitLabel: string;
  /** The last moment a lot may expire and still be counted as expiring. */
  expiryBefore: Date;
}

/**
 * The one line of warning above the stock, shown only when some of it is
 * expired or about to be. It names both quantities in the product's base unit.
 */
export function ProductInventoryExpiryAlert({
  totals,
  baseUnitLabel,
  expiryBefore,
}: ProductInventoryExpiryAlertProps) {
  const { expiredQuantity, soonQuantity } = totals;
  if (expiredQuantity <= 0 && soonQuantity <= 0) return null;

  const expired = `${formatQuantity(expiredQuantity)} ${baseUnitLabel}`;
  const soon = `${formatQuantity(soonQuantity)} ${baseUnitLabel}`;
  const cutoff = formatDate(expiryBefore);

  let title: string;
  if (expiredQuantity > 0 && soonQuantity > 0) {
    title = `${expired} is expired and ${soon} expires by ${cutoff}.`;
  } else if (expiredQuantity > 0) {
    title = `${expired} is expired.`;
  } else {
    title = `${soon} expires by ${cutoff}.`;
  }

  return <Banner tone="danger" title={title} />;
}

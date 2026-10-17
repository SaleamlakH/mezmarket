import { Banner } from '@/components/Banner';
import { formatQuantity } from '@/lib/format';
import { EXPIRY_SOON_HORIZON_DAYS, type ExpiryAlertTotals } from '../lib/productExpiry';

export interface ProductInventoryExpiryAlertProps {
  totals: ExpiryAlertTotals;
  baseUnitLabel: string;
}

/**
 * The one line of warning above the stock, shown only when some of it is
 * expired or about to be. It names both quantities in the product's base unit.
 */
export function ProductInventoryExpiryAlert({
  totals,
  baseUnitLabel,
}: ProductInventoryExpiryAlertProps) {
  const { expiredQuantity, soonQuantity } = totals;
  if (expiredQuantity <= 0 && soonQuantity <= 0) return null;

  const expired = `${formatQuantity(expiredQuantity)} ${baseUnitLabel}`;
  const soon = `${formatQuantity(soonQuantity)} ${baseUnitLabel}`;

  let title: string;
  if (expiredQuantity > 0 && soonQuantity > 0) {
    title = `${expired} is expired and ${soon} expires within ${EXPIRY_SOON_HORIZON_DAYS} days.`;
  } else if (expiredQuantity > 0) {
    title = `${expired} is expired.`;
  } else {
    title = `${soon} expires within ${EXPIRY_SOON_HORIZON_DAYS} days.`;
  }

  return <Banner tone="danger" title={title} />;
}

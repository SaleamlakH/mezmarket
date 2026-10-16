import type { PaymentStatus } from '@mez/types';
import type { BadgeTone } from '@/components/Badge';
import { pluralize } from '@/lib/format';

/** The count of sale lines as shown in the panel and product chip. */
export function formatLineCount(count: number): string {
  return `${count} ${pluralize(count, 'line')}`;
}

/** How each payment status reads. */
export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  PAID: 'Paid',
  PENDING: 'Pending',
  PARTIALLY_PAID: 'Partially paid',
};

/** The badge/chip tone each payment status reads with. */
export const PAYMENT_TONES: Record<PaymentStatus, BadgeTone> = {
  PAID: 'positive',
  PENDING: 'warning',
  PARTIALLY_PAID: 'warning',
};

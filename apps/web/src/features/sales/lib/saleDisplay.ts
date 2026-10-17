import type { PaymentMethod, PaymentStatus } from '@mez/types';
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

/** How each payment method reads. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank transfer',
  MOBILE_MONEY: 'Mobile money',
  OTHER: 'Other',
};

/** The payment methods a sale is settled with, as select options. */
export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = (
  Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]
).map((value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }));

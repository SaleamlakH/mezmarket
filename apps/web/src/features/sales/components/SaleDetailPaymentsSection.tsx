import type { PaymentMethod, PaymentResponse, SaleDetailResponse } from '@mez/types';
import { Banknote, Building2, CircleDot, CreditCard, Smartphone } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatMoney } from '@/lib/format';
import { PAYMENT_METHOD_LABELS } from '../lib/saleDisplay';

const METHOD_ICONS: Record<PaymentMethod, ReactNode> = {
  CASH: <Banknote size={16} aria-hidden />,
  CARD: <CreditCard size={16} aria-hidden />,
  BANK_TRANSFER: <Building2 size={16} aria-hidden />,
  MOBILE_MONEY: <Smartphone size={16} aria-hidden />,
  OTHER: <CircleDot size={16} aria-hidden />,
};

/** The payment's method, plus the card's last four when known. */
function methodLabel(payment: PaymentResponse): string {
  const label = PAYMENT_METHOD_LABELS[payment.method];
  if (payment.method === 'CARD' && payment.methodDetail) {
    const last4 = payment.methodDetail.slice(-4);
    if (last4) return `${label} **${last4}`;
  }
  return payment.methodDetail ? `${label} • ${payment.methodDetail}` : label;
}

export interface SaleDetailPaymentsSectionProps {
  sale: SaleDetailResponse;
  currency: string;
}

/** The payments recorded against a sale. */
export function SaleDetailPaymentsSection({ sale, currency }: SaleDetailPaymentsSectionProps) {
  return (
    <section aria-labelledby="sale-payments-title">
      <h2 id="sale-payments-title" className="m-0 mb-2 text-base font-medium text-(--text)">
        Paid by customer
      </h2>

      {sale.payments.length === 0 ? (
        <p className="m-0 border-b border-(--border) py-2.5 text-sm text-(--text-muted)">
          No payments yet.
        </p>
      ) : (
        <ul
          className={`m-0 flex list-none flex-col divide-y divide-(--border) ${sale.payments.length > 1 && 'border-b border-(--border)'} p-0`}
        >
          {sale.payments.map((payment) => (
            <li key={payment.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="text-(--text-muted)">{METHOD_ICONS[payment.method]}</span>
              <span className="min-w-0 flex-1 truncate text-(--text)">{methodLabel(payment)}</span>
              <span className="font-mono tabular-nums text-(--text)">
                {formatMoney(payment.amount, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

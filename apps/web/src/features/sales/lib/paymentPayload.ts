import type { PaymentFormValues } from '@mez/types';
import type { SalePaymentDraft } from '../state/saleDraft';

/**
 * The payment a draft sends on the create-sale request.
 * Pending sends only its status; a partial sends its amount (a blank stays off
 * so validation refuses it); a paid sale's amount is deliberately never sent —
 * the server settles the whole total (an exact paid amount later changes it
 * here); the method and detail travel only when chosen — `createSaleSchema`
 * requires the method for a recorded payment.
 */
export function paymentPayload(payment: SalePaymentDraft): PaymentFormValues {
  if (payment.status === 'PENDING') return { status: 'PENDING' };

  return {
    status: payment.status,
    ...(payment.status === 'PARTIALLY_PAID' && payment.amount.trim() !== ''
      ? { amount: payment.amount }
      : {}),
    ...(payment.method ? { method: payment.method } : {}),
    ...(payment.methodDetail.trim() !== '' ? { methodDetail: payment.methodDetail } : {}),
  };
}

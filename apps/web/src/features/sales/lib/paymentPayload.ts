import type { PaymentFormValues } from '@mez/types';

/**
 * The payment a draft sends on the create-sale request: everything the form
 * holds, except a paid sale's amount, which stays off so the server settles
 * the balance. Blanks ride along for the validation schemas to refuse.
 */
export function paymentPayload(payment: PaymentFormValues): PaymentFormValues {
  if (payment.status === 'PENDING') return { status: 'PENDING' };

  return {
    status: payment.status,
    ...(payment.status === 'PARTIALLY_PAID' && payment.amount !== undefined
      ? { amount: payment.amount }
      : {}),
    ...(payment.method ? { method: payment.method } : {}),
    ...(payment.methodDetail ? { methodDetail: payment.methodDetail } : {}),
  };
}

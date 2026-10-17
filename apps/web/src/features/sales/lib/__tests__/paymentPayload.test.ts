import { describe, it, expect } from 'vitest';
import type { PaymentFormValues } from '@mez/types';
import { paymentPayload } from '../paymentPayload';

function payment(overrides: Partial<PaymentFormValues> = {}): PaymentFormValues {
  return { status: 'PAID', ...overrides };
}

describe('paymentPayload', () => {
  it('never sends a paid sale\u2019s amount however the draft holds it', () => {
    const sent = payment({ amount: '1200', method: 'CARD', methodDetail: 'ref 42' });

    expect(paymentPayload(sent)).toEqual({
      status: 'PAID',
      method: 'CARD',
      methodDetail: 'ref 42',
    });
  });

  it('sends a paid sale\u2019s method and detail only when they were chosen', () => {
    expect(paymentPayload(payment())).toEqual({ status: 'PAID' });
    expect(paymentPayload(payment({ method: 'CASH', methodDetail: 'ref 42' }))).toEqual({
      status: 'PAID',
      method: 'CASH',
      methodDetail: 'ref 42',
    });
  });

  it('sends a partial sale\u2019s amount and lets a blank one ride along', () => {
    expect(
      paymentPayload(payment({ status: 'PARTIALLY_PAID', amount: '300', method: 'CASH' })),
    ).toEqual({
      status: 'PARTIALLY_PAID',
      amount: '300',
      method: 'CASH',
    });

    expect(
      paymentPayload(payment({ status: 'PARTIALLY_PAID', amount: '   ', method: 'CASH' })),
    ).toEqual({
      status: 'PARTIALLY_PAID',
      amount: '   ',
      method: 'CASH',
    });
  });

  it('sends nothing but the status for a pending sale', () => {
    const sent = paymentPayload(
      payment({
        status: 'PENDING',
        amount: '500',
        method: 'CARD',
        methodDetail: 'ref 42',
      }),
    );

    expect(sent).toEqual({ status: 'PENDING' });
  });
});

import { describe, it, expect } from 'vitest';
import type { SalePaymentDraft } from '../../state/saleDraft';
import { EMPTY_PAYMENT } from '../../state/saleDraft';
import { paymentPayload } from '../paymentPayload';

const methodless: SalePaymentDraft = { ...EMPTY_PAYMENT, method: '' };

function payment(overrides: Partial<SalePaymentDraft> = {}): SalePaymentDraft {
  return { ...EMPTY_PAYMENT, ...overrides };
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
    expect(paymentPayload(methodless)).toEqual({ status: 'PAID' });
    expect(paymentPayload(payment({ methodDetail: 'ref 42' }))).toEqual({
      status: 'PAID',
      method: 'CASH',
      methodDetail: 'ref 42',
    });
  });

  it('sends a partial sale\u2019s amount only when one was keyed in', () => {
    expect(paymentPayload(payment({ status: 'PARTIALLY_PAID', amount: '300' }))).toEqual({
      status: 'PARTIALLY_PAID',
      amount: '300',
      method: 'CASH',
    });

    const blank = paymentPayload(payment({ status: 'PARTIALLY_PAID', amount: '   ' }));
    expect(blank).not.toHaveProperty('amount');
    expect(blank).toEqual({ status: 'PARTIALLY_PAID', method: 'CASH' });
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

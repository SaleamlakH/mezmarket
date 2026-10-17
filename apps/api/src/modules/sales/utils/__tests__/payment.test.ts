import { describe, it, expect } from 'vitest';
import {
  amountToRecord,
  paymentSummary,
  resolveInitialPayment,
  toResolvedPayment,
} from '../payment.js';

describe('amountToRecord', () => {
  it('settles the fallback for a paid payment that names no amount', () => {
    expect(amountToRecord('PAID', undefined, 60)).toBe(60);
  });

  it('keeps the amount a paid payment names, even below the balance', () => {
    expect(amountToRecord('PAID', 40, 60)).toBe(40);
  });

  it('requires the amount a partial payment names', () => {
    expect(amountToRecord('PARTIALLY_PAID', 40, 60)).toBe(40);
  });

  it('records nothing for a pending sale', () => {
    expect(amountToRecord('PENDING', undefined, 60)).toBeNull();
  });
});

describe('paymentSummary', () => {
  it('leaves the remainder due after a partial payment', () => {
    expect(paymentSummary(100, 40)).toEqual({ amountPaid: 40, balanceDue: 60 });
  });

  it('settles a sale once the payments reach the total', () => {
    expect(paymentSummary(100, 100)).toEqual({ amountPaid: 100, balanceDue: 0 });
  });

  it('floors an overpayment at no balance due', () => {
    expect(paymentSummary(100, 120)).toEqual({ amountPaid: 120, balanceDue: 0 });
  });

  it('keeps a balance due when a sale is marked paid short', () => {
    expect(paymentSummary(100, 40)).toEqual({ amountPaid: 40, balanceDue: 60 });
  });
});

describe('resolveInitialPayment', () => {
  it('opens pending owing the whole total when no payment is named', () => {
    expect(resolveInitialPayment(undefined, 2185)).toEqual({
      status: 'PENDING',
      amountPaid: 0,
      balanceDue: 2185,
      payment: null,
    });
  });

  it('opens a paid sale settled whole when no amount is named', () => {
    expect(resolveInitialPayment({ status: 'PAID' }, 2185)).toEqual({
      status: 'PAID',
      amountPaid: 2185,
      balanceDue: 0,
      payment: { amount: 2185, method: 'OTHER', methodDetail: null },
    });
  });

  it('opens a partial sale at the amount it names and keeps a balance', () => {
    expect(resolveInitialPayment({ status: 'PARTIALLY_PAID', amount: 500 }, 2185)).toEqual({
      status: 'PARTIALLY_PAID',
      amountPaid: 500,
      balanceDue: 1685,
      payment: { amount: 500, method: 'OTHER', methodDetail: null },
    });
  });
});

describe('toResolvedPayment', () => {
  it('defaults the method and drops an empty detail', () => {
    expect(toResolvedPayment({}, 500)).toEqual({
      amount: 500,
      method: 'OTHER',
      methodDetail: null,
    });
  });

  it('carries the method and its free-text detail through', () => {
    expect(toResolvedPayment({ method: 'MOBILE_MONEY', methodDetail: 'ref 42' }, 500)).toEqual({
      amount: 500,
      method: 'MOBILE_MONEY',
      methodDetail: 'ref 42',
    });
  });
});

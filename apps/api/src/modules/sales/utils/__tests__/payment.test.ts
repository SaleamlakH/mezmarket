import { describe, it, expect } from 'vitest';
import { amountToRecord, paymentSummary } from '../payment.js';

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

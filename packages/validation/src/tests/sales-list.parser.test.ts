import { describe, it, expect } from 'vitest';
import { validateSaleListFilters } from '../parser.js';

const FROM = '2026-01-01T00:00:00.000Z';
const TO = '2026-01-02T00:00:00.000Z';

describe('validateSaleListFilters', () => {
  it('reads an empty query as no filters', () => {
    const result = validateSaleListFilters({});

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({});
  });

  it('keeps valid ISO instant bounds as strings', () => {
    const result = validateSaleListFilters({ from: FROM, to: TO });

    expect(result.errors).toBeNull();
    expect(result.data?.from).toBe(FROM);
    expect(result.data?.to).toBe(TO);
  });

  it('rejects a start after the end', () => {
    expect(validateSaleListFilters({ from: TO, to: FROM }).errors).toEqual({
      from: expect.any(String),
    });
  });

  it('reads a blank bound as no filter', () => {
    const result = validateSaleListFilters({ from: '   ', to: '' });

    expect(result.errors).toBeNull();
    expect(result.data?.from).toBeUndefined();
    expect(result.data?.to).toBeUndefined();
  });

  it('accepts equal bounds, which are inclusive', () => {
    const result = validateSaleListFilters({ from: FROM, to: FROM });

    expect(result.errors).toBeNull();
  });

  it('coerces the string flag "true" and "false" to booleans', () => {
    expect(validateSaleListFilters({ unpaid: 'true' }).data?.unpaid).toBe(true);
    expect(validateSaleListFilters({ unpaid: 'false' }).data?.unpaid).toBe(false);
  });

  it('accepts an already-typed boolean flag', () => {
    expect(validateSaleListFilters({ unpaid: true }).data?.unpaid).toBe(true);
    expect(validateSaleListFilters({ unpaid: false }).data?.unpaid).toBe(false);
  });

  it('rejects a flag that is neither a boolean nor "true"/"false"', () => {
    expect(validateSaleListFilters({ unpaid: 'maybe' }).errors).toEqual({
      unpaid: expect.any(String),
    });
  });

  it('treats overdue as implying unpaid when unpaid is left unset', () => {
    const result = validateSaleListFilters({ overdue: 'true' });

    expect(result.errors).toBeNull();
    expect(result.data?.overdue).toBe(true);
    expect(result.data?.unpaid).toBe(true);
  });

  it('does not force unpaid when overdue is explicitly false', () => {
    const result = validateSaleListFilters({ overdue: 'false' });

    expect(result.errors).toBeNull();
    expect(result.data?.overdue).toBe(false);
    expect(result.data?.unpaid).toBeUndefined();
  });

  it('coerces unpaid to true whenever overdue is true, even when unpaid was false', () => {
    const result = validateSaleListFilters({ overdue: true, unpaid: false });

    expect(result.errors).toBeNull();
    expect(result.data?.overdue).toBe(true);
    expect(result.data?.unpaid).toBe(true);
  });

  it('reads a blank product id as no filter', () => {
    const result = validateSaleListFilters({ productId: '   ' });

    expect(result.errors).toBeNull();
    expect(result.data?.productId).toBeUndefined();
  });

  it('reads a single status from the comma-separated value', () => {
    const result = validateSaleListFilters({ status: 'paid' });

    expect(result.errors).toBeNull();
    expect(result.data?.status).toEqual(['PAID']);
  });

  it('reads several statuses from the comma-separated value', () => {
    const result = validateSaleListFilters({ status: 'paid,partially_paid' });

    expect(result.errors).toBeNull();
    expect(result.data?.status).toEqual(['PAID', 'PARTIALLY_PAID']);
  });

  it('ignores whitespace and case in the status list', () => {
    const result = validateSaleListFilters({ status: ' PAID , partially_paid ' });

    expect(result.errors).toBeNull();
    expect(result.data?.status).toEqual(['PAID', 'PARTIALLY_PAID']);
  });

  it('dedupes repeated statuses', () => {
    const result = validateSaleListFilters({ status: 'paid,PAID' });

    expect(result.errors).toBeNull();
    expect(result.data?.status).toEqual(['PAID']);
  });

  it('rejects an unknown payment status', () => {
    expect(validateSaleListFilters({ status: 'cancelled' }).errors).toEqual({
      status: expect.any(String),
    });
  });

  it('rejects an unknown status inside the list', () => {
    expect(validateSaleListFilters({ status: 'paid,cancelled' }).errors).not.toBeNull();
  });

  it('reads a blank status list as no filter', () => {
    const result = validateSaleListFilters({ status: '   ' });

    expect(result.errors).toBeNull();
    expect(result.data?.status).toBeUndefined();
  });

  it('keeps valid payment instant bounds as strings', () => {
    const result = validateSaleListFilters({ paymentFrom: FROM, paymentTo: TO });

    expect(result.errors).toBeNull();
    expect(result.data?.paymentFrom).toBe(FROM);
    expect(result.data?.paymentTo).toBe(TO);
  });

  it('rejects a payment start after the payment end', () => {
    expect(validateSaleListFilters({ paymentFrom: TO, paymentTo: FROM }).errors).toEqual({
      paymentFrom: expect.any(String),
    });
  });

  it('rejects an invalid payment instant', () => {
    expect(validateSaleListFilters({ paymentFrom: 'not-an-instant' }).errors).toEqual({
      paymentFrom: expect.any(String),
    });
  });
});

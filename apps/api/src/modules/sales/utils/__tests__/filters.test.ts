import { describe, it, expect } from 'vitest';
import { toSaleListQuery } from '../filters.js';

describe('toSaleListQuery', () => {
  const now = new Date('2026-02-10T12:00:00.000Z');

  it('resolves every filter into the terms the read takes', () => {
    const from = '2026-02-01T00:00:00.000Z';
    const to = '2026-02-28T23:59:59.999Z';

    expect(
      toSaleListQuery(
        {
          status: 'PARTIALLY_PAID',
          from,
          to,
          productId: 'p-tequila',
          unpaid: true,
        },
        now,
      ),
    ).toEqual({
      status: 'PARTIALLY_PAID',
      from: new Date(from),
      to: new Date(to),
      productId: 'p-tequila',
      unpaid: true,
    });
  });

  it('passes no terms when no filter was given', () => {
    expect(toSaleListQuery({}, now)).toEqual({});
  });

  it('turns overdue into an unpaid read ending just before the seven-day cutoff', () => {
    expect(toSaleListQuery({ overdue: true }, now)).toEqual({
      unpaid: true,
      to: new Date('2026-02-03T11:59:59.999Z'),
    });
  });

  it('keeps the earlier upper bound when overdue is combined with to', () => {
    const to = '2026-02-01T00:00:00.000Z';

    expect(toSaleListQuery({ overdue: true, to }, now)).toEqual({
      unpaid: true,
      to: new Date(to),
    });
  });

  it('keeps overdue unpaid even when unpaid is false', () => {
    expect(toSaleListQuery({ overdue: true, unpaid: false }, now)).toEqual({
      unpaid: true,
      to: new Date('2026-02-03T11:59:59.999Z'),
    });
  });

  it('drops from when overdue is given', () => {
    const from = '2026-01-01T00:00:00.000Z';

    expect(toSaleListQuery({ overdue: true, from }, now)).toEqual({
      unpaid: true,
      to: new Date('2026-02-03T11:59:59.999Z'),
    });
  });
});

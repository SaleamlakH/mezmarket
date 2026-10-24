import { describe, it, expect } from 'vitest';
import {
  fromSearchParams,
  toSaleListFilters,
  withListDateFilters,
  SALE_HISTORY_FILTERS,
} from '../saleListFilter';

describe('saleListFilter', () => {
  describe('toSaleListFilters', () => {
    it('sends no filters for the unfiltered list', () => {
      expect(toSaleListFilters('all')).toEqual({});
    });

    it('reads outstanding as an unpaid balance', () => {
      expect(toSaleListFilters('outstanding')).toEqual({ unpaid: true });
    });

    it('reads overdue as the overdue filter', () => {
      expect(toSaleListFilters('overdue')).toEqual({ overdue: true });
    });

    it('reads the paid-and-partial chip as both statuses', () => {
      expect(toSaleListFilters('paidOrPartial')).toEqual({
        status: ['PAID', 'PARTIALLY_PAID'],
      });
    });

    it.each(['PAID', 'PENDING', 'PARTIALLY_PAID'] as const)(
      'narrows %s to its payment status',
      (status) => {
        expect(toSaleListFilters(status)).toEqual({ status: [status] });
      },
    );
  });

  describe('fromSearchParams', () => {
    it('reads an empty query as the unfiltered list', () => {
      expect(fromSearchParams(new URLSearchParams())).toBe('all');
    });

    it('reads unpaid=true as outstanding, keeping dashboard deep links working', () => {
      expect(fromSearchParams(new URLSearchParams('unpaid=true'))).toBe('outstanding');
    });

    it('reads overdue=true as overdue', () => {
      expect(fromSearchParams(new URLSearchParams('overdue=true'))).toBe('overdue');
    });

    it('reads the documented unpaid and overdue deep link as overdue', () => {
      expect(fromSearchParams(new URLSearchParams('unpaid=true&overdue=true'))).toBe('overdue');
    });

    it('reads a recognized status from the comma-separated value', () => {
      expect(fromSearchParams(new URLSearchParams('status=paid'))).toBe('PAID');
    });

    it('reads paid and partially-paid statuses as the combined chip', () => {
      expect(fromSearchParams(new URLSearchParams('status=paid,partially_paid'))).toBe(
        'paidOrPartial',
      );
    });

    it('reads the combined chip regardless of status order', () => {
      expect(fromSearchParams(new URLSearchParams('status=partially_paid,paid'))).toBe(
        'paidOrPartial',
      );
    });

    it('ignores whitespace and case in the status list', () => {
      expect(fromSearchParams(new URLSearchParams('status= PAID , partially_paid '))).toBe(
        'paidOrPartial',
      );
    });

    it('dedupes repeated statuses', () => {
      expect(fromSearchParams(new URLSearchParams('status=paid,PAID'))).toBe('PAID');
    });

    it('prefers outstanding when both keys are present', () => {
      expect(fromSearchParams(new URLSearchParams('status=PAID&unpaid=true'))).toBe('outstanding');
    });

    it('prefers overdue over status', () => {
      expect(fromSearchParams(new URLSearchParams('status=PAID&overdue=true'))).toBe('overdue');
    });

    it('ignores unpaid=false', () => {
      expect(fromSearchParams(new URLSearchParams('unpaid=false'))).toBe('all');
    });

    it('ignores an unknown status', () => {
      expect(fromSearchParams(new URLSearchParams('status=CANCELLED'))).toBe('all');
    });
  });

  describe('withListDateFilters', () => {
    it('adds the sale and payment bounds carried by a dashboard link', () => {
      const from = '2026-02-01T00:00:00.000Z';
      const to = '2026-02-28T23:59:59.999Z';
      const paymentFrom = '2026-02-01T00:00:00.000Z';
      const paymentTo = '2026-02-28T23:59:59.999Z';
      const params = new URLSearchParams({ from, to, paymentFrom, paymentTo });

      expect(withListDateFilters({ status: ['PAID'] }, params)).toEqual({
        status: ['PAID'],
        from,
        to,
        paymentFrom,
        paymentTo,
      });
    });

    it('leaves the chip filters alone when no bounds are present', () => {
      expect(withListDateFilters({ unpaid: true }, new URLSearchParams())).toEqual({
        unpaid: true,
      });
    });
  });

  describe('SALE_HISTORY_FILTERS', () => {
    it('offers all, outstanding, overdue, the combined chip and the three payment statuses in order', () => {
      expect(SALE_HISTORY_FILTERS.map((option) => option.value)).toEqual([
        'all',
        'outstanding',
        'overdue',
        'paidOrPartial',
        'PAID',
        'PENDING',
        'PARTIALLY_PAID',
      ]);
    });
  });
});

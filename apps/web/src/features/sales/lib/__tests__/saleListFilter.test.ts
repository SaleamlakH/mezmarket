import { describe, it, expect } from 'vitest';
import { fromSearchParams, toSaleListFilters, SALE_HISTORY_FILTERS } from '../saleListFilter';

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

    it.each(['PAID', 'PENDING', 'PARTIALLY_PAID'] as const)(
      'narrows %s to its payment status',
      (status) => {
        expect(toSaleListFilters(status)).toEqual({ status });
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

    it('reads a recognized status', () => {
      expect(fromSearchParams(new URLSearchParams('status=PAID'))).toBe('PAID');
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

  describe('SALE_HISTORY_FILTERS', () => {
    it('offers all, outstanding, overdue and the three payment statuses in order', () => {
      expect(SALE_HISTORY_FILTERS.map((option) => option.value)).toEqual([
        'all',
        'outstanding',
        'overdue',
        'PAID',
        'PENDING',
        'PARTIALLY_PAID',
      ]);
    });
  });
});

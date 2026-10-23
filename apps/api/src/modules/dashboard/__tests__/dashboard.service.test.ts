import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';
import { TEQUILA_BOTTLE, TEQUILA_MOU } from '../../../shared/utils/__tests__/snapshot.fixtures.js';
import { createDashboardService } from '../dashboard.service.js';
import type { DashboardRepository } from '../dashboard.types.js';
import { actor, money } from './dashboard.fixtures.js';

const NOW = new Date('2026-06-15T12:00:00.000Z');
const CURRENT_FROM = new Date('2026-06-01T00:00:00.000Z');
const CURRENT_TO = new Date('2026-06-11T00:00:00.000Z');
const PREVIOUS_FROM = new Date('2026-05-22T00:00:00.000Z');

function mockRepository(): DashboardRepository {
  return {
    stockPositions: vi.fn(),
    expiredLotCount: vi.fn(),
    expiringLotCount: vi.fn(),
    earliestExpiringLot: vi.fn(),
    unpaidAggregate: vi.fn(),
    draftBatchAggregate: vi.fn(),
    salesAggregate: vi.fn(),
    cashAggregate: vi.fn(),
    cogsGroups: vi.fn(),
    lossGroups: vi.fn(),
    lotContext: vi.fn(),
    salesByTimestamp: vi.fn(),
    trendCostGroups: vi.fn(),
    saleLineMap: vi.fn(),
  };
}

const LOT = {
  id: 'lot-1',
  purchaseQuantity: money(10),
  purchaseUnitCost: money(5),
  units: {
    sourceUnit: TEQUILA_BOTTLE,
    sourceBaseUnit: TEQUILA_BOTTLE,
    mouUnit: TEQUILA_MOU,
  },
};

describe('dashboard.service', () => {
  let repository: DashboardRepository;
  let service: ReturnType<typeof createDashboardService>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    repository = mockRepository();
    service = createDashboardService(repository);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getAttention', () => {
    function arrangeStock() {
      vi.mocked(repository.stockPositions).mockResolvedValue([
        { name: 'Zeta', currentSealedStock: money(0), lowStockThreshold: null },
        { name: 'Alpha', currentSealedStock: money(3), lowStockThreshold: null },
        { name: 'Gamma', currentSealedStock: money(4), lowStockThreshold: money(4) },
        { name: 'Beta', currentSealedStock: money(3), lowStockThreshold: money(1) },
      ]);
      vi.mocked(repository.expiredLotCount).mockResolvedValue(2);
      vi.mocked(repository.expiringLotCount).mockResolvedValue(1);
      vi.mocked(repository.earliestExpiringLot).mockResolvedValue({
        expiryDate: new Date('2026-06-20T00:00:00.000Z'),
        product: { name: 'Yogurt' },
      });
      vi.mocked(repository.unpaidAggregate).mockResolvedValue({
        all: { total: money(125.5), count: 3 },
        overdue: { total: money(50.25), count: 1 },
      });
    }

    it('counts stock, expiry and unpaid, and the draft anchor for a manager', async () => {
      arrangeStock();
      const createdAt = new Date('2026-06-01T08:00:00.000Z');
      vi.mocked(repository.draftBatchAggregate).mockResolvedValue({
        count: 2,
        oldest: { batchId: 'batch-1', supplierName: 'Farm', createdAt, lineCount: 4 },
      });

      const result = await service.getAttention(actor('MANAGER'));

      expect(result).toEqual({
        asOf: NOW.toISOString(),
        stock: { count: 2, lowCount: 1, outCount: 1, preview: ['Zeta', 'Gamma'] },
        expiring: {
          lotCount: 3,
          expiredLotCount: 2,
          expiringLotCount: 1,
          earliest: { productName: 'Yogurt', expiryDate: '2026-06-20T00:00:00.000Z' },
        },
        unpaid: { count: 3, total: 125.5, overdue: { count: 1, total: 50.25 } },
        draftBatches: {
          count: 2,
          oldest: {
            batchId: 'batch-1',
            supplierName: 'Farm',
            createdAt: createdAt.toISOString(),
            lineCount: 4,
          },
        },
      });
      expect(result).not.toHaveProperty('openContainers');
    });

    it('uses the shared seven-day and thirty-day cutoffs', async () => {
      arrangeStock();
      vi.mocked(repository.draftBatchAggregate).mockResolvedValue({ count: 0, oldest: null });

      await service.getAttention(actor('OWNER'));

      expect(repository.expiredLotCount).toHaveBeenCalledWith('b-1', 'br-1', NOW);
      expect(repository.expiringLotCount).toHaveBeenCalledWith(
        'b-1',
        'br-1',
        NOW,
        new Date('2026-07-15T12:00:00.000Z'),
      );
      expect(repository.unpaidAggregate).toHaveBeenCalledWith(
        'b-1',
        'br-1',
        new Date('2026-06-08T12:00:00.000Z'),
      );
    });

    it('omits the draft block for staff and never runs its queries', async () => {
      arrangeStock();

      const result = await service.getAttention(actor('CASHIER'));

      expect(repository.draftBatchAggregate).not.toHaveBeenCalled();
      expect(result).not.toHaveProperty('draftBatches');
      expect(result.stock.count).toBe(2);
    });

    it('returns zeros and a null anchor for empty categories', async () => {
      vi.mocked(repository.stockPositions).mockResolvedValue([]);
      vi.mocked(repository.expiredLotCount).mockResolvedValue(0);
      vi.mocked(repository.expiringLotCount).mockResolvedValue(0);
      vi.mocked(repository.earliestExpiringLot).mockResolvedValue(null);
      vi.mocked(repository.unpaidAggregate).mockResolvedValue({
        all: { total: null, count: 0 },
        overdue: { total: null, count: 0 },
      });
      vi.mocked(repository.draftBatchAggregate).mockResolvedValue({ count: 0, oldest: null });

      const result = await service.getAttention(actor('OWNER'));

      expect(result.stock).toEqual({ count: 0, lowCount: 0, outCount: 0, preview: [] });
      expect(result.expiring).toEqual({
        lotCount: 0,
        expiredLotCount: 0,
        expiringLotCount: 0,
        earliest: null,
      });
      expect(result.unpaid).toEqual({ count: 0, total: 0, overdue: { count: 0, total: 0 } });
    });

    it('fails the request when one repository call fails', async () => {
      arrangeStock();
      vi.mocked(repository.draftBatchAggregate).mockResolvedValue({ count: 0, oldest: null });
      vi.mocked(repository.expiredLotCount).mockRejectedValue(new Error('db down'));

      await expect(service.getAttention(actor('OWNER'))).rejects.toThrow('db down');
    });
  });

  describe('getSummary', () => {
    it('returns only sales and cash for staff and skips manager queries', async () => {
      vi.mocked(repository.salesAggregate).mockResolvedValue({
        total: money(1150),
        taxAmount: money(150),
        count: 2,
      });
      vi.mocked(repository.cashAggregate).mockResolvedValue({ total: money(900), count: 3 });

      const result = await service.getSummary(actor('SERVER'), {
        from: CURRENT_FROM,
        to: CURRENT_TO,
      });

      expect(result).toEqual({
        period: { from: CURRENT_FROM.toISOString(), to: CURRENT_TO.toISOString() },
        asOf: NOW.toISOString(),
        sales: { total: 1150, count: 2 },
        cashCollected: { total: 900, paymentCount: 3 },
      });
      expect(repository.salesAggregate).toHaveBeenCalledTimes(1);
      expect(repository.unpaidAggregate).not.toHaveBeenCalled();
      expect(repository.cogsGroups).not.toHaveBeenCalled();
      expect(repository.lossGroups).not.toHaveBeenCalled();
    });

    it('adds gross profit, outstanding and losses for a manager', async () => {
      vi.mocked(repository.salesAggregate).mockImplementation((_businessId, _branchId, from) =>
        Promise.resolve(
          from.getTime() === CURRENT_FROM.getTime()
            ? { total: money(1150), taxAmount: money(150), count: 2 }
            : { total: money(575), taxAmount: money(75), count: 1 },
        ),
      );
      vi.mocked(repository.cashAggregate).mockResolvedValue({ total: money(900), count: 3 });
      vi.mocked(repository.cogsGroups).mockImplementation((_businessId, _branchId, from) =>
        Promise.resolve(
          from.getTime() === CURRENT_FROM.getTime()
            ? [{ stockBatchLineId: 'lot-1', unitCost: money(6), quantityPulled: money(10) }]
            : [{ stockBatchLineId: 'lot-1', unitCost: money(5), quantityPulled: money(5) }],
        ),
      );
      vi.mocked(repository.lotContext).mockResolvedValue([LOT]);
      vi.mocked(repository.unpaidAggregate).mockResolvedValue({
        all: { total: money(200), count: 2 },
        overdue: { total: money(80), count: 1 },
      });
      vi.mocked(repository.lossGroups).mockResolvedValue([
        { stockBatchLineId: 'lot-1', standardQuantity: money(2), count: 2 },
        { stockBatchLineId: 'lot-1', standardQuantity: money(1), count: 3 },
      ]);

      const result = await service.getSummary(actor('OWNER'), {
        from: CURRENT_FROM,
        to: CURRENT_TO,
      });

      expect(repository.salesAggregate).toHaveBeenCalledWith(
        'b-1',
        'br-1',
        PREVIOUS_FROM,
        CURRENT_FROM,
      );
      expect(result.grossProfit).toEqual({ value: 940, previous: 475, deltaPercent: 97.89 });
      expect(result.outstanding).toEqual({
        total: 200,
        count: 2,
        overdue: { total: 80, count: 1 },
      });
      // Two loss groups: the counts add up rather than counting groups.
      expect(result.losses).toEqual({ total: 15, count: 5 });
      expect(result.sales).toEqual({ total: 1150, count: 2 });
    });
  });

  describe('getTrend', () => {
    const FROM = new Date('2026-06-15T00:00:00.000Z');
    const TO = new Date('2026-06-15T03:00:00.000Z');

    it('returns 403 for staff without touching the repository', async () => {
      await expect(
        service.getTrend(actor('CASHIER'), { from: FROM, to: TO, bucket: 'hour' }),
      ).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN, statusCode: 403 });
      expect(repository.salesByTimestamp).not.toHaveBeenCalled();
    });

    it('refuses an hourly bucket above 48 hours', async () => {
      await expect(
        service.getTrend(actor('OWNER'), {
          from: new Date('2026-06-01T00:00:00.000Z'),
          to: new Date('2026-06-04T00:00:00.000Z'),
          bucket: 'hour',
        }),
      ).rejects.toMatchObject({ code: ERROR_CODES.BAD_REQUEST, statusCode: 400 });
    });

    it('emits every hourly bucket and maps each sale to the bucket holding it', async () => {
      const firstSale = new Date('2026-06-15T00:30:00.000Z');
      vi.mocked(repository.salesByTimestamp).mockResolvedValue([
        { saleDatetime: firstSale, total: money(110), taxAmount: money(10) },
        {
          saleDatetime: new Date('2026-06-15T02:15:00.000Z'),
          total: money(55),
          taxAmount: money(5),
        },
      ]);
      vi.mocked(repository.trendCostGroups).mockResolvedValue([
        {
          saleLineId: 'sl-1',
          stockBatchLineId: 'lot-1',
          unitCost: money(5),
          quantityPulled: money(4),
        },
      ]);
      vi.mocked(repository.saleLineMap).mockResolvedValue([
        { id: 'sl-1', saleDatetime: firstSale },
      ]);
      vi.mocked(repository.lotContext).mockResolvedValue([LOT]);

      const result = await service.getTrend(actor('OWNER'), {
        from: FROM,
        to: TO,
        bucket: 'hour',
      });

      expect(result.bucket).toBe('hour');
      expect(result.points).toEqual([
        { start: '2026-06-15T00:00:00.000Z', grossProfit: 80 },
        { start: '2026-06-15T01:00:00.000Z', grossProfit: 0 },
        { start: '2026-06-15T02:00:00.000Z', grossProfit: 50 },
      ]);
    });

    it('uses the frozen sale-line cost and the lot conversion for COGS', async () => {
      const saleDatetime = new Date('2026-06-15T00:30:00.000Z');
      vi.mocked(repository.salesByTimestamp).mockResolvedValue([
        { saleDatetime, total: money(220), taxAmount: money(20) },
      ]);
      vi.mocked(repository.trendCostGroups).mockResolvedValue([
        {
          saleLineId: 'sl-1',
          stockBatchLineId: 'lot-1',
          unitCost: money(12),
          quantityPulled: money(10),
        },
      ]);
      vi.mocked(repository.saleLineMap).mockResolvedValue([{ id: 'sl-1', saleDatetime }]);
      vi.mocked(repository.lotContext).mockResolvedValue([{ ...LOT, purchaseUnitCost: money(5) }]);

      const result = await service.getTrend(actor('OWNER'), {
        from: FROM,
        to: TO,
        bucket: 'hour',
      });

      // Revenue 200, cost 10 × 12 (frozen cost, not the lot's current 5).
      expect(result.points[0]?.grossProfit).toBe(80);
    });

    it('matches the summary gross profit when the same period is reaggregated', async () => {
      const from = new Date('2026-06-01T00:00:00.000Z');
      const to = new Date('2026-06-02T00:00:00.000Z');
      const saleDatetime = new Date('2026-06-01T10:00:00.000Z');

      vi.mocked(repository.salesAggregate).mockImplementation((_businessId, _branchId, start) =>
        Promise.resolve(
          start.getTime() === from.getTime()
            ? { total: money(1150), taxAmount: money(150), count: 2 }
            : { total: null, taxAmount: null, count: 0 },
        ),
      );
      vi.mocked(repository.cashAggregate).mockResolvedValue({ total: money(0), count: 0 });
      vi.mocked(repository.cogsGroups).mockImplementation((_businessId, _branchId, start) =>
        Promise.resolve(
          start.getTime() === from.getTime()
            ? [{ stockBatchLineId: 'lot-1', unitCost: money(6), quantityPulled: money(10) }]
            : [],
        ),
      );
      vi.mocked(repository.lotContext).mockResolvedValue([LOT]);
      vi.mocked(repository.unpaidAggregate).mockResolvedValue({
        all: { total: null, count: 0 },
        overdue: { total: null, count: 0 },
      });
      vi.mocked(repository.lossGroups).mockResolvedValue([]);

      const summary = await service.getSummary(actor('OWNER'), { from, to });

      vi.mocked(repository.salesByTimestamp).mockResolvedValue([
        { saleDatetime, total: money(1150), taxAmount: money(150) },
      ]);
      vi.mocked(repository.trendCostGroups).mockResolvedValue([
        {
          saleLineId: 'sl-1',
          stockBatchLineId: 'lot-1',
          unitCost: money(6),
          quantityPulled: money(10),
        },
      ]);
      vi.mocked(repository.saleLineMap).mockResolvedValue([{ id: 'sl-1', saleDatetime }]);

      const trend = await service.getTrend(actor('OWNER'), { from, to, bucket: 'day' });
      const sum = trend.points.reduce((total, point) => total + point.grossProfit, 0);

      expect(summary.grossProfit?.value).toBe(940);
      expect(sum).toBe(940);
    });
  });
});

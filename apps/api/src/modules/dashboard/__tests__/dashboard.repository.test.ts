import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '../../../../generated/prisma/client.js';
import { createDashboardRepository } from '../dashboard.repository.js';
import { money } from './dashboard.fixtures.js';

const FROM = new Date('2026-06-01T00:00:00.000Z');
const TO = new Date('2026-06-02T00:00:00.000Z');
const AS_OF = new Date('2026-06-15T12:00:00.000Z');
const OVERDUE_BEFORE = new Date('2026-06-08T12:00:00.000Z');
const EXPIRY_BEFORE = new Date('2026-07-15T12:00:00.000Z');

function createPrismaStub() {
  const product = { findMany: vi.fn() };
  const stockBatchLine = { count: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() };
  const sale = { aggregate: vi.fn(), groupBy: vi.fn() };
  const stockBatch = { count: vi.fn(), findFirst: vi.fn() };
  const payment = { aggregate: vi.fn() };
  const saleLineCost = { groupBy: vi.fn() };
  const loss = { groupBy: vi.fn() };
  const saleLine = { findMany: vi.fn() };

  const prisma = {
    product,
    stockBatchLine,
    sale,
    stockBatch,
    payment,
    saleLineCost,
    loss,
    saleLine,
  } as unknown as PrismaClient;

  return {
    prisma,
    product,
    stockBatchLine,
    sale,
    stockBatch,
    payment,
    saleLineCost,
    loss,
    saleLine,
  };
}

describe('dashboard.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('stockPositions', () => {
    it('reads active branch products with their stock and threshold', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      product.findMany.mockResolvedValue([
        { name: 'Soap', currentSealedStock: money(3), lowStockThreshold: null },
      ]);

      await expect(repo.stockPositions('b-1', 'br-1')).resolves.toEqual([
        { name: 'Soap', currentSealedStock: money(3), lowStockThreshold: null },
      ]);
      expect(product.findMany).toHaveBeenCalledWith({
        where: { businessId: 'b-1', branchId: 'br-1', active: true },
        select: {
          name: true,
          currentSealedStock: true,
          lowStockThreshold: true,
        },
        orderBy: { name: 'asc' },
      });
    });

    it('reads no products when the branch has no active products', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      product.findMany.mockResolvedValue([]);

      await expect(repo.stockPositions('b-1', 'br-1')).resolves.toEqual([]);
    });
  });

  describe('expiring lots', () => {
    it('counts confirmed lots already expired', async () => {
      const { prisma, stockBatchLine } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      stockBatchLine.count.mockResolvedValue(2);

      await expect(repo.expiredLotCount('b-1', 'br-1', AS_OF)).resolves.toBe(2);
      expect(stockBatchLine.count).toHaveBeenCalledWith({
        where: {
          quantityRemaining: { gt: 0 },
          expiryDate: { lt: AS_OF },
          stockBatch: { businessId: 'b-1', branchId: 'br-1', confirmedAt: { not: null } },
        },
      });
    });

    it('counts confirmed lots expiring in the window', async () => {
      const { prisma, stockBatchLine } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      stockBatchLine.count.mockResolvedValue(1);

      await repo.expiringLotCount('b-1', 'br-1', AS_OF, EXPIRY_BEFORE);

      expect(stockBatchLine.count).toHaveBeenCalledWith({
        where: {
          quantityRemaining: { gt: 0 },
          expiryDate: { gte: AS_OF, lt: EXPIRY_BEFORE },
          stockBatch: { businessId: 'b-1', branchId: 'br-1', confirmedAt: { not: null } },
        },
      });
    });

    it('reads the earliest lot with its product name', async () => {
      const { prisma, stockBatchLine } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      const row = {
        expiryDate: new Date('2026-06-20T00:00:00.000Z'),
        product: { name: 'Yogurt' },
      };
      stockBatchLine.findFirst.mockResolvedValue(row);

      await expect(repo.earliestExpiringLot('b-1', 'br-1', EXPIRY_BEFORE)).resolves.toEqual(row);
      expect(stockBatchLine.findFirst).toHaveBeenCalledWith({
        where: {
          quantityRemaining: { gt: 0 },
          expiryDate: { not: null, lt: EXPIRY_BEFORE },
          stockBatch: { businessId: 'b-1', branchId: 'br-1', confirmedAt: { not: null } },
        },
        select: { expiryDate: true, product: { select: { name: true } } },
        orderBy: { expiryDate: 'asc' },
      });
    });
  });

  describe('unpaidAggregate', () => {
    it('sums every unpaid sale and the overdue subset', async () => {
      const { prisma, sale } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      sale.aggregate
        .mockResolvedValueOnce({ _sum: { balanceDue: money(125.5) }, _count: 3 })
        .mockResolvedValueOnce({ _sum: { balanceDue: money(50.25) }, _count: 1 });

      await expect(repo.unpaidAggregate('b-1', 'br-1', OVERDUE_BEFORE)).resolves.toEqual({
        all: { total: money(125.5), count: 3 },
        overdue: { total: money(50.25), count: 1 },
      });

      expect(sale.aggregate).toHaveBeenNthCalledWith(1, {
        where: {
          businessId: 'b-1',
          branchId: 'br-1',
          voidStatus: { not: 'VOIDED' },
          balanceDue: { gt: 0 },
        },
        _sum: { balanceDue: true },
        _count: true,
      });
      expect(sale.aggregate).toHaveBeenNthCalledWith(2, {
        where: {
          businessId: 'b-1',
          branchId: 'br-1',
          voidStatus: { not: 'VOIDED' },
          balanceDue: { gt: 0 },
          saleDatetime: { lt: OVERDUE_BEFORE },
        },
        _sum: { balanceDue: true },
        _count: true,
      });
    });
  });

  describe('draftBatchAggregate', () => {
    it('counts draft batches and reads the oldest with its line count', async () => {
      const { prisma, stockBatch } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      const createdAt = new Date('2026-06-01T08:00:00.000Z');
      stockBatch.count.mockResolvedValue(2);
      stockBatch.findFirst.mockResolvedValue({
        id: 'batch-1',
        supplierName: 'Farm',
        createdAt,
        _count: { lines: 4 },
      });

      await expect(repo.draftBatchAggregate('b-1', 'br-1')).resolves.toEqual({
        count: 2,
        oldest: { batchId: 'batch-1', supplierName: 'Farm', createdAt, lineCount: 4 },
      });

      expect(stockBatch.findFirst).toHaveBeenCalledWith({
        where: { businessId: 'b-1', branchId: 'br-1', confirmedAt: null },
        select: {
          id: true,
          supplierName: true,
          createdAt: true,
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('returns a null anchor when no draft exists', async () => {
      const { prisma, stockBatch } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      stockBatch.count.mockResolvedValue(0);
      stockBatch.findFirst.mockResolvedValue(null);

      await expect(repo.draftBatchAggregate('b-1', 'br-1')).resolves.toEqual({
        count: 0,
        oldest: null,
      });
    });
  });

  describe('salesAggregate', () => {
    it('sums non-voided sales in the half-open period', async () => {
      const { prisma, sale } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      sale.aggregate.mockResolvedValue({
        _sum: { total: money(1150), taxAmount: money(150) },
        _count: 2,
      });

      await expect(repo.salesAggregate('b-1', 'br-1', FROM, TO)).resolves.toEqual({
        total: money(1150),
        taxAmount: money(150),
        count: 2,
      });
      expect(sale.aggregate).toHaveBeenCalledWith({
        where: {
          businessId: 'b-1',
          branchId: 'br-1',
          voidStatus: { not: 'VOIDED' },
          saleDatetime: { gte: FROM, lt: TO },
        },
        _sum: { total: true, taxAmount: true },
        _count: true,
      });
    });
  });

  describe('cashAggregate', () => {
    it('sums payments received in the period through non-voided sales', async () => {
      const { prisma, payment } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      payment.aggregate.mockResolvedValue({ _sum: { amount: money(900) }, _count: 3 });

      await expect(repo.cashAggregate('b-1', 'br-1', FROM, TO)).resolves.toEqual({
        total: money(900),
        count: 3,
      });
      expect(payment.aggregate).toHaveBeenCalledWith({
        where: {
          paidAt: { gte: FROM, lte: TO },
          sale: { businessId: 'b-1', branchId: 'br-1', voidStatus: { not: 'VOIDED' } },
        },
        _sum: { amount: true },
        _count: true,
      });
    });
  });

  describe('cogsGroups', () => {
    it('groups pulled quantities by lot and frozen cost', async () => {
      const { prisma, saleLineCost } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      saleLineCost.groupBy.mockResolvedValue([
        {
          stockBatchLineId: 'lot-1',
          unitCost: money(6),
          _sum: { quantityPulled: money(10) },
        },
      ]);

      await expect(repo.cogsGroups('b-1', 'br-1', FROM, TO)).resolves.toEqual([
        { stockBatchLineId: 'lot-1', unitCost: money(6), quantityPulled: money(10) },
      ]);
      expect(saleLineCost.groupBy).toHaveBeenCalledWith({
        by: ['stockBatchLineId', 'unitCost'],
        where: {
          saleLine: {
            sale: {
              businessId: 'b-1',
              branchId: 'br-1',
              voidStatus: { not: 'VOIDED' },
              saleDatetime: { gte: FROM, lt: TO },
            },
          },
        },
        _sum: { quantityPulled: true },
      });
    });
  });

  describe('lossGroups', () => {
    it('groups lost quantities by lot and keeps each group row count', async () => {
      const { prisma, loss } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      loss.groupBy.mockResolvedValue([
        { stockBatchLineId: 'lot-1', _sum: { standardQuantity: money(2) }, _count: 3 },
      ]);

      await expect(repo.lossGroups('b-1', 'br-1', FROM, TO)).resolves.toEqual([
        { stockBatchLineId: 'lot-1', standardQuantity: money(2), count: 3 },
      ]);
      expect(loss.groupBy).toHaveBeenCalledWith({
        by: ['stockBatchLineId'],
        where: {
          createdAt: { gte: FROM, lt: TO },
          stockBatchLine: { stockBatch: { businessId: 'b-1', branchId: 'br-1' } },
        },
        _sum: { standardQuantity: true },
        _count: true,
      });
    });
  });

  describe('lotContext', () => {
    it('returns the units the lot cost conversion walks', async () => {
      const { prisma, stockBatchLine } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      const unitRow = {
        id: 'pu-base',
        productId: 'p-1',
        unitRole: 'BASE',
        standardUnitId: 'su-pc',
        name: 'Bottle',
        dependsOn: null,
        conversionRate: null,
        purchaseCapable: true,
        sellCapable: false,
        price: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        standardUnit: { id: 'su-pc', name: 'Piece', symbol: 'pc' },
      };
      const mouRow = {
        ...unitRow,
        id: 'pu-mou',
        unitRole: 'MOU',
        standardUnitId: 'su-ml',
        name: 'Milliliter',
        dependsOn: 'BASE',
        conversionRate: money(350),
        purchaseCapable: false,
        standardUnit: { id: 'su-ml', name: 'Milliliter', symbol: 'ml' },
      };
      stockBatchLine.findMany.mockResolvedValue([
        {
          id: 'lot-1',
          purchaseQuantity: money(10),
          purchaseUnitCost: money(5),
          productUnit: unitRow,
          product: { productUnits: [unitRow, mouRow] },
        },
      ]);

      await expect(repo.lotContext(['lot-1'])).resolves.toEqual([
        {
          id: 'lot-1',
          purchaseQuantity: money(10),
          purchaseUnitCost: money(5),
          units: {
            sourceUnit: unitRow,
            sourceBaseUnit: unitRow,
            mouUnit: mouRow,
          },
        },
      ]);
      expect(stockBatchLine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['lot-1'] } } }),
      );
    });

    it('does not query when there are no lots', async () => {
      const { prisma, stockBatchLine } = createPrismaStub();
      const repo = createDashboardRepository(prisma);

      await expect(repo.lotContext([])).resolves.toEqual([]);
      expect(stockBatchLine.findMany).not.toHaveBeenCalled();
    });
  });

  describe('salesByTimestamp', () => {
    it('groups revenue components by sale timestamp', async () => {
      const { prisma, sale } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      const saleDatetime = new Date('2026-06-01T10:00:00.000Z');
      sale.groupBy.mockResolvedValue([
        { saleDatetime, _sum: { total: money(110), taxAmount: money(10) } },
      ]);

      await expect(repo.salesByTimestamp('b-1', 'br-1', FROM, TO)).resolves.toEqual([
        { saleDatetime, total: money(110), taxAmount: money(10) },
      ]);
      expect(sale.groupBy).toHaveBeenCalledWith({
        by: ['saleDatetime'],
        where: {
          businessId: 'b-1',
          branchId: 'br-1',
          voidStatus: { not: 'VOIDED' },
          saleDatetime: { gte: FROM, lt: TO },
        },
        _sum: { total: true, taxAmount: true },
      });
    });
  });

  describe('trendCostGroups', () => {
    it('groups pulled quantities per sale line and lot', async () => {
      const { prisma, saleLineCost } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      saleLineCost.groupBy.mockResolvedValue([
        {
          saleLineId: 'sl-1',
          stockBatchLineId: 'lot-1',
          unitCost: money(5),
          _sum: { quantityPulled: money(4) },
        },
      ]);

      await expect(repo.trendCostGroups('b-1', 'br-1', FROM, TO)).resolves.toEqual([
        {
          saleLineId: 'sl-1',
          stockBatchLineId: 'lot-1',
          unitCost: money(5),
          quantityPulled: money(4),
        },
      ]);
      expect(saleLineCost.groupBy).toHaveBeenCalledWith({
        by: ['saleLineId', 'stockBatchLineId', 'unitCost'],
        where: {
          saleLine: {
            sale: {
              businessId: 'b-1',
              branchId: 'br-1',
              voidStatus: { not: 'VOIDED' },
              saleDatetime: { gte: FROM, lt: TO },
            },
          },
        },
        _sum: { quantityPulled: true },
      });
    });
  });

  describe('saleLineMap', () => {
    it('reads only each sale line id and its sale timestamp', async () => {
      const { prisma, saleLine } = createPrismaStub();
      const repo = createDashboardRepository(prisma);
      const saleDatetime = new Date('2026-06-01T10:00:00.000Z');
      saleLine.findMany.mockResolvedValue([{ id: 'sl-1', sale: { saleDatetime } }]);

      await expect(repo.saleLineMap(['sl-1'])).resolves.toEqual([{ id: 'sl-1', saleDatetime }]);
      expect(saleLine.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['sl-1'] } },
        select: { id: true, sale: { select: { saleDatetime: true } } },
      });
    });

    it('does not query when there are no sale lines', async () => {
      const { prisma, saleLine } = createPrismaStub();
      const repo = createDashboardRepository(prisma);

      await expect(repo.saleLineMap([])).resolves.toEqual([]);
      expect(saleLine.findMany).not.toHaveBeenCalled();
    });
  });
});

import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import { conversionUnitsOf } from '../../shared/utils/snapshot.js';
import type {
  CostGroup,
  CostingLot,
  DashboardRepository,
  LossGroup,
  SaleLineTime,
  SalesTimeGroup,
  TrendCostGroup,
} from './dashboard.types.js';

/** Non-voided is the row predicate every reporting figure shares. */
const NOT_VOIDED: Prisma.EnumVoidStatusFilter = { not: 'VOIDED' };

export function createDashboardRepository(prisma: PrismaClient): DashboardRepository {
  return {
    /**
     * Active products in the branch with their stock and own threshold. The
     * service finishes the low/out classification because Prisma cannot compare
     * a column to a computed status.
     */
    async stockPositions(businessId, branchId) {
      return prisma.product.findMany({
        where: { businessId, branchId, active: true },
        select: {
          name: true,
          currentSealedStock: true,
          lowStockThreshold: true,
        },
        orderBy: { name: 'asc' },
      });
    },

    async expiredLotCount(businessId, branchId, asOf) {
      return prisma.stockBatchLine.count({
        where: {
          quantityRemaining: { gt: 0 },
          expiryDate: { lt: asOf },
          stockBatch: { businessId, branchId, confirmedAt: { not: null } },
        },
      });
    },

    async expiringLotCount(businessId, branchId, asOf, before) {
      return prisma.stockBatchLine.count({
        where: {
          quantityRemaining: { gt: 0 },
          expiryDate: { gte: asOf, lt: before },
          stockBatch: { businessId, branchId, confirmedAt: { not: null } },
        },
      });
    },

    /**
     * The earliest lot across both the expired and expiring groups, carrying
     * its product name so the service never issues a second lookup.
     */
    async earliestExpiringLot(businessId, branchId, before) {
      return prisma.stockBatchLine.findFirst({
        where: {
          quantityRemaining: { gt: 0 },
          expiryDate: { not: null, lt: before },
          stockBatch: { businessId, branchId, confirmedAt: { not: null } },
        },
        select: {
          expiryDate: true,
          product: { select: { name: true } },
        },
        orderBy: { expiryDate: 'asc' },
      });
    },

    /**
     * Every non-voided sale still owing money, and the overdue slice of it.
     * Both aggregates start together; the service owns the seven-day cutoff.
     */
    async unpaidAggregate(businessId, branchId, overdueBefore) {
      const outstanding: Prisma.SaleWhereInput = {
        businessId,
        branchId,
        voidStatus: NOT_VOIDED,
        balanceDue: { gt: 0 },
      };

      const [all, overdue] = await Promise.all([
        prisma.sale.aggregate({
          where: outstanding,
          _sum: { balanceDue: true },
          _count: true,
        }),
        prisma.sale.aggregate({
          where: { ...outstanding, saleDatetime: { lt: overdueBefore } },
          _sum: { balanceDue: true },
          _count: true,
        }),
      ]);

      return {
        all: { total: all._sum.balanceDue, count: all._count },
        overdue: { total: overdue._sum.balanceDue, count: overdue._count },
      };
    },

    async draftBatchAggregate(businessId, branchId) {
      const where: Prisma.StockBatchWhereInput = {
        businessId,
        branchId,
        confirmedAt: null,
      };

      const [count, oldest] = await Promise.all([
        prisma.stockBatch.count({ where }),
        prisma.stockBatch.findFirst({
          where,
          select: {
            id: true,
            supplierName: true,
            createdAt: true,
            _count: { select: { lines: true } },
          },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      return {
        count,
        oldest: oldest
          ? {
              batchId: oldest.id,
              supplierName: oldest.supplierName,
              createdAt: oldest.createdAt,
              lineCount: oldest._count.lines,
            }
          : null,
      };
    },

    async salesAggregate(businessId, branchId, from, to) {
      const row = await prisma.sale.aggregate({
        where: {
          businessId,
          branchId,
          voidStatus: NOT_VOIDED,
          saleDatetime: { gte: from, lt: to },
        },
        _sum: { total: true, taxAmount: true },
        _count: true,
      });

      return { total: row._sum.total, taxAmount: row._sum.taxAmount, count: row._count };
    },

    async cashAggregate(businessId, branchId, from, to) {
      const row = await prisma.payment.aggregate({
        where: {
          paidAt: { gte: from, lt: to },
          sale: { businessId, branchId, voidStatus: NOT_VOIDED },
        },
        _sum: { amount: true },
        _count: true,
      });

      return { total: row._sum.amount, count: row._count };
    },

    /** One row per lot/cost pair, not one per cost row. */
    async cogsGroups(businessId, branchId, from, to) {
      const rows = await prisma.saleLineCost.groupBy({
        by: ['stockBatchLineId', 'unitCost'],
        where: {
          saleLine: {
            sale: {
              businessId,
              branchId,
              voidStatus: NOT_VOIDED,
              saleDatetime: { gte: from, lt: to },
            },
          },
        },
        _sum: { quantityPulled: true },
      });

      return rows.map<CostGroup>((row) => ({
        stockBatchLineId: row.stockBatchLineId,
        unitCost: row.unitCost,
        quantityPulled: row._sum.quantityPulled,
      }));
    },

    /** Loss rows grouped by lot; the count is summed across groups by the service. */
    async lossGroups(businessId, branchId, from, to) {
      const rows = await prisma.loss.groupBy({
        by: ['stockBatchLineId'],
        where: {
          createdAt: { gte: from, lt: to },
          stockBatchLine: { stockBatch: { businessId, branchId } },
        },
        _sum: { standardQuantity: true },
        _count: true,
      });

      return rows.map<LossGroup>((row) => ({
        stockBatchLineId: row.stockBatchLineId,
        standardQuantity: row._sum.standardQuantity,
        count: row._count,
      }));
    },

    /** The referenced lots with the units their cost conversion walks. */
    async lotContext(stockBatchLineIds) {
      if (stockBatchLineIds.length === 0) return [];

      const rows = await prisma.stockBatchLine.findMany({
        where: { id: { in: stockBatchLineIds } },
        select: {
          id: true,
          purchaseQuantity: true,
          purchaseUnitCost: true,
          productUnit: {
            include: { standardUnit: { select: { id: true, name: true, symbol: true } } },
          },
          product: {
            select: {
              productUnits: {
                where: { unitRole: { in: ['BASE', 'MOU'] } },
                include: { standardUnit: { select: { id: true, name: true, symbol: true } } },
              },
            },
          },
        },
      });

      return rows.map<CostingLot>(({ product, productUnit, ...lot }) => {
        const units = conversionUnitsOf(product.productUnits, productUnit?.id ?? null);

        return {
          ...lot,
          units: { ...units, sourceUnit: productUnit },
        };
      });
    },

    async salesByTimestamp(businessId, branchId, from, to) {
      const rows = await prisma.sale.groupBy({
        by: ['saleDatetime'],
        where: {
          businessId,
          branchId,
          voidStatus: NOT_VOIDED,
          saleDatetime: { gte: from, lt: to },
        },
        _sum: { total: true, taxAmount: true },
      });

      return rows.map<SalesTimeGroup>((row) => ({
        saleDatetime: row.saleDatetime,
        total: row._sum.total,
        taxAmount: row._sum.taxAmount,
      }));
    },

    /** Costs grouped per sale line and lot so each group maps to one timestamp. */
    async trendCostGroups(businessId, branchId, from, to) {
      const rows = await prisma.saleLineCost.groupBy({
        by: ['saleLineId', 'stockBatchLineId', 'unitCost'],
        where: {
          saleLine: {
            sale: {
              businessId,
              branchId,
              voidStatus: NOT_VOIDED,
              saleDatetime: { gte: from, lt: to },
            },
          },
        },
        _sum: { quantityPulled: true },
      });

      return rows.map<TrendCostGroup>((row) => ({
        saleLineId: row.saleLineId,
        stockBatchLineId: row.stockBatchLineId,
        unitCost: row.unitCost,
        quantityPulled: row._sum.quantityPulled,
      }));
    },

    async saleLineMap(saleLineIds) {
      if (saleLineIds.length === 0) return [];

      const rows = await prisma.saleLine.findMany({
        where: { id: { in: saleLineIds } },
        select: { id: true, sale: { select: { saleDatetime: true } } },
      });

      return rows.map<SaleLineTime>((row) => ({
        id: row.id,
        saleDatetime: row.sale.saleDatetime,
      }));
    },
  };
}

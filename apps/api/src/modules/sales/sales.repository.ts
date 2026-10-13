import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import type {
  CreateSaleCommand,
  ResolvedSaleLine,
  SaleLineAllocation,
  SaleRecordWithDetail,
  SaleRepository,
} from './sales.types.js';

const memberSummarySelect = { id: true, name: true, role: true } as const;

/** How many times a create is reattempted when a concurrent write took the invoice number. */
const MAX_INVOICE_ATTEMPTS = 3;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}

export function createSaleRepository(prisma: PrismaClient): SaleRepository {
  return {
    async getBusinessSaleConfig(businessId) {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { defaultTaxRate: true, allowNegativeStock: true },
      });

      return business ?? null;
    },

    async getProductSellContext(businessId, productIds) {
      return prisma.product.findMany({
        where: { id: { in: productIds }, businessId },
        select: {
          id: true,
          businessId: true,
          name: true,
          currentSealedStock: true,
          productUnits: {
            select: {
              id: true,
              productId: true,
              unitRole: true,
              standardUnitId: true,
              name: true,
              dependsOn: true,
              conversionRate: true,
              purchaseCapable: true,
              sellCapable: true,
              price: true,
              createdAt: true,
              updatedAt: true,
              standardUnit: { select: { id: true, name: true, symbol: true } },
            },
          },
        },
      });
    },

    /**
     * The lots still holding stock for the named products, oldest purchase first,
     * so a sale draws the earliest one down before the next.
     */
    async getStockLots(businessId, productIds) {
      return prisma.stockBatchLine.findMany({
        where: {
          productId: { in: productIds },
          quantityRemaining: { gt: 0 },
          stockBatch: { businessId },
        },
        select: {
          id: true,
          productId: true,
          purchaseUnitCost: true,
          quantityRemaining: true,
        },
        orderBy: [{ stockBatch: { batchDate: 'asc' } }, { createdAt: 'asc' }],
      });
    },

    async createSale(command) {
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await prisma.$transaction((tx) => writeSale(tx, command));
        } catch (error) {
          // The invoice number is a per-branch running count, so two concurrent
          // creates can pick the same one; the branched unique index catches it
          // and the loop recomputes. Anything else rethrows immediately.
          if (attempt >= MAX_INVOICE_ATTEMPTS - 1 || !isUniqueViolation(error)) {
            throw error;
          }
        }
      }
    },

    async listSales(businessId, branchId) {
      return prisma.sale.findMany({
        where: { businessId, branchId },
        include: {
          lines: true,
          processedByMember: true,
          serverMember: true,
          customer: true,
        },
        orderBy: { saleDatetime: 'desc' },
      });
    },
  };
}

/** Records a sale, its lines and the stock each line draws, in one transaction. */
async function writeSale(
  tx: Prisma.TransactionClient,
  command: CreateSaleCommand,
): Promise<SaleRecordWithDetail> {
  const existing = await tx.sale.count({ where: { branchId: command.branchId } });
  const invoiceNumber = String(existing + 1);

  const sale = await tx.sale.create({
    data: {
      businessId: command.businessId,
      branchId: command.branchId,
      invoiceNumber,
      processedByMemberId: command.memberId,
      saleDatetime: command.saleDatetime,
      discount: command.discount,
      taxRateApplied: command.taxRateApplied,
      subtotal: command.subtotal,
      taxAmount: command.taxAmount,
      total: command.total,
      // A sale with no payment recorded against it is pending, and the full
      // total is what it is owed.
      paymentStatus: 'PENDING',
      amountPaid: 0,
      balanceDue: command.total,
    },
    include: {
      processedByMember: { select: memberSummarySelect },
      serverMember: { select: memberSummarySelect },
      customer: true,
    },
  });

  // Each line and the lots it drew from are written together: the FK on every
  // frozen cost row points at the just-created line, so nothing needs matching.
  const lines = await Promise.all(
    command.lines.map(({ allocations, quantityInBaseUnit, ...line }) => {
      void quantityInBaseUnit; // Stock is drawn per product, not stored on the line.
      return tx.saleLine.create({
        data: toLineCreateData(sale.id, line, allocations),
        include: { product: { select: { brand: true } } },
      });
    }),
  );

  await Promise.all([decrementLotStock(tx, command), decrementProductStock(tx, command)]);

  return { ...sale, lines, payments: [] };
}

/**
 * The create payload for one sale line, with its FIFO draws nested as cost
 * rows. Oversold quantity has no lot behind it, so nothing is nested for it.
 */
function toLineCreateData(
  saleId: string,
  line: Omit<ResolvedSaleLine, 'allocations' | 'quantityInBaseUnit'>,
  allocations: SaleLineAllocation[],
): Prisma.SaleLineUncheckedCreateInput {
  const data: Prisma.SaleLineUncheckedCreateInput = { saleId, ...line };

  if (allocations.length > 0) {
    data.costs = {
      createMany: {
        data: allocations.map(({ stockBatchLineId, quantityPulled, unitCost }) => ({
          stockBatchLineId,
          quantityPulled,
          unitCost,
        })),
      },
    };
  }

  return data;
}

/** Takes each drawn lot's remaining quantity down by the summed draws. */
async function decrementLotStock(
  tx: Prisma.TransactionClient,
  command: CreateSaleCommand,
): Promise<void> {
  await Promise.all(
    command.lotDecrements.map((decrement) =>
      tx.stockBatchLine.update({
        where: { id: decrement.stockBatchLineId },
        data: { quantityRemaining: { decrement: decrement.quantity } },
      }),
    ),
  );
}

/** Takes each product's sealed stock down by what the sale drew from it. */
async function decrementProductStock(
  tx: Prisma.TransactionClient,
  command: CreateSaleCommand,
): Promise<void> {
  await Promise.all(
    command.stockDecrements.map((decrement) =>
      tx.product.update({
        where: { id: decrement.productId },
        data: { currentSealedStock: { decrement: decrement.amount } },
      }),
    ),
  );
}

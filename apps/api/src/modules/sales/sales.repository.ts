import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import type { CreateSaleCommand, SaleRecordWithDetail, SaleRepository } from './sales.types.js';

const memberSummarySelect = { id: true, name: true, role: true } as const;

const saleDetailInclude = {
  lines: {
    include: { product: { select: { brand: true } } },
    orderBy: { createdAt: 'asc' },
  },
  payments: { orderBy: { paidAt: 'asc' } },
  processedByMember: { select: memberSummarySelect },
  serverMember: { select: memberSummarySelect },
  customer: { select: { id: true, name: true } },
} as const;

/** How many times a create is reattempted when a concurrent write took the invoice number. */
const MAX_INVOICE_ATTEMPTS = 3;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}

export function createSaleRepository(prisma: PrismaClient): SaleRepository {
  return {
    async getBusinessTaxConfig(businessId) {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { defaultTaxRate: true },
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
        include: saleDetailInclude,
        orderBy: { saleDatetime: 'desc' },
      });
    },
  };
}

/** Records a sale and its lines in one transaction. */
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
      customer: { select: { id: true, name: true } },
    },
  });

  const lines = await tx.saleLine.createManyAndReturn({
    data: command.lines.map((line) => ({ saleId: sale.id, ...line })),
    include: { product: { select: { brand: true } } },
  });

  return { ...sale, lines, payments: [] };
}

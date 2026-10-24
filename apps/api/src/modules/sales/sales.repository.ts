import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import { paymentSummary } from './utils/payment.js';
import type {
  CreateSaleCommand,
  RecordPaymentCommand,
  ResolvedPayment,
  ResolvedSaleLine,
  SaleLineAllocation,
  SaleRecordWithDetail,
  SaleRepository,
} from './sales.types.js';

const memberSummarySelect = { id: true, name: true, role: true } as const;

/**
 * The relations every detail read carries back, so a create, a payment write
 * and a re-read all answer the same shape.
 */
const saleDetailInclude = {
  lines: { include: { product: { select: { brand: true } } } },
  payments: true,
  processedByMember: { select: memberSummarySelect },
  serverMember: { select: memberSummarySelect },
  customer: true,
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

    /**
     * The named customer, but only if it belongs to the business, so a sale can
     * never be attributed across businesses. Inactive customers are not attached.
     */
    async getCustomer(businessId, customerId) {
      return prisma.customer.findFirst({
        where: { id: customerId, businessId, active: true },
        select: { id: true },
      });
    },

    /**
     * The named server, but only if it is an active member of the business with
     * the server role, so a sale can never be attributed across businesses or to
     * a member who does not take orders.
     */
    async getServer(businessId, serverMemberId) {
      return prisma.businessMember.findFirst({
        where: { id: serverMemberId, businessId, active: true, role: 'SERVER' },
        select: { id: true },
      });
    },

    async getSaleForPayment(businessId, saleId) {
      return prisma.sale.findFirst({
        where: { id: saleId, businessId },
        select: {
          id: true,
          total: true,
          paymentStatus: true,
          voidStatus: true,
          amountPaid: true,
          balanceDue: true,
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

    async getSale(businessId, saleId) {
      return prisma.sale.findFirst({
        where: { id: saleId, businessId },
        include: saleDetailInclude,
      });
    },

    async recordPayment(command) {
      return prisma.$transaction((tx) => writePayment(tx, command));
    },

    async listSales(businessId, branchId, query) {
      return prisma.sale.findMany({
        where: {
          businessId,
          branchId,
          voidStatus: { not: 'VOIDED' },
          ...(query.status?.length ? { paymentStatus: { in: query.status } } : {}),
          ...(query.unpaid && {
            balanceDue: { gt: 0 },
            paymentStatus: { not: 'PAID' },
          }),
          ...((query.from || query.to) && {
            saleDatetime: {
              ...(query.from && { gte: query.from }),
              ...(query.to && { lte: query.to }),
            },
          }),
          ...((query.paymentFrom || query.paymentTo) && {
            payments: {
              some: {
                paidAt: {
                  ...(query.paymentFrom && { gte: query.paymentFrom }),
                  ...(query.paymentTo && { lte: query.paymentTo }),
                },
              },
            },
          }),
          ...(query.productId && { lines: { some: { productId: query.productId } } }),
        },
        include: {
          lines: true,
          processedByMember: true,
          serverMember: true,
          customer: true,
        },
        // Status first so the sales still needing attention lead, newest-first
        // within each status.
        orderBy: [{ paymentStatus: 'asc' }, { saleDatetime: 'desc' }],
      });
    },
  };
}

/** The fields a payment row is built from, whether it opens a sale or tops one up. */
type PaymentWrite = {
  saleId: string;
  memberId: string;
  payment: ResolvedPayment;
};

/** Writes one payment row against a sale; the create and the payment flows share it. */
function createPayment(tx: Prisma.TransactionClient, { saleId, memberId, payment }: PaymentWrite) {
  return tx.payment.create({
    data: {
      saleId,
      businessMemberId: memberId,
      amount: payment.amount,
      method: payment.method,
      methodDetail: payment.methodDetail,
    },
  });
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
      serverMemberId: command.serverMemberId,
      customerId: command.customerId,
      saleDatetime: command.saleDatetime,
      discount: command.discount,
      taxRateApplied: command.taxRateApplied,
      subtotal: command.subtotal,
      taxAmount: command.taxAmount,
      total: command.total,
      paymentStatus: command.paymentStatus,
      amountPaid: command.amountPaid,
      balanceDue: command.balanceDue,
    },
    include: {
      processedByMember: { select: memberSummarySelect },
      serverMember: { select: memberSummarySelect },
      customer: true,
    },
  });

  // The opening payment and the lines are independent of each other — both only
  // need the sale's id — so they are written together.
  const [payment, lines] = await Promise.all([
    command.initialPayment
      ? createPayment(tx, {
          saleId: sale.id,
          memberId: command.memberId,
          payment: command.initialPayment,
        })
      : Promise.resolve(null),

    // Each line and the lots it drew from are written together: the FK on every
    // frozen cost row points at the just-created line, so nothing needs matching.
    Promise.all(
      command.lines.map(({ allocations, quantityInBaseUnit, ...line }) => {
        void quantityInBaseUnit; // Stock is drawn per product, not stored on the line.
        return tx.saleLine.create({
          data: toLineCreateData(sale.id, line, allocations),
          include: { product: { select: { brand: true } } },
        });
      }),
    ),
  ]);

  await Promise.all([decrementLotStock(tx, command), decrementProductStock(tx, command)]);

  return { ...sale, lines, payments: payment ? [payment] : [] };
}

/**
 * Appends a payment to an existing sale and restamps its payment summary in one
 * transaction. The running totals are summed from the sale's payment rows
 * rather than taken from the caller, so a stale figure never wins.
 */
async function writePayment(
  tx: Prisma.TransactionClient,
  command: RecordPaymentCommand,
): Promise<SaleRecordWithDetail> {
  if (command.payment) {
    await createPayment(tx, {
      saleId: command.saleId,
      memberId: command.memberId,
      payment: command.payment,
    });
  }

  const summed = await tx.payment.aggregate({
    where: { saleId: command.saleId },
    _sum: { amount: true },
  });

  const { amountPaid, balanceDue } = paymentSummary(
    command.total,
    summed._sum.amount?.toNumber() ?? 0,
  );

  return tx.sale.update({
    where: { id: command.saleId },
    data: { paymentStatus: command.paymentStatus, amountPaid, balanceDue },
    include: saleDetailInclude,
  });
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

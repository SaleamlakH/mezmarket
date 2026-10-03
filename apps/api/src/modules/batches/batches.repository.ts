import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { BatchRepository } from './batches.types.js';

/** The standard unit a line's snapshot names, by label and by id. */
const standardUnitSelect = {
  id: true,
  name: true,
  symbol: true,
};

/** Everything the unit math walks, and nothing a purchase never needs. */
const productUnitSelect = {
  id: true,
  productId: true,
  unitRole: true,
  standardUnitId: true,
  name: true,
  dependsOn: true,
  conversionRate: true,
  purchaseCapable: true,
  createdAt: true,
  updatedAt: true,
  sellCapable: true,
  standardUnit: { select: standardUnitSelect },
};

export function createBatchRepository(prisma: PrismaClient): BatchRepository {
  return {
    async getProductUnitContext(businessId, productIds) {
      return prisma.product.findMany({
        where: { id: { in: productIds }, businessId },
        select: {
          id: true,
          businessId: true,
          productUnits: { select: productUnitSelect },
        },
      });
    },

    /**
     * Writing a batch and moving the stock it adds is one act: a batch whose
     * lines are written but whose products were never incremented — or the
     * other way round — would be a stock figure nobody can explain.
     */
    async createBatchAndAdjustStock(command) {
      return prisma.$transaction(async (tx) => {
        const batch = await tx.stockBatch.create({
          data: {
            businessId: command.businessId,
            branchId: command.branchId,
            batchDate: command.header.batchDate,
            // Recording a batch is confirming it: a recorded purchase is not
            // later revised, only superseded by an adjustment.
            confirmedAt: new Date(),
            receivedByMemberId: command.memberId,
            ...(command.header.supplierName !== undefined && {
              supplierName: command.header.supplierName,
            }),
            ...(command.header.referenceNumber !== undefined && {
              referenceNumber: command.header.referenceNumber,
            }),
          },
          include: { receivedByMember: true },
        });

        // The lines and the stock movement touch different tables and neither
        // reads the other, so they are written together rather than in turn.
        const [lines] = await Promise.all([createLines(), incrementStock()]);

        return { ...batch, lines };

        function createLines() {
          return tx.stockBatchLine.createManyAndReturn({
            data: command.lines.map((line) => {
              const { stockIncrement, ...lineData } = line;
              void stockIncrement; // Worked out by the service, not a column on the line.
              return { stockBatchId: batch.id, ...lineData };
            }),

            include: { product: { select: { name: true, brand: true } } },
          });
        }

        function incrementStock() {
          return Promise.all(
            command.stockIncrements.map((increment) =>
              tx.product.update({
                where: { id: increment.productId },
                data: { currentSealedStock: { increment: increment.amount } },
              }),
            ),
          );
        }
      });
    },

    async listBatches(businessId, branchId) {
      const batches = await prisma.stockBatch.findMany({
        where: { businessId, branchId },
        include: {
          lines: {
            include: {
              product: {
                select: { name: true, brand: true },
              },
            },
          },
          receivedByMember: true,
        },
        orderBy: { batchDate: 'desc' },
      });

      return batches;
    },
  };
}

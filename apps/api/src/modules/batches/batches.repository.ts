import { AttachmentRecordType } from '../../../generated/prisma/client.js';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { BatchRepository } from './batches.types.js';

const standardUnitSelect = {
  id: true,
  name: true,
  symbol: true,
};

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

    /** Writing the batch and moving the stock it adds is one transaction. */
    async createBatchAndAdjustStock(command) {
      return prisma.$transaction(async (tx) => {
        const batch = await tx.stockBatch.create({
          data: {
            businessId: command.businessId,
            branchId: command.branchId,
            batchDate: command.header.batchDate,
            // A recorded purchase is confirmed; it is superseded, never revised.
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

        const [lines] = await Promise.all([createLines(), incrementStock()]);

        return { ...batch, lines };

        function createLines() {
          return tx.stockBatchLine.createManyAndReturn({
            data: command.lines.map((line) => {
              const { stockIncrement, ...lineData } = line;
              void stockIncrement; // Service-only, not a column on the line.
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
      return await prisma.stockBatch.findMany({
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
    },

    /** One recorded batch of the scope, in the same shape the list reads it. */
    async getBatchDetail(businessId, branchId, batchId) {
      return await prisma.stockBatch.findFirst({
        where: { id: batchId, businessId, branchId },
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
      });
    },

    /** Active products, with their Base Unit and the lines still holding stock. */
    async listProductsWithStockLines(businessId, branchId) {
      return prisma.product.findMany({
        where: { businessId, branchId, active: true },
        include: {
          productUnits: { where: { unitRole: 'BASE' }, take: 1 },
          stockBatchLines: { where: { quantityRemaining: { gt: 0 } } },
        },
        orderBy: { name: 'asc' },
      });
    },

    /**
     * One product of the scope with its Base Unit and every line of it, each
     * line carrying the batch that recorded it. Inactive products are read too,
     * so a product's complete purchase history stays available.
     */
    async getProductWithBatchHistory(businessId, branchId, productId) {
      return await prisma.product.findFirst({
        where: { id: productId, businessId, branchId },
        include: {
          productUnits: { where: { unitRole: 'BASE' }, take: 1 },
          stockBatchLines: { include: { stockBatch: true } },
        },
      });
    },

    /** The live product attachments, for the service to join uploadIds onto. */
    listProductAttachments(productIds) {
      return prisma.attachment.findMany({
        where: {
          recordType: AttachmentRecordType.PRODUCT,
          recordId: { in: productIds },
          deletedAt: null,
        },
      });
    },
  };
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBatchRepository } from '../batches.repository.js';
import type { CreateBatchCommand } from '../batches.types.js';
import { AttachmentRecordType } from '../../../../generated/prisma/client.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

type MockTx = {
  stockBatch: { create: ReturnType<typeof vi.fn> };
  stockBatchLine: { createManyAndReturn: ReturnType<typeof vi.fn> };
  product: { update: ReturnType<typeof vi.fn> };
};

const BATCH_INCLUDE = {
  lines: { include: { product: { select: { name: true, brand: true } } } },
  receivedByMember: true,
};

function createPrismaStub() {
  const tx: MockTx = {
    stockBatch: { create: vi.fn() },
    stockBatchLine: { createManyAndReturn: vi.fn() },
    product: { update: vi.fn() },
  };
  const product = { findMany: vi.fn() };
  const stockBatch = { findMany: vi.fn() };
  const attachment = { findMany: vi.fn().mockResolvedValue([]) };
  const $transaction = vi.fn((cb: (tx: MockTx) => unknown) => cb(tx));

  const prisma = {
    product,
    stockBatch,
    attachment,
    $transaction,
  } as unknown as PrismaClient;

  return { prisma, tx, product, stockBatch, attachment, $transaction };
}

function command(overrides: Partial<CreateBatchCommand> = {}): CreateBatchCommand {
  return {
    businessId: 'b-1',
    branchId: 'br-1',
    memberId: 'm-1',
    header: { batchDate: new Date('2026-02-01T09:00:00.000Z') },
    lines: [
      {
        productId: 'p-tequila',
        productUnitId: 'pu-bottle',
        purchaseUnit: 'Bottle',
        purchaseQuantity: 10,
        purchaseUnitCost: 950,
        standardUnit: 'pc',
        standardQuantity: 10,
        resolvedStandardUnitId: 'su-pc',
        expiryDate: null,
        stockIncrement: 10,
      },
    ],
    stockIncrements: [{ productId: 'p-tequila', amount: 10 }],
    ...overrides,
  };
}

/** What `stockBatch.create` hands back: the batch with its receiver included. */
function createdBatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sb-1',
    businessId: 'b-1',
    branchId: 'br-1',
    supplierName: null,
    referenceNumber: null,
    batchDate: new Date('2026-02-01T09:00:00.000Z'),
    confirmedAt: new Date('2026-02-01T10:00:00.000Z'),
    receivedByMemberId: 'm-1',
    createdAt: new Date('2026-02-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T10:00:00.000Z'),
    receivedByMember: { id: 'm-1', name: 'me', role: 'OWNER' },
    ...overrides,
  };
}

/** What `createManyAndReturn` hands back: the written lines, with products. */
const CREATED_LINE = {
  id: 'sbl-1',
  stockBatchId: 'sb-1',
  productId: 'p-tequila',
  purchaseUnit: 'Bottle',
  purchaseQuantity: 10,
  purchaseUnitCost: 950,
  standardUnit: 'pc',
  standardQuantity: 10,
  productUnitId: 'pu-bottle',
  resolvedStandardUnitId: 'su-pc',
  quantityRemaining: 0,
  expiryDate: null,
  createdAt: new Date('2026-02-01T10:00:00.000Z'),
  updatedAt: new Date('2026-02-01T10:00:00.000Z'),
  product: { name: 'Sierra Tequila 350 ml', brand: 'Sierra' },
};

/** What `findMany` hands back on a list read: no separate lines call. */
function listedBatch(overrides: Record<string, unknown> = {}) {
  return {
    ...createdBatch(),
    lines: [{ ...CREATED_LINE }],
    receivedByMember: { id: 'm-1', name: 'me', role: 'OWNER' },
    ...overrides,
  };
}

/** Lets every already-queued microtask and promise callback run. */
function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function registerSuccess(tx: MockTx) {
  tx.stockBatch.create.mockResolvedValue(createdBatch());
  tx.stockBatchLine.createManyAndReturn.mockResolvedValue([CREATED_LINE]);
}

describe('batches.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProductUnitContext', () => {
    it('reads the named products of the business with the fields the unit math walks', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createBatchRepository(prisma);

      await repo.getProductUnitContext('b-1', ['p-tequila', 'p-tshirt']);

      expect(product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['p-tequila', 'p-tshirt'] }, businessId: 'b-1' },
          select: expect.objectContaining({
            id: true,
            businessId: true,
            productUnits: {
              select: expect.objectContaining({
                unitRole: true,
                standardUnitId: true,
                dependsOn: true,
                conversionRate: true,
                purchaseCapable: true,
                standardUnit: { select: { id: true, name: true, symbol: true } },
              }),
            },
          }),
        }),
      );
    });
  });

  describe('createBatchAndAdjustStock', () => {
    it('writes the batch, its lines and the stock movement in one transaction', async () => {
      const { prisma, tx, $transaction } = createPrismaStub();
      const repo = createBatchRepository(prisma);
      registerSuccess(tx);

      await repo.createBatchAndAdjustStock(command());

      expect($transaction).toHaveBeenCalledTimes(1);
      expect(tx.stockBatch.create).toHaveBeenCalledTimes(1);
      expect(tx.stockBatchLine.createManyAndReturn).toHaveBeenCalledTimes(1);
      expect(tx.product.update).toHaveBeenCalledTimes(1);
    });

    it('creates the batch confirmed, against the acting member, with its receiver', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createBatchRepository(prisma);
      registerSuccess(tx);

      await repo.createBatchAndAdjustStock(command());

      expect(tx.stockBatch.create).toHaveBeenCalledWith({
        data: {
          businessId: 'b-1',
          branchId: 'br-1',
          batchDate: new Date('2026-02-01T09:00:00.000Z'),
          confirmedAt: expect.any(Date),
          receivedByMemberId: 'm-1',
        },
        include: { receivedByMember: true },
      });
    });

    it('carries a supplier and reference through when the header names them', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createBatchRepository(prisma);
      registerSuccess(tx);

      await repo.createBatchAndAdjustStock(
        command({
          header: {
            batchDate: new Date('2026-02-01T09:00:00.000Z'),
            supplierName: 'Awash Mart',
            referenceNumber: 'INV-42',
          },
        }),
      );

      expect(tx.stockBatch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          supplierName: 'Awash Mart',
          referenceNumber: 'INV-42',
        }),
        include: { receivedByMember: true },
      });
    });

    it('writes each resolved line against the created batch, seeding its remaining stock', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createBatchRepository(prisma);
      registerSuccess(tx);

      await repo.createBatchAndAdjustStock(command());

      expect(tx.stockBatchLine.createManyAndReturn).toHaveBeenCalledWith({
        data: [
          {
            stockBatchId: 'sb-1',
            productId: 'p-tequila',
            productUnitId: 'pu-bottle',
            purchaseUnit: 'Bottle',
            purchaseQuantity: 10,
            purchaseUnitCost: 950,
            standardUnit: 'pc',
            standardQuantity: 10,
            resolvedStandardUnitId: 'su-pc',
            expiryDate: null,
            quantityRemaining: 10,
          },
        ],
        include: { product: { select: { name: true, brand: true } } },
      });
    });

    it("seeds each line's remaining stock in the base unit, whatever unit it was bought in", async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createBatchRepository(prisma);
      registerSuccess(tx);

      await repo.createBatchAndAdjustStock(
        command({
          lines: [
            {
              productId: 'p-tequila',
              productUnitId: 'pu-case',
              purchaseUnit: 'Case (12 bottles)',
              purchaseQuantity: 1,
              purchaseUnitCost: 11400,
              standardUnit: 'pc',
              standardQuantity: 12,
              resolvedStandardUnitId: 'su-pc',
              expiryDate: null,
              stockIncrement: 12,
            },
          ],
          stockIncrements: [{ productId: 'p-tequila', amount: 12 }],
        }),
      );

      expect(tx.stockBatchLine.createManyAndReturn).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            purchaseQuantity: 1,
            standardQuantity: 12,
            quantityRemaining: 12,
          }),
        ],
        include: { product: { select: { name: true, brand: true } } },
      });
    });

    it('takes the written lines from the insert rather than reading them back', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createBatchRepository(prisma);
      registerSuccess(tx);

      const result = await repo.createBatchAndAdjustStock(command());

      expect(result.lines).toEqual([CREATED_LINE]);
    });

    it('increments each product sealed stock by its own amount', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createBatchRepository(prisma);
      registerSuccess(tx);

      await repo.createBatchAndAdjustStock(
        command({
          stockIncrements: [
            { productId: 'p-tequila', amount: 10 },
            { productId: 'p-tshirt', amount: 17 },
          ],
        }),
      );

      expect(tx.product.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'p-tequila' },
        data: { currentSealedStock: { increment: 10 } },
      });
      expect(tx.product.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'p-tshirt' },
        data: { currentSealedStock: { increment: 17 } },
      });
    });

    it('does not close the transaction while a stock increment is still in flight', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createBatchRepository(prisma);
      registerSuccess(tx);

      let release: () => void = () => {};
      tx.product.update.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          release = resolve;
        }) as never,
      );
      tx.product.update.mockResolvedValueOnce({} as never);

      let settled = false;
      const pending = repo
        .createBatchAndAdjustStock(
          command({
            stockIncrements: [
              { productId: 'p-tequila', amount: 10 },
              { productId: 'p-tshirt', amount: 17 },
            ],
          }),
        )
        .then((batch) => {
          settled = true;
          return batch;
        });

      // The lines are already written, so only an awaited increment can still
      // be holding the transaction open.
      await tick();

      expect(settled).toBe(false);

      release();
      await pending;

      expect(settled).toBe(true);
    });

    it('returns the receiver under its relation name', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createBatchRepository(prisma);
      registerSuccess(tx);

      const result = await repo.createBatchAndAdjustStock(command());

      expect(result.receivedByMember).toEqual({ id: 'm-1', name: 'me', role: 'OWNER' });
    });

    it('lets a failed write reject out of the transaction, leaving the lines unwritten', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createBatchRepository(prisma);
      tx.stockBatch.create.mockRejectedValue(new Error('db down'));

      await expect(repo.createBatchAndAdjustStock(command())).rejects.toThrow('db down');

      expect(tx.stockBatchLine.createManyAndReturn).not.toHaveBeenCalled();
      expect(tx.product.update).not.toHaveBeenCalled();
    });
  });

  describe('listBatches', () => {
    it('reads the branch batches newest first with the full report include', async () => {
      const { prisma, stockBatch } = createPrismaStub();
      const repo = createBatchRepository(prisma);
      stockBatch.findMany.mockResolvedValue([]);

      await repo.listBatches('b-1', 'br-1');

      expect(stockBatch.findMany).toHaveBeenCalledWith({
        where: { businessId: 'b-1', branchId: 'br-1' },
        include: BATCH_INCLUDE,
        orderBy: { batchDate: 'desc' },
      });
    });

    it('carries the receiver relation on every batch returned', async () => {
      const { prisma, stockBatch } = createPrismaStub();
      const repo = createBatchRepository(prisma);
      stockBatch.findMany.mockResolvedValue([
        listedBatch({ id: 'sb-1' }),
        listedBatch({ id: 'sb-2' }),
      ]);

      const result = await repo.listBatches('b-1', 'br-1');

      expect(result).toHaveLength(2);
      for (const batch of result) {
        expect(batch.receivedByMember).toEqual({ id: 'm-1', name: 'me', role: 'OWNER' });
      }
    });
  });

  describe('listProductsWithStockLines', () => {
    const INVENTORY_INCLUDE = {
      productUnits: {
        include: { standardUnit: { select: { id: true, name: true, symbol: true } } },
      },
      stockBatchLines: { where: { quantityRemaining: { gt: 0 } } },
    };

    it('reads the active products of the branch whole, with both summary relations', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createBatchRepository(prisma);
      product.findMany.mockResolvedValue([]);

      await repo.listProductsWithStockLines('b-1', 'br-1');

      // The exact call also pins that no `select` is passed, so the summary is
      // worked out from whole rows.
      expect(product.findMany).toHaveBeenCalledWith({
        where: { businessId: 'b-1', branchId: 'br-1', active: true },
        include: INVENTORY_INCLUDE,
        orderBy: { name: 'asc' },
      });
    });

    it('returns the product rows the query answered with', async () => {
      const { prisma, product, attachment } = createPrismaStub();
      const repo = createBatchRepository(prisma);
      const rows = [
        { id: 'p-1', name: 'A', productUnits: [], stockBatchLines: [] },
        { id: 'p-2', name: 'B', productUnits: [], stockBatchLines: [] },
      ];
      product.findMany.mockResolvedValue(rows as never);

      const result = await repo.listProductsWithStockLines('b-1', 'br-1');

      expect(result).toEqual(rows);
      expect(attachment.findMany).not.toHaveBeenCalled();
    });
  });

  describe('listProductAttachments', () => {
    it('reads the live product attachments for the named products', async () => {
      const { prisma, attachment } = createPrismaStub();
      const repo = createBatchRepository(prisma);

      await repo.listProductAttachments(['p-1', 'p-2']);

      expect(attachment.findMany).toHaveBeenCalledWith({
        where: {
          recordType: AttachmentRecordType.PRODUCT,
          recordId: { in: ['p-1', 'p-2'] },
          deletedAt: null,
        },
      });
    });

    it('returns the attachment rows the query answered with', async () => {
      const { prisma, attachment } = createPrismaStub();
      const repo = createBatchRepository(prisma);
      const rows = [
        { id: 'a-1', recordId: 'p-1', uploadId: 'u-1' },
        { id: 'a-2', recordId: 'p-2', uploadId: null },
      ];
      attachment.findMany.mockResolvedValue(rows as never);

      const result = await repo.listProductAttachments(['p-1', 'p-2']);

      expect(result).toEqual(rows);
    });
  });
});

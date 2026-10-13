import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSaleRepository } from '../sales.repository.js';
import type { CreateSaleCommand } from '../sales.types.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

type MockTx = {
  sale: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
  };
  saleLine: { create: ReturnType<typeof vi.fn> };
  stockBatchLine: { update: ReturnType<typeof vi.fn> };
  product: { update: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
};

function createPrismaStub() {
  const tx: MockTx = {
    sale: { count: vi.fn(), create: vi.fn(), findUniqueOrThrow: vi.fn() },
    saleLine: { create: vi.fn() },
    stockBatchLine: { update: vi.fn() },
    product: { update: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  const business = { findUnique: vi.fn() };
  const product = { findMany: vi.fn() };
  const sale = { findMany: vi.fn() };
  const stockBatchLine = { findMany: vi.fn() };
  const $transaction = vi.fn((cb: (tx: MockTx) => unknown) => cb(tx));

  const prisma = {
    business,
    product,
    sale,
    stockBatchLine,
    $transaction,
  } as unknown as PrismaClient;

  return { prisma, tx, business, product, sale, stockBatchLine, $transaction };
}

function command(overrides: Partial<CreateSaleCommand> = {}): CreateSaleCommand {
  return {
    businessId: 'b-1',
    branchId: 'br-1',
    memberId: 'm-1',
    saleDatetime: new Date('2026-02-01T09:00:00.000Z'),
    discount: null,
    taxRateApplied: 0.15,
    subtotal: 1900,
    taxAmount: 285,
    total: 2185,
    lines: [
      {
        productId: 'p-tequila',
        productName: 'Sierra Tequila 350 ml',
        productUnitId: 'pu-bottle',
        soldUnit: 'Bottle',
        quantity: 2,
        standardUnit: 'pc',
        quantityInStandardUnit: 2,
        quantityInBaseUnit: 2,
        resolvedStandardUnitId: 'su-pc',
        unitPrice: 950,
        allocations: [{ stockBatchLineId: 'lot-1', quantityPulled: 2, unitCost: 600 }],
      },
    ],
    stockDecrements: [{ productId: 'p-tequila', amount: 2 }],
    lotDecrements: [{ stockBatchLineId: 'lot-1', quantity: 2 }],
    ...overrides,
  };
}

/** What `sale.create` hands back: the sale with its relations included. */
function createdSale(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sale-1',
    businessId: 'b-1',
    branchId: 'br-1',
    invoiceNumber: '1',
    processedByMemberId: 'm-1',
    serverMemberId: null,
    customerId: null,
    saleDatetime: new Date('2026-02-01T09:00:00.000Z'),
    discount: null,
    taxRateApplied: 0.15,
    subtotal: 1900,
    taxAmount: 285,
    total: 2185,
    paymentStatus: 'PENDING',
    amountPaid: 0,
    balanceDue: 2185,
    voidStatus: 'NONE',
    voidReason: null,
    createdAt: new Date('2026-02-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T10:00:00.000Z'),
    processedByMember: { id: 'm-1', name: 'me', role: 'OWNER' },
    serverMember: null,
    customer: null,
    ...overrides,
  };
}

/** What `createManyAndReturn` hands back: the written lines, with their brand. */
const CREATED_LINE = {
  id: 'sl-1',
  saleId: 'sale-1',
  productId: 'p-tequila',
  productName: 'Sierra Tequila 350 ml',
  productUnitId: 'pu-bottle',
  soldUnit: 'Bottle',
  quantity: 2,
  standardUnit: 'pc',
  quantityInStandardUnit: 2,
  resolvedStandardUnitId: 'su-pc',
  unitPrice: 950,
  containerId: null,
  refunded: false,
  refundRestocked: false,
  createdAt: new Date('2026-02-01T10:00:00.000Z'),
  updatedAt: new Date('2026-02-01T10:00:00.000Z'),
  product: { brand: 'Sierra' },
};

/** What `findMany` hands back on a history read: header fields plus a light line preview. */
function listedSale(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sale-1',
    invoiceNumber: '1',
    saleDatetime: new Date('2026-02-01T09:00:00.000Z'),
    total: 2185,
    paymentStatus: 'PENDING',
    voidStatus: 'NONE',
    lines: [{ productName: 'Sierra Tequila 350 ml' }],
    processedByMember: { id: 'm-1', name: 'me', role: 'OWNER' },
    serverMember: null,
    customer: null,
    ...overrides,
  };
}

function registerSuccess(tx: MockTx) {
  tx.sale.count.mockResolvedValue(0);
  tx.sale.create.mockResolvedValue(createdSale());
  tx.saleLine.create.mockResolvedValue(CREATED_LINE);
}

describe('sales.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBusinessSaleConfig', () => {
    it('reads the business tax rate and negative-stock policy by id', async () => {
      const { prisma, business } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      business.findUnique.mockResolvedValue({
        defaultTaxRate: { toNumber: () => 0.15 },
        allowNegativeStock: false,
      });

      const result = await repo.getBusinessSaleConfig('b-1');

      expect(business.findUnique).toHaveBeenCalledWith({
        where: { id: 'b-1' },
        select: { defaultTaxRate: true, allowNegativeStock: true },
      });
      expect(result?.defaultTaxRate?.toNumber()).toBe(0.15);
      expect(result?.allowNegativeStock).toBe(false);
    });

    it('answers null when the business is gone', async () => {
      const { prisma, business } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      business.findUnique.mockResolvedValue(null);

      await expect(repo.getBusinessSaleConfig('b-1')).resolves.toBeNull();
    });
  });

  describe('getProductSellContext', () => {
    it('reads the named products of the business with the fields the unit math walks and the price', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createSaleRepository(prisma);

      await repo.getProductSellContext('b-1', ['p-tequila', 'p-tshirt']);

      expect(product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['p-tequila', 'p-tshirt'] }, businessId: 'b-1' },
          select: expect.objectContaining({
            id: true,
            businessId: true,
            name: true,
            currentSealedStock: true,
            productUnits: {
              select: expect.objectContaining({
                unitRole: true,
                standardUnitId: true,
                dependsOn: true,
                conversionRate: true,
                purchaseCapable: true,
                sellCapable: true,
                price: true,
                standardUnit: { select: { id: true, name: true, symbol: true } },
              }),
            },
          }),
        }),
      );
    });
  });

  describe('getStockLots', () => {
    it('reads the in-stock lots of the named products, oldest purchase first', async () => {
      const { prisma, stockBatchLine } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      stockBatchLine.findMany.mockResolvedValue([]);

      await repo.getStockLots('b-1', ['p-tequila']);

      expect(stockBatchLine.findMany).toHaveBeenCalledWith({
        where: {
          productId: { in: ['p-tequila'] },
          quantityRemaining: { gt: 0 },
          stockBatch: { businessId: 'b-1' },
        },
        select: {
          id: true,
          productId: true,
          purchaseUnitCost: true,
          quantityRemaining: true,
        },
        orderBy: [{ stockBatch: { batchDate: 'asc' } }, { createdAt: 'asc' }],
      });
    });
  });

  describe('createSale', () => {
    it('writes the sale, its lines and the stock movement in one transaction', async () => {
      const { prisma, tx, $transaction } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      registerSuccess(tx);

      await repo.createSale(command());

      expect($transaction).toHaveBeenCalledTimes(1);
      expect(tx.sale.count).toHaveBeenCalledTimes(1);
      expect(tx.sale.create).toHaveBeenCalledTimes(1);
      expect(tx.saleLine.create).toHaveBeenCalledTimes(1);
      expect(tx.stockBatchLine.update).toHaveBeenCalledTimes(1);
      expect(tx.product.update).toHaveBeenCalledTimes(1);
    });

    it('numbers the sale next in its branch', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      tx.sale.count.mockResolvedValue(4);
      tx.sale.create.mockResolvedValue(createdSale({ invoiceNumber: '5' }));
      tx.saleLine.create.mockResolvedValue(CREATED_LINE);

      await repo.createSale(command());

      expect(tx.sale.count).toHaveBeenCalledWith({ where: { branchId: 'br-1' } });
      expect(tx.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ invoiceNumber: '5' }) }),
      );
    });

    it('writes the sale pending, against the acting member and the scope', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      registerSuccess(tx);

      await repo.createSale(command());

      expect(tx.sale.create).toHaveBeenCalledWith({
        data: {
          businessId: 'b-1',
          branchId: 'br-1',
          invoiceNumber: '1',
          processedByMemberId: 'm-1',
          saleDatetime: new Date('2026-02-01T09:00:00.000Z'),
          discount: null,
          taxRateApplied: 0.15,
          subtotal: 1900,
          taxAmount: 285,
          total: 2185,
          paymentStatus: 'PENDING',
          amountPaid: 0,
          balanceDue: 2185,
        },
        include: {
          processedByMember: { select: { id: true, name: true, role: true } },
          serverMember: { select: { id: true, name: true, role: true } },
          customer: true,
        },
      });
    });

    it('writes each resolved line with its draws nested, against the created sale', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      registerSuccess(tx);

      await repo.createSale(command());

      expect(tx.saleLine.create).toHaveBeenCalledWith({
        data: {
          saleId: 'sale-1',
          productId: 'p-tequila',
          productName: 'Sierra Tequila 350 ml',
          productUnitId: 'pu-bottle',
          soldUnit: 'Bottle',
          quantity: 2,
          standardUnit: 'pc',
          quantityInStandardUnit: 2,
          resolvedStandardUnitId: 'su-pc',
          unitPrice: 950,
          costs: {
            createMany: {
              data: [
                {
                  stockBatchLineId: 'lot-1',
                  quantityPulled: 2,
                  unitCost: 600,
                },
              ],
            },
          },
        },
        include: { product: { select: { brand: true } } },
      });
    });

    it('composes the created sale from the inserts rather than reading it back', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      registerSuccess(tx);

      const result = await repo.createSale(command());

      expect(result.lines).toEqual([CREATED_LINE]);
      expect(result.payments).toEqual([]);
      expect(tx.sale.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it('takes each lot down by the summed draw the command carries', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      registerSuccess(tx);

      await repo.createSale(
        command({
          lotDecrements: [
            { stockBatchLineId: 'lot-1', quantity: 1 },
            { stockBatchLineId: 'lot-2', quantity: 1 },
          ],
        }),
      );

      expect(tx.stockBatchLine.update).toHaveBeenCalledWith({
        where: { id: 'lot-1' },
        data: { quantityRemaining: { decrement: 1 } },
      });
      expect(tx.stockBatchLine.update).toHaveBeenCalledWith({
        where: { id: 'lot-2' },
        data: { quantityRemaining: { decrement: 1 } },
      });
    });

    it('decrements each product sealed stock by its summed draw', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      registerSuccess(tx);

      await repo.createSale(command());

      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'p-tequila' },
        data: { currentSealedStock: { decrement: 2 } },
      });
    });

    it('nests no cost rows when a line drew no lot', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      registerSuccess(tx);

      const [firstLine] = command().lines;
      if (!firstLine) {
        throw new Error('expected a seeded line');
      }

      await repo.createSale(
        command({
          lines: [{ ...firstLine, allocations: [] }],
          stockDecrements: [],
          lotDecrements: [],
        }),
      );

      const data = (
        vi.mocked(tx.saleLine.create).mock.calls[0]?.[0] as {
          data: { costs?: unknown };
        }
      ).data;
      expect(data).not.toHaveProperty('costs');
      expect(tx.stockBatchLine.update).not.toHaveBeenCalled();
      expect(tx.product.update).not.toHaveBeenCalled();
    });

    it('recomputes the invoice number when a concurrent write takes it', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      tx.sale.count.mockResolvedValue(0);
      tx.sale.create.mockRejectedValueOnce({ code: 'P2002' });
      tx.sale.create.mockResolvedValueOnce(createdSale({ invoiceNumber: '2' }));
      tx.saleLine.create.mockResolvedValue(CREATED_LINE);

      await repo.createSale(command());

      expect(tx.sale.create).toHaveBeenCalledTimes(2);
      expect(tx.sale.count).toHaveBeenCalledTimes(2);
    });

    it('lets a failed write reject out of the transaction, leaving the lines unwritten', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      tx.sale.count.mockResolvedValue(0);
      tx.sale.create.mockRejectedValue(new Error('db down'));

      await expect(repo.createSale(command())).rejects.toThrow('db down');

      expect(tx.saleLine.create).not.toHaveBeenCalled();
    });
  });

  describe('listSales', () => {
    it('reads the branch sales newest first with the relations included', async () => {
      const { prisma, sale } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      sale.findMany.mockResolvedValue([]);

      await repo.listSales('b-1', 'br-1');

      expect(sale.findMany).toHaveBeenCalledWith({
        where: { businessId: 'b-1', branchId: 'br-1' },
        include: {
          lines: true,
          processedByMember: true,
          serverMember: true,
          customer: true,
        },
        orderBy: { saleDatetime: 'desc' },
      });
    });

    it('returns the sale rows the query answered with', async () => {
      const { prisma, sale } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      const rows = [listedSale({ id: 'sale-1' }), listedSale({ id: 'sale-2' })];
      sale.findMany.mockResolvedValue(rows);

      const result = await repo.listSales('b-1', 'br-1');

      expect(result).toEqual(rows);
      for (const row of result) {
        expect(row.processedByMember).toEqual({ id: 'm-1', name: 'me', role: 'OWNER' });
      }
    });
  });
});

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
  saleLine: { createManyAndReturn: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
};

const SALE_INCLUDE = {
  lines: {
    include: { product: { select: { brand: true } } },
    orderBy: { createdAt: 'asc' },
  },
  payments: { orderBy: { paidAt: 'asc' } },
  processedByMember: { select: { id: true, name: true, role: true } },
  serverMember: { select: { id: true, name: true, role: true } },
  customer: { select: { id: true, name: true } },
};

function createPrismaStub() {
  const tx: MockTx = {
    sale: { count: vi.fn(), create: vi.fn(), findUniqueOrThrow: vi.fn() },
    saleLine: { createManyAndReturn: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  const business = { findUnique: vi.fn() };
  const product = { findMany: vi.fn() };
  const sale = { findMany: vi.fn() };
  const $transaction = vi.fn((cb: (tx: MockTx) => unknown) => cb(tx));

  const prisma = {
    business,
    product,
    sale,
    $transaction,
  } as unknown as PrismaClient;

  return { prisma, tx, business, product, sale, $transaction };
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
        resolvedStandardUnitId: 'su-pc',
        unitPrice: 950,
      },
    ],
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

/** What `findMany` hands back on a list read: each sale with its lines. */
function listedSale(overrides: Record<string, unknown> = {}) {
  return {
    ...createdSale(),
    lines: [{ ...CREATED_LINE }],
    payments: [],
    ...overrides,
  };
}

function registerSuccess(tx: MockTx) {
  tx.sale.count.mockResolvedValue(0);
  tx.sale.create.mockResolvedValue(createdSale());
  tx.saleLine.createManyAndReturn.mockResolvedValue([CREATED_LINE]);
}

describe('sales.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBusinessTaxConfig', () => {
    it('reads the business default tax rate by id', async () => {
      const { prisma, business } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      business.findUnique.mockResolvedValue({ defaultTaxRate: { toNumber: () => 0.15 } });

      const result = await repo.getBusinessTaxConfig('b-1');

      expect(business.findUnique).toHaveBeenCalledWith({
        where: { id: 'b-1' },
        select: { defaultTaxRate: true },
      });
      expect(result?.defaultTaxRate?.toNumber()).toBe(0.15);
    });

    it('answers null when the business is gone', async () => {
      const { prisma, business } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      business.findUnique.mockResolvedValue(null);

      await expect(repo.getBusinessTaxConfig('b-1')).resolves.toBeNull();
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

  describe('createSale', () => {
    it('writes the sale and its lines in one transaction', async () => {
      const { prisma, tx, $transaction } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      registerSuccess(tx);

      await repo.createSale(command());

      expect($transaction).toHaveBeenCalledTimes(1);
      expect(tx.sale.count).toHaveBeenCalledTimes(1);
      expect(tx.sale.create).toHaveBeenCalledTimes(1);
      expect(tx.saleLine.createManyAndReturn).toHaveBeenCalledTimes(1);
    });

    it('numbers the sale next in its branch', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      tx.sale.count.mockResolvedValue(4);
      tx.sale.create.mockResolvedValue(createdSale({ invoiceNumber: '5' }));
      tx.saleLine.createManyAndReturn.mockResolvedValue([CREATED_LINE]);

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
          customer: { select: { id: true, name: true } },
        },
      });
    });

    it('writes each resolved line against the created sale, with its brand', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      registerSuccess(tx);

      await repo.createSale(command());

      expect(tx.saleLine.createManyAndReturn).toHaveBeenCalledWith({
        data: [
          {
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
          },
        ],
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

    it('recomputes the invoice number when a concurrent write takes it', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      tx.sale.count.mockResolvedValue(0);
      tx.sale.create.mockRejectedValueOnce({ code: 'P2002' });
      tx.sale.create.mockResolvedValueOnce(createdSale({ invoiceNumber: '2' }));
      tx.saleLine.createManyAndReturn.mockResolvedValue([CREATED_LINE]);

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

      expect(tx.saleLine.createManyAndReturn).not.toHaveBeenCalled();
    });
  });

  describe('listSales', () => {
    it('reads the branch sales newest first with the full report include', async () => {
      const { prisma, sale } = createPrismaStub();
      const repo = createSaleRepository(prisma);
      sale.findMany.mockResolvedValue([]);

      await repo.listSales('b-1', 'br-1');

      expect(sale.findMany).toHaveBeenCalledWith({
        where: { businessId: 'b-1', branchId: 'br-1' },
        include: SALE_INCLUDE,
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

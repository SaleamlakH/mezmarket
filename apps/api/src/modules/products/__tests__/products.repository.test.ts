import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProductsRepository } from '../products.repository.js';
import type { ProductRepository, CreateProductInput } from '../products.types.js';
import { AttachmentRecordType } from '../../../../generated/prisma/client.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';

type MockTx = {
  product: {
    create: ReturnType<typeof vi.fn>;
  };
  productUnit: {
    create: ReturnType<typeof vi.fn>;
  };
  standardUnit: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  attachment: {
    create: ReturnType<typeof vi.fn>;
  };
};

function createPrismaStub() {
  const tx: MockTx = {
    product: { create: vi.fn() },
    productUnit: { create: vi.fn() },
    standardUnit: { findUnique: vi.fn() },
    attachment: { create: vi.fn() },
  };
  const product = {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn(),
  };
  const attachment = {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
  };
  const $transaction = vi.fn((cb: (tx: MockTx) => unknown) => cb(tx));

  const prisma = { product, attachment, $transaction } as unknown as PrismaClient;

  return { prisma, tx, product, attachment, $transaction };
}

function registerSuccess(tx: MockTx) {
  tx.standardUnit.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
    if (where.id === 'kg-1')
      return Promise.resolve({ id: 'kg-1', symbol: 'kg', dimensionId: 'd-1' });
    if (where.id === 'pc-1')
      return Promise.resolve({ id: 'pc-1', symbol: 'pc', dimensionId: 'd-2' });
    return Promise.resolve(null);
  });
  tx.product.create.mockResolvedValue({ id: 'p-1' });
  tx.productUnit.create.mockImplementation(({ data }: { data: { unitRole?: string } }) =>
    Promise.resolve({ id: data.unitRole === 'MOU' ? 'pu-2' : 'pu-1' }),
  );
}

function input(overrides: Partial<CreateProductInput> = {}): CreateProductInput {
  return {
    name: 'Sugar',
    categoryId: null,
    brand: null,
    description: null,
    trackAsPartial: false,
    lowStockThreshold: null,
    baseUnit: { unitId: 'kg-1', price: 50 },
    ...(overrides.name !== undefined && { name: overrides.name }),
    ...(overrides.categoryId !== undefined && { categoryId: overrides.categoryId }),
    ...(overrides.brand !== undefined && { brand: overrides.brand }),
    ...(overrides.description !== undefined && { description: overrides.description }),
    ...(overrides.trackAsPartial !== undefined && { trackAsPartial: overrides.trackAsPartial }),
    ...(overrides.lowStockThreshold !== undefined && {
      lowStockThreshold: overrides.lowStockThreshold,
    }),
    ...(overrides.baseUnit !== undefined && { baseUnit: overrides.baseUnit }),
    ...(overrides.mou !== undefined && { mou: overrides.mou }),
    ...(overrides.uploadId !== undefined && { uploadId: overrides.uploadId }),
  };
}

describe('products.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an object implementing ProductRepository', () => {
    const { prisma } = createPrismaStub();
    const repo = createProductsRepository(prisma) satisfies ProductRepository;

    expect(typeof repo.list).toBe('function');
    expect(typeof repo.getById).toBe('function');
    expect(typeof repo.createForBusiness).toBe('function');
    expect(typeof repo.listAttachmentsForProducts).toBe('function');
    expect(typeof repo.getProductAttachment).toBe('function');
  });

  describe('list', () => {
    it('calls findMany with business + branch filter, active only, and included units', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      await repo.list('b-1', 'br-1');

      expect(product.findMany).toHaveBeenCalledWith({
        where: { businessId: 'b-1', branchId: 'br-1', active: true },
        orderBy: { createdAt: 'desc' },
        include: { productUnits: { orderBy: [{ unitRole: 'asc' }, { createdAt: 'asc' }] } },
      });
    });

    it('returns exactly the records resolved by findMany', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      const records = [
        { id: 'p-1', productUnits: [] },
        { id: 'p-2', productUnits: [] },
      ];
      product.findMany.mockResolvedValue(records);

      const result = await repo.list('b-1', 'br-1');

      expect(result).toEqual(records);
    });
  });

  describe('getById', () => {
    it('calls findFirst with id, business filter and included units', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      await repo.getById('p-1', 'b-1');

      expect(product.findFirst).toHaveBeenCalledWith({
        where: { id: 'p-1', businessId: 'b-1' },
        include: { productUnits: { orderBy: [{ unitRole: 'asc' }, { createdAt: 'asc' }] } },
      });
    });

    it('returns the resolved record with its units', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      const record = { id: 'p-1', productUnits: [] };
      product.findFirst.mockResolvedValue(record);

      const result = await repo.getById('p-1', 'b-1');

      expect(result).toEqual(record);
    });

    it('returns null when the product is missing', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      product.findFirst.mockResolvedValue(null);

      await expect(repo.getById('missing', 'b-1')).resolves.toBeNull();
    });
  });

  describe('createForBusiness', () => {
    it('runs the creates inside a transaction', async () => {
      const { prisma, tx, $transaction } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerSuccess(tx);

      await repo.createForBusiness('b-1', 'br-1', input());

      expect($transaction).toHaveBeenCalledTimes(1);
    });

    it('creates the product with business, branch and name', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerSuccess(tx);

      await repo.createForBusiness('b-1', 'br-1', input());

      expect(tx.product.create).toHaveBeenCalledWith({
        data: { businessId: 'b-1', branchId: 'br-1', name: 'Sugar' },
      });
    });

    it('includes optional product fields when provided', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerSuccess(tx);

      await repo.createForBusiness(
        'b-1',
        'br-1',
        input({
          brand: 'Acme',
          description: 'Fine sugar',
          categoryId: 'c-1',
          lowStockThreshold: 0,
          trackAsPartial: true,
        }),
      );

      expect(tx.product.create).toHaveBeenCalledWith({
        data: {
          businessId: 'b-1',
          branchId: 'br-1',
          name: 'Sugar',
          brand: 'Acme',
          description: 'Fine sugar',
          categoryId: 'c-1',
          lowStockThreshold: 0,
          trackAsPartial: true,
        },
      });
    });

    it('creates the BASE unit from the standard unit symbol with purchase + sell prices', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerSuccess(tx);

      await repo.createForBusiness('b-1', 'br-1', input());

      expect(tx.standardUnit.findUnique).toHaveBeenCalledWith({ where: { id: 'kg-1' } });
      expect(tx.productUnit.create).toHaveBeenCalledWith({
        data: {
          productId: 'p-1',
          unitRole: 'BASE',
          standardUnitId: 'kg-1',
          name: 'kg',
          dependsOn: null,
          conversionRate: null,
          price: 50,
          purchaseCapable: true,
          sellCapable: true,
        },
      });
    });

    it('creates the MOU unit with conversion rate against BASE when mou is provided', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerSuccess(tx);

      await repo.createForBusiness(
        'b-1',
        'br-1',
        input({ mou: { unitId: 'pc-1', conversionRate: 10, price: 5 } }),
      );

      expect(tx.standardUnit.findUnique).toHaveBeenCalledWith({ where: { id: 'pc-1' } });
      expect(tx.productUnit.create).toHaveBeenCalledWith({
        data: {
          productId: 'p-1',
          unitRole: 'MOU',
          standardUnitId: 'pc-1',
          name: 'pc',
          dependsOn: 'BASE',
          conversionRate: 10,
          price: 5,
          purchaseCapable: false,
          sellCapable: true,
        },
      });
    });

    it('omits the MOU price when not provided', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerSuccess(tx);

      await repo.createForBusiness(
        'b-1',
        'br-1',
        input({ mou: { unitId: 'pc-1', conversionRate: 10 } }),
      );

      const mouCall = tx.productUnit.create.mock.calls[1]?.[0];
      expect(mouCall?.data).toMatchObject({
        productId: 'p-1',
        unitRole: 'MOU',
        standardUnitId: 'pc-1',
        conversionRate: 10,
      });
      expect(mouCall?.data).not.toHaveProperty('price');
    });

    it('returns the created product with its units', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerSuccess(tx);

      const result = await repo.createForBusiness('b-1', 'br-1', input());

      expect(result).toMatchObject({
        id: 'p-1',
        units: [{ id: 'pu-1' }],
      });
    });

    it('throws BAD_REQUEST when the base standard unit is missing', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      tx.standardUnit.findUnique.mockResolvedValue(null);
      tx.product.create.mockResolvedValue({ id: 'p-1' });

      await expect(repo.createForBusiness('b-1', 'br-1', input())).rejects.toEqual(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Base unit not found', 400),
      );
      expect(tx.productUnit.create).not.toHaveBeenCalled();
    });

    it('throws BAD_REQUEST when the MOU standard unit is missing', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      tx.standardUnit.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          where.id === 'kg-1' ? { id: 'kg-1', symbol: 'kg', dimensionId: 'd-1' } : null,
        ),
      );
      tx.product.create.mockResolvedValue({ id: 'p-1' });

      await expect(
        repo.createForBusiness(
          'b-1',
          'br-1',
          input({ mou: { unitId: 'pc-1', conversionRate: 10 } }),
        ),
      ).rejects.toEqual(new AppError(ERROR_CODES.BAD_REQUEST, 'MOU unit not found', 400));
      expect(tx.productUnit.create).not.toHaveBeenCalled();
    });

    it('throws BAD_REQUEST when the MOU is in the same dimension as the base unit', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      tx.standardUnit.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          where.id === 'kg-1'
            ? { id: 'kg-1', symbol: 'kg', dimensionId: 'd-1' }
            : { id: 'pc-1', symbol: 'pc', dimensionId: 'd-1' },
        ),
      );
      tx.product.create.mockResolvedValue({ id: 'p-1' });

      await expect(
        repo.createForBusiness(
          'b-1',
          'br-1',
          input({ mou: { unitId: 'pc-1', conversionRate: 10 } }),
        ),
      ).rejects.toEqual(
        new AppError(
          ERROR_CODES.BAD_REQUEST,
          'MOU must be in a different dimension from the base unit',
          400,
        ),
      );
      expect(tx.productUnit.create).not.toHaveBeenCalled();
    });

    it('does not create an attachment when no uploadId is provided', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerSuccess(tx);

      const result = await repo.createForBusiness('b-1', 'br-1', input());

      expect(tx.attachment.create).not.toHaveBeenCalled();
      expect(result.attachment).toBeNull();
    });

    it('creates an attachment for the upload when uploadId is provided', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerSuccess(tx);
      tx.attachment.create.mockResolvedValue({
        id: 'a-1',
        uploadId: 'u-1',
        recordType: AttachmentRecordType.PRODUCT,
        recordId: 'p-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      });

      const result = await repo.createForBusiness('b-1', 'br-1', input({ uploadId: 'u-1' }));

      expect(tx.attachment.create).toHaveBeenCalledWith({
        data: {
          uploadId: 'u-1',
          recordType: AttachmentRecordType.PRODUCT,
          recordId: 'p-1',
        },
      });
      expect(result.attachment).toMatchObject({ id: 'a-1', uploadId: 'u-1' });
    });
  });

  describe('listAttachmentsForProducts', () => {
    it('calls findMany with PRODUCT record type, ids and live attachments only', async () => {
      const { prisma, attachment } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      await repo.listAttachmentsForProducts(['p-1', 'p-2']);

      expect(attachment.findMany).toHaveBeenCalledWith({
        where: {
          recordType: AttachmentRecordType.PRODUCT,
          recordId: { in: ['p-1', 'p-2'] },
          deletedAt: null,
        },
      });
    });

    it('returns exactly the records resolved by findMany', async () => {
      const { prisma, attachment } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      const records = [{ id: 'a-1', uploadId: 'u-1' }];
      attachment.findMany.mockResolvedValue(records);

      await expect(repo.listAttachmentsForProducts(['p-1'])).resolves.toEqual(records);
    });
  });

  describe('getProductAttachment', () => {
    it('calls findFirst with PRODUCT record type, id and live attachments only', async () => {
      const { prisma, attachment } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      await repo.getProductAttachment('p-1');

      expect(attachment.findFirst).toHaveBeenCalledWith({
        where: {
          recordType: AttachmentRecordType.PRODUCT,
          recordId: 'p-1',
          deletedAt: null,
        },
      });
    });

    it('returns the resolved record', async () => {
      const { prisma, attachment } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      const record = { id: 'a-1', uploadId: 'u-1' };
      attachment.findFirst.mockResolvedValue(record);

      await expect(repo.getProductAttachment('p-1')).resolves.toEqual(record);
    });

    it('returns null when there is no live attachment', async () => {
      const { prisma } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      await expect(repo.getProductAttachment('p-1')).resolves.toBeNull();
    });
  });
});

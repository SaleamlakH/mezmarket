import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProductsRepository } from '../products.repository.js';
import type {
  CreateProductCommand,
  CreateProductInput,
  ProductRepository,
  ProductUnitWrite,
  UpdateProductInput,
} from '../products.types.js';
import { AttachmentRecordType } from '../../../../generated/prisma/client.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

type MockTx = {
  product: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  productUnit: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  attachment: { create: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
};

function createPrismaStub() {
  const tx: MockTx = {
    product: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    productUnit: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
    attachment: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
  };
  const product = { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() };
  const productUnit = { create: vi.fn(), update: vi.fn() };
  const attachment = {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
  };
  const standardUnit = { findMany: vi.fn().mockResolvedValue([]) };
  const $transaction = vi.fn((arg: unknown) =>
    Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: MockTx) => unknown)(tx),
  );

  const prisma = {
    product,
    productUnit,
    attachment,
    standardUnit,
    $transaction,
  } as unknown as PrismaClient;

  return { prisma, tx, product, productUnit, attachment, standardUnit, $transaction };
}

function productInput(overrides: Partial<CreateProductInput> = {}): CreateProductInput {
  return {
    name: 'Sugar',
    categoryId: null,
    brand: null,
    description: null,
    trackAsPartial: false,
    lowStockThreshold: null,
    baseUnit: { unitId: 'kg-1', price: 50 },
    ...overrides,
  };
}

function command(
  product: Partial<CreateProductInput> = {},
  resolved: { base?: { id: string; name: string }; mou?: { id: string; name: string } } = {},
): CreateProductCommand {
  return {
    businessId: 'b-1',
    branchId: 'br-1',
    product: productInput(product),
    baseStandardUnit: resolved.base ?? { id: 'kg-1', name: 'kg' },
    ...(resolved.mou && { mouStandardUnit: resolved.mou }),
  };
}

function unitWrite(overrides: Partial<ProductUnitWrite> = {}): ProductUnitWrite {
  return {
    productId: 'p-1',
    unitRole: 'CUSTOM',
    standardUnitId: null,
    name: 'Shot',
    dependsOn: 'BASE',
    conversionRate: 25,
    price: 120,
    purchaseCapable: true,
    sellCapable: true,
    ...overrides,
  };
}

function registerCreate(tx: MockTx) {
  tx.product.create.mockResolvedValue({ id: 'p-1' });
  // Distinct ids per row, so a test can tell which unit came back.
  let created = 0;
  tx.productUnit.create.mockImplementation(({ data }: { data: { unitRole?: string } }) => {
    created += 1;
    const id = data.unitRole === 'BASE' ? 'pu-1' : `pu-${created}`;
    return Promise.resolve({ id });
  });
}

describe('products.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an object implementing ProductRepository', () => {
    const { prisma } = createPrismaStub();
    const repo = createProductsRepository(prisma) satisfies ProductRepository;

    expect(typeof repo.listForBusiness).toBe('function');
    expect(typeof repo.getByIdWithUnits).toBe('function');
    expect(typeof repo.listAttachmentsForProducts).toBe('function');
    expect(typeof repo.getProductAttachment).toBe('function');
    expect(typeof repo.findStandardUnits).toBe('function');
    expect(typeof repo.createProduct).toBe('function');
    expect(typeof repo.createUnit).toBe('function');
    expect(typeof repo.updateUnits).toBe('function');
    expect(typeof repo.updateProduct).toBe('function');
    expect(typeof repo.setActive).toBe('function');
  });

  describe('listForBusiness', () => {
    it('calls findMany with the business + branch filter and only the base unit', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      await repo.listForBusiness('b-1', 'br-1', { status: 'all' });

      expect(product.findMany).toHaveBeenCalledWith({
        where: { businessId: 'b-1', branchId: 'br-1' },
        orderBy: { createdAt: 'desc' },
        include: { productUnits: { where: { unitRole: 'BASE' }, take: 1 } },
      });
    });

    it('asks for the active products only when the filter wants the active ones', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      await repo.listForBusiness('b-1', 'br-1', { status: 'active' });

      expect(product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { businessId: 'b-1', branchId: 'br-1', active: true } }),
      );
    });

    it('asks for the inactive products when the filter wants those', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      await repo.listForBusiness('b-1', 'br-1', { status: 'inactive' });

      expect(product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { businessId: 'b-1', branchId: 'br-1', active: false } }),
      );
    });

    it('returns exactly the records resolved by findMany', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      const records = [
        { id: 'p-1', productUnits: [] },
        { id: 'p-2', productUnits: [] },
      ];
      product.findMany.mockResolvedValue(records);

      await expect(repo.listForBusiness('b-1', 'br-1', { status: 'all' })).resolves.toEqual(
        records,
      );
    });
  });

  describe('getByIdWithUnits', () => {
    it('calls findFirst with id, business filter and included units', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      await repo.getByIdWithUnits('p-1', 'b-1');

      expect(product.findFirst).toHaveBeenCalledWith({
        where: { id: 'p-1', businessId: 'b-1' },
        include: { productUnits: true },
      });
    });

    it('returns the resolved record and null when it is missing', async () => {
      const { prisma, product } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      product.findFirst.mockResolvedValue({ id: 'p-1', productUnits: [] });
      await expect(repo.getByIdWithUnits('p-1', 'b-1')).resolves.toEqual({
        id: 'p-1',
        productUnits: [],
      });

      product.findFirst.mockResolvedValue(null);
      await expect(repo.getByIdWithUnits('missing', 'b-1')).resolves.toBeNull();
    });
  });

  describe('findStandardUnits', () => {
    it('calls findMany with the ids it was given', async () => {
      const { prisma, standardUnit } = createPrismaStub();
      const repo = createProductsRepository(prisma);

      const records = [{ id: 'kg-1', symbol: 'kg', dimensionId: 'd-1' }];
      standardUnit.findMany.mockResolvedValue(records);

      await expect(repo.findStandardUnits(['kg-1', 'pc-1'])).resolves.toEqual(records);
      expect(standardUnit.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['kg-1', 'pc-1'] } },
      });
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
  });

  describe('createProduct', () => {
    it('runs the writes inside one transaction', async () => {
      const { prisma, tx, $transaction } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerCreate(tx);

      await repo.createProduct(command());

      expect($transaction).toHaveBeenCalledTimes(1);
    });

    it('creates the product with business, branch and the fields the request carried', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerCreate(tx);

      await repo.createProduct(
        command({
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

    it('creates the BASE unit from the resolved standard unit and the given price', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerCreate(tx);

      await repo.createProduct(command());

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

    it('creates the MOU unit from the resolved standard unit', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerCreate(tx);

      await repo.createProduct(
        command(
          { mou: { unitId: 'pc-1', conversionRate: 10, price: 5 } },
          {
            mou: { id: 'pc-1', name: 'pc' },
          },
        ),
      );

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
      registerCreate(tx);

      await repo.createProduct(
        command(
          { mou: { unitId: 'pc-1', conversionRate: 10 } },
          {
            mou: { id: 'pc-1', name: 'pc' },
          },
        ),
      );

      const mouCall = tx.productUnit.create.mock.calls[1]?.[0];
      expect(mouCall?.data).toMatchObject({ unitRole: 'MOU', name: 'pc' });
      expect(mouCall?.data).not.toHaveProperty('price');
    });

    it('creates a custom unit as the owner named it, with a price only when it is sold', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerCreate(tx);

      await repo.createProduct(
        command({
          customUnits: [
            {
              name: 'Shot',
              dependsOn: 'BASE',
              conversionRate: 0.125,
              purchaseCapable: true,
              sellCapable: true,
              price: 45,
            },
            {
              name: 'Box',
              dependsOn: 'BASE',
              conversionRate: 12,
              purchaseCapable: true,
              sellCapable: false,
            },
          ],
        }),
      );

      expect(tx.productUnit.create).toHaveBeenCalledWith({
        data: {
          productId: 'p-1',
          unitRole: 'CUSTOM',
          standardUnitId: null,
          name: 'Shot',
          dependsOn: 'BASE',
          conversionRate: 0.125,
          price: 45,
          purchaseCapable: true,
          sellCapable: true,
        },
      });

      const boxCall = tx.productUnit.create.mock.calls.at(-1)?.[0];
      expect(boxCall?.data).toMatchObject({ name: 'Box', sellCapable: false });
      expect(boxCall?.data).not.toHaveProperty('price');
    });

    it('returns the created product with its units and no attachment when none was given', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerCreate(tx);

      const result = await repo.createProduct(command());

      expect(tx.attachment.create).not.toHaveBeenCalled();
      expect(result).toMatchObject({ id: 'p-1', units: [{ id: 'pu-1' }], attachment: null });
    });

    it('creates an attachment and returns it when an uploadId was given', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerCreate(tx);
      tx.attachment.create.mockResolvedValue({ id: 'a-1', uploadId: 'u-1' });

      const result = await repo.createProduct(command({ uploadId: 'u-1' }));

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

  describe('createUnit', () => {
    function registerCreatedUnit(tx: MockTx) {
      tx.product.findFirst.mockResolvedValue({
        id: 'p-1',
        productUnits: [{ id: 'pu-2', name: 'Shot' }],
      });
    }

    it('writes the row exactly as it was given and answers with the product', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerCreatedUnit(tx);
      tx.productUnit.create.mockImplementation(({ data }: { data: object }) =>
        Promise.resolve({ id: 'pu-2', ...data }),
      );

      const data = unitWrite();
      const result = await repo.createUnit(data);

      expect(tx.productUnit.create).toHaveBeenCalledWith({ data });
      expect(tx.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        include: { productUnits: true },
      });
      expect(result).toMatchObject({
        id: 'p-1',
        productUnits: [{ id: 'pu-2', name: 'Shot' }],
      });
    });

    it('leaves the price off a row that carries none', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerCreatedUnit(tx);

      const write = unitWrite({ sellCapable: false });
      delete write.price;
      await repo.createUnit(write);

      const passed = tx.productUnit.create.mock.calls[0]?.[0]?.data as Record<string, unknown>;
      expect(passed).not.toHaveProperty('price');
    });
  });

  describe('updateUnits', () => {
    function registerUpdate(tx: MockTx) {
      tx.product.findFirst.mockResolvedValue({
        id: 'p-1',
        productUnits: [{ id: 'pu-1', price: 80 }],
      });
    }

    it('writes each row with only the fields it carried and answers with the product', async () => {
      const { prisma, tx, $transaction } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerUpdate(tx);

      const result = await repo.updateUnits('p-1', [{ id: 'pu-1', price: 80 }]);

      expect($transaction).toHaveBeenCalledTimes(1);
      expect(tx.productUnit.update).toHaveBeenCalledWith({
        where: { id: 'pu-1' },
        data: { price: 80 },
      });
      expect(result).toMatchObject({
        id: 'p-1',
        productUnits: [{ id: 'pu-1', price: 80 }],
      });
    });

    it('writes the price and selling capability when a unit is turned sellable', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerUpdate(tx);

      await repo.updateUnits('p-1', [
        { id: 'pu-1', purchaseCapable: false, sellCapable: true, price: 5 },
      ]);

      expect(tx.productUnit.update).toHaveBeenCalledWith({
        where: { id: 'pu-1' },
        data: { price: 5, purchaseCapable: false, sellCapable: true },
      });
    });

    it('passes an explicit null price through, to clear it', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerUpdate(tx);

      await repo.updateUnits('p-1', [{ id: 'pu-1', price: null }]);

      expect(tx.productUnit.update).toHaveBeenCalledWith({
        where: { id: 'pu-1' },
        data: { price: null },
      });
    });

    it('answers with the product without writing units when there is nothing to write', async () => {
      const { prisma, tx, $transaction } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerUpdate(tx);

      const result = await repo.updateUnits('p-1', []);

      expect($transaction).toHaveBeenCalledTimes(1);
      expect(tx.productUnit.update).not.toHaveBeenCalled();
      expect(result).toMatchObject({ id: 'p-1', productUnits: [{ id: 'pu-1' }] });
    });
  });

  describe('updateProduct', () => {
    function registerUpdate(tx: MockTx) {
      tx.product.findFirst.mockResolvedValue({
        id: 'p-1',
        productUnits: [{ id: 'pu-1' }],
      });
      tx.attachment.findMany.mockResolvedValue([]);
    }

    it('writes only the fields the request carried', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerUpdate(tx);

      await repo.updateProduct('p-1', { brand: 'Acme' } as UpdateProductInput);

      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { brand: 'Acme' },
      });
    });

    it('writes the category when the request changes it', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerUpdate(tx);

      await repo.updateProduct('p-1', {
        name: 'Brown Sugar',
        categoryId: 'c-1',
        brand: null,
        description: null,
        trackAsPartial: false,
        lowStockThreshold: null,
      });

      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: {
          name: 'Brown Sugar',
          categoryId: 'c-1',
          brand: null,
          description: null,
          trackAsPartial: false,
          lowStockThreshold: null,
        },
      });
    });

    it('passes an explicit null through, to clear a field', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerUpdate(tx);

      await repo.updateProduct('p-1', { brand: null, description: null } as UpdateProductInput);

      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { brand: null, description: null },
      });
    });

    it('answers with the updated product, its units and live attachments', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerUpdate(tx);
      tx.attachment.findMany.mockResolvedValue([{ id: 'a-1', uploadId: 'u-1' }]);

      const result = await repo.updateProduct('p-1', {
        name: 'Brown Sugar',
      } as UpdateProductInput);

      expect(result).toMatchObject({
        id: 'p-1',
        productUnits: [{ id: 'pu-1' }],
        attachments: [{ id: 'a-1', uploadId: 'u-1' }],
      });
    });
  });

  describe('setActive', () => {
    function registerActive(tx: MockTx) {
      tx.product.findFirst.mockResolvedValue({
        id: 'p-1',
        active: false,
        productUnits: [{ id: 'pu-1' }],
      });
      tx.attachment.findMany.mockResolvedValue([]);
    }

    it('flips the flag', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerActive(tx);

      await repo.setActive('p-1', false);

      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { active: false },
      });
    });

    it('answers with the updated product, its units and live attachments', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createProductsRepository(prisma);
      registerActive(tx);
      tx.attachment.findMany.mockResolvedValue([{ id: 'a-1', uploadId: 'u-1' }]);

      const result = await repo.setActive('p-1', false);

      expect(result).toMatchObject({
        id: 'p-1',
        active: false,
        productUnits: [{ id: 'pu-1' }],
        attachments: [{ id: 'a-1', uploadId: 'u-1' }],
      });
    });
  });
});

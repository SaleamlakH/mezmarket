import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProductsService } from '../products.service.js';
import type {
  CreateProductInput,
  ProductRecord,
  ProductRecordWithBaseUnit,
  ProductRecordWithUnits,
  ProductRepository,
  ProductService,
  ProductUnitRecord,
} from '../products.types.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import type { Decimal } from '../../../../generated/prisma/internal/prismaNamespace.js';
import type { Prisma } from '../../../../generated/prisma/client.js';

function mockRepository(): ProductRepository {
  return {
    listForBusiness: vi.fn(),
    getByIdWithUnits: vi.fn(),
    createForBusiness: vi.fn(),
    listAttachmentsForProducts: vi.fn().mockResolvedValue([]),
    getProductAttachment: vi.fn().mockResolvedValue(null),
  };
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

function decimal(value: number) {
  return { toNumber: () => value } as unknown as Prisma.Decimal;
}

const SCOPE = { businessId: 'b-1', branchId: 'br-1' };

function unitRow(overrides: Partial<ProductUnitRecord> = {}): ProductUnitRecord {
  return {
    id: 'pu-bottle',
    productId: 'p-tequila',
    name: 'Bottle',
    unitRole: 'BASE',
    standardUnitId: 'su-pc',
    dependsOn: null,
    conversionRate: null,
    price: decimal(950),
    purchaseCapable: true,
    sellCapable: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function productRow(overrides: Partial<ProductRecordWithBaseUnit> = {}): ProductRecordWithBaseUnit {
  return {
    id: 'p-tequila',
    name: 'Sierra Tequila 350 ml',
    brand: 'Sierra',
    businessId: 'b-1',
    branchId: 'br-1',
    categoryId: null,
    description: null,
    trackAsPartial: false,
    lowStockThreshold: null,
    currentSealedStock: decimal(42),
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    productUnits: [unitRow()],
    ...overrides,
  };
}

/** The row `getByIdWithUnits` answers with: the product and all of its units. */
function productWithUnits(id: string, productUnits: ProductUnitRecord[]): ProductRecordWithUnits {
  return { ...productRow({ id }), productUnits };
}

function prismaProduct(overrides: Record<string, unknown> = {}): ProductRecord & {
  productUnits: ProductUnitRecord[];
} {
  return {
    id: 'p-1',
    businessId: 'b-1',
    branchId: 'br-1',
    categoryId: null,
    name: 'Sugar',
    brand: null,
    description: null,
    trackAsPartial: false,
    lowStockThreshold: null,
    currentSealedStock: decimal(0) as Decimal,
    active: true,
    productUnits: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function prismaUnit(overrides: Record<string, unknown> = {}): ProductUnitRecord {
  return {
    id: 'pu-1',
    productId: 'p-1',
    unitRole: 'BASE',
    standardUnitId: 'kg-1',
    name: 'kg',
    dependsOn: null,
    conversionRate: null,
    price: decimal(50) as Decimal,
    purchaseCapable: true,
    sellCapable: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('products.service', () => {
  let repo: ProductRepository;
  let service: ProductService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = mockRepository();
    service = createProductsService(repo);
  });

  describe('listProducts', () => {
    it('answers with one summary per product, holding exactly the summary fields', async () => {
      vi.mocked(repo.listForBusiness).mockResolvedValue([
        productRow(),
        productRow({ id: 'p-tshirt', name: 'T-Shirt', brand: null, active: false }),
      ] as never);

      const result = await service.listProducts(SCOPE);

      expect(result).toEqual([
        {
          id: 'p-tequila',
          name: 'Sierra Tequila 350 ml',
          brand: 'Sierra',
          currentSealedStock: 42,
          lowStockThreshold: null,
          active: true,
          baseUnitLabel: 'Bottle',
          uploadId: null,
        },
        {
          id: 'p-tshirt',
          name: 'T-Shirt',
          brand: null,
          currentSealedStock: 42,
          lowStockThreshold: null,
          active: false,
          baseUnitLabel: 'Bottle',
          uploadId: null,
        },
      ]);
    });

    it('answers with an empty list when the business has no products', async () => {
      vi.mocked(repo.listForBusiness).mockResolvedValue([] as never);

      await expect(service.listProducts(SCOPE)).resolves.toEqual([]);
    });

    it('fails the request when a product has no base unit to label its stock with', async () => {
      vi.mocked(repo.listForBusiness).mockResolvedValue([
        productRow({ productUnits: [] }),
      ] as never);

      await expect(service.listProducts(SCOPE)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_ERROR,
        statusCode: 500,
        message: expect.any(String),
      });
    });

    it('passes an unset brand and low stock threshold through as null', async () => {
      vi.mocked(repo.listForBusiness).mockResolvedValue([
        productRow({ brand: null, lowStockThreshold: null }),
      ] as never);

      const result = await service.listProducts(SCOPE);

      expect(result[0]).toMatchObject({ brand: null, lowStockThreshold: null });
    });

    it('skips the attachment lookup when there are no products', async () => {
      vi.mocked(repo.listForBusiness).mockResolvedValue([] as never);

      await service.listProducts(SCOPE);

      expect(repo.listAttachmentsForProducts).not.toHaveBeenCalled();
    });

    it('maps the uploadId of each product to its summary, with none for the rest', async () => {
      vi.mocked(repo.listForBusiness).mockResolvedValue([
        productRow({ id: 'p-1' }),
        productRow({ id: 'p-2' }),
      ] as never);
      vi.mocked(repo.listAttachmentsForProducts).mockResolvedValue([
        { recordId: 'p-1', uploadId: 'u-1' },
        { recordId: 'p-2', uploadId: null },
      ] as never);

      const result = await service.listProducts(SCOPE);

      expect(repo.listAttachmentsForProducts).toHaveBeenCalledWith(['p-1', 'p-2']);
      expect(result.map((product) => product.uploadId)).toEqual(['u-1', null]);
    });
  });

  describe('listProductUnits', () => {
    it('answers with one option per unit, holding exactly the option fields', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(
        productWithUnits('p-tequila', [
          unitRow({ unitRole: 'MOU', dependsOn: 'BASE', conversionRate: decimal(12) }),
        ]) as never,
      );

      const result = await service.listProductUnits(SCOPE, 'p-tequila');

      expect(result).toEqual([
        {
          id: 'pu-bottle',
          productId: 'p-tequila',
          name: 'Bottle',
          purchaseCapable: true,
          sellCapable: true,
          unitRole: 'MOU',
          dependsOn: 'BASE',
          conversionRate: 12,
          price: 950,
        },
      ]);
    });

    it('answers with an empty list when the product has no units', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(productWithUnits('p-1', []) as never);

      await expect(service.listProductUnits(SCOPE, 'p-1')).resolves.toEqual([]);
    });

    it('passes a missing parent unit and conversion rate through as null', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(
        productWithUnits('p-1', [unitRow({ dependsOn: null, conversionRate: null })]) as never,
      );

      const result = await service.listProductUnits(SCOPE, 'p-1');

      expect(result[0]).toMatchObject({ dependsOn: null, conversionRate: null });
    });

    it('fails the request when the product is not found in the business', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(null as never);

      await expect(service.listProductUnits(SCOPE, 'p-missing')).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
        message: expect.any(String),
      });
    });

    it('orders units by their place in the hierarchy, then by name within a role', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(
        productWithUnits('p-1', [
          unitRow({ id: 'pu-1', name: 'Ziplock', unitRole: 'CUSTOM' }),
          unitRow({ id: 'pu-2', name: 'Milliliter', unitRole: 'STANDARD' }),
          unitRow({ id: 'pu-3', name: 'Bag', unitRole: 'CUSTOM' }),
          unitRow({ id: 'pu-4', name: 'Box', unitRole: 'MOU' }),
          unitRow({ id: 'pu-5', name: 'Bottle', unitRole: 'BASE' }),
        ]) as never,
      );

      const result = await service.listProductUnits(SCOPE, 'p-1');

      expect(result.map((unit) => unit.unitRole)).toEqual([
        'BASE',
        'MOU',
        'STANDARD',
        'CUSTOM',
        'CUSTOM',
      ]);
      expect(result.map((unit) => unit.name)).toEqual([
        'Bottle',
        'Box',
        'Milliliter',
        'Bag',
        'Ziplock',
      ]);
    });
  });

  describe('getProduct', () => {
    it('calls getByIdWithUnits with the id and business id', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(prismaProduct() as never);

      await service.getProduct('p-1', 'b-1', 'br-1');

      expect(repo.getByIdWithUnits).toHaveBeenCalledWith('p-1', 'b-1');
    });

    it('throws NOT_FOUND when the record is not found', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(null);

      await expect(service.getProduct('missing', 'b-1', 'br-1')).rejects.toEqual(
        new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404),
      );
    });

    it('throws BAD_REQUEST when the product id is missing', async () => {
      await expect(service.getProduct(undefined, 'b-1', 'br-1')).rejects.toEqual(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Missing product id', 400),
      );
    });

    it('maps the found record to the domain shape', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(
        prismaProduct({ lowStockThreshold: decimal(4) }) as never,
      );

      const result = await service.getProduct('p-1', 'b-1', 'br-1');

      expect(result).toMatchObject({
        id: 'p-1',
        name: 'Sugar',
        lowStockThreshold: 4,
        units: [],
      });
    });

    it('includes the mapped units of the product', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(
        prismaProduct({ productUnits: [prismaUnit(), prismaUnit({ id: 'pu-2' })] }) as never,
      );

      const result = await service.getProduct('p-1', 'b-1', 'br-1');

      expect(result.units).toMatchObject([
        { id: 'pu-1', conversionRate: null, price: 50 },
        { id: 'pu-2', conversionRate: null, price: 50 },
      ]);
    });

    it('fetches the attachment for the resolved product', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(prismaProduct() as never);

      await service.getProduct('p-1', 'b-1', 'br-1');

      expect(repo.getProductAttachment).toHaveBeenCalledWith('p-1');
    });

    it('exposes the uploadId of the live attachment', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(prismaProduct() as never);
      vi.mocked(repo.getProductAttachment).mockResolvedValue({
        uploadId: 'u-1',
      } as never);

      const result = await service.getProduct('p-1', 'b-1', 'br-1');

      expect(result.uploadId).toBe('u-1');
    });
  });

  describe('createProduct', () => {
    it('calls createForBusiness with the business, branch and input', async () => {
      vi.mocked(repo.createForBusiness).mockResolvedValue({
        ...prismaProduct(),
        units: [prismaUnit()],
      } as never);

      await service.createProduct(
        'b-1',
        'br-1',
        input({ baseUnit: { unitId: 'kg-1', price: 50 } }),
      );

      expect(repo.createForBusiness).toHaveBeenCalledWith(
        'b-1',
        'br-1',
        input({ baseUnit: { unitId: 'kg-1', price: 50 } }),
      );
    });

    it('maps the created record to the domain shape including units', async () => {
      vi.mocked(repo.createForBusiness).mockResolvedValue({
        ...prismaProduct({ lowStockThreshold: decimal(0) }),
        units: [prismaUnit()],
      } as never);

      const result = await service.createProduct('b-1', 'br-1', input());

      expect(result).toMatchObject({
        id: 'p-1',
        lowStockThreshold: 0,
        currentSealedStock: 0,
        units: [{ id: 'pu-1', conversionRate: null, price: 50 }],
      });
    });

    it('propagates the base unit error from the repository', async () => {
      vi.mocked(repo.createForBusiness).mockRejectedValue(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Base unit not found', 400),
      );

      await expect(service.createProduct('b-1', 'br-1', input())).rejects.toEqual(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Base unit not found', 400),
      );
    });

    it('passes the uploadId through to the repository input', async () => {
      vi.mocked(repo.createForBusiness).mockResolvedValue({
        ...prismaProduct(),
        units: [prismaUnit()],
      } as never);

      await service.createProduct('b-1', 'br-1', input({ uploadId: 'u-1' }));

      const repoInput = vi.mocked(repo.createForBusiness).mock.calls[0]?.[2];
      expect(repoInput?.uploadId).toBe('u-1');
    });

    it('exposes the uploadId from the created attachment', async () => {
      vi.mocked(repo.createForBusiness).mockResolvedValue({
        ...prismaProduct(),
        units: [prismaUnit()],
        attachment: { id: 'a-1', uploadId: 'u-1' },
      } as never);

      const result = await service.createProduct('b-1', 'br-1', input());

      expect(result.uploadId).toBe('u-1');
      expect(result).not.toHaveProperty('attachment');
    });

    it('exposes a null uploadId when no attachment was created', async () => {
      vi.mocked(repo.createForBusiness).mockResolvedValue({
        ...prismaProduct(),
        units: [prismaUnit()],
        attachment: null,
      } as never);

      const result = await service.createProduct('b-1', 'br-1', input());

      expect(result.uploadId).toBeNull();
    });
  });

  describe('resolveUploadId', () => {
    it('returns the uploadId of the product live attachment', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(prismaProduct() as never);
      vi.mocked(repo.getProductAttachment).mockResolvedValue({ uploadId: 'u-1' } as never);

      const result = await service.resolveUploadId('p-1', 'b-1');

      expect(repo.getByIdWithUnits).toHaveBeenCalledWith('p-1', 'b-1');
      expect(repo.getProductAttachment).toHaveBeenCalledWith('p-1');
      expect(result).toBe('u-1');
    });

    it('throws NOT_FOUND when the product is not in scope', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(null);

      await expect(service.resolveUploadId('p-1', 'b-1')).rejects.toEqual(
        new AppError(ERROR_CODES.NOT_FOUND, 'Upload not found', 404),
      );
      expect(repo.getProductAttachment).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the product has no live attachment', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(prismaProduct() as never);
      vi.mocked(repo.getProductAttachment).mockResolvedValue(null);

      await expect(service.resolveUploadId('p-1', 'b-1')).rejects.toEqual(
        new AppError(ERROR_CODES.NOT_FOUND, 'Upload not found', 404),
      );
      expect(repo.getProductAttachment).toHaveBeenCalledWith('p-1');
    });

    it('throws BAD_REQUEST when the product id is missing', async () => {
      await expect(service.resolveUploadId(undefined, 'b-1')).rejects.toEqual(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Missing product id', 400),
      );
    });

    it('throws UNAUTHORIZED when the business id is missing', async () => {
      await expect(service.resolveUploadId('p-1', undefined)).rejects.toEqual(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );
    });
  });

  describe('resolveUploadIds', () => {
    it('returns the deduped uploadIds of the active products live attachments', async () => {
      vi.mocked(repo.listForBusiness).mockResolvedValue([
        prismaProduct({ id: 'p-1' }),
        prismaProduct({ id: 'p-2' }),
      ] as never);
      vi.mocked(repo.listAttachmentsForProducts).mockResolvedValue([
        { recordId: 'p-1', uploadId: 'u-1' },
        { recordId: 'p-2', uploadId: 'u-2' },
        { recordId: 'p-1', uploadId: 'u-1' },
        { recordId: 'p-1', uploadId: null },
      ] as never);

      const result = await service.resolveUploadIds('b-1', 'br-1');

      expect(repo.listForBusiness).toHaveBeenCalledWith('b-1', 'br-1');
      expect(repo.listAttachmentsForProducts).toHaveBeenCalledWith(['p-1', 'p-2']);
      expect(result).toEqual(['u-1', 'u-2']);
    });

    it('returns an empty list when there are no products', async () => {
      vi.mocked(repo.listForBusiness).mockResolvedValue([] as never);

      const result = await service.resolveUploadIds('b-1', 'br-1');

      expect(result).toEqual([]);
      expect(repo.listAttachmentsForProducts).not.toHaveBeenCalled();
    });

    it('throws UNAUTHORIZED when the business id is missing', async () => {
      await expect(service.resolveUploadIds(undefined, 'br-1')).rejects.toEqual(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );
    });

    it('throws UNAUTHORIZED when the branch id is missing', async () => {
      await expect(service.resolveUploadIds('b-1', undefined)).rejects.toEqual(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProductsService } from '../products.service.js';
import type {
  CreateProductInput,
  ProductRecord,
  ProductRepository,
  ProductService,
  ProductUnitRecord,
} from '../products.types.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import type { Decimal } from '../../../../generated/prisma/internal/prismaNamespace.js';

function mockRepository(): ProductRepository {
  return {
    list: vi.fn(),
    getById: vi.fn(),
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
    baseUnit: { unitId: 'kg-1', price: '50' },
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
  return { toNumber: () => value };
}

function prismaProduct(overrides: Record<string, unknown> = {}): ProductRecord {
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
    it('calls list with the business and branch ids', async () => {
      vi.mocked(repo.list).mockResolvedValue([] as never);

      await service.listProducts('b-1', 'br-1');

      expect(repo.list).toHaveBeenCalledWith('b-1', 'br-1');
    });

    it('skips the attachment lookup when there are no products', async () => {
      vi.mocked(repo.list).mockResolvedValue([] as never);

      await service.listProducts('b-1', 'br-1');

      expect(repo.listAttachmentsForProducts).not.toHaveBeenCalled();
    });

    it('fetches attachments for the resolved product ids', async () => {
      vi.mocked(repo.list).mockResolvedValue([
        prismaProduct({ id: 'p-1' }),
        prismaProduct({ id: 'p-2' }),
      ] as never);

      await service.listProducts('b-1', 'br-1');

      expect(repo.listAttachmentsForProducts).toHaveBeenCalledWith(['p-1', 'p-2']);
    });

    it('maps stored products to the domain shape', async () => {
      vi.mocked(repo.list).mockResolvedValue([prismaProduct()] as never);

      const result = await service.listProducts('b-1', 'br-1');

      expect(result).toEqual([
        {
          ...prismaProduct(),
          lowStockThreshold: null,
          currentSealedStock: 0,
          uploadId: null,
        },
      ]);
    });

    it('converts non-null decimals to numbers and keeps zero as 0', async () => {
      vi.mocked(repo.list).mockResolvedValue([
        prismaProduct({
          lowStockThreshold: decimal(10),
          currentSealedStock: decimal(0),
        }),
      ] as never);

      const result = await service.listProducts('b-1', 'br-1');

      expect(result[0]).toMatchObject({ lowStockThreshold: 10, currentSealedStock: 0 });
    });

    it('exposes the uploadId of the first live attachment', async () => {
      vi.mocked(repo.list).mockResolvedValue([prismaProduct()] as never);
      vi.mocked(repo.listAttachmentsForProducts).mockResolvedValue([
        { recordId: 'p-1', uploadId: 'u-1' },
      ] as never);

      const result = await service.listProducts('b-1', 'br-1');

      expect(result[0]?.uploadId).toBe('u-1');
    });

    it('maps uploadId from the first attachment only', async () => {
      vi.mocked(repo.list).mockResolvedValue([prismaProduct()] as never);
      vi.mocked(repo.listAttachmentsForProducts).mockResolvedValue([
        { recordId: 'p-1', uploadId: 'u-1' },
        { recordId: 'p-1', uploadId: 'u-2' },
      ] as never);

      const result = await service.listProducts('b-1', 'br-1');

      expect(result[0]?.uploadId).toBe('u-1');
    });

    it('groups attachments to their matching product', async () => {
      vi.mocked(repo.list).mockResolvedValue([
        prismaProduct({ id: 'p-1' }),
        prismaProduct({ id: 'p-2' }),
      ] as never);
      vi.mocked(repo.listAttachmentsForProducts).mockResolvedValue([
        { recordId: 'p-1', uploadId: 'u-1' },
        { recordId: 'p-2', uploadId: 'u-2' },
      ] as never);

      const result = await service.listProducts('b-1', 'br-1');

      expect(result[0]?.uploadId).toBe('u-1');
      expect(result[1]?.uploadId).toBe('u-2');
    });

    it('throws UNAUTHORIZED when the business id is missing', async () => {
      await expect(service.listProducts(undefined, 'br-1')).rejects.toEqual(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );
    });

    it('throws UNAUTHORIZED when the branch id is missing', async () => {
      await expect(service.listProducts('b-1', undefined)).rejects.toEqual(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );
    });
  });

  describe('getProduct', () => {
    it('calls getById with the id and business id', async () => {
      vi.mocked(repo.getById).mockResolvedValue(prismaProduct() as never);

      await service.getProduct('p-1', 'b-1', 'br-1');

      expect(repo.getById).toHaveBeenCalledWith('p-1', 'b-1');
    });

    it('throws NOT_FOUND when the record is not found', async () => {
      vi.mocked(repo.getById).mockResolvedValue(null);

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
      vi.mocked(repo.getById).mockResolvedValue(
        prismaProduct({ lowStockThreshold: decimal(4) }) as never,
      );

      const result = await service.getProduct('p-1', 'b-1', 'br-1');

      expect(result).toMatchObject({
        id: 'p-1',
        name: 'Sugar',
        lowStockThreshold: 4,
      });
    });

    it('fetches the attachment for the resolved product', async () => {
      vi.mocked(repo.getById).mockResolvedValue(prismaProduct() as never);

      await service.getProduct('p-1', 'b-1', 'br-1');

      expect(repo.getProductAttachment).toHaveBeenCalledWith('p-1');
    });

    it('exposes the uploadId of the live attachment', async () => {
      vi.mocked(repo.getById).mockResolvedValue(prismaProduct() as never);
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
        input({ baseUnit: { unitId: 'kg-1', price: '50' } }),
      );

      expect(repo.createForBusiness).toHaveBeenCalledWith(
        'b-1',
        'br-1',
        input({ baseUnit: { unitId: 'kg-1', price: '50' } }),
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
      vi.mocked(repo.getById).mockResolvedValue(prismaProduct() as never);
      vi.mocked(repo.getProductAttachment).mockResolvedValue({ uploadId: 'u-1' } as never);

      const result = await service.resolveUploadId('p-1', 'b-1');

      expect(repo.getById).toHaveBeenCalledWith('p-1', 'b-1');
      expect(repo.getProductAttachment).toHaveBeenCalledWith('p-1');
      expect(result).toBe('u-1');
    });

    it('throws NOT_FOUND when the product is not in scope', async () => {
      vi.mocked(repo.getById).mockResolvedValue(null);

      await expect(service.resolveUploadId('p-1', 'b-1')).rejects.toEqual(
        new AppError(ERROR_CODES.NOT_FOUND, 'Upload not found', 404),
      );
      expect(repo.getProductAttachment).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the product has no live attachment', async () => {
      vi.mocked(repo.getById).mockResolvedValue(prismaProduct() as never);
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
      vi.mocked(repo.list).mockResolvedValue([
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

      expect(repo.list).toHaveBeenCalledWith('b-1', 'br-1');
      expect(repo.listAttachmentsForProducts).toHaveBeenCalledWith(['p-1', 'p-2']);
      expect(result).toEqual(['u-1', 'u-2']);
    });

    it('returns an empty list when there are no products', async () => {
      vi.mocked(repo.list).mockResolvedValue([] as never);

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

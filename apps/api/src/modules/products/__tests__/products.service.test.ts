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
    photoId: null,
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

    it('maps stored products to the domain shape', async () => {
      vi.mocked(repo.list).mockResolvedValue([prismaProduct()] as never);

      const result = await service.listProducts('b-1', 'br-1');

      expect(result).toEqual([
        {
          ...prismaProduct(),
          lowStockThreshold: null,
          currentSealedStock: 0,
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
  });
});

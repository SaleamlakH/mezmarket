import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProductService } from '../products.service.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';
import type {
  ProductRepository,
  ProductRecordWithBaseUnit,
  ProductRecordWithUnits,
  ProductUnitRecord,
} from '../products.types.js';
import type { Prisma } from '../../../../generated/prisma/client.js';

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
    photoUrl: null,
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

/** The row `getProductWithUnits` answers with: the product and all of its units. */
function productWithUnits(id: string, productUnits: ProductUnitRecord[]): ProductRecordWithUnits {
  return { ...productRow({ id }), productUnits };
}

function mockRepository(): ProductRepository {
  return { listProducts: vi.fn(), getProductWithUnits: vi.fn() };
}

describe('products.service', () => {
  let repository: ProductRepository;
  let service: ReturnType<typeof createProductService>;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = mockRepository();
    service = createProductService(repository);
  });

  describe('listProducts', () => {
    it('answers with one summary per product, holding exactly the summary fields', async () => {
      vi.mocked(repository.listProducts).mockResolvedValue([
        productRow(),
        productRow({ id: 'p-tshirt', name: 'T-Shirt', brand: null, active: false }),
      ]);

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
        },
        {
          id: 'p-tshirt',
          name: 'T-Shirt',
          brand: null,
          currentSealedStock: 42,
          lowStockThreshold: null,
          active: false,
          baseUnitLabel: 'Bottle',
        },
      ]);
    });

    it('answers with an empty list when the business has no products', async () => {
      vi.mocked(repository.listProducts).mockResolvedValue([]);

      await expect(service.listProducts(SCOPE)).resolves.toEqual([]);
    });

    it('fails the request when a product has no base unit to label its stock with', async () => {
      vi.mocked(repository.listProducts).mockResolvedValue([productRow({ productUnits: [] })]);

      await expect(service.listProducts(SCOPE)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_ERROR,
        statusCode: 500,
        message: expect.any(String),
      });
    });

    it('passes an unset brand and low stock threshold through as null', async () => {
      vi.mocked(repository.listProducts).mockResolvedValue([
        productRow({ brand: null, lowStockThreshold: null }),
      ]);

      const result = await service.listProducts(SCOPE);

      expect(result[0]).toMatchObject({ brand: null, lowStockThreshold: null });
    });
  });

  describe('listProductUnits', () => {
    it('answers with one option per unit, holding exactly the option fields', async () => {
      vi.mocked(repository.getProductWithUnits).mockResolvedValue(
        productWithUnits('p-tequila', [
          unitRow({ unitRole: 'MOU', dependsOn: 'BASE', conversionRate: decimal(12) }),
        ]),
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
        },
      ]);
    });

    it('answers with an empty list when the product has no units', async () => {
      vi.mocked(repository.getProductWithUnits).mockResolvedValue(productWithUnits('p-1', []));

      await expect(service.listProductUnits(SCOPE, 'p-1')).resolves.toEqual([]);
    });

    it('passes a missing parent unit and conversion rate through as null', async () => {
      vi.mocked(repository.getProductWithUnits).mockResolvedValue(
        productWithUnits('p-1', [unitRow({ dependsOn: null, conversionRate: null })]),
      );

      const result = await service.listProductUnits(SCOPE, 'p-1');

      expect(result[0]).toMatchObject({ dependsOn: null, conversionRate: null });
    });

    it('fails the request when the product is not found in the business', async () => {
      vi.mocked(repository.getProductWithUnits).mockResolvedValue(null);

      await expect(service.listProductUnits(SCOPE, 'p-missing')).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
        message: expect.any(String),
      });
    });

    it('orders units by their place in the hierarchy, then by name within a role', async () => {
      vi.mocked(repository.getProductWithUnits).mockResolvedValue(
        productWithUnits('p-1', [
          unitRow({ id: 'pu-1', name: 'Ziplock', unitRole: 'CUSTOM' }),
          unitRow({ id: 'pu-2', name: 'Milliliter', unitRole: 'STANDARD' }),
          unitRow({ id: 'pu-3', name: 'Bag', unitRole: 'CUSTOM' }),
          unitRow({ id: 'pu-4', name: 'Box', unitRole: 'MOU' }),
          unitRow({ id: 'pu-5', name: 'Bottle', unitRole: 'BASE' }),
        ]),
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
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProductsService } from '../products.service.js';
import type {
  CreateProductInput,
  CreateProductRepoResult,
  CreateProductUnitInput,
  ProductListFilters,
  ProductRecord,
  ProductRecordWithBaseUnit,
  ProductRecordWithUnits,
  ProductRepository,
  ProductService,
  ProductUnitRecord,
  StandardUnitRecord,
  UpdateProductInput,
  UpdateProductRepoResult,
  UpdateProductUnitsInput,
} from '../products.types.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';
import type { Decimal } from '../../../../generated/prisma/internal/prismaNamespace.js';
import type { Prisma } from '../../../../generated/prisma/client.js';

function mockRepository(): ProductRepository {
  return {
    listForBusiness: vi.fn(),
    getByIdWithUnits: vi.fn(),
    listAttachmentsForProducts: vi.fn().mockResolvedValue([]),
    getProductAttachment: vi.fn().mockResolvedValue(null),
    findStandardUnits: vi.fn().mockResolvedValue([]),
    createProduct: vi.fn(),
    createUnit: vi.fn(),
    updateUnits: vi.fn().mockResolvedValue(updateRow()),
    updateProduct: vi.fn(),
    setActive: vi.fn(),
  };
}

const ACTIVE: ProductListFilters = { status: 'active' };

function input(overrides: Partial<CreateProductInput> = {}): CreateProductInput {
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

function updateInput(overrides: Partial<UpdateProductInput> = {}): UpdateProductInput {
  return {
    name: 'Sugar',
    categoryId: null,
    brand: null,
    description: null,
    trackAsPartial: false,
    lowStockThreshold: null,
    ...overrides,
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

function standardUnitRow(id: string, symbol: string, dimensionId: string): StandardUnitRecord {
  return { id, symbol, dimensionId } as unknown as StandardUnitRecord;
}

function updateRow(overrides: Record<string, unknown> = {}): UpdateProductRepoResult {
  return {
    ...prismaProduct(),
    productUnits: [prismaUnit()],
    attachments: [],
    ...overrides,
  } as UpdateProductRepoResult;
}

function createdRow(overrides: Record<string, unknown> = {}): CreateProductRepoResult {
  return {
    ...prismaProduct(),
    units: [prismaUnit()],
    attachment: null,
    ...overrides,
  } as CreateProductRepoResult;
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

      const result = await service.listProducts(SCOPE, ACTIVE);

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

      await expect(service.listProducts(SCOPE, ACTIVE)).resolves.toEqual([]);
    });

    it('fails the request when a product has no base unit to label its stock with', async () => {
      vi.mocked(repo.listForBusiness).mockResolvedValue([
        productRow({ productUnits: [] }),
      ] as never);

      await expect(service.listProducts(SCOPE, ACTIVE)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_ERROR,
        statusCode: 500,
        message: expect.any(String),
      });
    });

    it('passes an unset brand and low stock threshold through as null', async () => {
      vi.mocked(repo.listForBusiness).mockResolvedValue([
        productRow({ brand: null, lowStockThreshold: null }),
      ] as never);

      const result = await service.listProducts(SCOPE, ACTIVE);

      expect(result[0]).toMatchObject({ brand: null, lowStockThreshold: null });
    });

    it('skips the attachment lookup when there are no products', async () => {
      vi.mocked(repo.listForBusiness).mockResolvedValue([] as never);

      await service.listProducts(SCOPE, ACTIVE);

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

      const result = await service.listProducts(SCOPE, ACTIVE);

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

      await expect(service.getProduct('missing', 'b-1', 'br-1')).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
        message: expect.any(String),
      });
    });

    it('throws BAD_REQUEST when the product id is missing', async () => {
      await expect(service.getProduct(undefined, 'b-1', 'br-1')).rejects.toMatchObject({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        message: expect.any(String),
      });
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
    const base = standardUnitRow('kg-1', 'kg', 'mass');

    function standards(rows: StandardUnitRecord[]) {
      vi.mocked(repo.findStandardUnits).mockImplementation((ids) =>
        Promise.resolve(rows.filter((row) => ids.includes(row.id))),
      );
    }

    it('resolves the standard unit the base unit names', async () => {
      standards([base]);
      vi.mocked(repo.createProduct).mockResolvedValue(createdRow());

      await service.createProduct('b-1', 'br-1', input());

      expect(repo.findStandardUnits).toHaveBeenCalledWith(['kg-1']);
    });

    it('hands the repository a command built from the resolved standard units', async () => {
      const mou = standardUnitRow('pc-1', 'pc', 'count');
      standards([base, mou]);
      vi.mocked(repo.createProduct).mockResolvedValue(createdRow());

      const payload = input({
        baseUnit: { unitId: 'kg-1', price: 50 },
        mou: { unitId: 'pc-1', conversionRate: 12 },
      });
      await service.createProduct('b-1', 'br-1', payload);

      expect(repo.findStandardUnits).toHaveBeenCalledWith(['kg-1', 'pc-1']);
      expect(repo.createProduct).toHaveBeenCalledWith({
        businessId: 'b-1',
        branchId: 'br-1',
        product: payload,
        baseStandardUnit: { id: 'kg-1', name: 'kg' },
        mouStandardUnit: { id: 'pc-1', name: 'pc' },
      });
    });

    it('fails the request when the base unit names no standard unit', async () => {
      standards([]);

      await expect(service.createProduct('b-1', 'br-1', input())).rejects.toMatchObject({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        message: expect.any(String),
      });
      expect(repo.createProduct).not.toHaveBeenCalled();
    });

    it('fails the request when the content unit names no standard unit', async () => {
      standards([base]);

      await expect(
        service.createProduct(
          'b-1',
          'br-1',
          input({ mou: { unitId: 'pc-1', conversionRate: 12 } }),
        ),
      ).rejects.toMatchObject({
        code: ERROR_CODES.BAD_REQUEST,
        message: expect.any(String),
      });
    });

    it('fails the request when the content unit is in the base unit dimension', async () => {
      standards([base, standardUnitRow('kg-2', 'kg', 'mass')]);

      await expect(
        service.createProduct('b-1', 'br-1', input({ mou: { unitId: 'kg-2', conversionRate: 2 } })),
      ).rejects.toMatchObject({
        message: expect.any(String),
      });
    });

    it('refuses a custom unit named after the base unit, pointing at its field', async () => {
      standards([base]);

      await expect(
        service.createProduct(
          'b-1',
          'br-1',
          input({
            customUnits: [
              {
                name: 'Shot',
                dependsOn: 'BASE',
                conversionRate: 25,
                purchaseCapable: true,
                sellCapable: false,
              },
              {
                name: ' kg ',
                dependsOn: 'BASE',
                conversionRate: 30,
                purchaseCapable: true,
                sellCapable: false,
              },
            ],
          }),
        ),
      ).rejects.toMatchObject({
        code: ERROR_CODES.BAD_REQUEST,
        details: { 'customUnits.1.name': expect.any(String) },
      });
      expect(repo.createProduct).not.toHaveBeenCalled();
    });

    it('refuses two custom units that share a name', async () => {
      standards([base]);

      await expect(
        service.createProduct(
          'b-1',
          'br-1',
          input({
            customUnits: [
              {
                name: 'Shot',
                dependsOn: 'BASE',
                conversionRate: 25,
                purchaseCapable: true,
                sellCapable: false,
              },
              {
                name: 'shot ',
                dependsOn: 'BASE',
                conversionRate: 30,
                purchaseCapable: true,
                sellCapable: false,
              },
            ],
          }),
        ),
      ).rejects.toMatchObject({
        details: { 'customUnits.1.name': expect.any(String) },
      });
    });

    it('answers a racing name clash with the fieldless message', async () => {
      standards([base]);
      vi.mocked(repo.createProduct).mockRejectedValue({ code: 'P2002' });

      await expect(service.createProduct('b-1', 'br-1', input())).rejects.toMatchObject({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        message: expect.any(String),
      });
    });

    it('maps the created record including its units and image', async () => {
      standards([base]);
      vi.mocked(repo.createProduct).mockResolvedValue(
        createdRow({ attachment: { id: 'a-1', uploadId: 'u-1' } }),
      );

      const result = await service.createProduct('b-1', 'br-1', input());

      expect(result).toMatchObject({
        id: 'p-1',
        currentSealedStock: 0,
        uploadId: 'u-1',
        units: [{ id: 'pu-1', price: 50 }],
      });
      expect(result).not.toHaveProperty('attachment');
    });

    it('exposes a null uploadId when no attachment was created', async () => {
      standards([base]);
      vi.mocked(repo.createProduct).mockResolvedValue(createdRow({ attachment: null }));

      const result = await service.createProduct('b-1', 'br-1', input());

      expect(result.uploadId).toBeNull();
    });

    it('throws UNAUTHORIZED when the scope is missing', async () => {
      await expect(service.createProduct(undefined, undefined, input())).rejects.toMatchObject({
        code: ERROR_CODES.UNAUTHORIZED,
        statusCode: 401,
        message: expect.any(String),
      });
    });
  });

  describe('createProductUnit', () => {
    const customPayload: CreateProductUnitInput = {
      unitRole: 'CUSTOM',
      name: 'Shot',
      dependsOn: 'BASE',
      conversionRate: 25,
      purchaseCapable: true,
      sellCapable: true,
      price: 120,
    };

    const baseUnit = prismaUnit({
      id: 'pu-base',
      unitRole: 'BASE',
      standardUnitId: 'kg-1',
      name: 'kg',
      dependsOn: null,
      conversionRate: null,
    });

    function standards(rows: StandardUnitRecord[]) {
      vi.mocked(repo.findStandardUnits).mockImplementation((ids) =>
        Promise.resolve(rows.filter((row) => ids.includes(row.id))),
      );
    }

    it('writes a custom unit the owner named, with the capabilities and price given', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(
        productWithUnits('p-1', [baseUnit]) as never,
      );
      const createdUnit = prismaUnit({
        id: 'pu-custom',
        unitRole: 'CUSTOM',
        standardUnitId: null,
        name: 'Shot',
        dependsOn: 'BASE',
        conversionRate: decimal(25),
        price: decimal(120),
      });
      vi.mocked(repo.createUnit).mockResolvedValue(
        updateRow({ productUnits: [baseUnit, createdUnit] }) as never,
      );

      const result = await service.createProductUnit('p-1', 'b-1', 'br-1', customPayload);

      expect(repo.createUnit).toHaveBeenCalledWith({
        productId: 'p-1',
        unitRole: 'CUSTOM',
        standardUnitId: null,
        name: 'Shot',
        dependsOn: 'BASE',
        conversionRate: 25,
        price: 120,
        purchaseCapable: true,
        sellCapable: true,
      });
      expect(result).toMatchObject({
        id: 'p-1',
        units: [
          { id: 'pu-base' },
          { id: 'pu-custom', unitRole: 'CUSTOM', conversionRate: 25, price: 120 },
        ],
      });
    });

    it('leaves the price off a custom unit that cannot be sold', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(
        productWithUnits('p-1', [baseUnit]) as never,
      );
      vi.mocked(repo.createUnit).mockResolvedValue(updateRow() as never);

      const payload: CreateProductUnitInput = {
        unitRole: 'CUSTOM',
        name: 'Box',
        dependsOn: 'BASE',
        conversionRate: 12,
        purchaseCapable: true,
        sellCapable: false,
      };
      await service.createProductUnit('p-1', 'b-1', 'br-1', payload);

      const passed = vi.mocked(repo.createUnit).mock.calls[0]?.[0];
      expect(passed).toMatchObject({ name: 'Box', sellCapable: false });
      expect(passed).not.toHaveProperty('price');
    });

    it('refuses a name another unit already holds, pointing at the field', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(
        productWithUnits('p-1', [baseUnit]) as never,
      );

      await expect(
        service.createProductUnit('p-1', 'b-1', 'br-1', { ...customPayload, name: ' kg ' }),
      ).rejects.toMatchObject({
        code: ERROR_CODES.BAD_REQUEST,
        details: { name: expect.any(String) },
      });
      expect(repo.createUnit).not.toHaveBeenCalled();
    });

    it('refuses a unit based on a content unit when there is none yet', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(
        productWithUnits('p-1', [baseUnit]) as never,
      );

      await expect(
        service.createProductUnit('p-1', 'b-1', 'br-1', { ...customPayload, dependsOn: 'MOU' }),
      ).rejects.toMatchObject({
        details: {
          dependsOn: 'Set a content unit first, or base this unit on the base unit instead',
        },
      });
    });

    it('fails the request when the product is not found in the business', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(null);

      await expect(
        service.createProductUnit('p-missing', 'b-1', 'br-1', customPayload),
      ).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
        message: expect.any(String),
      });
    });

    it('writes a content unit named after its standard unit', async () => {
      standards([standardUnitRow('kg-1', 'kg', 'mass'), standardUnitRow('ml-1', 'ml', 'volume')]);
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(
        productWithUnits('p-1', [baseUnit]) as never,
      );
      const createdMou = prismaUnit({
        id: 'pu-mou',
        unitRole: 'MOU',
        standardUnitId: 'ml-1',
        name: 'ml',
        dependsOn: 'BASE',
        conversionRate: decimal(750),
        price: decimal(40),
        purchaseCapable: false,
        sellCapable: true,
      });
      vi.mocked(repo.createUnit).mockResolvedValue(
        updateRow({ productUnits: [baseUnit, createdMou] }) as never,
      );

      const result = await service.createProductUnit('p-1', 'b-1', 'br-1', {
        unitRole: 'MOU',
        unitId: 'ml-1',
        conversionRate: 750,
        price: 40,
      });

      expect(repo.createUnit).toHaveBeenCalledWith({
        productId: 'p-1',
        unitRole: 'MOU',
        standardUnitId: 'ml-1',
        name: 'ml',
        dependsOn: 'BASE',
        conversionRate: 750,
        price: 40,
        purchaseCapable: false,
        sellCapable: true,
      });
      expect(result).toMatchObject({
        id: 'p-1',
        units: [{ id: 'pu-base' }, { id: 'pu-mou', unitRole: 'MOU', conversionRate: 750 }],
      });
    });

    it('refuses a second content unit', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(
        productWithUnits('p-1', [
          baseUnit,
          prismaUnit({
            id: 'pu-mou',
            unitRole: 'MOU',
            standardUnitId: 'ml-1',
            name: 'ml',
            dependsOn: 'BASE',
            conversionRate: decimal(750),
          }),
        ]) as never,
      );

      await expect(
        service.createProductUnit('p-1', 'b-1', 'br-1', {
          unitRole: 'MOU',
          unitId: 'ml-1',
          conversionRate: 750,
        }),
      ).rejects.toMatchObject({
        details: { unitRole: expect.any(String) },
      });
    });

    it('refuses a content unit that names no standard unit', async () => {
      standards([standardUnitRow('kg-1', 'kg', 'mass')]);
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(
        productWithUnits('p-1', [baseUnit]) as never,
      );

      await expect(
        service.createProductUnit('p-1', 'b-1', 'br-1', {
          unitRole: 'MOU',
          unitId: 'ml-1',
          conversionRate: 750,
        }),
      ).rejects.toMatchObject({ details: { unitId: expect.any(String) } });
    });

    it('refuses a content unit in the base unit dimension', async () => {
      standards([standardUnitRow('kg-1', 'kg', 'mass'), standardUnitRow('kg-2', 'kg', 'mass')]);
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(
        productWithUnits('p-1', [baseUnit]) as never,
      );

      await expect(
        service.createProductUnit('p-1', 'b-1', 'br-1', {
          unitRole: 'MOU',
          unitId: 'kg-2',
          conversionRate: 2,
        }),
      ).rejects.toMatchObject({
        details: { unitId: expect.any(String) },
      });
    });

    it('refuses a content unit whose name another unit already holds', async () => {
      standards([standardUnitRow('kg-1', 'kg', 'mass'), standardUnitRow('ml-1', 'ml', 'volume')]);
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(
        productWithUnits('p-1', [
          baseUnit,
          prismaUnit({
            id: 'pu-x',
            unitRole: 'CUSTOM',
            standardUnitId: null,
            name: 'ml',
            dependsOn: 'BASE',
            conversionRate: decimal(750),
          }),
        ]) as never,
      );

      await expect(
        service.createProductUnit('p-1', 'b-1', 'br-1', {
          unitRole: 'MOU',
          unitId: 'ml-1',
          conversionRate: 750,
        }),
      ).rejects.toMatchObject({
        details: { unitId: expect.any(String) },
      });
    });

    it('answers a racing name clash with the fieldless message', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(
        productWithUnits('p-1', [baseUnit]) as never,
      );
      vi.mocked(repo.createUnit).mockRejectedValue({ code: 'P2002' });

      await expect(
        service.createProductUnit('p-1', 'b-1', 'br-1', customPayload),
      ).rejects.toMatchObject({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        message: expect.any(String),
      });
    });

    it('throws BAD_REQUEST when the product id is missing', async () => {
      await expect(
        service.createProductUnit(undefined, 'b-1', 'br-1', customPayload),
      ).rejects.toMatchObject({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        message: expect.any(String),
      });
    });

    it('throws UNAUTHORIZED when the scope is missing', async () => {
      await expect(
        service.createProductUnit('p-1', undefined, undefined, customPayload),
      ).rejects.toMatchObject({
        code: ERROR_CODES.UNAUTHORIZED,
        statusCode: 401,
        message: expect.any(String),
      });
    });
  });

  describe('updateProduct', () => {
    it('checks the product is in scope, then writes the fields given', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(prismaProduct() as never);
      vi.mocked(repo.updateProduct).mockResolvedValue(updateRow() as never);

      const payload = updateInput({ name: 'Brown Sugar', categoryId: 'c-1' });
      await service.updateProduct('p-1', 'b-1', 'br-1', payload);

      expect(repo.getByIdWithUnits).toHaveBeenCalledWith('p-1', 'b-1');
      expect(repo.updateProduct).toHaveBeenCalledWith('p-1', payload);
    });

    it('fails the request when the product is not found in the business', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(null);

      await expect(
        service.updateProduct('p-missing', 'b-1', 'br-1', updateInput()),
      ).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
        message: expect.any(String),
      });
      expect(repo.updateProduct).not.toHaveBeenCalled();
    });

    it('maps the updated record including its units and image', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(prismaProduct() as never);
      vi.mocked(repo.updateProduct).mockResolvedValue(
        updateRow({
          lowStockThreshold: decimal(5),
          productUnits: [prismaUnit({ price: decimal(80) })],
          attachments: [{ uploadId: 'u-9' }],
        }) as never,
      );

      const result = await service.updateProduct('p-1', 'b-1', 'br-1', updateInput());

      expect(result).toMatchObject({
        id: 'p-1',
        lowStockThreshold: 5,
        uploadId: 'u-9',
        units: [{ id: 'pu-1', price: 80 }],
      });
    });

    it('throws BAD_REQUEST when the product id is missing', async () => {
      await expect(
        service.updateProduct(undefined, 'b-1', 'br-1', updateInput()),
      ).rejects.toMatchObject({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        message: expect.any(String),
      });
    });

    it('throws UNAUTHORIZED when the scope is missing', async () => {
      await expect(
        service.updateProduct('p-1', undefined, undefined, updateInput()),
      ).rejects.toMatchObject({
        code: ERROR_CODES.UNAUTHORIZED,
        statusCode: 401,
        message: expect.any(String),
      });
    });
  });

  describe('updateProductUnits', () => {
    const customUnit = prismaUnit({
      id: 'pu-c',
      unitRole: 'CUSTOM',
      standardUnitId: null,
      name: 'Shot',
      dependsOn: 'BASE',
      conversionRate: decimal(25),
      price: decimal(120),
    });
    const platformBase = prismaUnit({
      id: 'pu-b',
      unitRole: 'BASE',
      standardUnitId: 'kg-1',
      name: 'kg',
      dependsOn: null,
      conversionRate: null,
    });

    function productWith(units: ProductUnitRecord[]) {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(productWithUnits('p-1', units) as never);
    }

    it('fails the request when the product is not found in the business', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(null);

      await expect(
        service.updateProductUnits('p-missing', 'b-1', 'br-1', { units: [] }),
      ).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND, statusCode: 404 });
      expect(repo.updateUnits).not.toHaveBeenCalled();
    });

    it('writes the fields a custom unit edit carries and answers with the product', async () => {
      productWith([customUnit]);
      vi.mocked(repo.updateUnits).mockResolvedValue(
        updateRow({
          productUnits: [
            prismaUnit({
              id: 'pu-c',
              unitRole: 'CUSTOM',
              standardUnitId: null,
              name: 'Shot',
              dependsOn: 'BASE',
              conversionRate: decimal(25),
              price: decimal(75),
            }),
          ],
        }) as never,
      );

      const result = await service.updateProductUnits('p-1', 'b-1', 'br-1', {
        units: [
          {
            unitRole: 'CUSTOM',
            id: 'pu-c',
            name: 'Shot',
            purchaseCapable: true,
            sellCapable: true,
            price: 75,
          },
        ],
      });

      expect(repo.updateUnits).toHaveBeenCalledWith('p-1', [
        { id: 'pu-c', purchaseCapable: true, sellCapable: true, price: 75 },
      ]);
      expect(result).toMatchObject({
        id: 'p-1',
        units: [{ id: 'pu-c', price: 75 }],
      });
    });

    it('keeps the price of a custom unit when selling is turned off', async () => {
      productWith([customUnit]);
      vi.mocked(repo.updateUnits).mockResolvedValue(updateRow() as never);

      await service.updateProductUnits('p-1', 'b-1', 'br-1', {
        units: [
          {
            unitRole: 'CUSTOM',
            id: 'pu-c',
            name: 'Shot',
            purchaseCapable: true,
            sellCapable: false,
          },
        ],
      });

      expect(repo.updateUnits).toHaveBeenCalledWith('p-1', [
        { id: 'pu-c', purchaseCapable: true, sellCapable: false },
      ]);
    });

    it('writes a price and selling capability when a unit is turned sellable', async () => {
      productWith([prismaUnit({ ...customUnit, sellCapable: false, price: null })]);
      vi.mocked(repo.updateUnits).mockResolvedValue(updateRow() as never);

      await service.updateProductUnits('p-1', 'b-1', 'br-1', {
        units: [
          {
            unitRole: 'CUSTOM',
            id: 'pu-c',
            name: 'Shot',
            purchaseCapable: true,
            sellCapable: true,
            price: 5,
          },
        ],
      });

      expect(repo.updateUnits).toHaveBeenCalledWith('p-1', [
        { id: 'pu-c', price: 5, purchaseCapable: true, sellCapable: true },
      ]);
    });

    it('refuses a unit made sellable with no price on it', async () => {
      productWith([prismaUnit({ ...customUnit, sellCapable: false, price: null })]);

      await expect(
        service.updateProductUnits('p-1', 'b-1', 'br-1', {
          units: [
            {
              unitRole: 'CUSTOM',
              id: 'pu-c',
              name: 'Shot',
              purchaseCapable: true,
              sellCapable: true,
            },
          ],
        } as unknown as UpdateProductUnitsInput),
      ).rejects.toMatchObject({
        code: ERROR_CODES.BAD_REQUEST,
        details: { 'units.0.price': expect.any(String) },
      });
      expect(repo.updateUnits).not.toHaveBeenCalled();
    });

    it('refuses a unit that can neither be bought nor sold', async () => {
      productWith([customUnit]);

      await expect(
        service.updateProductUnits('p-1', 'b-1', 'br-1', {
          units: [
            {
              unitRole: 'CUSTOM',
              id: 'pu-c',
              name: 'Shot',
              purchaseCapable: false,
              sellCapable: false,
            },
          ],
        }),
      ).rejects.toMatchObject({
        details: { 'units.0.sellCapable': expect.any(String) },
      });
    });

    it('refuses a row that is not part of this product', async () => {
      productWith([customUnit]);

      await expect(
        service.updateProductUnits('p-1', 'b-1', 'br-1', {
          units: [
            {
              unitRole: 'CUSTOM',
              id: 'pu-x',
              name: 'Box',
              purchaseCapable: true,
              sellCapable: false,
            },
          ],
        }),
      ).rejects.toMatchObject({
        details: { 'units.0.id': expect.any(String) },
      });
    });

    it('refuses a row whose role does not match the stored unit', async () => {
      productWith([customUnit]);

      await expect(
        service.updateProductUnits('p-1', 'b-1', 'br-1', {
          units: [{ unitRole: 'BASE', id: 'pu-c', price: 60 }],
        }),
      ).rejects.toMatchObject({
        details: { 'units.0.unitRole': expect.any(String) },
      });
    });

    it('writes only the price on a base unit', async () => {
      productWith([platformBase]);
      vi.mocked(repo.updateUnits).mockResolvedValue(updateRow() as never);

      const result = await service.updateProductUnits('p-1', 'b-1', 'br-1', {
        units: [{ unitRole: 'BASE', id: 'pu-b', price: 60 }],
      });

      expect(repo.updateUnits).toHaveBeenCalledWith('p-1', [{ id: 'pu-b', price: 60 }]);
      expect(result).toMatchObject({ id: 'p-1' });
    });

    it('clears an MOU price when the payload sends null', async () => {
      const mou = prismaUnit({
        id: 'pu-m',
        unitRole: 'MOU',
        standardUnitId: 'ml-1',
        name: 'ml',
        dependsOn: 'BASE',
        conversionRate: decimal(750),
        price: decimal(40),
      });
      productWith([mou]);
      vi.mocked(repo.updateUnits).mockResolvedValue(updateRow() as never);

      await service.updateProductUnits('p-1', 'b-1', 'br-1', {
        units: [{ unitRole: 'MOU', id: 'pu-m', price: null }],
      });

      expect(repo.updateUnits).toHaveBeenCalledWith('p-1', [{ id: 'pu-m', price: null }]);
    });

    it('refuses a rename onto a name another unit holds, blaming the renamed row', async () => {
      productWith([
        prismaUnit({ ...customUnit, id: 'pu-a', name: 'Shot' }),
        prismaUnit({ ...customUnit, id: 'pu-b2', name: 'Box' }),
      ]);

      await expect(
        service.updateProductUnits('p-1', 'b-1', 'br-1', {
          units: [
            {
              unitRole: 'CUSTOM',
              id: 'pu-a',
              name: 'Box',
              purchaseCapable: true,
              sellCapable: false,
            },
          ],
        }),
      ).rejects.toMatchObject({
        details: { 'units.0.name': expect.any(String) },
      });
    });

    it('allows a custom unit to keep its own name', async () => {
      productWith([customUnit]);
      vi.mocked(repo.updateUnits).mockResolvedValue(updateRow() as never);

      await service.updateProductUnits('p-1', 'b-1', 'br-1', {
        units: [
          {
            unitRole: 'CUSTOM',
            id: 'pu-c',
            name: 'shot',
            purchaseCapable: true,
            sellCapable: true,
            price: 120,
          },
        ],
      });

      expect(repo.updateUnits).toHaveBeenCalledWith('p-1', [
        { id: 'pu-c', name: 'shot', price: 120, purchaseCapable: true, sellCapable: true },
      ]);
    });

    it('accepts a custom rename to an unused name', async () => {
      productWith([customUnit]);
      vi.mocked(repo.updateUnits).mockResolvedValue(updateRow() as never);

      await service.updateProductUnits('p-1', 'b-1', 'br-1', {
        units: [
          {
            unitRole: 'CUSTOM',
            id: 'pu-c',
            name: 'Bag',
            purchaseCapable: true,
            sellCapable: true,
            price: 120,
          },
        ],
      });

      expect(repo.updateUnits).toHaveBeenCalledWith('p-1', [
        { id: 'pu-c', name: 'Bag', price: 120, purchaseCapable: true, sellCapable: true },
      ]);
    });

    it('refuses a rename onto a name another row vacates in the same request', async () => {
      productWith([
        customUnit,
        prismaUnit({ ...customUnit, id: 'pu-c2', name: 'Box', price: decimal(100) }),
      ]);

      await expect(
        service.updateProductUnits('p-1', 'b-1', 'br-1', {
          units: [
            {
              unitRole: 'CUSTOM',
              id: 'pu-c',
              name: 'Bag',
              purchaseCapable: true,
              sellCapable: true,
              price: 120,
            },
            {
              unitRole: 'CUSTOM',
              id: 'pu-c2',
              name: 'Shot',
              purchaseCapable: true,
              sellCapable: true,
              price: 100,
            },
          ],
        }),
      ).rejects.toMatchObject({
        details: { 'units.1.name': expect.any(String) },
      });
      expect(repo.updateUnits).not.toHaveBeenCalled();
    });

    it('refuses two rows renamed to the same new name', async () => {
      productWith([
        customUnit,
        prismaUnit({ ...customUnit, id: 'pu-c2', name: 'Box', price: decimal(100) }),
      ]);

      await expect(
        service.updateProductUnits('p-1', 'b-1', 'br-1', {
          units: [
            {
              unitRole: 'CUSTOM',
              id: 'pu-c',
              name: 'Bag',
              purchaseCapable: true,
              sellCapable: true,
              price: 120,
            },
            {
              unitRole: 'CUSTOM',
              id: 'pu-c2',
              name: 'bag',
              purchaseCapable: true,
              sellCapable: true,
              price: 100,
            },
          ],
        }),
      ).rejects.toMatchObject({
        details: { 'units.1.name': expect.any(String) },
      });
      expect(repo.updateUnits).not.toHaveBeenCalled();
    });

    it('answers a racing name clash with the fieldless message', async () => {
      productWith([customUnit]);
      vi.mocked(repo.updateUnits).mockRejectedValue({ code: 'P2002' });

      const payload: UpdateProductUnitsInput = {
        units: [
          {
            unitRole: 'CUSTOM',
            id: 'pu-c',
            name: 'Shot',
            purchaseCapable: true,
            sellCapable: false,
          },
        ],
      };
      await expect(service.updateProductUnits('p-1', 'b-1', 'br-1', payload)).rejects.toMatchObject(
        {
          code: ERROR_CODES.BAD_REQUEST,
          statusCode: 400,
          message: expect.any(String),
        },
      );
    });

    it('throws UNAUTHORIZED when the scope is missing', async () => {
      await expect(
        service.updateProductUnits('p-1', undefined, undefined, { units: [] }),
      ).rejects.toMatchObject({
        code: ERROR_CODES.UNAUTHORIZED,
        statusCode: 401,
        message: expect.any(String),
      });
    });
  });

  describe('setProductActive', () => {
    it('checks the product is in scope, then flips the flag', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(prismaProduct() as never);
      vi.mocked(repo.setActive).mockResolvedValue(updateRow({ active: false }) as never);

      await service.setProductActive('p-1', 'b-1', 'br-1', false);

      expect(repo.getByIdWithUnits).toHaveBeenCalledWith('p-1', 'b-1');
      expect(repo.setActive).toHaveBeenCalledWith('p-1', false);
    });

    it('fails the request when the product is not found in the business', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(null);

      await expect(
        service.setProductActive('p-missing', 'b-1', 'br-1', false),
      ).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
        message: expect.any(String),
      });
      expect(repo.setActive).not.toHaveBeenCalled();
    });

    it('maps the updated record including its units', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(prismaProduct() as never);
      vi.mocked(repo.setActive).mockResolvedValue(updateRow({ active: false }) as never);

      const result = await service.setProductActive('p-1', 'b-1', 'br-1', false);

      expect(result).toMatchObject({ id: 'p-1', active: false, units: [{ id: 'pu-1' }] });
    });

    it('throws BAD_REQUEST when the product id is missing', async () => {
      await expect(service.setProductActive(undefined, 'b-1', 'br-1', false)).rejects.toMatchObject(
        {
          code: ERROR_CODES.BAD_REQUEST,
          statusCode: 400,
          message: expect.any(String),
        },
      );
    });

    it('throws UNAUTHORIZED when the scope is missing', async () => {
      await expect(
        service.setProductActive('p-1', undefined, undefined, false),
      ).rejects.toMatchObject({
        code: ERROR_CODES.UNAUTHORIZED,
        statusCode: 401,
        message: expect.any(String),
      });
    });
  });

  describe('resolveUploadTarget', () => {
    it('returns the uploadId of the product live attachment', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(prismaProduct() as never);
      vi.mocked(repo.getProductAttachment).mockResolvedValue({ uploadId: 'u-1' } as never);

      const result = await service.resolveUploadTarget('p-1', 'b-1');

      expect(repo.getByIdWithUnits).toHaveBeenCalledWith('p-1', 'b-1');
      expect(result).toEqual({ productId: 'p-1', uploadId: 'u-1' });
    });

    it('answers with a null uploadId when the product has no live attachment', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(prismaProduct() as never);
      vi.mocked(repo.getProductAttachment).mockResolvedValue(null);

      const result = await service.resolveUploadTarget('p-1', 'b-1');

      expect(result).toEqual({ productId: 'p-1', uploadId: null });
    });

    it('throws NOT_FOUND when the product is not in scope', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(null);

      await expect(service.resolveUploadTarget('p-1', 'b-1')).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
        message: expect.any(String),
      });
    });

    it('throws BAD_REQUEST when the product id is missing', async () => {
      await expect(service.resolveUploadTarget(undefined, 'b-1')).rejects.toMatchObject({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        message: expect.any(String),
      });
    });

    it('throws UNAUTHORIZED when the business id is missing', async () => {
      await expect(service.resolveUploadTarget('p-1', undefined)).rejects.toMatchObject({
        code: ERROR_CODES.UNAUTHORIZED,
        statusCode: 401,
        message: expect.any(String),
      });
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

      await expect(service.resolveUploadId('p-1', 'b-1')).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
        message: expect.any(String),
      });
      expect(repo.getProductAttachment).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the product has no live attachment', async () => {
      vi.mocked(repo.getByIdWithUnits).mockResolvedValue(prismaProduct() as never);
      vi.mocked(repo.getProductAttachment).mockResolvedValue(null);

      await expect(service.resolveUploadId('p-1', 'b-1')).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
        message: expect.any(String),
      });
      expect(repo.getProductAttachment).toHaveBeenCalledWith('p-1');
    });

    it('throws BAD_REQUEST when the product id is missing', async () => {
      await expect(service.resolveUploadId(undefined, 'b-1')).rejects.toMatchObject({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        message: expect.any(String),
      });
    });

    it('throws UNAUTHORIZED when the business id is missing', async () => {
      await expect(service.resolveUploadId('p-1', undefined)).rejects.toMatchObject({
        code: ERROR_CODES.UNAUTHORIZED,
        statusCode: 401,
        message: expect.any(String),
      });
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

      expect(repo.listForBusiness).toHaveBeenCalledWith('b-1', 'br-1', { status: 'all' });
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
      await expect(service.resolveUploadIds(undefined, 'br-1')).rejects.toMatchObject({
        code: ERROR_CODES.UNAUTHORIZED,
        statusCode: 401,
        message: expect.any(String),
      });
    });

    it('throws UNAUTHORIZED when the branch id is missing', async () => {
      await expect(service.resolveUploadIds('b-1', undefined)).rejects.toMatchObject({
        code: ERROR_CODES.UNAUTHORIZED,
        statusCode: 401,
        message: expect.any(String),
      });
    });
  });
});

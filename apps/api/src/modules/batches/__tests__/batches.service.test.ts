import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBatchService } from '../batches.service.js';
import type {
  BatchRepository,
  BatchService,
  CreateBatchCommand,
  CreateBatchInput,
  ProductContext,
  ProductInventoryRecord,
  ProductUnitContext,
  StockBatchRecord,
} from '../batches.types.js';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';

function mockRepository(): BatchRepository {
  return {
    getProductUnitContext: vi.fn(),
    createBatchAndAdjustStock: vi.fn(),
    listBatches: vi.fn(),
    listProductInventorySummaries: vi.fn(),
  };
}

/** Stands in for a `Decimal` column: the service only ever calls toNumber. */
function decimal(value: number): Prisma.Decimal {
  return { toNumber: () => value } as unknown as Prisma.Decimal;
}

function unit(overrides: Partial<ProductUnitContext> = {}): ProductUnitContext {
  return {
    id: 'pu-base',
    productId: 'p-tequila',
    unitRole: 'BASE',
    standardUnitId: 'su-pc',
    standardUnit: { id: 'su-pc', name: 'Piece', symbol: 'pc' },
    name: 'Bottle',
    dependsOn: null,
    conversionRate: null,
    purchaseCapable: true,
    sellCapable: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/** Sealed products arrive whole or in packs of the base unit. */
const TSHIRT: ProductContext = {
  id: 'p-tshirt',
  businessId: 'b-1',
  productUnits: [
    unit({ id: 'pu-piece', productId: 'p-tshirt', name: 'Piece' }),
    unit({
      id: 'pu-pack',
      productId: 'p-tshirt',
      unitRole: 'CUSTOM',
      standardUnitId: null,
      standardUnit: null,
      name: 'Pack (6 pcs)',
      dependsOn: 'BASE',
      conversionRate: decimal(6),
    }),
  ],
};

/** A product whose units hang off both the base unit and an MOU. */
const TEQUILA: ProductContext = {
  id: 'p-tequila',
  businessId: 'b-1',
  productUnits: [
    unit({ id: 'pu-bottle', productId: 'p-tequila', name: 'Bottle' }),
    unit({
      id: 'pu-mou',
      productId: 'p-tequila',
      unitRole: 'MOU',
      standardUnitId: 'su-ml',
      standardUnit: { id: 'su-ml', name: 'Milliliter', symbol: 'ml' },
      name: 'Milliliter',
      dependsOn: 'BASE',
      conversionRate: decimal(350),
      purchaseCapable: false,
    }),
    unit({
      id: 'pu-liter',
      productId: 'p-tequila',
      unitRole: 'STANDARD',
      standardUnitId: 'su-l',
      standardUnit: { id: 'su-l', name: 'Liter', symbol: 'L' },
      name: 'Liter',
      dependsOn: 'MOU',
      conversionRate: decimal(1000),
    }),
    unit({
      id: 'pu-shot',
      productId: 'p-tequila',
      unitRole: 'CUSTOM',
      standardUnitId: null,
      standardUnit: null,
      name: 'Shot',
      dependsOn: 'MOU',
      conversionRate: decimal(25),
    }),
    unit({
      id: 'pu-case',
      productId: 'p-tequila',
      unitRole: 'CUSTOM',
      standardUnitId: null,
      standardUnit: null,
      name: 'Case (12 bottles)',
      dependsOn: 'BASE',
      conversionRate: decimal(12),
    }),
  ],
};

/** A weighed product: its base unit is already measurable, plus a finer standard. */
const RICE: ProductContext = {
  id: 'p-rice',
  businessId: 'b-1',
  productUnits: [
    unit({
      id: 'pu-kg',
      productId: 'p-rice',
      name: 'Kilogram',
      standardUnitId: 'su-kg',
      standardUnit: { id: 'su-kg', name: 'Kilogram', symbol: 'kg' },
    }),
    unit({
      id: 'pu-gram',
      productId: 'p-rice',
      unitRole: 'STANDARD',
      standardUnitId: 'su-g',
      standardUnit: { id: 'su-g', name: 'Gram', symbol: 'g' },
      name: 'Gram',
      dependsOn: 'BASE',
      conversionRate: decimal(0.001),
    }),
    unit({
      id: 'pu-sack',
      productId: 'p-rice',
      unitRole: 'CUSTOM',
      standardUnitId: null,
      standardUnit: null,
      name: 'Sack (50 kg)',
      dependsOn: 'BASE',
      conversionRate: decimal(50),
    }),
  ],
};

/**
 * An oil measured by volume, where the standard unit hangs off the MOU rather
 * than the base unit. Its MOU is purchase-capable so a batch can be bought in
 * the measurement unit directly.
 */
const OIL: ProductContext = {
  id: 'p-oil',
  businessId: 'b-1',
  productUnits: [
    unit({ id: 'pu-oil-bottle', productId: 'p-oil', name: 'Bottle' }),
    unit({
      id: 'pu-oil-mou',
      productId: 'p-oil',
      unitRole: 'MOU',
      standardUnitId: 'su-ml',
      standardUnit: { id: 'su-ml', name: 'Milliliter', symbol: 'ml' },
      name: 'Milliliter',
      dependsOn: 'BASE',
      conversionRate: decimal(5000),
    }),
    unit({
      id: 'pu-oil-liter',
      productId: 'p-oil',
      unitRole: 'STANDARD',
      standardUnitId: 'su-l',
      standardUnit: { id: 'su-l', name: 'Liter', symbol: 'L' },
      name: 'Liter',
      dependsOn: 'MOU',
      conversionRate: decimal(1000),
    }),
  ],
};

const CATALOG = [TEQUILA, TSHIRT, RICE, OIL];

/** The same product with one unit row altered, for the broken-catalog cases. */
function withUnit(
  product: ProductContext,
  id: string,
  overrides: Partial<ProductUnitContext>,
): ProductContext {
  return {
    ...product,
    productUnits: product.productUnits.map((candidate) =>
      candidate.id === id ? { ...candidate, ...overrides } : candidate,
    ),
  };
}

/** The same product with every unit of one role dropped. */
function withoutRole(product: ProductContext, role: ProductUnitContext['unitRole']) {
  return {
    ...product,
    productUnits: product.productUnits.filter((candidate) => candidate.unitRole !== role),
  };
}

function actor() {
  return { businessId: 'b-1', branchId: 'br-1', memberId: 'm-1' };
}

function line(overrides: Partial<CreateBatchInput['lines'][number]> = {}) {
  return {
    productId: 'p-tequila',
    productUnitId: 'pu-bottle',
    purchaseQuantity: 10,
    purchaseUnitCost: 950,
    ...overrides,
  };
}

function input(overrides: Partial<CreateBatchInput> = {}): CreateBatchInput {
  return {
    batchDate: new Date('2026-02-01T09:00:00.000Z'),
    lines: [line()],
    ...overrides,
  };
}

function lineRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sbl-1',
    stockBatchId: 'sb-1',
    productId: 'p-tequila',
    purchaseUnit: 'Bottle',
    purchaseQuantity: decimal(10),
    purchaseUnitCost: decimal(950),
    standardUnit: 'pc',
    standardQuantity: decimal(10),
    productUnitId: 'pu-bottle',
    resolvedStandardUnitId: 'su-pc',
    quantityRemaining: decimal(10),
    expiryDate: null,
    createdAt: new Date('2026-02-01T09:00:00.000Z'),
    updatedAt: new Date('2026-02-01T09:00:00.000Z'),
    product: { name: 'Sierra Tequila 350 ml', brand: 'Sierra' },
    ...overrides,
  };
}

function batchRecord(overrides: Record<string, unknown> = {}): StockBatchRecord {
  return {
    id: 'sb-1',
    businessId: 'b-1',
    branchId: 'br-1',
    supplierName: 'Awash Mart',
    referenceNumber: null,
    batchDate: new Date('2026-02-01T09:00:00.000Z'),
    confirmedAt: new Date('2026-02-01T10:00:00.000Z'),
    receivedByMemberId: 'm-1',
    createdAt: new Date('2026-02-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T10:00:00.000Z'),
    lines: [lineRecord()],
    receivedByMember: { id: 'm-1', name: 'me', role: 'OWNER' },
    ...overrides,
  } as StockBatchRecord;
}

/** The lines and stock the service resolved, as the repository saw them. */
function written(): CreateBatchCommand {
  const call = vi.mocked(mockRepo.createBatchAndAdjustStock).mock.calls.at(0);

  if (!call) {
    throw new Error('createBatchAndAdjustStock was never called');
  }

  return call[0];
}

/**
 * A thrown AppError pinned by code and status only. The message text is the
 * implementation to be relied on, so it is never matched literally.
 */
function appError(code: string, statusCode: number) {
  return expect.objectContaining({ code, statusCode, message: expect.any(String) });
}

let mockRepo: BatchRepository;
let service: BatchService;

describe('batches.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = mockRepository();
    service = createBatchService(mockRepo);
    vi.mocked(mockRepo.getProductUnitContext).mockResolvedValue(CATALOG);
    vi.mocked(mockRepo.createBatchAndAdjustStock).mockResolvedValue(batchRecord());
  });

  describe('createBatch', () => {
    it('reads the catalog of the products named, once per distinct product', async () => {
      await service.createBatch(
        actor(),
        input({
          lines: [
            line({ productId: 'p-tequila' }),
            line({ productId: 'p-tshirt', productUnitId: 'pu-piece' }),
            line({ productId: 'p-tequila', productUnitId: 'pu-case' }),
          ],
        }),
      );

      expect(mockRepo.getProductUnitContext).toHaveBeenCalledWith('b-1', ['p-tequila', 'p-tshirt']);
    });

    it('rejects a line naming a product the business does not have', async () => {
      vi.mocked(mockRepo.getProductUnitContext).mockResolvedValue([TEQUILA]);

      await expect(
        service.createBatch(actor(), input({ lines: [line({ productId: 'p-unknown' })] })),
      ).rejects.toEqual(appError(ERROR_CODES.NOT_FOUND, 404));
      expect(mockRepo.createBatchAndAdjustStock).not.toHaveBeenCalled();
    });

    it('rejects a product belonging to another business', async () => {
      vi.mocked(mockRepo.getProductUnitContext).mockResolvedValue([
        { ...TEQUILA, businessId: 'b-other' },
      ]);

      await expect(service.createBatch(actor(), input())).rejects.toEqual(
        appError(ERROR_CODES.NOT_FOUND, 404),
      );
      expect(mockRepo.createBatchAndAdjustStock).not.toHaveBeenCalled();
    });

    it('rejects a unit that is not one of that product units', async () => {
      await expect(
        service.createBatch(actor(), input({ lines: [line({ productUnitId: 'pu-pack' })] })),
      ).rejects.toEqual(appError(ERROR_CODES.BAD_REQUEST, 400));
      expect(mockRepo.createBatchAndAdjustStock).not.toHaveBeenCalled();
    });

    it('rejects a unit the stock cannot be bought in', async () => {
      await expect(
        service.createBatch(actor(), input({ lines: [line({ productUnitId: 'pu-mou' })] })),
      ).rejects.toEqual(appError(ERROR_CODES.BAD_REQUEST, 400));
      expect(mockRepo.createBatchAndAdjustStock).not.toHaveBeenCalled();
    });

    it('writes the batch against the acting member of the resolved scope', async () => {
      await service.createBatch(
        { businessId: 'b-1', branchId: 'br-9', memberId: 'm-9' },
        input({ supplierName: 'Awash Mart', referenceNumber: 'INV-42' }),
      );

      expect(mockRepo.createBatchAndAdjustStock).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: 'b-1',
          branchId: 'br-9',
          memberId: 'm-9',
          header: {
            batchDate: new Date('2026-02-01T09:00:00.000Z'),
            supplierName: 'Awash Mart',
            referenceNumber: 'INV-42',
          },
        }),
      );
    });

    it('leaves an absent supplier and reference out of the header entirely', async () => {
      await service.createBatch(actor(), input());

      expect(written().header).toEqual({ batchDate: new Date('2026-02-01T09:00:00.000Z') });
    });

    it('snapshots a base unit purchase in the base unit own standard unit', async () => {
      await service.createBatch(actor(), input({ lines: [line({ purchaseQuantity: 10 })] }));

      expect(written().lines).toEqual([
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
      ]);
    });

    it('walks a custom unit based on the base unit up to the base unit standard', async () => {
      await service.createBatch(
        actor(),
        input({ lines: [line({ productUnitId: 'pu-case', purchaseQuantity: 3 })] }),
      );

      expect(written().lines).toEqual([
        expect.objectContaining({
          purchaseUnit: 'Case (12 bottles)',
          standardUnit: 'pc',
          standardQuantity: 36,
          resolvedStandardUnitId: 'su-pc',
          stockIncrement: 36,
        }),
      ]);
    });

    it('walks a custom unit based on the MOU up to the MOU standard', async () => {
      await service.createBatch(
        actor(),
        input({ lines: [line({ productUnitId: 'pu-shot', purchaseQuantity: 4 })] }),
      );

      expect(written().lines).toEqual([
        expect.objectContaining({
          purchaseUnit: 'Shot',
          standardUnit: 'ml',
          standardQuantity: 100,
          resolvedStandardUnitId: 'su-ml',
          // 4 shots x 25 ml = 100 ml of the 350 ml one bottle holds
          stockIncrement: 100 / 350,
        }),
      ]);
    });

    it('keeps a standard unit purchase in its own standard unit and still adds base unit stock', async () => {
      await service.createBatch(
        actor(),
        input({ lines: [line({ productUnitId: 'pu-liter', purchaseQuantity: 20 })] }),
      );

      expect(written().lines).toEqual([
        expect.objectContaining({
          purchaseUnit: 'Liter',
          standardUnit: 'L',
          standardQuantity: 20,
          resolvedStandardUnitId: 'su-l',
          // 20 L x 1000 ml = 20000 ml of the 350 ml one bottle holds
          stockIncrement: 20000 / 350,
        }),
      ]);
    });

    it('keeps a standard unit hanging off the base unit in its own standard unit', async () => {
      await service.createBatch(
        actor(),
        input({
          lines: [line({ productId: 'p-rice', productUnitId: 'pu-gram', purchaseQuantity: 500 })],
        }),
      );

      expect(written().lines).toEqual([
        expect.objectContaining({
          purchaseUnit: 'Gram',
          standardUnit: 'g',
          standardQuantity: 500,
          resolvedStandardUnitId: 'su-g',
          // 500 g x 0.001 kg = 0.5 kg of stock
          stockIncrement: 0.5,
        }),
      ]);
    });

    it('walks a custom unit based on the base unit of a weighed product', async () => {
      await service.createBatch(
        actor(),
        input({
          lines: [line({ productId: 'p-rice', productUnitId: 'pu-sack', purchaseQuantity: 2 })],
        }),
      );

      expect(written().lines).toEqual([
        expect.objectContaining({
          purchaseUnit: 'Sack (50 kg)',
          standardUnit: 'kg',
          standardQuantity: 100,
          resolvedStandardUnitId: 'su-kg',
          stockIncrement: 100,
        }),
      ]);
    });

    it('snapshots two purchased units of one product in the standard each was bought in', async () => {
      await service.createBatch(
        actor(),
        input({
          lines: [
            line({ productId: 'p-oil', productUnitId: 'pu-oil-liter', purchaseQuantity: 20 }),
            line({ productId: 'p-oil', productUnitId: 'pu-oil-mou', purchaseQuantity: 350 }),
          ],
        }),
      );

      expect(written().lines).toEqual([
        expect.objectContaining({
          purchaseUnit: 'Liter',
          standardUnit: 'L',
          standardQuantity: 20,
          resolvedStandardUnitId: 'su-l',
          // 20 L x 1000 ml = 20000 ml of the 5000 ml one bottle holds
          stockIncrement: 4,
        }),
        expect.objectContaining({
          purchaseUnit: 'Milliliter',
          standardUnit: 'ml',
          standardQuantity: 350,
          resolvedStandardUnitId: 'su-ml',
          // 350 ml of the 5000 ml one bottle holds
          stockIncrement: 350 / 5000,
        }),
      ]);

      expect(written().stockIncrements).toEqual([{ productId: 'p-oil', amount: 4 + 350 / 5000 }]);
    });

    it('leaves a non-terminating fraction for the column to round', async () => {
      await service.createBatch(
        actor(),
        input({ lines: [line({ productUnitId: 'pu-shot', purchaseQuantity: 3 })] }),
      );

      // 3 shots x 25 ml = 75 ml of the 350 ml one bottle holds
      expect(written().lines).toEqual([expect.objectContaining({ stockIncrement: 75 / 350 })]);
    });

    it('adds up the stock several lines of one product contribute into a single increment', async () => {
      await service.createBatch(
        actor(),
        input({
          lines: [
            line({ productId: 'p-tshirt', productUnitId: 'pu-pack', purchaseQuantity: 2 }),
            line({ productId: 'p-tshirt', productUnitId: 'pu-piece', purchaseQuantity: 5 }),
          ],
        }),
      );

      expect(written().stockIncrements).toEqual([{ productId: 'p-tshirt', amount: 17 }]);
    });

    it('keeps the stock of different products in separate increments', async () => {
      await service.createBatch(
        actor(),
        input({
          lines: [
            line({ productId: 'p-tequila', purchaseQuantity: 10 }),
            line({ productId: 'p-tshirt', productUnitId: 'pu-piece', purchaseQuantity: 5 }),
          ],
        }),
      );

      expect(written().stockIncrements).toEqual([
        { productId: 'p-tequila', amount: 10 },
        { productId: 'p-tshirt', amount: 5 },
      ]);
    });

    it('carries an expiry date through when the line has one', async () => {
      const expiryDate = new Date('2027-01-01T00:00:00.000Z');

      await service.createBatch(actor(), input({ lines: [line({ expiryDate })] }));

      expect(written().lines).toEqual([expect.objectContaining({ expiryDate })]);
    });

    it('returns the created batch with its lines, product labels and receiver', async () => {
      const result = await service.createBatch(actor(), input());

      expect(result).toEqual({
        id: 'sb-1',
        businessId: 'b-1',
        branchId: 'br-1',
        supplierName: 'Awash Mart',
        referenceNumber: null,
        batchDate: new Date('2026-02-01T09:00:00.000Z'),
        confirmedAt: new Date('2026-02-01T10:00:00.000Z'),
        receivedByMemberId: 'm-1',
        createdAt: new Date('2026-02-01T10:00:00.000Z'),
        updatedAt: new Date('2026-02-01T10:00:00.000Z'),
        lines: [
          {
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
            quantityRemaining: 10,
            expiryDate: null,
            createdAt: new Date('2026-02-01T09:00:00.000Z'),
            updatedAt: new Date('2026-02-01T09:00:00.000Z'),
            productName: 'Sierra Tequila 350 ml',
            productBrand: 'Sierra',
          },
        ],
        receivedBy: { id: 'm-1', name: 'me', role: 'OWNER' },
      });
    });

    it('narrows a stored decimal to a plain number', async () => {
      vi.mocked(mockRepo.createBatchAndAdjustStock).mockResolvedValue(
        batchRecord({
          lines: [lineRecord({ purchaseQuantity: decimal(2.5), quantityRemaining: decimal(0) })],
        }),
      );

      const result = await service.createBatch(actor(), input());

      expect(result.lines[0]).toMatchObject({ purchaseQuantity: 2.5, quantityRemaining: 0 });
    });

    it('reads back a batch with no receiving member as null', async () => {
      vi.mocked(mockRepo.createBatchAndAdjustStock).mockResolvedValue(
        batchRecord({ receivedByMemberId: null, receivedByMember: null }),
      );

      const result = await service.createBatch(actor(), input());

      expect(result.receivedBy).toBeNull();
      expect(result.receivedByMemberId).toBeNull();
    });

    /**
     * A unit row that contradicts the catalog's own rules cannot be snapshotted
     * or converted, and must not be guessed at: the batch is refused outright.
     */
    describe('a catalog whose unit rows contradict each other', () => {
      it('refuses a base unit that is linked to no standard unit', async () => {
        vi.mocked(mockRepo.getProductUnitContext).mockResolvedValue([
          withUnit(TEQUILA, 'pu-bottle', { standardUnitId: null, standardUnit: null }),
        ]);

        await expect(service.createBatch(actor(), input())).rejects.toEqual(
          appError(ERROR_CODES.INTERNAL_ERROR, 500),
        );
        expect(mockRepo.createBatchAndAdjustStock).not.toHaveBeenCalled();
      });

      it('refuses a measurement unit that is linked to no standard unit', async () => {
        vi.mocked(mockRepo.getProductUnitContext).mockResolvedValue([
          withUnit(TEQUILA, 'pu-mou', { standardUnitId: null, standardUnit: null }),
        ]);

        await expect(
          service.createBatch(
            actor(),
            input({ lines: [line({ productUnitId: 'pu-shot', purchaseQuantity: 4 })] }),
          ),
        ).rejects.toEqual(appError(ERROR_CODES.INTERNAL_ERROR, 500));
        expect(mockRepo.createBatchAndAdjustStock).not.toHaveBeenCalled();
      });

      it('refuses a standard unit that is linked to no standard unit', async () => {
        vi.mocked(mockRepo.getProductUnitContext).mockResolvedValue([
          withUnit(TEQUILA, 'pu-liter', { standardUnitId: null, standardUnit: null }),
        ]);

        await expect(
          service.createBatch(
            actor(),
            input({ lines: [line({ productUnitId: 'pu-liter', purchaseQuantity: 20 })] }),
          ),
        ).rejects.toEqual(appError(ERROR_CODES.INTERNAL_ERROR, 500));
        expect(mockRepo.createBatchAndAdjustStock).not.toHaveBeenCalled();
      });

      it('refuses a custom unit depending on a role the product does not have', async () => {
        vi.mocked(mockRepo.getProductUnitContext).mockResolvedValue([withoutRole(TEQUILA, 'MOU')]);

        await expect(
          service.createBatch(
            actor(),
            input({ lines: [line({ productUnitId: 'pu-shot', purchaseQuantity: 4 })] }),
          ),
        ).rejects.toEqual(appError(ERROR_CODES.INTERNAL_ERROR, 500));
        expect(mockRepo.createBatchAndAdjustStock).not.toHaveBeenCalled();
      });

      it('refuses a custom unit linked to no unit to resolve through', async () => {
        vi.mocked(mockRepo.getProductUnitContext).mockResolvedValue([
          withUnit(TEQUILA, 'pu-shot', { dependsOn: null }),
        ]);

        await expect(
          service.createBatch(
            actor(),
            input({ lines: [line({ productUnitId: 'pu-shot', purchaseQuantity: 4 })] }),
          ),
        ).rejects.toEqual(appError(ERROR_CODES.INTERNAL_ERROR, 500));
        expect(mockRepo.createBatchAndAdjustStock).not.toHaveBeenCalled();
      });

      it('refuses a standard unit linked to no unit to convert through', async () => {
        vi.mocked(mockRepo.getProductUnitContext).mockResolvedValue([
          withUnit(TEQUILA, 'pu-liter', { dependsOn: null }),
        ]);

        await expect(
          service.createBatch(
            actor(),
            input({ lines: [line({ productUnitId: 'pu-liter', purchaseQuantity: 20 })] }),
          ),
        ).rejects.toEqual(appError(ERROR_CODES.INTERNAL_ERROR, 500));
        expect(mockRepo.createBatchAndAdjustStock).not.toHaveBeenCalled();
      });

      it('refuses a custom unit with no conversion rate', async () => {
        vi.mocked(mockRepo.getProductUnitContext).mockResolvedValue([
          withUnit(TEQUILA, 'pu-shot', { conversionRate: null }),
        ]);

        await expect(
          service.createBatch(
            actor(),
            input({ lines: [line({ productUnitId: 'pu-shot', purchaseQuantity: 4 })] }),
          ),
        ).rejects.toEqual(appError(ERROR_CODES.INTERNAL_ERROR, 500));
        expect(mockRepo.createBatchAndAdjustStock).not.toHaveBeenCalled();
      });

      it('refuses a standard unit with no conversion rate', async () => {
        vi.mocked(mockRepo.getProductUnitContext).mockResolvedValue([
          withUnit(TEQUILA, 'pu-liter', { conversionRate: null }),
        ]);

        await expect(
          service.createBatch(
            actor(),
            input({ lines: [line({ productUnitId: 'pu-liter', purchaseQuantity: 20 })] }),
          ),
        ).rejects.toEqual(appError(ERROR_CODES.INTERNAL_ERROR, 500));
        expect(mockRepo.createBatchAndAdjustStock).not.toHaveBeenCalled();
      });

      it('refuses a measurement unit with no pack relation', async () => {
        vi.mocked(mockRepo.getProductUnitContext).mockResolvedValue([
          withUnit(OIL, 'pu-oil-mou', { conversionRate: null }),
        ]);

        await expect(
          service.createBatch(
            actor(),
            input({
              lines: [
                line({ productId: 'p-oil', productUnitId: 'pu-oil-mou', purchaseQuantity: 350 }),
              ],
            }),
          ),
        ).rejects.toEqual(appError(ERROR_CODES.INTERNAL_ERROR, 500));
        expect(mockRepo.createBatchAndAdjustStock).not.toHaveBeenCalled();
      });

      it('refuses to convert through a measurement unit that has no pack relation', async () => {
        vi.mocked(mockRepo.getProductUnitContext).mockResolvedValue([
          withUnit(OIL, 'pu-oil-mou', { conversionRate: null }),
        ]);

        await expect(
          service.createBatch(
            actor(),
            input({
              lines: [
                line({ productId: 'p-oil', productUnitId: 'pu-oil-liter', purchaseQuantity: 20 }),
              ],
            }),
          ),
        ).rejects.toEqual(appError(ERROR_CODES.INTERNAL_ERROR, 500));
        expect(mockRepo.createBatchAndAdjustStock).not.toHaveBeenCalled();
      });
    });
  });

  describe('listBatches', () => {
    it('lists the batches of the resolved business and branch', async () => {
      vi.mocked(mockRepo.listBatches).mockResolvedValue([]);

      await service.listBatches({ businessId: 'b-1', branchId: 'br-1' });

      expect(mockRepo.listBatches).toHaveBeenCalledWith('b-1', 'br-1');
    });

    it('returns an empty list when the business has no batches', async () => {
      vi.mocked(mockRepo.listBatches).mockResolvedValue([]);

      await expect(service.listBatches({ businessId: 'b-1', branchId: 'br-1' })).resolves.toEqual(
        [],
      );
    });

    it('returns every batch with its lines, product labels and receiver', async () => {
      vi.mocked(mockRepo.listBatches).mockResolvedValue([batchRecord()]);

      const [batch, ...rest] = await service.listBatches({ businessId: 'b-1', branchId: 'br-1' });

      expect(rest).toEqual([]);
      expect(batch).toMatchObject({
        id: 'sb-1',
        receivedBy: { id: 'm-1', name: 'me', role: 'OWNER' },
      });
      expect(batch?.lines).toHaveLength(1);
      expect(batch?.lines[0]).toMatchObject({
        productName: 'Sierra Tequila 350 ml',
        productBrand: 'Sierra',
        purchaseQuantity: 10,
      });
    });
  });
});

describe('batch service listProductInventorySummaries', () => {
  let mockRepo: BatchRepository;
  let service: ReturnType<typeof createBatchService>;

  const SCOPE = { businessId: 'b-1', branchId: 'br-1' };

  function line(overrides: Partial<ProductInventoryRecord['stockBatchLines'][number]> = {}) {
    return {
      id: 'sbl-1',
      stockBatchId: 'sb-1',
      productId: 'p-tequila',
      purchaseUnit: 'Bottle',
      purchaseQuantity: decimal(10),
      purchaseUnitCost: decimal(950),
      standardUnit: 'pc',
      standardQuantity: decimal(10),
      productUnitId: 'pu-bottle',
      resolvedStandardUnitId: 'su-pc',
      quantityRemaining: decimal(10),
      expiryDate: null,
      createdAt: new Date('2026-02-01T10:00:00.000Z'),
      updatedAt: new Date('2026-02-01T10:00:00.000Z'),
      ...overrides,
    };
  }

  function inventoryRecord(
    overrides: Partial<ProductInventoryRecord> = {},
  ): ProductInventoryRecord {
    return {
      id: 'p-tequila',
      businessId: 'b-1',
      branchId: 'br-1',
      categoryId: null,
      name: 'Sierra Tequila 350 ml',
      brand: 'Sierra',
      description: null,
      photoUrl: null,
      trackAsPartial: false,
      lowStockThreshold: decimal(5),
      currentSealedStock: decimal(10),
      active: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      productUnits: [unit()],
      stockBatchLines: [line()],
      ...overrides,
    } as ProductInventoryRecord;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = mockRepository();
    service = createBatchService(mockRepo);
  });

  it('returns a list of summaries in the correct shape', async () => {
    vi.mocked(mockRepo.listProductInventorySummaries).mockResolvedValue([inventoryRecord()]);
    const result = await service.listProductInventorySummaries(SCOPE);
    expect(mockRepo.listProductInventorySummaries).toHaveBeenCalledWith('b-1', 'br-1');
    expect(result).toEqual([
      {
        id: 'p-tequila',
        name: 'Sierra Tequila 350 ml',
        brand: 'Sierra',
        currentSealedStock: 10,
        lowStockThreshold: 5,
        active: true,
        baseUnitLabel: 'Bottle',
        totalCost: 9500,
        earliestExpiry: null,
        expiryCount: 0,
        numberOfBatches: 1,
        stockStatus: 'IN_STOCK',
      },
    ]);
  });

  it('fails the request when a product has no base unit', async () => {
    vi.mocked(mockRepo.listProductInventorySummaries).mockResolvedValue([
      inventoryRecord({ productUnits: [] }),
    ]);

    await expect(service.listProductInventorySummaries(SCOPE)).rejects.toMatchObject({
      code: ERROR_CODES.INTERNAL_ERROR,
      statusCode: 500,
    });
  });

  describe('totalCost', () => {
    it('correctly calculates the total cost when a fraction remains', async () => {
      vi.mocked(mockRepo.listProductInventorySummaries).mockResolvedValue([
        inventoryRecord({
          stockBatchLines: [line({ purchaseQuantity: decimal(10), quantityRemaining: decimal(4) })],
        }),
      ]);
      const [summary] = await service.listProductInventorySummaries(SCOPE);
      expect(summary?.totalCost).toBe(3800);
    });

    it('returns 0 for a product with no remaining lines', async () => {
      vi.mocked(mockRepo.listProductInventorySummaries).mockResolvedValue([
        inventoryRecord({ stockBatchLines: [] }),
      ]);
      const [summary] = await service.listProductInventorySummaries(SCOPE);
      expect(summary?.totalCost).toBe(0);
    });

    it('does not fail when a line has no standard quantity', async () => {
      vi.mocked(mockRepo.listProductInventorySummaries).mockResolvedValue([
        inventoryRecord({
          stockBatchLines: [line({ standardQuantity: decimal(0), quantityRemaining: decimal(0) })],
        }),
      ]);
      const [summary] = await service.listProductInventorySummaries(SCOPE);
      expect(summary?.totalCost).toBe(0);
    });
  });

  describe('expiry', () => {
    const EARLY = new Date('2026-03-01T00:00:00.000Z');
    const LATE = new Date('2026-09-01T00:00:00.000Z');

    it('correctly reports the earliest expiry and counts expiring lines correctly', async () => {
      vi.mocked(mockRepo.listProductInventorySummaries).mockResolvedValue([
        inventoryRecord({
          stockBatchLines: [
            line({ id: 'sbl-1', stockBatchId: 'sb-1', expiryDate: LATE }),
            line({ id: 'sbl-2', stockBatchId: 'sb-2', expiryDate: EARLY }),
          ],
        }),
      ]);
      const [summary] = await service.listProductInventorySummaries(SCOPE);
      expect(summary?.earliestExpiry).toEqual(EARLY);
      expect(summary?.expiryCount).toBe(2);
    });
  });

  describe('numberOfBatches', () => {
    it('counts every batch still holding stock of the product', async () => {
      vi.mocked(mockRepo.listProductInventorySummaries).mockResolvedValue([
        inventoryRecord({
          stockBatchLines: [
            line({ id: 'sbl-1', stockBatchId: 'sb-1' }),
            line({ id: 'sbl-2', stockBatchId: 'sb-2' }),
            line({ id: 'sbl-3', stockBatchId: 'sb-1' }),
          ],
        }),
      ]);

      const [summary] = await service.listProductInventorySummaries(SCOPE);

      expect(summary?.numberOfBatches).toBe(2);
    });

    it('is zero for a product with nothing left', async () => {
      vi.mocked(mockRepo.listProductInventorySummaries).mockResolvedValue([
        inventoryRecord({ stockBatchLines: [] }),
      ]);

      const [summary] = await service.listProductInventorySummaries(SCOPE);

      expect(summary?.numberOfBatches).toBe(0);
    });
  });

  describe('stockStatus', () => {
    it('is out of stock when nothing is left', async () => {
      vi.mocked(mockRepo.listProductInventorySummaries).mockResolvedValue([
        inventoryRecord({ currentSealedStock: decimal(0) }),
      ]);

      const [summary] = await service.listProductInventorySummaries(SCOPE);

      expect(summary?.stockStatus).toBe('OUT_OF_STOCK');
    });

    it('is out of stock when the figure has gone negative', async () => {
      vi.mocked(mockRepo.listProductInventorySummaries).mockResolvedValue([
        inventoryRecord({ currentSealedStock: decimal(-1) }),
      ]);

      const [summary] = await service.listProductInventorySummaries(SCOPE);

      expect(summary?.stockStatus).toBe('OUT_OF_STOCK');
    });

    it('is low when the stock has fallen under the product threshold', async () => {
      vi.mocked(mockRepo.listProductInventorySummaries).mockResolvedValue([
        inventoryRecord({ currentSealedStock: decimal(4), lowStockThreshold: decimal(5) }),
      ]);

      const [summary] = await service.listProductInventorySummaries(SCOPE);

      expect(summary?.stockStatus).toBe('LOW_STOCK');
    });

    it('is in stock once the stock reaches the threshold exactly', async () => {
      vi.mocked(mockRepo.listProductInventorySummaries).mockResolvedValue([
        inventoryRecord({ currentSealedStock: decimal(5), lowStockThreshold: decimal(5) }),
      ]);

      const [summary] = await service.listProductInventorySummaries(SCOPE);

      expect(summary?.stockStatus).toBe('IN_STOCK');
    });

    it('treats a product that as stock with no threshold as in stock', async () => {
      vi.mocked(mockRepo.listProductInventorySummaries).mockResolvedValue([
        inventoryRecord({ currentSealedStock: decimal(1), lowStockThreshold: null }),
      ]);

      const [summary] = await service.listProductInventorySummaries(SCOPE);

      expect(summary?.stockStatus).toBe('IN_STOCK');
    });

    it('is out of stock if nothing is left for a product no threshold', async () => {
      vi.mocked(mockRepo.listProductInventorySummaries).mockResolvedValue([
        inventoryRecord({ currentSealedStock: decimal(0), lowStockThreshold: null }),
      ]);

      const [summary] = await service.listProductInventorySummaries(SCOPE);

      expect(summary?.stockStatus).toBe('OUT_OF_STOCK');
    });
  });
});

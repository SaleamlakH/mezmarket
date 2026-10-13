import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBatchService } from '../batches.service.js';
import type {
  BatchRepository,
  BatchService,
  CreateBatchCommand,
  CreateBatchInput,
  ProductContext,
  ProductWithStockLinesRecord,
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
    listProductsWithStockLines: vi.fn(),
    listProductAttachments: vi.fn(),
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

const CATALOG = [TEQUILA, TSHIRT];

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

  function line(overrides: Partial<ProductWithStockLinesRecord['stockBatchLines'][number]> = {}) {
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
    overrides: Partial<ProductWithStockLinesRecord> = {},
  ): ProductWithStockLinesRecord {
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
      productUnits: [unit({ id: 'pu-bottle' })],
      stockBatchLines: [line()],
      ...overrides,
    } as ProductWithStockLinesRecord;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = mockRepository();
    service = createBatchService(mockRepo);
    vi.mocked(mockRepo.listProductAttachments).mockResolvedValue([]);
  });

  it('returns a list of summaries in the correct shape', async () => {
    vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([inventoryRecord()]);
    const result = await service.listProductInventorySummaries(SCOPE);
    expect(mockRepo.listProductsWithStockLines).toHaveBeenCalledWith('b-1', 'br-1');
    expect(mockRepo.listProductAttachments).toHaveBeenCalledWith(['p-tequila']);
    expect(result).toEqual([
      {
        id: 'p-tequila',
        name: 'Sierra Tequila 350 ml',
        brand: 'Sierra',
        currentSealedStock: 10,
        lowStockThreshold: 5,
        active: true,
        baseUnitLabel: 'Bottle',
        uploadId: null,
        totalCost: 9500,
        earliestExpiry: null,
        expiryCount: 0,
        numberOfBatches: 1,
        stockStatus: 'IN_STOCK',
      },
    ]);
  });

  it('maps the live attachment uploadId of each product into its summary', async () => {
    vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([
      inventoryRecord(),
      inventoryRecord({ id: 'p-2', name: 'B' }),
    ]);
    vi.mocked(mockRepo.listProductAttachments).mockResolvedValue([
      { recordId: 'p-tequila', uploadId: 'u-1' },
      { recordId: 'p-2', uploadId: null },
    ] as never);

    const summaries = await service.listProductInventorySummaries(SCOPE);

    expect(summaries.map((summary) => summary.uploadId)).toEqual(['u-1', null]);
  });

  it('skips the attachment lookup when no active product holds stock', async () => {
    vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([]);

    await expect(service.listProductInventorySummaries(SCOPE)).resolves.toEqual([]);
    expect(mockRepo.listProductAttachments).not.toHaveBeenCalled();
  });

  it('fails the request when a product has no base unit', async () => {
    vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([
      inventoryRecord({ productUnits: [] }),
    ]);

    await expect(service.listProductInventorySummaries(SCOPE)).rejects.toMatchObject({
      code: ERROR_CODES.INTERNAL_ERROR,
      statusCode: 500,
    });
  });

  describe('totalCost', () => {
    it('correctly calculates the total cost when a fraction remains', async () => {
      vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([
        inventoryRecord({
          stockBatchLines: [line({ purchaseQuantity: decimal(10), quantityRemaining: decimal(4) })],
        }),
      ]);
      const [summary] = await service.listProductInventorySummaries(SCOPE);
      expect(summary?.totalCost).toBe(3800);
    });

    it('sums the remaining cost across every line of the product', async () => {
      vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([
        inventoryRecord({
          stockBatchLines: [
            line({ id: 'sbl-1', purchaseQuantity: decimal(10), quantityRemaining: decimal(4) }),
            line({
              id: 'sbl-2',
              purchaseQuantity: decimal(10),
              purchaseUnitCost: decimal(100),
              quantityRemaining: decimal(5),
            }),
            line({
              id: 'sbl-3',
              stockBatchId: 'sb-2',
              purchaseQuantity: decimal(10),
              purchaseUnitCost: decimal(20),
              quantityRemaining: decimal(10),
            }),
          ],
        }),
      ]);

      const [summary] = await service.listProductInventorySummaries(SCOPE);

      // 10x950x(4/10) + 10x100x(5/10) + 10x20x(10/10)
      expect(summary?.totalCost).toBe(3800 + 500 + 200);
    });

    it('returns 0 for a product with no remaining lines', async () => {
      vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([
        inventoryRecord({ stockBatchLines: [] }),
      ]);
      const [summary] = await service.listProductInventorySummaries(SCOPE);
      expect(summary?.totalCost).toBe(0);
    });

    it('prorates the remaining cost by the unsold share in base units, not in the units bought', async () => {
      vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([
        inventoryRecord({
          productUnits: [
            unit({ id: 'pu-bottle', productId: 'p-tequila' }),
            unit({
              id: 'pu-ml',
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
          ],
          stockBatchLines: [
            line({
              productUnitId: 'pu-liter',
              purchaseUnit: 'Liter',
              purchaseQuantity: decimal(7),
              purchaseUnitCost: decimal(2000),
              standardUnit: 'ml',
              standardQuantity: decimal(7000),
              quantityRemaining: decimal(5),
            }),
          ],
        }),
      ]);

      const [summary] = await service.listProductInventorySummaries(SCOPE);

      // 7 L bought at 2000 = 14000 spread over 20 bottles (7 x 1000 ml / 350 ml);
      // the 5 bottles still sellable keep 14000 x (5 / 20), not 14000 x (5 / 7
      // liters) nor 14000 x (5 / 7000 ml).
      expect(summary?.totalCost).toBe(3500);
    });

    it("skips the cost of a line whose purchased unit is not in the product's units", async () => {
      vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([
        inventoryRecord({
          stockBatchLines: [
            line({ id: 'sbl-1', purchaseQuantity: decimal(10), quantityRemaining: decimal(4) }),
            line({ id: 'sbl-2', productUnitId: 'pu-retired' }),
          ],
        }),
      ]);

      const [summary] = await service.listProductInventorySummaries(SCOPE);

      // Only sbl-1 counts (10 x 950 x 4/10); the stale-unit line contributes 0
      // and doesn't fail the summary for the product being listed.
      expect(summary?.totalCost).toBe(3800);
    });

    it('does not fail when a line has no standard quantity', async () => {
      vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([
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
      vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([
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

    it('skips lines with no expiry when reporting the earliest', async () => {
      vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([
        inventoryRecord({
          stockBatchLines: [
            line({ id: 'sbl-1', stockBatchId: 'sb-1', expiryDate: null }),
            line({ id: 'sbl-2', stockBatchId: 'sb-2', expiryDate: LATE }),
            line({ id: 'sbl-3', stockBatchId: 'sb-3', expiryDate: EARLY }),
          ],
        }),
      ]);

      const [summary] = await service.listProductInventorySummaries(SCOPE);

      expect(summary?.earliestExpiry).toEqual(EARLY);
      expect(summary?.expiryCount).toBe(2);
      expect(summary?.numberOfBatches).toBe(3);
    });
  });

  describe('numberOfBatches', () => {
    it('counts every batch still holding stock of the product', async () => {
      vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([
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
      vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([
        inventoryRecord({ stockBatchLines: [] }),
      ]);

      const [summary] = await service.listProductInventorySummaries(SCOPE);

      expect(summary?.numberOfBatches).toBe(0);
    });
  });

  describe('stockStatus', () => {
    const CASES: Array<{
      name: string;
      stock: number;
      threshold: ReturnType<typeof decimal> | null;
      expected: string;
    }> = [
      {
        name: 'is out of stock when nothing is left',
        stock: 0,
        threshold: decimal(5),
        expected: 'OUT_OF_STOCK',
      },
      {
        name: 'is out of stock when the figure has gone negative',
        stock: -1,
        threshold: decimal(5),
        expected: 'OUT_OF_STOCK',
      },
      {
        name: 'is low when the stock has fallen under the product threshold',
        stock: 4,
        threshold: decimal(5),
        expected: 'LOW_STOCK',
      },
      {
        name: 'is in stock once the stock reaches the threshold exactly',
        stock: 5,
        threshold: decimal(5),
        expected: 'IN_STOCK',
      },
      {
        name: 'treats a product that has stock with no threshold as in stock',
        stock: 1,
        threshold: null,
        expected: 'IN_STOCK',
      },
      {
        name: 'is out of stock if nothing is left for a product with no threshold',
        stock: 0,
        threshold: null,
        expected: 'OUT_OF_STOCK',
      },
    ];

    it.each(CASES)('$name', async ({ stock, threshold, expected }) => {
      vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([
        inventoryRecord({ currentSealedStock: decimal(stock), lowStockThreshold: threshold }),
      ]);

      const [summary] = await service.listProductInventorySummaries(SCOPE);

      expect(summary?.stockStatus).toBe(expected);
    });
  });
});

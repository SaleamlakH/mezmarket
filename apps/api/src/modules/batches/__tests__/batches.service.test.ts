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
    getBatchDetail: vi.fn(),
    listProductsWithStockLines: vi.fn(),
    getProductWithBatchHistory: vi.fn(),
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
    price: null,
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

    it('snapshots the purchased unit, its standard unit and the stock it adds onto the write', async () => {
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

    it('carries an expiry date through onto the snapshotted line', async () => {
      const expiryDate = new Date('2027-01-01T00:00:00.000Z');

      await service.createBatch(actor(), input({ lines: [line({ expiryDate })] }));

      expect(written().lines).toEqual([expect.objectContaining({ expiryDate })]);
    });

    it('snapshots a custom unit on the base unit with a base-unit standard quantity and an equal base stock increment', async () => {
      await service.createBatch(
        actor(),
        input({ lines: [line({ productUnitId: 'pu-case', purchaseQuantity: 3 })] }),
      );

      // 3 cases x 12 = 36 bottles; the standard unit is the base unit, so the
      // standard quantity and the base stock increment are the same 36.
      expect(written().lines).toEqual([
        expect.objectContaining({
          purchaseUnit: 'Case (12 bottles)',
          standardUnit: 'pc',
          standardQuantity: 36,
          stockIncrement: 36,
        }),
      ]);
      expect(written().stockIncrements).toEqual([{ productId: 'p-tequila', amount: 36 }]);
    });

    it('snapshots a custom unit on the MOU with an MOU standard quantity but a base stock increment', async () => {
      await service.createBatch(
        actor(),
        input({ lines: [line({ productUnitId: 'pu-shot', purchaseQuantity: 14 })] }),
      );

      // 14 shots x 25 ml = 350 ml in the MOU standard, but that is only 1 bottle
      // of base stock (MOU rate 350): the standard quantity and the increment
      // must not be conflated.
      expect(written().lines).toEqual([
        expect.objectContaining({
          purchaseUnit: 'Shot',
          standardUnit: 'ml',
          standardQuantity: 350,
          resolvedStandardUnitId: 'su-ml',
          stockIncrement: 1,
        }),
      ]);
      expect(written().stockIncrements).toEqual([{ productId: 'p-tequila', amount: 1 }]);
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

    it('returns the created batch with its lines, product labels and receiver', async () => {
      const result = await service.createBatch(actor(), input());

      expect(result).toMatchObject({
        id: 'sb-1',
        receivedBy: { id: 'm-1', name: 'me', role: 'OWNER' },
      });
      expect(result.lines[0]).toMatchObject({
        productName: 'Sierra Tequila 350 ml',
        productBrand: 'Sierra',
        purchaseQuantity: 10,
      });
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

  describe('getBatchDetail', () => {
    it('reads the batch of the resolved business, branch and id', async () => {
      vi.mocked(mockRepo.getBatchDetail).mockResolvedValue(batchRecord());

      await service.getBatchDetail({ businessId: 'b-1', branchId: 'br-1' }, 'sb-1');

      expect(mockRepo.getBatchDetail).toHaveBeenCalledWith('b-1', 'br-1', 'sb-1');
    });

    it('returns the batch with its lines, product labels and receiver', async () => {
      vi.mocked(mockRepo.getBatchDetail).mockResolvedValue(batchRecord());

      const batch = await service.getBatchDetail({ businessId: 'b-1', branchId: 'br-1' }, 'sb-1');

      expect(batch).toMatchObject({
        id: 'sb-1',
        receivedBy: { id: 'm-1', name: 'me', role: 'OWNER' },
      });
      expect(batch.lines[0]).toMatchObject({
        productName: 'Sierra Tequila 350 ml',
        productBrand: 'Sierra',
        purchaseQuantity: 10,
      });
    });

    it('fails with a 404 when the batch is outside the caller scope', async () => {
      vi.mocked(mockRepo.getBatchDetail).mockResolvedValue(null);

      await expect(
        service.getBatchDetail({ businessId: 'b-1', branchId: 'br-1' }, 'missing'),
      ).rejects.toEqual(appError(ERROR_CODES.NOT_FOUND, 404));
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
    const result = await service.listProductInventorySummaries(SCOPE, {});
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
        expiry: { lotCount: 0, quantity: 0 },
        numberOfBatches: 1,
        stockStatus: 'IN_STOCK',
      },
    ]);
  });

  it('totals the remaining cost and the expiring stock of each product', async () => {
    vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([
      inventoryRecord({
        stockBatchLines: [
          line({
            purchaseQuantity: decimal(10),
            purchaseUnitCost: decimal(950),
            quantityRemaining: decimal(4),
          }),
          line({
            id: 'sbl-2',
            stockBatchId: 'sb-2',
            purchaseQuantity: decimal(10),
            purchaseUnitCost: decimal(950),
            quantityRemaining: decimal(6),
            expiryDate: new Date('2026-05-01T00:00:00.000Z'),
          }),
        ],
      }),
    ]);

    const [summary] = await service.listProductInventorySummaries(SCOPE, {
      expiryBefore: new Date('2026-06-01T00:00:00.000Z'),
    });

    // 10x950x(4/10) + 10x950x(6/10) = 9500; only the second line expires in time.
    expect(summary?.totalCost).toBe(9500);
    expect(summary?.expiry).toEqual({ lotCount: 1, quantity: 6 });
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

    const summaries = await service.listProductInventorySummaries(SCOPE, {});

    expect(summaries.map((summary) => summary.uploadId)).toEqual(['u-1', null]);
  });

  it('skips the attachment lookup when no active product holds stock', async () => {
    vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([]);

    await expect(service.listProductInventorySummaries(SCOPE, {})).resolves.toEqual([]);
    expect(mockRepo.listProductAttachments).not.toHaveBeenCalled();
  });

  it('fails the request when a product has no base unit', async () => {
    vi.mocked(mockRepo.listProductsWithStockLines).mockResolvedValue([
      inventoryRecord({ productUnits: [] }),
    ]);

    await expect(service.listProductInventorySummaries(SCOPE, {})).rejects.toMatchObject({
      code: ERROR_CODES.INTERNAL_ERROR,
      statusCode: 500,
    });
  });
});

describe('batch service getProductInventoryDetail', () => {
  let mockRepo: BatchRepository;
  let service: ReturnType<typeof createBatchService>;

  const SCOPE = { businessId: 'b-1', branchId: 'br-1' };

  function historyLine(overrides: Record<string, unknown> = {}) {
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
      stockBatch: {
        id: 'sb-1',
        businessId: 'b-1',
        branchId: 'br-1',
        supplierName: 'Awash Mart',
        referenceNumber: 'INV-42',
        batchDate: new Date('2026-02-01T09:00:00.000Z'),
        confirmedAt: new Date('2026-02-01T10:00:00.000Z'),
        receivedByMemberId: 'm-1',
        createdAt: new Date('2026-02-01T10:00:00.000Z'),
        updatedAt: new Date('2026-02-01T10:00:00.000Z'),
      },
      ...overrides,
    };
  }

  function historyRecord(overrides: Record<string, unknown> = {}) {
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
      stockBatchLines: [historyLine()],
      ...overrides,
    } as never;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = mockRepository();
    service = createBatchService(mockRepo);
    vi.mocked(mockRepo.listProductAttachments).mockResolvedValue([]);
  });

  it('reads the product of the resolved business, branch and id', async () => {
    vi.mocked(mockRepo.getProductWithBatchHistory).mockResolvedValue(historyRecord());

    await service.getProductInventoryDetail(SCOPE, 'p-tequila', {});

    expect(mockRepo.getProductWithBatchHistory).toHaveBeenCalledWith('b-1', 'br-1', 'p-tequila');
  });

  it('fails with a 404 when the product is outside the caller scope', async () => {
    vi.mocked(mockRepo.getProductWithBatchHistory).mockResolvedValue(null);

    await expect(service.getProductInventoryDetail(SCOPE, 'missing', {})).rejects.toEqual(
      appError(ERROR_CODES.NOT_FOUND, 404),
    );
  });

  it('returns the summary header alongside the history', async () => {
    vi.mocked(mockRepo.getProductWithBatchHistory).mockResolvedValue(historyRecord());

    const result = await service.getProductInventoryDetail(SCOPE, 'p-tequila', {});

    expect(result).toMatchObject({
      id: 'p-tequila',
      name: 'Sierra Tequila 350 ml',
      brand: 'Sierra',
      currentSealedStock: 10,
      lowStockThreshold: 5,
      active: true,
      baseUnitLabel: 'Bottle',
      uploadId: null,
      totalCost: 9500,
      expiry: { lotCount: 0, quantity: 0 },
      numberOfBatches: 1,
      stockStatus: 'IN_STOCK',
    });
  });

  it('maps each grouped line to its remaining purchase quantity and cost', async () => {
    vi.mocked(mockRepo.getProductWithBatchHistory).mockResolvedValue(
      historyRecord({
        stockBatchLines: [
          historyLine({
            purchaseQuantity: decimal(10),
            purchaseUnitCost: decimal(950),
            quantityRemaining: decimal(4),
          }),
        ],
      }),
    );

    const result = await service.getProductInventoryDetail(SCOPE, 'p-tequila', {});

    // 10 bought at 950 with 4 of 10 left: 3800 of cost and 4 of the purchase unit.
    expect(result.batches[0]?.lines[0]).toEqual({
      id: 'sbl-1',
      purchaseQuantity: 10,
      purchaseUnit: 'Bottle',
      purchaseUnitCost: 950,
      standardQuantity: 10,
      standardUnit: 'pc',
      quantityRemaining: 4,
      baseUnit: 'Bottle',
      remainingPurchaseQuantity: 4,
      remainingCost: 3800,
      expiryDate: null,
    });
  });

  it('totals the expiry of the stock still on hand against the cutoff', async () => {
    const expiryBefore = new Date('2026-10-24T00:00:00.000Z');
    vi.mocked(mockRepo.getProductWithBatchHistory).mockResolvedValue(
      historyRecord({
        stockBatchLines: [
          historyLine({
            id: 'sbl-expired',
            expiryDate: new Date('2026-10-01T00:00:00.000Z'),
            quantityRemaining: decimal(8),
          }),
          historyLine({
            id: 'sbl-soon',
            expiryDate: new Date('2026-10-24T00:00:00.000Z'),
            quantityRemaining: decimal(50),
          }),
          historyLine({
            id: 'sbl-later',
            expiryDate: new Date('2026-10-25T00:00:00.000Z'),
            quantityRemaining: decimal(4),
          }),
          historyLine({
            id: 'sbl-empty',
            expiryDate: new Date('2026-09-01T00:00:00.000Z'),
            quantityRemaining: decimal(0),
          }),
          historyLine({
            id: 'sbl-no-expiry',
            expiryDate: null,
            quantityRemaining: decimal(3),
          }),
        ],
      }),
    );

    const result = await service.getProductInventoryDetail(SCOPE, 'p-tequila', {
      expiryBefore,
    });

    expect(result.expiry).toEqual({ lotCount: 2, quantity: 58 });
  });

  it('defaults the expiry cutoff to now', async () => {
    vi.mocked(mockRepo.getProductWithBatchHistory).mockResolvedValue(
      historyRecord({
        stockBatchLines: [
          historyLine({
            id: 'sbl-past',
            expiryDate: new Date('2000-01-01T00:00:00.000Z'),
            quantityRemaining: decimal(6),
          }),
          historyLine({
            id: 'sbl-future',
            expiryDate: new Date('2999-01-01T00:00:00.000Z'),
            quantityRemaining: decimal(4),
          }),
        ],
      }),
    );

    const result = await service.getProductInventoryDetail(SCOPE, 'p-tequila', {});

    expect(result.expiry).toEqual({ lotCount: 1, quantity: 6 });
  });

  it('groups the lines under the batch that carried them, newest batch first', async () => {
    const older = historyLine({
      id: 'sbl-old',
      stockBatchId: 'sb-old',
      stockBatch: {
        ...historyLine().stockBatch,
        id: 'sb-old',
        batchDate: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    const newer = historyLine({
      id: 'sbl-new',
      stockBatchId: 'sb-new',
      stockBatch: {
        ...historyLine().stockBatch,
        id: 'sb-new',
        batchDate: new Date('2026-03-01T00:00:00.000Z'),
      },
    });
    vi.mocked(mockRepo.getProductWithBatchHistory).mockResolvedValue(
      historyRecord({ stockBatchLines: [older, newer] }),
    );

    const result = await service.getProductInventoryDetail(SCOPE, 'p-tequila', {});

    expect(result.batches.map((batch) => batch.id)).toEqual(['sb-new', 'sb-old']);
  });

  it('keeps every line of one batch in a single group', async () => {
    vi.mocked(mockRepo.getProductWithBatchHistory).mockResolvedValue(
      historyRecord({
        stockBatchLines: [historyLine({ id: 'sbl-a' }), historyLine({ id: 'sbl-b' })],
      }),
    );

    const result = await service.getProductInventoryDetail(SCOPE, 'p-tequila', {});

    expect(result.batches).toHaveLength(1);
    expect(result.batches[0]?.lines.map((line) => line.id)).toEqual(['sbl-a', 'sbl-b']);
  });

  it('still lists a batch once its lines no longer hold stock', async () => {
    vi.mocked(mockRepo.getProductWithBatchHistory).mockResolvedValue(
      historyRecord({
        stockBatchLines: [
          historyLine({
            id: 'sbl-sold',
            standardQuantity: decimal(10),
            quantityRemaining: decimal(0),
          }),
        ],
      }),
    );

    const result = await service.getProductInventoryDetail(SCOPE, 'p-tequila', {});

    expect(result.batches).toHaveLength(1);
    expect(result.batches[0]?.lines[0]).toMatchObject({ id: 'sbl-sold', quantityRemaining: 0 });
    // The header figures still read only the lines holding stock.
    expect(result.numberOfBatches).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.expiry).toEqual({ lotCount: 0, quantity: 0 });
  });

  it('returns an empty history for a product with no batches', async () => {
    vi.mocked(mockRepo.getProductWithBatchHistory).mockResolvedValue(
      historyRecord({ stockBatchLines: [] }),
    );

    const result = await service.getProductInventoryDetail(SCOPE, 'p-tequila', {});

    expect(result.batches).toEqual([]);
  });

  it('returns the header for an inactive product too', async () => {
    vi.mocked(mockRepo.getProductWithBatchHistory).mockResolvedValue(
      historyRecord({ active: false }),
    );

    const result = await service.getProductInventoryDetail(SCOPE, 'p-tequila', {});

    expect(result.active).toBe(false);
  });

  it('attaches the live image uploadId of the product', async () => {
    vi.mocked(mockRepo.getProductWithBatchHistory).mockResolvedValue(historyRecord());
    vi.mocked(mockRepo.listProductAttachments).mockResolvedValue([
      { recordId: 'p-tequila', uploadId: 'u-1' },
    ] as never);

    const result = await service.getProductInventoryDetail(SCOPE, 'p-tequila', {});

    expect(result.uploadId).toBe('u-1');
  });
});

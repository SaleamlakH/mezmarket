import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSaleService } from '../sales.service.js';
import type {
  CreateSaleCommand,
  CreateSaleInput,
  ProductSellContext,
  ProductUnitSellContext,
  RecordPaymentCommand,
  SalePaymentContext,
  SaleRecordWithDetail,
  SaleRepository,
  SaleService,
  StockLot,
} from '../sales.types.js';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';

function mockRepository(): SaleRepository {
  return {
    getBusinessSaleConfig: vi.fn(),
    getProductSellContext: vi.fn(),
    getStockLots: vi.fn(),
    getSaleForPayment: vi.fn(),
    createSale: vi.fn(),
    recordPayment: vi.fn(),
    listSales: vi.fn(),
  };
}

/** Stands in for a `Decimal` column: the service only ever calls toNumber. */
function decimal(value: number): Prisma.Decimal {
  return { toNumber: () => value } as unknown as Prisma.Decimal;
}

function unit(overrides: Partial<ProductUnitSellContext> = {}): ProductUnitSellContext {
  return {
    id: 'pu-bottle',
    productId: 'p-tequila',
    unitRole: 'BASE',
    standardUnitId: 'su-pc',
    standardUnit: { id: 'su-pc', name: 'Piece', symbol: 'pc' },
    name: 'Bottle',
    dependsOn: null,
    conversionRate: null,
    purchaseCapable: true,
    sellCapable: true,
    price: decimal(950),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

const TEQUILA: ProductSellContext = {
  id: 'p-tequila',
  businessId: 'b-1',
  name: 'Sierra Tequila 350 ml',
  currentSealedStock: decimal(100),
  productUnits: [
    unit(),
    unit({
      id: 'pu-case',
      unitRole: 'CUSTOM',
      standardUnitId: null,
      standardUnit: null,
      name: 'Case (12 bottles)',
      dependsOn: 'BASE',
      conversionRate: decimal(12),
      price: decimal(10800),
    }),
    unit({
      id: 'pu-notsellable',
      unitRole: 'STANDARD',
      standardUnitId: 'su-l',
      standardUnit: { id: 'su-l', name: 'Liter', symbol: 'L' },
      name: 'Liter',
      dependsOn: 'BASE',
      conversionRate: decimal(1),
      sellCapable: false,
      price: decimal(50),
    }),
    unit({ id: 'pu-noprice', name: 'Unpriced', price: null }),
  ],
};

const CATALOG = [TEQUILA];

function line(overrides: Partial<CreateSaleInput['lines'][number]> = {}) {
  return {
    productId: 'p-tequila',
    productUnitId: 'pu-bottle',
    quantity: 2,
    ...overrides,
  };
}

function input(overrides: Partial<CreateSaleInput> = {}): CreateSaleInput {
  return {
    lines: [line()],
    ...overrides,
  };
}

/** A purchase lot still holding stock, as the FIFO walk reads it. */
function lot(overrides: Partial<StockLot> = {}): StockLot {
  return {
    id: 'lot-1',
    productId: 'p-tequila',
    purchaseUnitCost: decimal(600),
    quantityRemaining: decimal(10),
    ...overrides,
  };
}

function saleRecord(overrides: Partial<SaleRecordWithDetail> = {}): SaleRecordWithDetail {
  return {
    id: 'sale-1',
    businessId: 'b-1',
    branchId: 'br-1',
    invoiceNumber: '1',
    processedByMemberId: 'm-1',
    serverMemberId: null,
    customerId: null,
    saleDatetime: new Date('2026-02-01T09:00:00.000Z'),
    discount: null,
    taxRateApplied: decimal(0.15),
    subtotal: decimal(1900),
    taxAmount: decimal(285),
    total: decimal(2185),
    paymentStatus: 'PENDING',
    amountPaid: decimal(0),
    balanceDue: decimal(2185),
    voidStatus: 'NONE',
    voidReason: null,
    createdAt: new Date('2026-02-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T10:00:00.000Z'),
    lines: [
      {
        id: 'sl-1',
        saleId: 'sale-1',
        productId: 'p-tequila',
        productName: 'Sierra Tequila 350 ml',
        productUnitId: 'pu-bottle',
        soldUnit: 'Bottle',
        quantity: decimal(2),
        standardUnit: 'pc',
        quantityInStandardUnit: decimal(2),
        resolvedStandardUnitId: 'su-pc',
        unitPrice: decimal(950),
        containerId: null,
        refunded: false,
        refundRestocked: false,
        createdAt: new Date('2026-02-01T10:00:00.000Z'),
        updatedAt: new Date('2026-02-01T10:00:00.000Z'),
        product: { brand: 'Sierra' },
      },
    ],
    payments: [],
    processedByMember: { id: 'm-1', name: 'me', role: 'OWNER' },
    serverMember: null,
    customer: null,
    ...overrides,
  };
}

/** A sale as the payment flow reads it before it writes anything. */
function paymentContext(overrides: Partial<SalePaymentContext> = {}): SalePaymentContext {
  return {
    id: 'sale-1',
    total: decimal(2185),
    paymentStatus: 'PENDING',
    voidStatus: 'NONE',
    amountPaid: decimal(0),
    balanceDue: decimal(2185),
    ...overrides,
  };
}

function actor() {
  return { businessId: 'b-1', branchId: 'br-1', memberId: 'm-1' };
}

/** The command the service handed the repository, as it was given. */
function written(): CreateSaleCommand {
  const call = vi.mocked(mockRepo.createSale).mock.calls.at(0);

  if (!call) {
    throw new Error('createSale was never called');
  }

  return call[0];
}

/** The command the service handed the repository's payment write, as it was given. */
function paymentWritten(): RecordPaymentCommand {
  const call = vi.mocked(mockRepo.recordPayment).mock.calls.at(0);

  if (!call) {
    throw new Error('recordPayment was never called');
  }

  return call[0];
}

/** A thrown AppError pinned by code and status only. */
function appError(code: string, statusCode: number) {
  return expect.objectContaining({ code, statusCode, message: expect.any(String) });
}

let mockRepo: SaleRepository;
let service: SaleService;

describe('sales.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = mockRepository();
    service = createSaleService(mockRepo);
    vi.mocked(mockRepo.getBusinessSaleConfig).mockResolvedValue({
      defaultTaxRate: decimal(0.15),
      allowNegativeStock: true,
    });
    vi.mocked(mockRepo.getProductSellContext).mockResolvedValue(CATALOG);
    vi.mocked(mockRepo.getStockLots).mockResolvedValue([]);
    vi.mocked(mockRepo.createSale).mockResolvedValue(saleRecord());
    vi.mocked(mockRepo.recordPayment).mockResolvedValue(saleRecord());
    vi.mocked(mockRepo.getSaleForPayment).mockResolvedValue(paymentContext());
  });

  describe('createSale', () => {
    it('reads the catalog of the products named, once per distinct product', async () => {
      await service.createSale(
        actor(),
        input({ lines: [line(), line({ productUnitId: 'pu-case' })] }),
      );

      expect(mockRepo.getProductSellContext).toHaveBeenCalledWith('b-1', ['p-tequila']);
    });

    it('writes the sale against the acting member and scope', async () => {
      await service.createSale({ businessId: 'b-1', branchId: 'br-9', memberId: 'm-9' }, input());

      expect(written()).toMatchObject({
        businessId: 'b-1',
        branchId: 'br-9',
        memberId: 'm-9',
      });
    });

    it('computes subtotal, tax and total from the lines and the business tax rate', async () => {
      await service.createSale(actor(), input({ lines: [line({ quantity: 2 })] }));

      // 2 x 950 = 1900; tax 15% = 285; total = 2185
      expect(written()).toMatchObject({
        subtotal: 1900,
        taxRateApplied: 0.15,
        taxAmount: 285,
        total: 2185,
      });
    });

    it('charges no tax when the business has no rate set', async () => {
      vi.mocked(mockRepo.getBusinessSaleConfig).mockResolvedValue({
        defaultTaxRate: null,
        allowNegativeStock: true,
      });

      await service.createSale(actor(), input());

      expect(written()).toMatchObject({ taxRateApplied: 0, taxAmount: 0, total: 1900 });
    });

    it('rounds money to the precision the columns store', async () => {
      vi.mocked(mockRepo.getBusinessSaleConfig).mockResolvedValue({
        defaultTaxRate: decimal(0.075),
        allowNegativeStock: true,
      });

      await service.createSale(actor(), input({ lines: [line({ quantity: 3 })] }));

      // 3 x 950 = 2850; 7.5% = 213.75; total = 3063.75
      expect(written()).toMatchObject({ subtotal: 2850, taxAmount: 213.75, total: 3063.75 });
    });

    it('leaves the discount empty', async () => {
      await service.createSale(actor(), input());

      expect(written().discount).toBeNull();
    });

    it('defaults the sale datetime to now when none was given', async () => {
      const before = Date.now();
      await service.createSale(actor(), input());
      const after = Date.now();

      const writtenAt = written().saleDatetime.getTime();
      expect(writtenAt).toBeGreaterThanOrEqual(before);
      expect(writtenAt).toBeLessThanOrEqual(after);
    });

    it('honours an explicit sale datetime', async () => {
      const saleDatetime = new Date('2026-01-10T08:30:00.000Z');
      await service.createSale(actor(), input({ saleDatetime }));

      expect(written().saleDatetime).toEqual(saleDatetime);
    });

    it('hands the snapshotted lines to the write, computed before it runs', async () => {
      await service.createSale(actor(), input({ lines: [line({ quantity: 2 })] }));

      expect(written().lines).toEqual([
        expect.objectContaining({
          productName: 'Sierra Tequila 350 ml',
          soldUnit: 'Bottle',
          quantity: 2,
          quantityInStandardUnit: 2,
          unitPrice: 950,
        }),
      ]);
    });

    it('snapshots each sold unit price from the unit that was chosen', async () => {
      await service.createSale(actor(), input({ lines: [line({ productUnitId: 'pu-case' })] }));

      expect(written().lines).toEqual([
        expect.objectContaining({
          soldUnit: 'Case (12 bottles)',
          quantity: 2,
          quantityInStandardUnit: 24,
          unitPrice: 10800,
        }),
      ]);
    });

    it('rejects a unit that is not one of that product units', async () => {
      await expect(
        service.createSale(actor(), input({ lines: [line({ productUnitId: 'pu-elsewhere' })] })),
      ).rejects.toEqual(appError(ERROR_CODES.BAD_REQUEST, 400));
      expect(mockRepo.createSale).not.toHaveBeenCalled();
    });

    it('rejects a unit the product cannot be sold in', async () => {
      await expect(
        service.createSale(actor(), input({ lines: [line({ productUnitId: 'pu-notsellable' })] })),
      ).rejects.toEqual(appError(ERROR_CODES.BAD_REQUEST, 400));
      expect(mockRepo.createSale).not.toHaveBeenCalled();
    });

    it('rejects a sellable unit that carries no price', async () => {
      await expect(
        service.createSale(actor(), input({ lines: [line({ productUnitId: 'pu-noprice' })] })),
      ).rejects.toEqual(appError(ERROR_CODES.BAD_REQUEST, 400));
      expect(mockRepo.createSale).not.toHaveBeenCalled();
    });

    it('does not write the sale when a line cannot be snapshotted', async () => {
      await expect(
        service.createSale(actor(), input({ lines: [line({ productId: 'p-unknown' })] })),
      ).rejects.toEqual(appError(ERROR_CODES.NOT_FOUND, 404));
      expect(mockRepo.createSale).not.toHaveBeenCalled();
    });

    it('opens a sale paid when it is created with a paid status and no amount', async () => {
      await service.createSale(actor(), input({ initialPayment: { status: 'PAID' } }));

      expect(written()).toMatchObject({
        paymentStatus: 'PAID',
        amountPaid: 2185,
        balanceDue: 0,
        initialPayment: { amount: 2185, method: 'OTHER', methodDetail: null },
      });
    });

    it('opens a sale partially paid at the amount it names', async () => {
      await service.createSale(
        actor(),
        input({ initialPayment: { status: 'PARTIALLY_PAID', amount: 500, method: 'CASH' } }),
      );

      expect(written()).toMatchObject({
        paymentStatus: 'PARTIALLY_PAID',
        amountPaid: 500,
        balanceDue: 1685,
        initialPayment: { amount: 500, method: 'CASH', methodDetail: null },
      });
    });

    it('opens a sale pending with nothing paid when it is created without a payment', async () => {
      await service.createSale(actor(), input());

      expect(written()).toMatchObject({
        paymentStatus: 'PENDING',
        amountPaid: 0,
        balanceDue: 2185,
        initialPayment: null,
      });
    });

    it('keeps a free-text detail with the initial payment', async () => {
      await service.createSale(
        actor(),
        input({
          initialPayment: { status: 'PAID', method: 'MOBILE_MONEY', methodDetail: 'ref 42' },
        }),
      );

      expect(written().initialPayment).toEqual({
        amount: 2185,
        method: 'MOBILE_MONEY',
        methodDetail: 'ref 42',
      });
    });

    it('answers 404 when the business has vanished', async () => {
      vi.mocked(mockRepo.getBusinessSaleConfig).mockResolvedValue(null);

      await expect(service.createSale(actor(), input())).rejects.toEqual(
        appError(ERROR_CODES.NOT_FOUND, 404),
      );
      expect(mockRepo.createSale).not.toHaveBeenCalled();
    });

    it('returns the created sale with its lines, brand and processing member', async () => {
      const result = await service.createSale(actor(), input());

      expect(result).toMatchObject({
        id: 'sale-1',
        invoiceNumber: '1',
        subtotal: 1900,
        taxAmount: 285,
        total: 2185,
        paymentStatus: 'PENDING',
        discount: null,
        processedBy: { id: 'm-1', name: 'me', role: 'OWNER' },
        servedBy: null,
        customer: null,
        payments: [],
      });
      expect(result.lines[0]).toMatchObject({
        productName: 'Sierra Tequila 350 ml',
        productBrand: 'Sierra',
        quantity: 2,
        unitPrice: 950,
        quantityInStandardUnit: 2,
      });
      expect(result.lines[0]?.quantity).toBe(2);
    });

    it('reads the lots of the products named, oldest first', async () => {
      await service.createSale(actor(), input());

      expect(mockRepo.getStockLots).toHaveBeenCalledWith('b-1', ['p-tequila']);
    });

    it('allocates a line against the oldest lot first', async () => {
      vi.mocked(mockRepo.getStockLots).mockResolvedValue([
        lot({ id: 'lot-old', purchaseUnitCost: decimal(600), quantityRemaining: decimal(10) }),
        lot({ id: 'lot-new', purchaseUnitCost: decimal(700), quantityRemaining: decimal(10) }),
      ]);

      await service.createSale(actor(), input({ lines: [line({ quantity: 2 })] }));

      expect(written().lines[0]?.allocations).toEqual([
        { stockBatchLineId: 'lot-old', quantityPulled: 2, unitCost: 600 },
      ]);
    });

    it('splits a line across lots when the oldest runs out', async () => {
      vi.mocked(mockRepo.getStockLots).mockResolvedValue([
        lot({ id: 'lot-old', purchaseUnitCost: decimal(600), quantityRemaining: decimal(1) }),
        lot({ id: 'lot-new', purchaseUnitCost: decimal(700), quantityRemaining: decimal(10) }),
      ]);

      await service.createSale(actor(), input({ lines: [line({ quantity: 3 })] }));

      expect(written().lines[0]?.allocations).toEqual([
        { stockBatchLineId: 'lot-old', quantityPulled: 1, unitCost: 600 },
        { stockBatchLineId: 'lot-new', quantityPulled: 2, unitCost: 700 },
      ]);
      expect(written().lotDecrements).toEqual([
        { stockBatchLineId: 'lot-old', quantity: 1 },
        { stockBatchLineId: 'lot-new', quantity: 2 },
      ]);
    });

    it("sums one lot's draws across a product's lines into a single decrement", async () => {
      vi.mocked(mockRepo.getStockLots).mockResolvedValue([
        lot({ id: 'lot-1', quantityRemaining: decimal(50) }),
      ]);

      await service.createSale(
        actor(),
        input({ lines: [line({ quantity: 2 }), line({ quantity: 3 })] }),
      );

      expect(written().lotDecrements).toEqual([{ stockBatchLineId: 'lot-1', quantity: 5 }]);
    });

    it('takes the drawn base quantity off the product, summed across its lines', async () => {
      await service.createSale(
        actor(),
        input({ lines: [line({ quantity: 2 }), line({ productUnitId: 'pu-case', quantity: 1 })] }),
      );

      // 2 bottles + 1 case (12 bottles) = 14 base units.
      expect(written().stockDecrements).toEqual([{ productId: 'p-tequila', amount: 14 }]);
    });

    it('blocks a sale that would take stock below zero when the business disallows it', async () => {
      vi.mocked(mockRepo.getBusinessSaleConfig).mockResolvedValue({
        defaultTaxRate: decimal(0.15),
        allowNegativeStock: false,
      });
      vi.mocked(mockRepo.getProductSellContext).mockResolvedValue([
        { ...TEQUILA, currentSealedStock: decimal(1) },
      ]);

      await expect(
        service.createSale(actor(), input({ lines: [line({ quantity: 2 })] })),
      ).rejects.toEqual(appError(ERROR_CODES.BAD_REQUEST, 400));
      expect(mockRepo.createSale).not.toHaveBeenCalled();
    });

    it('lets a sale run stock negative when the business allows it', async () => {
      vi.mocked(mockRepo.getBusinessSaleConfig).mockResolvedValue({
        defaultTaxRate: decimal(0.15),
        allowNegativeStock: true,
      });
      vi.mocked(mockRepo.getProductSellContext).mockResolvedValue([
        { ...TEQUILA, currentSealedStock: decimal(1) },
      ]);

      await service.createSale(actor(), input({ lines: [line({ quantity: 2 })] }));

      expect(written().stockDecrements).toEqual([{ productId: 'p-tequila', amount: 2 }]);
    });

    it('draws what it can from lots and leaves the oversell unallocated', async () => {
      vi.mocked(mockRepo.getProductSellContext).mockResolvedValue([
        { ...TEQUILA, currentSealedStock: decimal(1) },
      ]);
      vi.mocked(mockRepo.getStockLots).mockResolvedValue([
        lot({ id: 'lot-old', quantityRemaining: decimal(1) }),
      ]);

      await service.createSale(actor(), input({ lines: [line({ quantity: 2 })] }));

      expect(written().lines[0]?.allocations).toEqual([
        { stockBatchLineId: 'lot-old', quantityPulled: 1, unitCost: 600 },
      ]);
      // The product still reflects the full draw, lot or not.
      expect(written().stockDecrements).toEqual([{ productId: 'p-tequila', amount: 2 }]);
      expect(written().lotDecrements).toEqual([{ stockBatchLineId: 'lot-old', quantity: 1 }]);
    });
  });

  describe('recordPayment', () => {
    it('reads the sale within the acting business before writing', async () => {
      await service.recordPayment(actor(), 'sale-1', { status: 'PAID' });

      expect(mockRepo.getSaleForPayment).toHaveBeenCalledWith('b-1', 'sale-1');
    });

    it('settles a paid sale for the whole balance when no amount is named', async () => {
      await service.recordPayment(actor(), 'sale-1', { status: 'PAID' });

      expect(paymentWritten()).toMatchObject({
        saleId: 'sale-1',
        memberId: 'm-1',
        total: 2185,
        paymentStatus: 'PAID',
        payment: { amount: 2185, method: 'OTHER', methodDetail: null },
      });
    });

    it('records the amount a partial payment names and keeps the status', async () => {
      vi.mocked(mockRepo.getSaleForPayment).mockResolvedValue(
        paymentContext({ paymentStatus: 'PENDING', balanceDue: decimal(2185) }),
      );

      await service.recordPayment(actor(), 'sale-1', {
        status: 'PARTIALLY_PAID',
        amount: 500,
        method: 'CARD',
      });

      expect(paymentWritten()).toMatchObject({
        paymentStatus: 'PARTIALLY_PAID',
        payment: { amount: 500, method: 'CARD', methodDetail: null },
      });
    });

    it('settles only the remaining balance for a paid sale already part-way', async () => {
      vi.mocked(mockRepo.getSaleForPayment).mockResolvedValue(
        paymentContext({
          paymentStatus: 'PARTIALLY_PAID',
          amountPaid: decimal(500),
          balanceDue: decimal(1685),
        }),
      );

      await service.recordPayment(actor(), 'sale-1', { status: 'PAID' });

      expect(paymentWritten()).toMatchObject({ payment: { amount: 1685 } });
    });

    it('marks a sale pending without recording a payment', async () => {
      await service.recordPayment(actor(), 'sale-1', { status: 'PENDING' });

      expect(paymentWritten()).toMatchObject({ paymentStatus: 'PENDING', payment: null });
    });

    it('rejects a payment against a sale that is already paid', async () => {
      vi.mocked(mockRepo.getSaleForPayment).mockResolvedValue(
        paymentContext({
          paymentStatus: 'PAID',
          amountPaid: decimal(2185),
          balanceDue: decimal(0),
        }),
      );

      await expect(service.recordPayment(actor(), 'sale-1', { status: 'PAID' })).rejects.toEqual(
        appError(ERROR_CODES.BAD_REQUEST, 400),
      );
      expect(mockRepo.recordPayment).not.toHaveBeenCalled();
    });

    it('rejects a payment against a voided sale', async () => {
      vi.mocked(mockRepo.getSaleForPayment).mockResolvedValue(
        paymentContext({ voidStatus: 'VOIDED' }),
      );

      await expect(service.recordPayment(actor(), 'sale-1', { status: 'PAID' })).rejects.toEqual(
        appError(ERROR_CODES.BAD_REQUEST, 400),
      );
      expect(mockRepo.recordPayment).not.toHaveBeenCalled();
    });

    it('rejects marking pending a sale that already holds a payment', async () => {
      vi.mocked(mockRepo.getSaleForPayment).mockResolvedValue(
        paymentContext({
          paymentStatus: 'PARTIALLY_PAID',
          amountPaid: decimal(500),
          balanceDue: decimal(1685),
        }),
      );

      await expect(service.recordPayment(actor(), 'sale-1', { status: 'PENDING' })).rejects.toEqual(
        appError(ERROR_CODES.BAD_REQUEST, 400),
      );
      expect(mockRepo.recordPayment).not.toHaveBeenCalled();
    });

    it('answers 404 when the sale is not in the business', async () => {
      vi.mocked(mockRepo.getSaleForPayment).mockResolvedValue(null);

      await expect(service.recordPayment(actor(), 'sale-1', { status: 'PAID' })).rejects.toEqual(
        appError(ERROR_CODES.NOT_FOUND, 404),
      );
      expect(mockRepo.recordPayment).not.toHaveBeenCalled();
    });
  });

  describe('listSales', () => {
    it('reads the sales of the resolved business and branch', async () => {
      vi.mocked(mockRepo.listSales).mockResolvedValue([]);

      await service.listSales({ businessId: 'b-1', branchId: 'br-1' });

      expect(mockRepo.listSales).toHaveBeenCalledWith('b-1', 'br-1');
    });

    it('maps each stored sale to a summary row rather than its detail', async () => {
      vi.mocked(mockRepo.listSales).mockResolvedValue([
        saleRecord(),
        saleRecord({ id: 'sale-2', invoiceNumber: '2' }),
      ]);

      const result = await service.listSales({ businessId: 'b-1', branchId: 'br-1' });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'sale-1',
        invoiceNumber: '1',
        total: 2185,
        paymentStatus: 'PENDING',
        voidStatus: 'NONE',
        itemCount: 1,
        productNames: ['Sierra Tequila 350 ml'],
        processedBy: { id: 'm-1', name: 'me', role: 'OWNER' },
        servedBy: null,
        customer: null,
      });
      expect(result[0]).not.toHaveProperty('lines');
      expect(result[0]).not.toHaveProperty('payments');
      expect(result[1]?.id).toBe('sale-2');
    });

    it('counts every line but names each product once', async () => {
      const baseLine = saleRecord().lines[0] as SaleRecordWithDetail['lines'][number];
      vi.mocked(mockRepo.listSales).mockResolvedValue([
        saleRecord({
          lines: [
            { ...baseLine, id: 'sl-1' },
            { ...baseLine, id: 'sl-2', productName: 'Cooking Oil 5 L' },
            { ...baseLine, id: 'sl-3', productUnitId: 'pu-case' },
          ],
        }),
      ]);

      const [row] = await service.listSales({ businessId: 'b-1', branchId: 'br-1' });

      expect(row?.itemCount).toBe(3);
      expect(row?.productNames).toEqual(['Sierra Tequila 350 ml', 'Cooking Oil 5 L']);
    });
  });
});

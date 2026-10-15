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
} from '../sales.types.js';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';

function mockRepository(): SaleRepository {
  return {
    getBusinessSaleConfig: vi.fn(),
    getProductSellContext: vi.fn(),
    getStockLots: vi.fn(),
    getCustomer: vi.fn(),
    getServer: vi.fn(),
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
    lines: [],
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
    vi.mocked(mockRepo.getCustomer).mockResolvedValue({ id: 'cust-1' });
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

    it('records the snapshotted lines onto the write', async () => {
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

    it('snapshots the chosen unit and its standard quantity onto the line', async () => {
      await service.createSale(actor(), input({ lines: [line({ productUnitId: 'pu-case' })] }));

      // 2 cases x 12 = 24 bottles in the standard unit
      expect(written().lines).toEqual([
        expect.objectContaining({
          soldUnit: 'Case (12 bottles)',
          quantityInStandardUnit: 24,
          unitPrice: 10800,
        }),
      ]);
    });

    it('leaves the discount empty', async () => {
      await service.createSale(actor(), input());

      expect(written().discount).toBeNull();
    });

    it('records a discount and lowers the total by it', async () => {
      await service.createSale(actor(), input({ discount: 100 }));

      // 1900 less 100 = 1800; tax 15% = 270; total = 2070
      expect(written()).toMatchObject({
        discount: 100,
        subtotal: 1900,
        taxAmount: 270,
        total: 2070,
      });
    });

    it('refuses a discount larger than the sale subtotal', async () => {
      await expect(service.createSale(actor(), input({ discount: 5000 }))).rejects.toThrow(
        appError(ERROR_CODES.BAD_REQUEST, 400),
      );
      expect(mockRepo.createSale).not.toHaveBeenCalled();
    });

    it('records the initial payment position of a sale confirmed paid', async () => {
      await service.createSale(actor(), input({ initialPayment: { status: 'PAID' } }));

      expect(written()).toMatchObject({
        paymentStatus: 'PAID',
        amountPaid: 2185,
        balanceDue: 0,
        initialPayment: { amount: 2185, method: 'OTHER', methodDetail: null },
      });
    });

    it('records a partial initial payment at the amount it names', async () => {
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

    it('records a pending sale owing the whole total when no payment is named', async () => {
      await service.createSale(actor(), input());

      expect(written()).toMatchObject({
        paymentStatus: 'PENDING',
        amountPaid: 0,
        balanceDue: 2185,
        initialPayment: null,
      });
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

    it('reads the lots of the products named', async () => {
      await service.createSale(actor(), input());

      expect(mockRepo.getStockLots).toHaveBeenCalledWith('b-1', ['p-tequila']);
    });

    it('answers 404 when the business has vanished', async () => {
      vi.mocked(mockRepo.getBusinessSaleConfig).mockResolvedValue(null);

      await expect(service.createSale(actor(), input())).rejects.toEqual(
        appError(ERROR_CODES.NOT_FOUND, 404),
      );
      expect(mockRepo.createSale).not.toHaveBeenCalled();
    });

    it('reads a named customer within the acting business before writing', async () => {
      await service.createSale(actor(), input({ customerId: 'cust-1' }));

      expect(mockRepo.getCustomer).toHaveBeenCalledWith('b-1', 'cust-1');
      expect(written().customerId).toBe('cust-1');
    });

    it('never reads a customer back for a sale that names none', async () => {
      await service.createSale(actor(), input());

      expect(mockRepo.getCustomer).not.toHaveBeenCalled();
      expect(written().customerId).toBeNull();
    });

    it('rejects a customer that is not in the business', async () => {
      vi.mocked(mockRepo.getCustomer).mockResolvedValue(null);

      await expect(
        service.createSale(actor(), input({ customerId: 'cust-other' })),
      ).rejects.toEqual(appError(ERROR_CODES.BAD_REQUEST, 400));
      expect(mockRepo.createSale).not.toHaveBeenCalled();
    });

    it('reads a named server within the acting business before writing', async () => {
      vi.mocked(mockRepo.getServer).mockResolvedValue({ id: 'srv-1' });

      await service.createSale(actor(), input({ serverMemberId: 'srv-1' }));

      expect(mockRepo.getServer).toHaveBeenCalledWith('b-1', 'srv-1');
      expect(written().serverMemberId).toBe('srv-1');
    });

    it('never reads a server back for a sale that names none', async () => {
      await service.createSale(actor(), input());

      expect(mockRepo.getServer).not.toHaveBeenCalled();
      expect(written().serverMemberId).toBeNull();
    });

    it('rejects a server that is not an active server of the business', async () => {
      vi.mocked(mockRepo.getServer).mockResolvedValue(null);

      await expect(
        service.createSale(actor(), input({ serverMemberId: 'srv-other' })),
      ).rejects.toEqual(appError(ERROR_CODES.BAD_REQUEST, 400));
      expect(mockRepo.createSale).not.toHaveBeenCalled();
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

    it('records the amount and method a partial payment names', async () => {
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
  });
});

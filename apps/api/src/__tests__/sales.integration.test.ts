import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { AuthRepository } from '../modules/auth/auth.types.js';
import type { BusinessRepository } from '../modules/business/business.types.js';
import type { SaleRepository } from '../modules/sales/sales.types.js';

const { verifyJwt, authRepository, businessRepository, salesRepository } = vi.hoisted(() => ({
  verifyJwt: vi.fn(),
  authRepository: {
    findIdentity: vi.fn(),
    createIdentity: vi.fn(),
  } satisfies AuthRepository,
  businessRepository: {
    listForOwner: vi.fn(),
    createForOwner: vi.fn(),
    getBusinessId: vi.fn(),
    getBranchId: vi.fn(),
    getActor: vi.fn(),
    getForOwner: vi.fn(),
    updateForOwner: vi.fn(),
  } satisfies BusinessRepository,
  salesRepository: {
    getBusinessSaleConfig: vi.fn(),
    getProductSellContext: vi.fn(),
    getStockLots: vi.fn(),
    getCustomer: vi.fn(),
    getServer: vi.fn(),
    getSaleForPayment: vi.fn(),
    getSale: vi.fn(),
    createSale: vi.fn(),
    recordPayment: vi.fn(),
    listSales: vi.fn(),
  } satisfies SaleRepository,
}));

vi.mock('../lib/jwt.js', () => ({ verifyJwt }));
vi.mock('../modules/auth/auth.repository.js', () => ({
  createAuthRepository: () => authRepository,
}));
vi.mock('../modules/business/business.repository.js', () => ({
  createBusinessRepository: () => businessRepository,
}));
vi.mock('../modules/sales/sales.repository.js', () => ({
  createSaleRepository: () => salesRepository,
}));

import app from '../app.js';
import { ERROR_CODES } from '../shared/errors/app-error.js';

const decimal = (value: number) => ({ toNumber: () => value });

const PRODUCT = {
  id: 'p-tequila',
  businessId: 'b-1',
  name: 'Sierra Tequila 350 ml',
  currentSealedStock: decimal(100),
  productUnits: [
    {
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
    },
  ],
};

const SALE_RECORD = {
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
};

const PAID_SALE_RECORD = {
  ...SALE_RECORD,
  paymentStatus: 'PAID',
  amountPaid: decimal(2185),
  balanceDue: decimal(0),
  payments: [{ id: 'pay-1', amount: decimal(2185), method: 'CASH', methodDetail: null }],
};

const SALE_PAYMENT_CONTEXT = {
  id: 'sale-1',
  total: decimal(2185),
  paymentStatus: 'PENDING',
  voidStatus: 'NONE',
  amountPaid: decimal(0),
  balanceDue: decimal(2185),
};

const BODY = {
  lines: [{ productId: 'p-tequila', productUnitId: 'pu-bottle', quantity: '2' }],
};

async function authenticate(role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'SERVER' = 'OWNER') {
  verifyJwt.mockResolvedValue({ sub: 'user-1', email: 'user@test.com' });
  authRepository.findIdentity.mockResolvedValue({
    id: 'id-1',
    ownerId: 'owner-1',
    providerUserId: 'user-1',
  });
  businessRepository.getBusinessId.mockResolvedValue('b-1');
  businessRepository.getBranchId.mockResolvedValue('br-1');
  businessRepository.getActor.mockResolvedValue({ id: 'm-1', role });
}

describe('sales.integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    salesRepository.getBusinessSaleConfig.mockResolvedValue({
      defaultTaxRate: decimal(0.15),
      allowNegativeStock: true,
    });
    salesRepository.getProductSellContext.mockResolvedValue([PRODUCT]);
    salesRepository.getStockLots.mockResolvedValue([]);
    salesRepository.createSale.mockResolvedValue(SALE_RECORD);
    salesRepository.getSaleForPayment.mockResolvedValue(SALE_PAYMENT_CONTEXT);
    salesRepository.recordPayment.mockResolvedValue(PAID_SALE_RECORD);
    salesRepository.listSales.mockResolvedValue([SALE_RECORD]);
  });

  describe('POST /api/businesses/:businessId/sales', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).post('/api/businesses/b-1/sales').send(BODY);

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.UNAUTHORIZED } });
      expect(salesRepository.createSale).not.toHaveBeenCalled();
    });

    it('rejects an invalid body before the catalog is read', async () => {
      await authenticate();

      const res = await request(app)
        .post('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token')
        .send({ lines: [] });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        error: { code: ERROR_CODES.BAD_REQUEST, message: expect.any(String) },
      });
      expect(salesRepository.getProductSellContext).not.toHaveBeenCalled();
    });

    it('refuses a SERVER with FORBIDDEN', async () => {
      await authenticate('SERVER');

      const res = await request(app)
        .post('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.FORBIDDEN } });
      expect(salesRepository.createSale).not.toHaveBeenCalled();
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER'] as const)('creates a sale for a %s', async (role) => {
      await authenticate(role);

      const res = await request(app)
        .post('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(201);
      expect(salesRepository.createSale).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: 'b-1',
          branchId: 'br-1',
          memberId: 'm-1',
          subtotal: 1900,
          taxAmount: 285,
          total: 2185,
          lines: [
            expect.objectContaining({
              productId: 'p-tequila',
              soldUnit: 'Bottle',
              quantity: 2,
              unitPrice: 950,
            }),
          ],
        }),
      );
    });

    it('attributes the server named on the sale, separate from who processed it', async () => {
      await authenticate('CASHIER');
      salesRepository.getServer.mockResolvedValue({ id: 'srv-1' });

      const res = await request(app)
        .post('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token')
        .send({ ...BODY, serverMemberId: 'srv-1' });

      expect(res.status).toBe(201);
      expect(salesRepository.getServer).toHaveBeenCalledWith('b-1', 'srv-1');
      expect(salesRepository.createSale).toHaveBeenCalledWith(
        expect.objectContaining({ memberId: 'm-1', serverMemberId: 'srv-1' }),
      );
    });

    it('rejects a server that is not an active server of the business', async () => {
      await authenticate();
      salesRepository.getServer.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token')
        .send({ ...BODY, serverMemberId: 'srv-other' });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.BAD_REQUEST } });
      expect(salesRepository.createSale).not.toHaveBeenCalled();
    });

    it('answers the created sale with exactly the lines entered and computed amounts', async () => {
      await authenticate();

      const res = await request(app)
        .post('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.body).toMatchObject({
        id: 'sale-1',
        invoiceNumber: '1',
        subtotal: 1900,
        taxAmount: 285,
        total: 2185,
        paymentStatus: 'PENDING',
        processedBy: { id: 'm-1', name: 'me', role: 'OWNER' },
      });
      expect(res.body.lines[0]).toMatchObject({
        productName: 'Sierra Tequila 350 ml',
        productBrand: 'Sierra',
        soldUnit: 'Bottle',
        quantity: 2,
        unitPrice: 950,
      });
      expect(res.body).not.toHaveProperty('processedByMember');
    });

    it('answers 404 when a line names a product the business does not have', async () => {
      await authenticate();
      salesRepository.getProductSellContext.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.NOT_FOUND } });
      expect(salesRepository.createSale).not.toHaveBeenCalled();
    });

    it('answers 404 when the caller does not own the business', async () => {
      await authenticate();
      businessRepository.getBusinessId.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(404);
      expect(salesRepository.createSale).not.toHaveBeenCalled();
    });

    it('creates a sale already paid from an initial payment with no amount', async () => {
      await authenticate();

      const res = await request(app)
        .post('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token')
        .send({ ...BODY, initialPayment: { status: 'PAID' } });

      expect(res.status).toBe(201);
      expect(salesRepository.createSale).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentStatus: 'PAID',
          amountPaid: 2185,
          balanceDue: 0,
          initialPayment: { amount: 2185, method: 'OTHER', methodDetail: null },
        }),
      );
    });

    it('refuses a partial initial payment with no amount, pointing at the field', async () => {
      await authenticate();

      const res = await request(app)
        .post('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token')
        .send({ ...BODY, initialPayment: { status: 'PARTIALLY_PAID' } });

      expect(res.status).toBe(400);
      expect(res.body.error.details).toMatchObject({ 'initialPayment.amount': expect.any(String) });
      expect(salesRepository.createSale).not.toHaveBeenCalled();
    });

    it('draws the sold quantity from the oldest lot first, splitting when it runs out', async () => {
      await authenticate();
      salesRepository.getProductSellContext.mockResolvedValue([
        { ...PRODUCT, currentSealedStock: decimal(100) },
      ]);
      salesRepository.getStockLots.mockResolvedValue([
        {
          id: 'lot-old',
          productId: 'p-tequila',
          purchaseUnitCost: decimal(600),
          quantityRemaining: decimal(1),
        },
        {
          id: 'lot-new',
          productId: 'p-tequila',
          purchaseUnitCost: decimal(700),
          quantityRemaining: decimal(10),
        },
      ]);

      const res = await request(app)
        .post('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(201);
      expect(salesRepository.createSale).toHaveBeenCalledWith(
        expect.objectContaining({
          stockDecrements: [{ productId: 'p-tequila', amount: 2 }],
          lotDecrements: [
            { stockBatchLineId: 'lot-old', quantity: 1 },
            { stockBatchLineId: 'lot-new', quantity: 1 },
          ],
          lines: [
            expect.objectContaining({
              quantityInBaseUnit: 2,
              allocations: [
                { stockBatchLineId: 'lot-old', quantityPulled: 1, unitCost: 600 },
                { stockBatchLineId: 'lot-new', quantityPulled: 1, unitCost: 700 },
              ],
            }),
          ],
        }),
      );
    });

    it('blocks a sale that would oversell when the business disallows negative stock', async () => {
      await authenticate();
      salesRepository.getBusinessSaleConfig.mockResolvedValue({
        defaultTaxRate: decimal(0.15),
        allowNegativeStock: false,
      });
      salesRepository.getProductSellContext.mockResolvedValue([
        { ...PRODUCT, currentSealedStock: decimal(1) },
      ]);

      const res = await request(app)
        .post('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.BAD_REQUEST } });
      expect(salesRepository.createSale).not.toHaveBeenCalled();
    });

    it('lets a sale oversell when the business allows negative stock', async () => {
      await authenticate();
      salesRepository.getProductSellContext.mockResolvedValue([
        { ...PRODUCT, currentSealedStock: decimal(1) },
      ]);

      const res = await request(app)
        .post('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(201);
      expect(salesRepository.createSale).toHaveBeenCalledWith(
        expect.objectContaining({ stockDecrements: [{ productId: 'p-tequila', amount: 2 }] }),
      );
    });
  });

  describe('GET /api/businesses/:businessId/sales', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get('/api/businesses/b-1/sales');

      expect(res.status).toBe(401);
      expect(salesRepository.listSales).not.toHaveBeenCalled();
    });

    it('lists the sales of the resolved business and branch', async () => {
      await authenticate();

      const res = await request(app)
        .get('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(salesRepository.listSales).toHaveBeenCalledWith('b-1', 'br-1');
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: 'sale-1',
        invoiceNumber: '1',
        total: 2185,
        itemCount: 1,
        productNames: ['Sierra Tequila 350 ml'],
      });
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER', 'SERVER'] as const)(
      'lets a %s read the sales',
      async (role) => {
        await authenticate(role);

        const res = await request(app)
          .get('/api/businesses/b-1/sales')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
      },
    );

    it('answers an empty list when the branch has no sales', async () => {
      await authenticate();
      salesRepository.listSales.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('answers 404 when the caller has no active member in the business', async () => {
      await authenticate();
      businessRepository.getActor.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/sales')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(salesRepository.listSales).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/businesses/:businessId/sales/:saleId', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get('/api/businesses/b-1/sales/sale-1');

      expect(res.status).toBe(401);
      expect(salesRepository.getSale).not.toHaveBeenCalled();
    });

    it('answers the sale detail with its lines, payments and relations', async () => {
      await authenticate();
      salesRepository.getSale.mockResolvedValue(SALE_RECORD as never);

      const res = await request(app)
        .get('/api/businesses/b-1/sales/sale-1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(salesRepository.getSale).toHaveBeenCalledWith('b-1', 'sale-1');
      expect(res.body).toMatchObject({
        id: 'sale-1',
        invoiceNumber: '1',
        subtotal: 1900,
        taxAmount: 285,
        total: 2185,
        amountPaid: 0,
        balanceDue: 2185,
        lines: [
          expect.objectContaining({
            id: 'sl-1',
            productId: 'p-tequila',
            quantity: 2,
            unitPrice: 950,
            productBrand: 'Sierra',
          }),
        ],
        payments: [],
        processedBy: { id: 'm-1', name: 'me', role: 'OWNER' },
        servedBy: null,
        customer: null,
      });
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER', 'SERVER'] as const)(
      'lets a %s read a sale',
      async (role) => {
        await authenticate(role);
        salesRepository.getSale.mockResolvedValue(SALE_RECORD as never);

        const res = await request(app)
          .get('/api/businesses/b-1/sales/sale-1')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
      },
    );

    it('answers 404 when the sale is not in the business', async () => {
      await authenticate();
      salesRepository.getSale.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/sales/sale-1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.NOT_FOUND } });
    });

    it('answers 404 when the caller has no active member in the business', async () => {
      await authenticate();
      businessRepository.getActor.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/sales/sale-1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(salesRepository.getSale).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/businesses/:businessId/sales/:saleId/payments', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/businesses/b-1/sales/sale-1/payments')
        .send({ status: 'PAID' });

      expect(res.status).toBe(401);
      expect(salesRepository.recordPayment).not.toHaveBeenCalled();
    });

    it('refuses a SERVER with FORBIDDEN', async () => {
      await authenticate('SERVER');

      const res = await request(app)
        .post('/api/businesses/b-1/sales/sale-1/payments')
        .set('Authorization', 'Bearer token')
        .send({ status: 'PAID' });

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.FORBIDDEN } });
      expect(salesRepository.recordPayment).not.toHaveBeenCalled();
    });

    it('rejects a body with no status before the sale is read', async () => {
      await authenticate();

      const res = await request(app)
        .post('/api/businesses/b-1/sales/sale-1/payments')
        .set('Authorization', 'Bearer token')
        .send({ amount: '500' });

      expect(res.status).toBe(400);
      expect(res.body.error.details).toMatchObject({ status: expect.any(String) });
      expect(salesRepository.getSaleForPayment).not.toHaveBeenCalled();
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER'] as const)(
      'records a payment for a %s',
      async (role) => {
        await authenticate(role);

        const res = await request(app)
          .post('/api/businesses/b-1/sales/sale-1/payments')
          .set('Authorization', 'Bearer token')
          .send({ status: 'PARTIALLY_PAID', amount: '500', method: 'CASH' });

        expect(res.status).toBe(201);
        expect(salesRepository.getSaleForPayment).toHaveBeenCalledWith('b-1', 'sale-1');
        expect(salesRepository.recordPayment).toHaveBeenCalledWith(
          expect.objectContaining({
            saleId: 'sale-1',
            memberId: 'm-1',
            paymentStatus: 'PARTIALLY_PAID',
            payment: { amount: 500, method: 'CASH', methodDetail: null },
          }),
        );
        expect(res.body).toMatchObject({ id: 'sale-1', paymentStatus: 'PAID' });
      },
    );

    it('answers 404 when the sale is not in the business', async () => {
      await authenticate();
      salesRepository.getSaleForPayment.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/businesses/b-1/sales/sale-1/payments')
        .set('Authorization', 'Bearer token')
        .send({ status: 'PAID' });

      expect(res.status).toBe(404);
      expect(salesRepository.recordPayment).not.toHaveBeenCalled();
    });
  });
});

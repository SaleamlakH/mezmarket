import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { AuthRepository } from '../modules/auth/auth.types.js';
import type { BusinessRepository } from '../modules/business/business.types.js';
import type { BatchRepository } from '../modules/batches/batches.types.js';

const { verifyJwt, authRepository, businessRepository, batchRepository } = vi.hoisted(() => ({
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
  batchRepository: {
    getProductUnitContext: vi.fn(),
    createBatchAndAdjustStock: vi.fn(),
    listBatches: vi.fn(),
    getBatchDetail: vi.fn(),
    listProductsWithStockLines: vi.fn(),
    getProductWithBatchHistory: vi.fn(),
    listProductAttachments: vi.fn(),
  } satisfies BatchRepository,
}));

vi.mock('../lib/jwt.js', () => ({ verifyJwt }));
vi.mock('../modules/auth/auth.repository.js', () => ({
  createAuthRepository: () => authRepository,
}));
vi.mock('../modules/business/business.repository.js', () => ({
  createBusinessRepository: () => businessRepository,
}));
vi.mock('../modules/batches/batches.repository.js', () => ({
  createBatchRepository: () => batchRepository,
}));

import app from '../app.js';
import { ERROR_CODES } from '../shared/errors/app-error.js';

const PRODUCT = {
  id: 'p-tequila',
  businessId: 'b-1',
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
    },
  ],
};

const LINE_RECORD = {
  id: 'sbl-1',
  stockBatchId: 'sb-1',
  productId: 'p-tequila',
  purchaseUnit: 'Bottle',
  purchaseQuantity: { toNumber: () => 10 },
  purchaseUnitCost: { toNumber: () => 950 },
  standardUnit: 'pc',
  standardQuantity: { toNumber: () => 10 },
  productUnitId: 'pu-bottle',
  resolvedStandardUnitId: 'su-pc',
  quantityRemaining: { toNumber: () => 10 },
  expiryDate: null,
  createdAt: new Date('2026-02-01T10:00:00.000Z'),
  updatedAt: new Date('2026-02-01T10:00:00.000Z'),
  product: { name: 'Sierra Tequila 350 ml', brand: 'Sierra' },
};

const BATCH_RECORD = {
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
  lines: [LINE_RECORD],
  receivedByMember: { id: 'm-1', name: 'me', role: 'OWNER' },
};

const INVENTORY_PRODUCT_RECORD = {
  id: 'p-tequila',
  businessId: 'b-1',
  branchId: 'br-1',
  categoryId: null,
  name: 'Sierra Tequila 350 ml',
  brand: 'Sierra',
  description: null,
  photoUrl: null,
  trackAsPartial: false,
  lowStockThreshold: { toNumber: () => 5 },
  currentSealedStock: { toNumber: () => 10 },
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  productUnits: [
    {
      id: 'pu-bottle',
      productId: 'p-tequila',
      unitRole: 'BASE',
      standardUnitId: 'su-pc',
      name: 'Bottle',
      dependsOn: null,
      conversionRate: null,
      purchaseCapable: true,
      sellCapable: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ],
  stockBatchLines: [
    {
      ...LINE_RECORD,
      expiryDate: new Date('2026-03-01T00:00:00.000Z'),
      product: undefined,
    },
  ],
};

const PRODUCT_HISTORY_RECORD = {
  id: 'p-tequila',
  businessId: 'b-1',
  branchId: 'br-1',
  categoryId: null,
  name: 'Sierra Tequila 350 ml',
  brand: 'Sierra',
  description: null,
  photoUrl: null,
  trackAsPartial: false,
  lowStockThreshold: { toNumber: () => 5 },
  currentSealedStock: { toNumber: () => 10 },
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  productUnits: INVENTORY_PRODUCT_RECORD.productUnits,
  stockBatchLines: [
    {
      ...LINE_RECORD,
      expiryDate: new Date('2026-03-01T00:00:00.000Z'),
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
    },
  ],
};

const BODY = {
  batchDate: '2026-02-01T09:00:00.000Z',
  supplierName: 'Awash Mart',
  lines: [
    {
      productId: 'p-tequila',
      productUnitId: 'pu-bottle',
      purchaseQuantity: '10',
      purchaseUnitCost: '950',
    },
  ],
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

describe('batches.integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    batchRepository.getProductUnitContext.mockResolvedValue([PRODUCT]);
    batchRepository.createBatchAndAdjustStock.mockResolvedValue(BATCH_RECORD);
    batchRepository.listBatches.mockResolvedValue([]);
    batchRepository.getBatchDetail.mockResolvedValue(BATCH_RECORD);
    batchRepository.listProductsWithStockLines.mockResolvedValue([]);
    batchRepository.getProductWithBatchHistory.mockResolvedValue(PRODUCT_HISTORY_RECORD as never);
    batchRepository.listProductAttachments.mockResolvedValue([]);
  });

  describe('POST /api/businesses/:businessId/inventory/batches', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).post('/api/businesses/b-1/inventory/batches').send(BODY);

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.UNAUTHORIZED } });
      expect(batchRepository.createBatchAndAdjustStock).not.toHaveBeenCalled();
    });

    it('rejects an invalid body before the catalog is read', async () => {
      await authenticate();

      const res = await request(app)
        .post('/api/businesses/b-1/inventory/batches')
        .set('Authorization', 'Bearer token')
        .send({ batchDate: '', lines: [] });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        error: { code: ERROR_CODES.BAD_REQUEST, message: expect.any(String) },
      });
      expect(batchRepository.getProductUnitContext).not.toHaveBeenCalled();
    });

    it.each(['CASHIER', 'SERVER'] as const)('refuses a %s with FORBIDDEN', async (role) => {
      await authenticate(role);

      const res = await request(app)
        .post('/api/businesses/b-1/inventory/batches')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.FORBIDDEN } });
      expect(batchRepository.createBatchAndAdjustStock).not.toHaveBeenCalled();
    });

    it.each(['OWNER', 'MANAGER'] as const)('records the batch for a %s', async (role) => {
      await authenticate(role);

      const res = await request(app)
        .post('/api/businesses/b-1/inventory/batches')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(201);
      expect(batchRepository.createBatchAndAdjustStock).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: 'b-1',
          branchId: 'br-1',
          memberId: 'm-1',
          stockIncrements: [{ productId: 'p-tequila', amount: 10 }],
        }),
      );
      expect(res.body).toMatchObject({
        id: 'sb-1',
        supplierName: 'Awash Mart',
        // The receiver echoed back is the stored member, not the role that was
        // allowed in — a MANAGER reading their own business' record sees
        // whoever received it.
        receivedBy: { id: 'm-1', name: 'me', role: 'OWNER' },
      });
      // The relation's own name stays inside the repository record.
      expect(res.body).not.toHaveProperty('receivedByMember');
      expect(res.body.lines[0]).toMatchObject({
        productName: 'Sierra Tequila 350 ml',
        purchaseQuantity: 10,
        purchaseUnitCost: 950,
      });
    });

    it('answers 404 when a line names a product the business does not have', async () => {
      await authenticate();
      batchRepository.getProductUnitContext.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/businesses/b-1/inventory/batches')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.NOT_FOUND } });
      expect(batchRepository.createBatchAndAdjustStock).not.toHaveBeenCalled();
    });

    it('answers 404 when the caller does not own the business', async () => {
      await authenticate();
      businessRepository.getBusinessId.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/businesses/b-1/inventory/batches')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(404);
      expect(batchRepository.createBatchAndAdjustStock).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/businesses/:businessId/inventory/batches', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get('/api/businesses/b-1/inventory/batches');

      expect(res.status).toBe(401);
      expect(batchRepository.listBatches).not.toHaveBeenCalled();
    });

    it('lists the batches of the resolved business and branch', async () => {
      await authenticate();
      batchRepository.listBatches.mockResolvedValue([BATCH_RECORD]);

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/batches')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(batchRepository.listBatches).toHaveBeenCalledWith('b-1', 'br-1');
      expect(res.body).toHaveLength(1);
      expect(res.body[0].lines[0]).toMatchObject({
        productName: 'Sierra Tequila 350 ml',
        standardQuantity: 10,
      });
    });

    it('answers an empty array when the branch has no batches', async () => {
      await authenticate();

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/batches')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER', 'SERVER'] as const)(
      'lets a %s read the batches',
      async (role) => {
        await authenticate(role);

        const res = await request(app)
          .get('/api/businesses/b-1/inventory/batches')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
      },
    );

    it('answers 404 when the caller has no active member in the business', async () => {
      await authenticate();
      businessRepository.getActor.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/batches')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(batchRepository.listBatches).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/businesses/:businessId/inventory/batches/:batchId', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get('/api/businesses/b-1/inventory/batches/sb-1');

      expect(res.status).toBe(401);
      expect(batchRepository.getBatchDetail).not.toHaveBeenCalled();
    });

    it('reads the batch of the resolved business, branch and id', async () => {
      await authenticate();

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/batches/sb-1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(batchRepository.getBatchDetail).toHaveBeenCalledWith('b-1', 'br-1', 'sb-1');
      expect(res.body).toMatchObject({
        id: 'sb-1',
        supplierName: 'Awash Mart',
        receivedBy: { id: 'm-1', name: 'me', role: 'OWNER' },
      });
      expect(res.body.lines[0]).toMatchObject({
        productName: 'Sierra Tequila 350 ml',
        productBrand: 'Sierra',
        standardQuantity: 10,
      });
    });

    it('answers 404 when the batch is outside the caller scope', async () => {
      await authenticate();
      batchRepository.getBatchDetail.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/batches/missing')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.NOT_FOUND } });
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER', 'SERVER'] as const)(
      'lets a %s read a batch',
      async (role) => {
        await authenticate(role);

        const res = await request(app)
          .get('/api/businesses/b-1/inventory/batches/sb-1')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
      },
    );

    it('answers 404 when the caller has no active member in the business', async () => {
      await authenticate();
      businessRepository.getActor.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/batches/sb-1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(batchRepository.getBatchDetail).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/businesses/:businessId/inventory/products', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get('/api/businesses/b-1/inventory/products');

      expect(res.status).toBe(401);
      expect(batchRepository.listProductsWithStockLines).not.toHaveBeenCalled();
    });

    it('summarises the resolved business and branch', async () => {
      await authenticate();
      batchRepository.listProductsWithStockLines.mockResolvedValue([
        INVENTORY_PRODUCT_RECORD as never,
      ]);

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/products')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(batchRepository.listProductsWithStockLines).toHaveBeenCalledWith('b-1', 'br-1');
    });

    it('answers a bare list of summaries carrying the aggregates', async () => {
      await authenticate();
      batchRepository.listProductsWithStockLines.mockResolvedValue([
        INVENTORY_PRODUCT_RECORD as never,
      ]);

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/products')
        .set('Authorization', 'Bearer token');

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: 'p-tequila',
        name: 'Sierra Tequila 350 ml',
        brand: 'Sierra',
        currentSealedStock: 10,
        lowStockThreshold: 5,
        active: true,
        baseUnitLabel: 'Bottle',
        totalCost: 9500,
        numberOfBatches: 1,
        expiryCount: 1,
        stockStatus: 'IN_STOCK',
      });
    });

    it('does not leak the rows the summary was worked out from', async () => {
      await authenticate();
      batchRepository.listProductsWithStockLines.mockResolvedValue([
        INVENTORY_PRODUCT_RECORD as never,
      ]);

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/products')
        .set('Authorization', 'Bearer token');

      expect(res.body[0]).not.toHaveProperty('productUnits');
      expect(res.body[0]).not.toHaveProperty('stockBatchLines');
    });

    it('answers an empty array when no active product holds stock', async () => {
      await authenticate();

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/products')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER', 'SERVER'] as const)(
      'lets a %s read the inventory summary',
      async (role) => {
        await authenticate(role);

        const res = await request(app)
          .get('/api/businesses/b-1/inventory/products')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
      },
    );

    it('answers 404 when the caller has no active member in the business', async () => {
      await authenticate();
      businessRepository.getActor.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/products')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(batchRepository.listProductsWithStockLines).not.toHaveBeenCalled();
    });

    it('answers 500 when a product has no base unit', async () => {
      await authenticate();
      batchRepository.listProductsWithStockLines.mockResolvedValue([
        { ...INVENTORY_PRODUCT_RECORD, productUnits: [] } as never,
      ]);

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/products')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/businesses/:businessId/inventory/products/:productId', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get('/api/businesses/b-1/inventory/products/p-tequila');

      expect(res.status).toBe(401);
      expect(batchRepository.getProductWithBatchHistory).not.toHaveBeenCalled();
    });

    it('reads the product of the resolved business, branch and id', async () => {
      await authenticate();

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/products/p-tequila')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(batchRepository.getProductWithBatchHistory).toHaveBeenCalledWith(
        'b-1',
        'br-1',
        'p-tequila',
      );
      expect(res.body).toMatchObject({
        id: 'p-tequila',
        name: 'Sierra Tequila 350 ml',
        brand: 'Sierra',
        currentSealedStock: 10,
        baseUnitLabel: 'Bottle',
        stockStatus: 'IN_STOCK',
      });
    });

    it('answers the product history grouped newest batch first, with each line', async () => {
      await authenticate();

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/products/p-tequila')
        .set('Authorization', 'Bearer token');

      expect(res.body.batches).toHaveLength(1);
      expect(res.body.batches[0]).toMatchObject({
        id: 'sb-1',
        supplierName: 'Awash Mart',
        referenceNumber: 'INV-42',
      });
      expect(res.body.batches[0].lines[0]).toMatchObject({
        id: 'sbl-1',
        purchaseUnit: 'Bottle',
        purchaseQuantity: 10,
        standardQuantity: 10,
      });
      // The rows the detail was worked out from are not leaked.
      expect(res.body).not.toHaveProperty('productUnits');
      expect(res.body).not.toHaveProperty('stockBatchLines');
    });

    it('answers 404 when the product is outside the caller scope', async () => {
      await authenticate();
      batchRepository.getProductWithBatchHistory.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/products/missing')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.NOT_FOUND } });
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER', 'SERVER'] as const)(
      'lets a %s read a product inventory detail',
      async (role) => {
        await authenticate(role);

        const res = await request(app)
          .get('/api/businesses/b-1/inventory/products/p-tequila')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
      },
    );

    it('answers 404 when the caller has no active member in the business', async () => {
      await authenticate();
      businessRepository.getActor.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/inventory/products/p-tequila')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(batchRepository.getProductWithBatchHistory).not.toHaveBeenCalled();
    });
  });
});

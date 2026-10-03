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
  });

  describe('POST /api/businesses/:businessId/batches', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).post('/api/businesses/b-1/batches').send(BODY);

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
      expect(batchRepository.createBatchAndAdjustStock).not.toHaveBeenCalled();
    });

    it('rejects an invalid body before the catalog is read', async () => {
      await authenticate();

      const res = await request(app)
        .post('/api/businesses/b-1/batches')
        .set('Authorization', 'Bearer token')
        .send({ batchDate: '', lines: [] });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        error: { code: 'BAD_REQUEST', message: 'Invalid request' },
      });
      expect(batchRepository.getProductUnitContext).not.toHaveBeenCalled();
    });

    it.each(['CASHIER', 'SERVER'] as const)('refuses a %s with FORBIDDEN', async (role) => {
      await authenticate(role);

      const res = await request(app)
        .post('/api/businesses/b-1/batches')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ error: { code: 'FORBIDDEN' } });
      expect(batchRepository.createBatchAndAdjustStock).not.toHaveBeenCalled();
    });

    it.each(['OWNER', 'MANAGER'] as const)('records the batch for a %s', async (role) => {
      await authenticate(role);

      const res = await request(app)
        .post('/api/businesses/b-1/batches')
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
        .post('/api/businesses/b-1/batches')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
      expect(batchRepository.createBatchAndAdjustStock).not.toHaveBeenCalled();
    });

    it('answers 404 when the caller does not own the business', async () => {
      await authenticate();
      businessRepository.getBusinessId.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/businesses/b-1/batches')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(404);
      expect(batchRepository.createBatchAndAdjustStock).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/businesses/:businessId/batches', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get('/api/businesses/b-1/batches');

      expect(res.status).toBe(401);
      expect(batchRepository.listBatches).not.toHaveBeenCalled();
    });

    it('lists the batches of the resolved business and branch', async () => {
      await authenticate();
      batchRepository.listBatches.mockResolvedValue([BATCH_RECORD]);

      const res = await request(app)
        .get('/api/businesses/b-1/batches')
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
        .get('/api/businesses/b-1/batches')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER', 'SERVER'] as const)(
      'lets a %s read the batches',
      async (role) => {
        await authenticate(role);

        const res = await request(app)
          .get('/api/businesses/b-1/batches')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
      },
    );

    it('answers 404 when the caller has no active member in the business', async () => {
      await authenticate();
      businessRepository.getActor.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/batches')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(batchRepository.listBatches).not.toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { AuthRepository } from '../modules/auth/auth.types.js';
import type { BusinessRepository } from '../modules/business/business.types.js';
import type {
  AttachmentsRepository,
  ProductRepository,
} from '../modules/products/products.types.js';
import { AppError, ERROR_CODES } from '../shared/errors/app-error.js';

const { verifyJwt, authRepository, businessRepository, productsRepository, attachmentsRepository } =
  vi.hoisted(() => ({
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
    } satisfies BusinessRepository,
    productsRepository: {
      list: vi.fn(),
      getById: vi.fn(),
      createForBusiness: vi.fn(),
    } satisfies ProductRepository,
    attachmentsRepository: {
      listForRecord: vi.fn().mockResolvedValue([]),
      getForRecord: vi.fn().mockResolvedValue(null),
    } satisfies AttachmentsRepository,
  }));

vi.mock('../lib/jwt.js', () => ({ verifyJwt }));
vi.mock('../modules/auth/auth.repository.js', () => ({
  createAuthRepository: () => authRepository,
}));
vi.mock('../modules/business/business.repository.js', () => ({
  createBusinessRepository: () => businessRepository,
}));
vi.mock('../modules/products/products.repository.js', () => ({
  createProductsRepository: () => productsRepository,
}));
vi.mock('../modules/products/attachments.repository.js', () => ({
  createAttachmentsRepository: () => attachmentsRepository,
}));

import app from '../app.js';

const ISO = '2026-08-01T00:00:00.000Z';

const WIRE_PRODUCT = {
  id: 'p-1',
  businessId: 'b-1',
  branchId: 'br-1',
  categoryId: null,
  name: 'Shirt',
  brand: null,
  description: null,
  trackAsPartial: false,
  lowStockThreshold: null,
  currentSealedStock: 10,
  active: true,
  uploadId: null,
  createdAt: ISO,
  updatedAt: ISO,
};

const BASE_UNIT_WIRE = {
  id: 'pu-1',
  productId: 'p-1',
  unitRole: 'BASE',
  standardUnitId: 'kg-1',
  name: 'kg',
  dependsOn: null,
  conversionRate: null,
  price: 120.5,
  purchaseCapable: true,
  sellCapable: true,
  createdAt: ISO,
  updatedAt: ISO,
};

function productRecord(overrides: Record<string, unknown> = {}) {
  return { ...WIRE_PRODUCT, currentSealedStock: { toNumber: () => 10 }, ...overrides };
}

function productUnit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pu-1',
    productId: 'p-1',
    unitRole: 'BASE',
    standardUnitId: 'kg-1',
    name: 'kg',
    dependsOn: null,
    conversionRate: null,
    price: { toNumber: () => 120.5 },
    purchaseCapable: true,
    sellCapable: true,
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

async function authenticate(ownerId = 'owner-1') {
  verifyJwt.mockResolvedValue({ sub: 'user-1', email: 'user@test.com' });
  authRepository.findIdentity.mockResolvedValue({
    id: 'id-1',
    ownerId,
    providerUserId: 'user-1',
  });
}

function authorize(businessId: string | null, branchId: string | null) {
  businessRepository.getBusinessId.mockResolvedValue(businessId);
  businessRepository.getBranchId.mockResolvedValue(branchId);
}

describe('products.integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    attachmentsRepository.listForRecord.mockResolvedValue([]);
    attachmentsRepository.getForRecord.mockResolvedValue(null);
  });

  describe('unauthenticated', () => {
    it('rejects listing products without a token', async () => {
      const res = await request(app).get('/api/businesses/b-1/products');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: { code: ERROR_CODES.UNAUTHORIZED, message: expect.any(String) },
      });
      expect(productsRepository.list).not.toHaveBeenCalled();
      expect(businessRepository.getBusinessId).not.toHaveBeenCalled();
    });

    it('rejects creating a product without a token', async () => {
      const res = await request(app)
        .post('/api/businesses/b-1/products')
        .send({ name: 'Shirt', baseUnit: { unitId: 'kg-1', price: '120.50' } });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: { code: ERROR_CODES.UNAUTHORIZED, message: expect.any(String) },
      });
      expect(productsRepository.createForBusiness).not.toHaveBeenCalled();
    });

    it('rejects getting a product without a token', async () => {
      const res = await request(app).get('/api/businesses/b-1/products/p-1');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: { code: ERROR_CODES.UNAUTHORIZED, message: expect.any(String) },
      });
      expect(productsRepository.getById).not.toHaveBeenCalled();
    });
  });

  describe('authorization', () => {
    it('returns NOT_FOUND when the business is not owned', async () => {
      await authenticate('owner-1');
      authorize(null, 'br-1');

      const res = await request(app)
        .get('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: { code: ERROR_CODES.NOT_FOUND, message: expect.any(String) },
      });
      expect(productsRepository.list).not.toHaveBeenCalled();
    });

    it('returns NOT_FOUND when the business has no branch', async () => {
      await authenticate('owner-1');
      authorize('b-1', null);

      const res = await request(app)
        .get('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: { code: ERROR_CODES.NOT_FOUND, message: expect.any(String) },
      });
    });
  });

  describe('GET /api/businesses/:businessId/products', () => {
    it('lists the products for the resolved scope', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      productsRepository.list.mockResolvedValue([productRecord()]);

      const res = await request(app)
        .get('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ products: [WIRE_PRODUCT] });
      expect(productsRepository.list).toHaveBeenCalledWith('b-1', 'br-1');
    });

    it('exposes the uploadId of the live attachment', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      productsRepository.list.mockResolvedValue([productRecord()]);
      attachmentsRepository.listForRecord.mockResolvedValue([{ recordId: 'p-1', uploadId: 'u-1' }]);

      const res = await request(app)
        .get('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.products[0].uploadId).toBe('u-1');
    });
  });

  describe('POST /api/businesses/:businessId/products', () => {
    it('creates a product with base and MOU units', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      const body = {
        name: 'Shirt',
        baseUnit: { unitId: 'kg-1', price: '120.50' },
        mou: { unitId: 'pc-1', conversionRate: 10, price: 10 },
      };
      const mouWire = {
        ...BASE_UNIT_WIRE,
        id: 'pu-2',
        unitRole: 'MOU',
        standardUnitId: 'pc-1',
        name: 'pc',
        dependsOn: 'BASE',
        conversionRate: 10,
        price: 10,
        purchaseCapable: false,
        sellCapable: true,
      };
      productsRepository.createForBusiness.mockResolvedValue({
        ...productRecord(),
        units: [
          productUnit(),
          {
            ...productUnit(),
            id: 'pu-2',
            unitRole: 'MOU',
            standardUnitId: 'pc-1',
            name: 'pc',
            dependsOn: 'BASE',
            conversionRate: { toNumber: () => 10 },
            price: { toNumber: () => 10 },
            purchaseCapable: false,
          },
        ],
      });

      const res = await request(app)
        .post('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token')
        .send(body);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ ...WIRE_PRODUCT, units: [BASE_UNIT_WIRE, mouWire] });
      expect(productsRepository.createForBusiness).toHaveBeenCalledWith('b-1', 'br-1', body);
    });

    it('creates a product with an uploaded image and echoes the uploadId', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      const body = {
        name: 'Shirt',
        baseUnit: { unitId: 'kg-1', price: '120.50' },
        uploadId: 'u-1',
      };
      productsRepository.createForBusiness.mockResolvedValue({
        ...productRecord(),
        units: [productUnit()],
        attachment: { id: 'a-1', uploadId: 'u-1' },
      });

      const res = await request(app)
        .post('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token')
        .send(body);

      expect(res.status).toBe(201);
      expect(res.body.uploadId).toBe('u-1');
      expect(productsRepository.createForBusiness).toHaveBeenCalledWith('b-1', 'br-1', body);
    });

    it('returns BAD_REQUEST when the base unit is unknown', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      productsRepository.createForBusiness.mockRejectedValue(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Base unit not found', 400),
      );

      const res = await request(app)
        .post('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token')
        .send({ name: 'Shirt', baseUnit: { unitId: 'missing', price: '10' } });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: { code: ERROR_CODES.BAD_REQUEST, message: expect.any(String) },
      });
    });
  });

  describe('GET /api/businesses/:businessId/products/:productId', () => {
    it('returns the product for the resolved scope', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      productsRepository.getById.mockResolvedValue(productRecord());

      const res = await request(app)
        .get('/api/businesses/b-1/products/p-1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(WIRE_PRODUCT);
      expect(productsRepository.getById).toHaveBeenCalledWith('p-1', 'b-1');
    });

    it('returns NOT_FOUND when the product is missing', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      productsRepository.getById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/products/missing')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: { code: ERROR_CODES.NOT_FOUND, message: expect.any(String) },
      });
    });
  });
});

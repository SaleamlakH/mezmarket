import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { AuthRepository } from '../modules/auth/auth.types.js';
import type { BusinessRepository } from '../modules/business/business.types.js';
import type { ProductRepository } from '../modules/products/products.types.js';
import type { UploadRepository } from '../modules/uploads/uploads.types.js';
import { UploadStatus } from '../../generated/prisma/client.js';
import { AppError, ERROR_CODES } from '../shared/errors/app-error.js';

const {
  verifyJwt,
  authRepository,
  businessRepository,
  productsRepository,
  uploadsRepository,
  storage,
} = vi.hoisted(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.STORAGE_BUCKET = 'bucket';

  return {
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
    productsRepository: {
      listForBusiness: vi.fn(),
      getByIdWithUnits: vi.fn(),
      createForBusiness: vi.fn(),
      listAttachmentsForProducts: vi.fn(),
      getProductAttachment: vi.fn(),
    } satisfies ProductRepository,
    uploadsRepository: {
      create: vi.fn(),
      getById: vi.fn(),
      getManyByIds: vi.fn(),
      setStatus: vi.fn(),
    } satisfies UploadRepository,
    storage: {
      createUploadUrl: vi.fn(),
      objectExists: vi.fn(),
      createDownloadUrl: vi.fn(),
    },
  };
});

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
vi.mock('../modules/uploads/uploads.repository.js', () => ({
  createUploadsRepository: () => uploadsRepository,
}));
vi.mock('../lib/storage/storage.js', () => ({
  createSupabaseClient: vi.fn(),
  createSupabaseStorage: () => storage,
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
  return {
    ...WIRE_PRODUCT,
    currentSealedStock: { toNumber: () => 10 },
    productUnits: [],
    ...overrides,
  };
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

function authorize(
  businessId: string | null,
  branchId: string | null,
  role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'SERVER' = 'OWNER',
) {
  businessRepository.getBusinessId.mockResolvedValue(businessId);
  businessRepository.getBranchId.mockResolvedValue(branchId);
  businessRepository.getActor.mockResolvedValue({ id: 'm-1', role });
}

describe('products.integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    productsRepository.listForBusiness.mockResolvedValue([]);
    productsRepository.getByIdWithUnits.mockResolvedValue(
      productRecord({ productUnits: [productUnit()] }),
    );
    productsRepository.listAttachmentsForProducts.mockResolvedValue([]);
    productsRepository.getProductAttachment.mockResolvedValue(null);
    uploadsRepository.getManyByIds.mockResolvedValue([]);
  });

  describe('unauthenticated', () => {
    it('rejects listing products without a token', async () => {
      const res = await request(app).get('/api/businesses/b-1/products');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: { code: ERROR_CODES.UNAUTHORIZED, message: expect.any(String) },
      });
      expect(productsRepository.listForBusiness).not.toHaveBeenCalled();
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
      expect(productsRepository.getByIdWithUnits).not.toHaveBeenCalled();
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
      expect(productsRepository.listForBusiness).not.toHaveBeenCalled();
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
    it('answers with a bare list of narrowed product summaries', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      productsRepository.listForBusiness.mockResolvedValue([
        productRecord({ productUnits: [productUnit()] }),
      ]);

      const res = await request(app)
        .get('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        {
          id: 'p-1',
          name: 'Shirt',
          brand: null,
          currentSealedStock: 10,
          lowStockThreshold: null,
          active: true,
          baseUnitLabel: 'kg',
          uploadId: null,
        },
      ]);
    });

    it('reads the products of the resolved business and branch', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');

      await request(app).get('/api/businesses/b-1/products').set('Authorization', 'Bearer token');

      expect(productsRepository.listForBusiness).toHaveBeenCalledWith('b-1', 'br-1');
    });

    it('exposes the uploadId of the live attachment in each summary', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      productsRepository.listForBusiness.mockResolvedValue([
        productRecord({ productUnits: [productUnit()] }),
      ]);
      productsRepository.listAttachmentsForProducts.mockResolvedValue([
        { recordId: 'p-1', uploadId: 'u-1' },
      ]);

      const res = await request(app)
        .get('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body[0].uploadId).toBe('u-1');
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER', 'SERVER'] as const)(
      'lets a %s read the catalog',
      async (role) => {
        await authenticate('owner-1');
        authorize('b-1', 'br-1', role);

        const res = await request(app)
          .get('/api/businesses/b-1/products')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
      },
    );

    it('answers 500 when a product is missing its base unit', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      productsRepository.listForBusiness.mockResolvedValue([productRecord({ productUnits: [] })]);

      const res = await request(app)
        .get('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(500);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.INTERNAL_ERROR } });
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
      const validatedBody = {
        name: 'Shirt',
        baseUnit: { unitId: 'kg-1', price: 120.5 },
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
      expect(productsRepository.createForBusiness).toHaveBeenCalledWith(
        'b-1',
        'br-1',
        validatedBody,
      );
    });

    it('creates a product with an uploaded image and echoes the uploadId', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      const body = {
        name: 'Shirt',
        baseUnit: { unitId: 'kg-1', price: '120.50' },
        uploadId: 'u-1',
      };
      const validatedBody = {
        name: 'Shirt',
        baseUnit: { unitId: 'kg-1', price: 120.5 },
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
      expect(res.body).not.toHaveProperty('attachment');
      expect(productsRepository.createForBusiness).toHaveBeenCalledWith(
        'b-1',
        'br-1',
        validatedBody,
      );
    });

    it('creates a product together with its own units', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      const body = {
        name: 'Shirt',
        baseUnit: { unitId: 'kg-1', price: '120.50' },
        customUnits: [
          { name: 'Shot', dependsOn: 'BASE', conversionRate: '0.125', price: '45' },
          {
            name: 'Box',
            dependsOn: 'BASE',
            conversionRate: '12',
            purchaseCapable: true,
            sellCapable: false,
          },
        ],
      };
      const validatedBody = {
        name: 'Shirt',
        baseUnit: { unitId: 'kg-1', price: 120.5 },
        customUnits: [
          {
            name: 'Shot',
            dependsOn: 'BASE',
            conversionRate: 0.125,
            purchaseCapable: true,
            sellCapable: true,
            price: 45,
          },
          {
            name: 'Box',
            dependsOn: 'BASE',
            conversionRate: 12,
            purchaseCapable: true,
            sellCapable: false,
          },
        ],
      };
      const shotWire = {
        id: 'pu-3',
        productId: 'p-1',
        unitRole: 'CUSTOM',
        standardUnitId: null,
        name: 'Shot',
        dependsOn: 'BASE',
        conversionRate: 0.125,
        price: 45,
        purchaseCapable: true,
        sellCapable: true,
        createdAt: ISO,
        updatedAt: ISO,
      };
      const boxWire = {
        ...shotWire,
        id: 'pu-4',
        name: 'Box',
        conversionRate: 12,
        price: null,
        sellCapable: false,
      };
      productsRepository.createForBusiness.mockResolvedValue({
        ...productRecord(),
        units: [
          productUnit(),
          productUnit({
            id: 'pu-3',
            unitRole: 'CUSTOM',
            standardUnitId: null,
            name: 'Shot',
            dependsOn: 'BASE',
            conversionRate: { toNumber: () => 0.125 },
            price: { toNumber: () => 45 },
          }),
          productUnit({
            id: 'pu-4',
            unitRole: 'CUSTOM',
            standardUnitId: null,
            name: 'Box',
            dependsOn: 'BASE',
            conversionRate: { toNumber: () => 12 },
            price: null,
            sellCapable: false,
          }),
        ],
      });

      const res = await request(app)
        .post('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token')
        .send(body);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ ...WIRE_PRODUCT, units: [BASE_UNIT_WIRE, shotWire, boxWire] });
      expect(productsRepository.createForBusiness).toHaveBeenCalledWith(
        'b-1',
        'br-1',
        validatedBody,
      );
    });

    it('refuses a unit named after one the product already has', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      productsRepository.createForBusiness.mockRejectedValue(
        new AppError(ERROR_CODES.BAD_REQUEST, 'This product already has a unit named "kg"', 400, {
          'customUnits.0.name': 'This product already has a unit named "kg"',
        }),
      );

      const res = await request(app)
        .post('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token')
        .send({
          name: 'Shirt',
          baseUnit: { unitId: 'kg-1', price: '120.50' },
          customUnits: [{ name: 'kg', dependsOn: 'BASE', conversionRate: '1', price: '45' }],
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: 'This product already has a unit named "kg"',
          details: { 'customUnits.0.name': 'This product already has a unit named "kg"' },
        },
      });
    });

    it('rejects a sellable unit with no price before reaching the repository', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');

      const res = await request(app)
        .post('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token')
        .send({
          name: 'Shirt',
          baseUnit: { unitId: 'kg-1', price: '120.50' },
          customUnits: [{ name: 'Shot', dependsOn: 'BASE', conversionRate: '0.125' }],
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: 'Invalid request',
          details: { 'customUnits.0.price': expect.any(String) },
        },
      });
      expect(productsRepository.createForBusiness).not.toHaveBeenCalled();
    });

    it('rejects a unit based on a content unit the product does not have', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');

      const res = await request(app)
        .post('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token')
        .send({
          name: 'Shirt',
          baseUnit: { unitId: 'kg-1', price: '120.50' },
          customUnits: [{ name: 'Label', dependsOn: 'MOU', conversionRate: '3', price: '5' }],
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: 'Invalid request',
          details: { 'customUnits.0.dependsOn': expect.any(String) },
        },
      });
      expect(productsRepository.createForBusiness).not.toHaveBeenCalled();
    });

    it('returns BAD_REQUEST with field details when the payload is invalid', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');

      const res = await request(app)
        .post('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token')
        .send({ name: 'Shirt' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: 'Invalid request',
          details: { baseUnit: expect.any(String) },
        },
      });
      expect(productsRepository.createForBusiness).not.toHaveBeenCalled();
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
      productsRepository.getByIdWithUnits.mockResolvedValue(productRecord());

      const res = await request(app)
        .get('/api/businesses/b-1/products/p-1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ...WIRE_PRODUCT, units: [] });
      expect(productsRepository.getByIdWithUnits).toHaveBeenCalledWith('p-1', 'b-1');
    });

    it('returns NOT_FOUND when the product is missing', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      productsRepository.getByIdWithUnits.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/products/missing')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: { code: ERROR_CODES.NOT_FOUND, message: expect.any(String) },
      });
    });
  });

  describe('uploads mounted under the products router', () => {
    function uploadRecord(overrides: Record<string, unknown> = {}) {
      return {
        id: 'u-1',
        storageKey: 'uploads/product/u-1.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        status: UploadStatus.PENDING,
        createdAt: ISO,
        updatedAt: ISO,
        ...overrides,
      };
    }

    describe('POST /api/businesses/:businessId/products/uploads', () => {
      it('rejects creating an upload without a token', async () => {
        const res = await request(app)
          .post('/api/businesses/b-1/products/uploads')
          .send({ record: 'PRODUCT', mimeType: 'image/jpeg', sizeBytes: 1024 });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({
          error: { code: ERROR_CODES.UNAUTHORIZED, message: expect.any(String) },
        });
        expect(uploadsRepository.create).not.toHaveBeenCalled();
      });

      it('rejects creating an upload when the business is not owned', async () => {
        await authenticate('owner-1');
        authorize(null, 'br-1');

        const res = await request(app)
          .post('/api/businesses/b-1/products/uploads')
          .set('Authorization', 'Bearer token')
          .send({ record: 'PRODUCT', mimeType: 'image/jpeg', sizeBytes: 1024 });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
          error: { code: ERROR_CODES.NOT_FOUND, message: expect.any(String) },
        });
        expect(uploadsRepository.create).not.toHaveBeenCalled();
      });

      it('creates an upload and returns the presigned upload url', async () => {
        await authenticate('owner-1');
        authorize('b-1', 'br-1');
        uploadsRepository.create.mockResolvedValue(uploadRecord());
        storage.createUploadUrl.mockResolvedValue('https://file/signed-upload');

        const res = await request(app)
          .post('/api/businesses/b-1/products/uploads')
          .set('Authorization', 'Bearer token')
          .send({ record: 'PRODUCT', mimeType: 'image/jpeg', sizeBytes: 1024 });

        expect(res.status).toBe(201);
        expect(res.body).toEqual({
          upload: {
            id: 'u-1',
            storageKey: 'uploads/product/u-1.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
            status: UploadStatus.PENDING,
            createdAt: ISO,
            updatedAt: ISO,
          },
          uploadUrl: 'https://file/signed-upload',
        });
        const input = uploadsRepository.create.mock.calls[0]?.[0];
        expect(input?.storageKey).toBe(`uploads/product/${input?.id}.jpg`);
        expect(storage.createUploadUrl).toHaveBeenCalledWith(input?.storageKey);
      });
    });

    describe('GET /api/businesses/:businessId/products/:recordId/uploads/:uploadId/url', () => {
      it('rejects fetching a download url without a token', async () => {
        const res = await request(app).get('/api/businesses/b-1/products/p-1/uploads/u-1/url');

        expect(res.status).toBe(401);
        expect(res.body).toEqual({
          error: { code: ERROR_CODES.UNAUTHORIZED, message: expect.any(String) },
        });
        expect(productsRepository.getByIdWithUnits).not.toHaveBeenCalled();
        expect(uploadsRepository.getById).not.toHaveBeenCalled();
      });

      it('rejects fetching a download url when the business is not owned', async () => {
        await authenticate('owner-1');
        authorize(null, 'br-1');

        const res = await request(app)
          .get('/api/businesses/b-1/products/p-1/uploads/u-1/url')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
          error: { code: ERROR_CODES.NOT_FOUND, message: expect.any(String) },
        });
        expect(productsRepository.getByIdWithUnits).not.toHaveBeenCalled();
        expect(uploadsRepository.getById).not.toHaveBeenCalled();
      });

      it('returns a presigned download url for the product upload', async () => {
        await authenticate('owner-1');
        authorize('b-1', 'br-1');
        productsRepository.getByIdWithUnits.mockResolvedValue(productRecord());
        productsRepository.getProductAttachment.mockResolvedValue({
          recordId: 'p-1',
          uploadId: 'u-1',
        });
        uploadsRepository.getById.mockResolvedValue(uploadRecord({ status: UploadStatus.ACTIVE }));
        storage.createDownloadUrl.mockResolvedValue('https://file/signed-download');

        const res = await request(app)
          .get('/api/businesses/b-1/products/p-1/uploads/u-1/url')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ url: 'https://file/signed-download' });
        expect(productsRepository.getByIdWithUnits).toHaveBeenCalledWith('p-1', 'b-1');
        expect(productsRepository.getProductAttachment).toHaveBeenCalledWith('p-1');
        expect(uploadsRepository.getById).toHaveBeenCalledWith('u-1');
        expect(storage.createDownloadUrl).toHaveBeenCalledWith('uploads/product/u-1.jpg');
      });

      it('reconciles a pending upload to ACTIVE when the object exists', async () => {
        await authenticate('owner-1');
        authorize('b-1', 'br-1');
        productsRepository.getByIdWithUnits.mockResolvedValue(productRecord());
        productsRepository.getProductAttachment.mockResolvedValue({
          recordId: 'p-1',
          uploadId: 'u-1',
        });
        uploadsRepository.getById.mockResolvedValue(uploadRecord());
        storage.objectExists.mockResolvedValue(true);
        storage.createDownloadUrl.mockResolvedValue('https://file/signed-download');

        const res = await request(app)
          .get('/api/businesses/b-1/products/p-1/uploads/u-1/url')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
        expect(uploadsRepository.setStatus).toHaveBeenCalledWith('u-1', UploadStatus.ACTIVE);
        expect(res.body).toEqual({ url: 'https://file/signed-download' });
      });

      it('rejects fetching a download url when the product has no live attachment', async () => {
        await authenticate('owner-1');
        authorize('b-1', 'br-1');
        productsRepository.getByIdWithUnits.mockResolvedValue(productRecord());
        productsRepository.getProductAttachment.mockResolvedValue(null);

        const res = await request(app)
          .get('/api/businesses/b-1/products/p-1/uploads/u-1/url')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
          error: { code: ERROR_CODES.NOT_FOUND, message: expect.any(String) },
        });
        expect(uploadsRepository.getById).not.toHaveBeenCalled();
        expect(storage.createDownloadUrl).not.toHaveBeenCalled();
      });
    });

    describe('GET /api/businesses/:businessId/products/uploads/urls', () => {
      function productUploadRecord(id: string) {
        return uploadRecord({
          id,
          storageKey: `uploads/product/${id}.jpg`,
          status: UploadStatus.ACTIVE,
        });
      }

      it('rejects batch download without a token', async () => {
        const res = await request(app).get('/api/businesses/b-1/products/uploads/urls');

        expect(res.status).toBe(401);
        expect(res.body).toEqual({
          error: { code: ERROR_CODES.UNAUTHORIZED, message: expect.any(String) },
        });
        expect(productsRepository.listAttachmentsForProducts).not.toHaveBeenCalled();
        expect(uploadsRepository.getManyByIds).not.toHaveBeenCalled();
      });

      it('rejects batch download when the business is not owned', async () => {
        await authenticate('owner-1');
        authorize(null, 'br-1');

        const res = await request(app)
          .get('/api/businesses/b-1/products/uploads/urls')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
          error: { code: ERROR_CODES.NOT_FOUND, message: expect.any(String) },
        });
        expect(productsRepository.listAttachmentsForProducts).not.toHaveBeenCalled();
      });

      it('returns a matched download url for each product upload id', async () => {
        await authenticate('owner-1');
        authorize('b-1', 'br-1');
        productsRepository.listForBusiness.mockResolvedValue([
          productRecord(),
          productRecord({ id: 'p-2' }),
        ]);
        productsRepository.listAttachmentsForProducts.mockResolvedValue([
          { recordId: 'p-1', uploadId: 'u-1' },
          { recordId: 'p-2', uploadId: 'u-2' },
        ]);
        uploadsRepository.getManyByIds.mockImplementation(
          async (ids: string[]) => ids.map((id) => productUploadRecord(id)) as never,
        );
        storage.createDownloadUrl.mockImplementation(
          async (storageKey: string) => `https://file/${storageKey}`,
        );

        const res = await request(app)
          .get('/api/businesses/b-1/products/uploads/urls')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([
          { uploadId: 'u-1', url: 'https://file/uploads/product/u-1.jpg' },
          { uploadId: 'u-2', url: 'https://file/uploads/product/u-2.jpg' },
        ]);
        expect(productsRepository.listForBusiness).toHaveBeenCalledWith('b-1', 'br-1');
        expect(productsRepository.listAttachmentsForProducts).toHaveBeenCalledWith(['p-1', 'p-2']);
        expect(uploadsRepository.getManyByIds).toHaveBeenCalledWith(['u-1', 'u-2']);
      });

      it('returns an empty batch when the business has no products', async () => {
        await authenticate('owner-1');
        authorize('b-1', 'br-1');

        const res = await request(app)
          .get('/api/businesses/b-1/products/uploads/urls')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
        expect(productsRepository.listAttachmentsForProducts).not.toHaveBeenCalled();
        expect(uploadsRepository.getManyByIds).not.toHaveBeenCalled();
      });
    });
  });

  describe('GET /api/businesses/:businessId/products/:productId/units', () => {
    it('rejects fetching units without a token', async () => {
      const res = await request(app).get('/api/businesses/b-1/products/p-1/units');

      expect(res.status).toBe(401);
      expect(productsRepository.getByIdWithUnits).not.toHaveBeenCalled();
    });

    it('answers with every unit in hierarchy order, narrowed to numbers', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      productsRepository.getByIdWithUnits.mockResolvedValue(
        productRecord({
          productUnits: [
            productUnit({
              id: 'pu-zip',
              name: 'Ziplock',
              unitRole: 'CUSTOM',
              dependsOn: 'BASE',
              conversionRate: { toNumber: () => 1 },
              price: null,
              purchaseCapable: false,
              sellCapable: true,
            }),
            productUnit({ id: 'pu-bottle', name: 'Bottle' }),
            productUnit({
              id: 'pu-bag',
              name: 'Bag',
              unitRole: 'CUSTOM',
              dependsOn: 'BASE',
              conversionRate: { toNumber: () => 1 },
              price: null,
              purchaseCapable: false,
              sellCapable: true,
            }),
            productUnit({
              id: 'pu-box',
              name: 'Box',
              unitRole: 'MOU',
              dependsOn: 'BASE',
              conversionRate: { toNumber: () => 6 },
              price: { toNumber: () => 5 },
              purchaseCapable: false,
              sellCapable: true,
            }),
          ],
        }),
      );

      const res = await request(app)
        .get('/api/businesses/b-1/products/p-1/units')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        {
          id: 'pu-bottle',
          productId: 'p-1',
          name: 'Bottle',
          unitRole: 'BASE',
          dependsOn: null,
          conversionRate: null,
          purchaseCapable: true,
          sellCapable: true,
        },
        {
          id: 'pu-box',
          productId: 'p-1',
          name: 'Box',
          unitRole: 'MOU',
          dependsOn: 'BASE',
          conversionRate: 6,
          purchaseCapable: false,
          sellCapable: true,
        },
        {
          id: 'pu-bag',
          productId: 'p-1',
          name: 'Bag',
          unitRole: 'CUSTOM',
          dependsOn: 'BASE',
          conversionRate: 1,
          purchaseCapable: false,
          sellCapable: true,
        },
        {
          id: 'pu-zip',
          productId: 'p-1',
          name: 'Ziplock',
          unitRole: 'CUSTOM',
          dependsOn: 'BASE',
          conversionRate: 1,
          purchaseCapable: false,
          sellCapable: true,
        },
      ]);
    });

    it('reads the product inside the caller business', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');

      await request(app)
        .get('/api/businesses/b-1/products/p-1/units')
        .set('Authorization', 'Bearer token');

      expect(productsRepository.getByIdWithUnits).toHaveBeenCalledWith('p-1', 'b-1');
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER', 'SERVER'] as const)(
      'lets a %s read the units',
      async (role) => {
        await authenticate('owner-1');
        authorize('b-1', 'br-1', role);

        const res = await request(app)
          .get('/api/businesses/b-1/products/p-1/units')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
      },
    );

    it('answers 404 for a product that does not exist', async () => {
      await authenticate('owner-1');
      authorize('b-1', 'br-1');
      productsRepository.getByIdWithUnits.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/products/ghost/units')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.NOT_FOUND } });
    });
  });
});

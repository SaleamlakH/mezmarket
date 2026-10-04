import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { AuthRepository } from '../modules/auth/auth.types.js';
import type { BusinessRepository } from '../modules/business/business.types.js';
import type { ProductRepository } from '../modules/products/products.types.js';

const { verifyJwt, authRepository, businessRepository, productRepository } = vi.hoisted(() => ({
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
  } satisfies BusinessRepository,
  productRepository: {
    listProducts: vi.fn(),
    getProductWithUnits: vi.fn(),
  } satisfies ProductRepository,
}));

vi.mock('../lib/jwt.js', () => ({ verifyJwt }));
vi.mock('../modules/auth/auth.repository.js', () => ({
  createAuthRepository: () => authRepository,
}));
vi.mock('../modules/business/business.repository.js', () => ({
  createBusinessRepository: () => businessRepository,
}));
vi.mock('../modules/products/products.repository.js', () => ({
  createProductRepository: () => productRepository,
}));

import app from '../app.js';
import { AppError, ERROR_CODES } from '../shared/errors/app-error.js';

const PRODUCT = {
  id: 'p-tequila',
  name: 'Sierra Tequila 350 ml',
  brand: 'Sierra',
  currentSealedStock: { toNumber: () => 42 },
  active: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  productUnits: [
    {
      name: 'Bottle',
      id: 'pu-b',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      productId: 'p-tequila',
      unitRole: 'BASE',
      dependsOn: null,
      conversionRate: null,
      purchaseCapable: true,
      sellCapable: true,
    },
  ],
};

const UNIT_ROWS = {
  id: 'p-tequila',
  productUnits: [
    {
      id: 'pu-bottle',
      productId: 'p-tequila',
      name: 'Bottle',
      unitRole: 'BASE',
      dependsOn: null,
      conversionRate: null,
      purchaseCapable: true,
      sellCapable: true,
    },
    {
      id: 'pu-box',
      productId: 'p-tequila',
      name: 'Box',
      unitRole: 'MOU',
      dependsOn: 'BASE',
      conversionRate: { toNumber: () => 6 },
      purchaseCapable: true,
      sellCapable: false,
    },
    {
      id: 'pu-single',
      productId: 'p-tequila',
      name: 'Single',
      unitRole: 'CUSTOM',
      dependsOn: 'STANDARD',
      conversionRate: { toNumber: () => 1 },
      standardUnitId: null,
      purchaseCapable: false,
      sellCapable: true,
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

describe('products.integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    productRepository.listProducts.mockResolvedValue([PRODUCT]);
    productRepository.getProductWithUnits.mockResolvedValue(UNIT_ROWS);
  });

  describe('GET /api/businesses/:businessId/products', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get('/api/businesses/b-1/products');

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.UNAUTHORIZED } });
      expect(productRepository.listProducts).not.toHaveBeenCalled();
    });

    it('refuses a business the caller does not belong to', async () => {
      await authenticate();
      businessRepository.getActor.mockRejectedValue(
        new AppError(ERROR_CODES.FORBIDDEN, 'Forbidden', 403),
      );

      const res = await request(app)
        .get('/api/businesses/b-2/products')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(403);
      expect(productRepository.listProducts).not.toHaveBeenCalled();
    });

    it('answers with a bare list of narrowed product summaries', async () => {
      await authenticate();

      const res = await request(app)
        .get('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        {
          id: 'p-tequila',
          name: 'Sierra Tequila 350 ml',
          brand: 'Sierra',
          baseUnitLabel: 'Bottle',
          currentSealedStock: 42,
          lowStockThreshold: null,
          active: true,
        },
      ]);
    });

    it('reads the products of the resolved business and branch', async () => {
      await authenticate();

      await request(app).get('/api/businesses/b-1/products').set('Authorization', 'Bearer token');

      expect(productRepository.listProducts).toHaveBeenCalledWith('b-1', 'br-1');
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER', 'SERVER'] as const)(
      'lets a %s read the catalog',
      async (role) => {
        await authenticate(role);

        const res = await request(app)
          .get('/api/businesses/b-1/products')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
      },
    );

    it('answers 500 when a product is missing its base unit', async () => {
      await authenticate();
      productRepository.listProducts.mockResolvedValue([{ ...PRODUCT, productUnits: [] }]);

      const res = await request(app)
        .get('/api/businesses/b-1/products')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(500);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.INTERNAL_ERROR } });
    });
  });

  describe('GET /api/businesses/:businessId/products/:productId/units', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get('/api/businesses/b-1/products/p-tequila/units');

      expect(res.status).toBe(401);
      expect(productRepository.getProductWithUnits).not.toHaveBeenCalled();
    });

    it('answers with every unit in hierarchy order, narrowed to numbers', async () => {
      await authenticate();

      const res = await request(app)
        .get('/api/businesses/b-1/products/p-tequila/units')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        {
          id: 'pu-bottle',
          productId: 'p-tequila',
          name: 'Bottle',
          unitRole: 'BASE',
          dependsOn: null,
          conversionRate: null,
          purchaseCapable: true,
          sellCapable: true,
        },
        {
          id: 'pu-box',
          productId: 'p-tequila',
          name: 'Box',
          unitRole: 'MOU',
          dependsOn: 'BASE',
          conversionRate: 6,
          purchaseCapable: true,
          sellCapable: false,
        },
        {
          id: 'pu-single',
          productId: 'p-tequila',
          name: 'Single',
          unitRole: 'CUSTOM',
          dependsOn: 'STANDARD',
          conversionRate: 1,
          purchaseCapable: false,
          sellCapable: true,
        },
      ]);
    });

    it('reads the product inside the caller business', async () => {
      await authenticate();

      await request(app)
        .get('/api/businesses/b-1/products/p-tequila/units')
        .set('Authorization', 'Bearer token');

      expect(productRepository.getProductWithUnits).toHaveBeenCalledWith('b-1', 'p-tequila');
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER', 'SERVER'] as const)(
      'lets a %s read the units',
      async (role) => {
        await authenticate(role);

        const res = await request(app)
          .get('/api/businesses/b-1/products/p-tequila/units')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
      },
    );

    it('answers 404 for a product that does not exist', async () => {
      await authenticate();
      productRepository.getProductWithUnits.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/products/ghost/units')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.NOT_FOUND } });
    });
  });
});

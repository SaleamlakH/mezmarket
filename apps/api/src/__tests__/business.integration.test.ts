import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { AuthRepository } from '../modules/auth/auth.types.js';
import type { BusinessRepository } from '../modules/business/business.types.js';

const { verifyJwt, authRepository, businessRepository } = vi.hoisted(() => ({
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
    getForOwner: vi.fn(),
    updateForOwner: vi.fn(),
    getActor: vi.fn(),
  } satisfies BusinessRepository,
}));

vi.mock('../lib/jwt.js', () => ({ verifyJwt }));
vi.mock('../modules/auth/auth.repository.js', () => ({
  createAuthRepository: () => authRepository,
}));
vi.mock('../modules/business/business.repository.js', () => ({
  createBusinessRepository: () => businessRepository,
}));

import app from '../app.js';

async function authenticate(ownerId = 'owner-1') {
  verifyJwt.mockResolvedValue({ sub: 'user-1', email: 'user@test.com' });
  authRepository.findIdentity.mockResolvedValue({
    id: 'id-1',
    ownerId,
    providerUserId: 'user-1',
  });
}

describe('business.integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects GET /api/businesses without a token', async () => {
    const res = await request(app).get('/api/businesses');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
    expect(businessRepository.listForOwner).not.toHaveBeenCalled();
  });

  it('rejects POST /api/businesses without a token', async () => {
    const res = await request(app)
      .post('/api/businesses')
      .send({ name: 'Test', currencyCode: 'USD' });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
    expect(businessRepository.createForOwner).not.toHaveBeenCalled();
  });

  it('lists the owner businesses when authenticated', async () => {
    await authenticate('owner-1');
    businessRepository.listForOwner.mockResolvedValue([{ id: 'b-1', name: 'Shop' }]);

    const res = await request(app).get('/api/businesses').set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      businesses: [
        { id: 'b-1', name: 'Shop', defaultTaxRate: null, lowStockDefaultThreshold: null },
      ],
    });
    expect(businessRepository.listForOwner).toHaveBeenCalledWith('owner-1');
  });

  it('creates a business with the authenticated owner id', async () => {
    await authenticate('owner-1');
    businessRepository.createForOwner.mockResolvedValue({
      business: { id: 'b-1' },
      branch: { id: 'br-1' },
      member: { id: 'm-1' },
    });

    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Test', currencyCode: 'USD' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      business: { id: 'b-1', defaultTaxRate: null, lowStockDefaultThreshold: null },
      branch: { id: 'br-1' },
      member: { id: 'm-1' },
    });
    expect(businessRepository.createForOwner).toHaveBeenCalledWith('owner-1', {
      name: 'Test',
      currencyCode: 'USD',
    });
  });

  it('rejects POST /api/businesses with an invalid body', async () => {
    await authenticate('owner-1');

    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', 'Bearer token')
      .send({ name: '', currencyCode: 'USDX' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid request',
        details: {
          name: 'Business name is required',
          currencyCode: 'Enter a valid 3-letter ISO currency code',
        },
      },
    });
    expect(businessRepository.createForOwner).not.toHaveBeenCalled();
  });

  describe('/businesses/:businessId', () => {
    it('rejects GET /api/businesses/:businessId without a token', async () => {
      const res = await request(app).get('/api/businesses/b-1');

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
      expect(businessRepository.getForOwner).not.toHaveBeenCalled();
    });

    it('fetches a single owned business when authenticated', async () => {
      await authenticate('owner-1');
      businessRepository.getForOwner.mockResolvedValue({ id: 'b-1', name: 'Shop' } as never);

      const res = await request(app)
        .get('/api/businesses/b-1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        business: { id: 'b-1', name: 'Shop', defaultTaxRate: null, lowStockDefaultThreshold: null },
      });
      expect(businessRepository.getForOwner).toHaveBeenCalledWith('b-1', 'owner-1');
    });

    it('returns 404 when the business does not belong to the owner', async () => {
      await authenticate('owner-1');
      businessRepository.getForOwner.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        error: { code: 'NOT_FOUND', message: expect.any(String) },
      });
    });

    it('rejects PUT /api/businesses/:businessId without a token', async () => {
      const res = await request(app)
        .put('/api/businesses/b-1')
        .send({ name: 'Shop v2', currencyCode: 'USD' });

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
      expect(businessRepository.getForOwner).not.toHaveBeenCalled();
    });

    it('updates an owned business when authenticated', async () => {
      await authenticate('owner-1');
      businessRepository.getForOwner.mockResolvedValue({ id: 'b-1' } as never);
      businessRepository.updateForOwner.mockResolvedValue({ id: 'b-1', name: 'Shop v2' } as never);

      const input = {
        name: 'Shop v2',
        currencyCode: 'USD',
        defaultTaxRate: 15,
        taxOnSales: true,
        allowNegativeStock: false,
        lowStockDefaultThreshold: 10,
      };

      const res = await request(app)
        .put('/api/businesses/b-1')
        .set('Authorization', 'Bearer token')
        .send(input);

      expect(res.status).toBe(200);
      expect(res.body.business).toMatchObject({
        id: 'b-1',
        name: 'Shop v2',
        defaultTaxRate: null,
        lowStockDefaultThreshold: null,
      });
      expect(businessRepository.getForOwner).toHaveBeenCalledWith('b-1', 'owner-1');
      expect(businessRepository.updateForOwner).toHaveBeenCalledWith('b-1', input);
    });

    it('returns 404 when PUT for a business not owned', async () => {
      await authenticate('owner-1');
      businessRepository.getForOwner.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/businesses/b-1')
        .set('Authorization', 'Bearer token')
        .send({ name: 'Shop v2', currencyCode: 'USD' });

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        error: { code: 'NOT_FOUND', message: expect.any(String) },
      });
      expect(businessRepository.updateForOwner).not.toHaveBeenCalled();
    });
  });
});

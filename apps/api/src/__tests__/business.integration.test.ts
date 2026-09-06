import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { AuthRepository } from '../modules/auth/auth.types.js';
import type { BusinessRepository } from '../modules/business/business.types.js';

const isoNow = '2026-01-01T00:00:00.000Z';
const now = new Date(isoNow);

const { verifyJwt, authRepository, businessRepository } = vi.hoisted(() => ({
  verifyJwt: vi.fn(),
  authRepository: {
    findIdentity: vi.fn(),
    createIdentity: vi.fn(),
  } satisfies AuthRepository,
  businessRepository: {
    listForOwner: vi.fn(),
    createForOwner: vi.fn(),
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

function rawBusinessRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'b-1',
    ownerId: 'owner-1',
    name: 'Test',
    currencyCode: 'USD',
    defaultTaxRate: null,
    taxDisplayMode: 'EXCLUSIVE',
    allowNegativeStock: true,
    lowStockDefaultThreshold: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function rawBranchRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'br-1',
    businessId: 'b-1',
    name: 'main',
    address: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function rawMemberRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm-1',
    businessId: 'b-1',
    branchId: 'br-1',
    ownerId: 'owner-1',
    name: 'me',
    role: 'OWNER',
    active: true,
    createdAt: now,
    updatedAt: now,
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
    businessRepository.listForOwner.mockResolvedValue([
      rawBusinessRow(),
      rawBusinessRow({ id: 'b-2' }),
    ]);

    const res = await request(app).get('/api/businesses').set('Authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      businesses: [
        {
          id: 'b-1',
          ownerId: 'owner-1',
          name: 'Test',
          currencyCode: 'USD',
          defaultTaxRate: null,
          taxDisplayMode: 'EXCLUSIVE',
          allowNegativeStock: true,
          lowStockDefaultThreshold: null,
          createdAt: isoNow,
          updatedAt: isoNow,
        },
        {
          id: 'b-2',
          ownerId: 'owner-1',
          name: 'Test',
          currencyCode: 'USD',
          defaultTaxRate: null,
          taxDisplayMode: 'EXCLUSIVE',
          allowNegativeStock: true,
          lowStockDefaultThreshold: null,
          createdAt: isoNow,
          updatedAt: isoNow,
        },
      ],
    });
    expect(businessRepository.listForOwner).toHaveBeenCalledWith('owner-1');
  });

  it('creates a business with the authenticated owner id', async () => {
    await authenticate('owner-1');
    businessRepository.createForOwner.mockResolvedValue({
      business: rawBusinessRow(),
      branch: rawBranchRow(),
      member: rawMemberRow(),
    });

    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Test', currencyCode: 'USD' });

    expect(res.status).toBe(201);

    expect(res.body).toEqual({
      business: {
        id: 'b-1',
        ownerId: 'owner-1',
        name: 'Test',
        currencyCode: 'USD',
        defaultTaxRate: null,
        taxDisplayMode: 'EXCLUSIVE',
        allowNegativeStock: true,
        lowStockDefaultThreshold: null,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      branch: {
        id: 'br-1',
        businessId: 'b-1',
        name: 'main',
        address: null,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      member: {
        id: 'm-1',
        businessId: 'b-1',
        branchId: 'br-1',
        ownerId: 'owner-1',
        name: 'me',
        role: 'OWNER',
        active: true,
        createdAt: isoNow,
        updatedAt: isoNow,
      },
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
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { AuthRepository } from '../modules/auth/auth.types.js';
import type { BusinessRepository } from '../modules/business/business.types.js';
import type { PaymentsRepository } from '../modules/payments/payments.types.js';

const { verifyJwt, authRepository, businessRepository, paymentsRepository } = vi.hoisted(() => ({
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
  paymentsRepository: {
    summarizeByMethod: vi.fn(),
  } satisfies PaymentsRepository,
}));

vi.mock('../lib/jwt.js', () => ({ verifyJwt }));
vi.mock('../modules/auth/auth.repository.js', () => ({
  createAuthRepository: () => authRepository,
}));
vi.mock('../modules/business/business.repository.js', () => ({
  createBusinessRepository: () => businessRepository,
}));
vi.mock('../modules/payments/payments.repository.js', () => ({
  createPaymentsRepository: () => paymentsRepository,
}));

import app from '../app.js';
import { ERROR_CODES } from '../shared/errors/app-error.js';

const FROM = '2026-02-01T00:00:00.000Z';
const TO = '2026-02-02T00:00:00.000Z';
const URL = `/api/businesses/b-1/payments/summary?from=${encodeURIComponent(FROM)}&to=${encodeURIComponent(TO)}`;

const decimal = (value: number) => ({ toNumber: () => value });

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

describe('payments.integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    paymentsRepository.summarizeByMethod.mockResolvedValue([
      { method: 'CASH', total: decimal(600), paymentCount: 3 },
      { method: 'CARD', total: decimal(300), paymentCount: 2 },
      { method: 'MOBILE_MONEY', total: decimal(100), paymentCount: 1 },
    ]);
  });

  describe('GET /api/businesses/:businessId/payments/summary', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get(URL);

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.UNAUTHORIZED } });
      expect(paymentsRepository.summarizeByMethod).not.toHaveBeenCalled();
    });

    it('rejects a missing period bound before the summary is read', async () => {
      await authenticate();

      const res = await request(app)
        .get(`/api/businesses/b-1/payments/summary?to=${encodeURIComponent(TO)}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(400);
      expect(res.body.error.details).toMatchObject({ from: expect.any(String) });
      expect(paymentsRepository.summarizeByMethod).not.toHaveBeenCalled();
    });

    it('rejects an inverted period before the summary is read', async () => {
      await authenticate();

      const res = await request(app)
        .get(
          `/api/businesses/b-1/payments/summary?from=${encodeURIComponent(TO)}&to=${encodeURIComponent(FROM)}`,
        )
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.BAD_REQUEST } });
      expect(paymentsRepository.summarizeByMethod).not.toHaveBeenCalled();
    });

    it('rejects a grouping other than method before the summary is read', async () => {
      await authenticate();

      const res = await request(app).get(`${URL}&groupBy=day`).set('Authorization', 'Bearer token');

      expect(res.status).toBe(400);
      expect(res.body.error.details).toMatchObject({ groupBy: expect.any(String) });
      expect(paymentsRepository.summarizeByMethod).not.toHaveBeenCalled();
    });

    it('summarizes the resolved branch period and derives shares from its method groups', async () => {
      await authenticate();

      const res = await request(app).get(URL).set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(paymentsRepository.summarizeByMethod).toHaveBeenCalledWith(
        { businessId: 'b-1', branchId: 'br-1' },
        { from: new Date(FROM), to: new Date(TO), groupBy: 'method' },
      );
      expect(res.body).toEqual({
        period: { from: FROM, to: TO },
        groupBy: 'method',
        total: 1000,
        methods: [
          { method: 'CASH', total: 600, paymentCount: 3, sharePercent: 60 },
          { method: 'CARD', total: 300, paymentCount: 2, sharePercent: 30 },
          { method: 'MOBILE_MONEY', total: 100, paymentCount: 1, sharePercent: 10 },
        ],
      });
    });

    it('answers zero and no methods for an empty period', async () => {
      await authenticate();
      paymentsRepository.summarizeByMethod.mockResolvedValue([]);

      const res = await request(app).get(URL).set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        period: { from: FROM, to: TO },
        groupBy: 'method',
        total: 0,
        methods: [],
      });
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER', 'SERVER'] as const)(
      'lets a %s read the summary',
      async (role) => {
        await authenticate(role);

        const res = await request(app).get(URL).set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
      },
    );

    it('answers 404 when the caller does not own the business', async () => {
      await authenticate();
      businessRepository.getBusinessId.mockResolvedValue(null);

      const res = await request(app).get(URL).set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.NOT_FOUND } });
      expect(paymentsRepository.summarizeByMethod).not.toHaveBeenCalled();
    });

    it('answers 404 when the caller has no active member in the business', async () => {
      await authenticate();
      businessRepository.getActor.mockResolvedValue(null);

      const res = await request(app).get(URL).set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(paymentsRepository.summarizeByMethod).not.toHaveBeenCalled();
    });
  });
});

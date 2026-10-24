import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { AuthRepository } from '../modules/auth/auth.types.js';
import type { BusinessRepository } from '../modules/business/business.types.js';
import type { DashboardRepository } from '../modules/dashboard/dashboard.types.js';

const { verifyJwt, authRepository, businessRepository, dashboardRepository } = vi.hoisted(() => ({
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
  dashboardRepository: {
    stockPositions: vi.fn(),
    expiredLotCount: vi.fn(),
    expiringLotCount: vi.fn(),
    earliestExpiringLot: vi.fn(),
    unpaidAggregate: vi.fn(),
    draftBatchAggregate: vi.fn(),
    salesAggregate: vi.fn(),
    cashAggregate: vi.fn(),
    cogsGroups: vi.fn(),
    lossGroups: vi.fn(),
    lotContext: vi.fn(),
    salesByTimestamp: vi.fn(),
    trendCostGroups: vi.fn(),
    saleLineMap: vi.fn(),
  } satisfies DashboardRepository,
}));

vi.mock('../lib/jwt.js', () => ({ verifyJwt }));
vi.mock('../modules/auth/auth.repository.js', () => ({
  createAuthRepository: () => authRepository,
}));
vi.mock('../modules/business/business.repository.js', () => ({
  createBusinessRepository: () => businessRepository,
}));
vi.mock('../modules/dashboard/dashboard.repository.js', () => ({
  createDashboardRepository: () => dashboardRepository,
}));

import app from '../app.js';
import { ERROR_CODES } from '../shared/errors/app-error.js';

const decimal = (value: number) => ({ toNumber: () => value });

const CURRENT_FROM = new Date('2026-06-01T00:00:00.000Z');
const CURRENT_TO = new Date('2026-06-11T00:00:00.000Z');
const PREVIOUS_FROM = new Date('2026-05-22T00:00:00.000Z');
const TREND_FROM = new Date('2026-06-01T00:00:00.000Z');
const TREND_TO = new Date('2026-06-01T03:00:00.000Z');

const BASE = '/api/businesses/b-1/dashboard';

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

describe('dashboard.integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    dashboardRepository.stockPositions.mockResolvedValue([]);
    dashboardRepository.expiredLotCount.mockResolvedValue(0);
    dashboardRepository.expiringLotCount.mockResolvedValue(0);
    dashboardRepository.earliestExpiringLot.mockResolvedValue(null);
    dashboardRepository.unpaidAggregate.mockResolvedValue({
      all: { total: null, count: 0 },
      overdue: { total: null, count: 0 },
    });
    dashboardRepository.draftBatchAggregate.mockResolvedValue({ count: 0, oldest: null });
    dashboardRepository.salesAggregate.mockResolvedValue({
      total: decimal(0),
      taxAmount: decimal(0),
      count: 0,
    });
    dashboardRepository.cashAggregate.mockResolvedValue({ total: decimal(0), count: 0 });
    dashboardRepository.cogsGroups.mockResolvedValue([]);
    dashboardRepository.lossGroups.mockResolvedValue([]);
    dashboardRepository.lotContext.mockResolvedValue([]);
    dashboardRepository.salesByTimestamp.mockResolvedValue([]);
    dashboardRepository.trendCostGroups.mockResolvedValue([]);
    dashboardRepository.saleLineMap.mockResolvedValue([]);
  });

  describe('GET /api/businesses/:businessId/dashboard/attention', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get(`${BASE}/attention`);

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.UNAUTHORIZED } });
      expect(dashboardRepository.stockPositions).not.toHaveBeenCalled();
    });

    it('returns the attention snapshot to staff without the draft block', async () => {
      await authenticate('CASHIER');
      dashboardRepository.stockPositions.mockResolvedValue([
        { name: 'Soap', currentSealedStock: decimal(0), lowStockThreshold: null },
        { name: 'Rice', currentSealedStock: decimal(4), lowStockThreshold: decimal(5) },
      ]);
      dashboardRepository.expiredLotCount.mockResolvedValue(1);
      dashboardRepository.expiringLotCount.mockResolvedValue(2);
      dashboardRepository.earliestExpiringLot.mockResolvedValue({
        expiryDate: new Date('2026-06-20T00:00:00.000Z'),
        product: { name: 'Yogurt' },
      });
      dashboardRepository.unpaidAggregate.mockResolvedValue({
        all: { total: decimal(100), count: 2 },
        overdue: { total: decimal(50), count: 1 },
      });

      const res = await request(app).get(`${BASE}/attention`).set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        asOf: expect.any(String),
        stock: { count: 2, lowCount: 1, outCount: 1, preview: ['Soap', 'Rice'] },
        expiring: {
          lotCount: 3,
          expiredLotCount: 1,
          expiringLotCount: 2,
          earliest: { productName: 'Yogurt', expiryDate: '2026-06-20T00:00:00.000Z' },
        },
        unpaid: { count: 2, total: 100, overdue: { count: 1, total: 50 } },
      });
      expect(res.body).not.toHaveProperty('draftBatches');
      expect(dashboardRepository.draftBatchAggregate).not.toHaveBeenCalled();
    });

    it('includes the draft block for a manager', async () => {
      await authenticate('MANAGER');
      const createdAt = new Date('2026-06-01T08:00:00.000Z');
      dashboardRepository.draftBatchAggregate.mockResolvedValue({
        count: 1,
        oldest: { batchId: 'batch-1', supplierName: 'Farm', createdAt, lineCount: 4 },
      });

      const res = await request(app).get(`${BASE}/attention`).set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(dashboardRepository.draftBatchAggregate).toHaveBeenCalledWith('b-1', 'br-1');
      expect(res.body.draftBatches).toEqual({
        count: 1,
        oldest: {
          batchId: 'batch-1',
          supplierName: 'Farm',
          createdAt: createdAt.toISOString(),
          lineCount: 4,
        },
      });
    });
  });

  describe('GET /api/businesses/:businessId/dashboard/summary', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get(
        `${BASE}/summary?from=${CURRENT_FROM.toISOString()}&to=${CURRENT_TO.toISOString()}`,
      );

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.UNAUTHORIZED } });
      expect(dashboardRepository.salesAggregate).not.toHaveBeenCalled();
    });

    it('rejects an invalid period before reading the repository', async () => {
      await authenticate();

      const res = await request(app)
        .get(`${BASE}/summary?from=${CURRENT_TO.toISOString()}&to=${CURRENT_FROM.toISOString()}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.BAD_REQUEST } });
      expect(dashboardRepository.salesAggregate).not.toHaveBeenCalled();
    });

    it('returns only sales and cash to staff', async () => {
      await authenticate('CASHIER');
      dashboardRepository.salesAggregate.mockResolvedValue({
        total: decimal(1150),
        taxAmount: decimal(150),
        count: 2,
      });
      dashboardRepository.cashAggregate.mockResolvedValue({ total: decimal(900), count: 3 });

      const res = await request(app)
        .get(`${BASE}/summary?from=${CURRENT_FROM.toISOString()}&to=${CURRENT_TO.toISOString()}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        period: {
          from: CURRENT_FROM.toISOString(),
          to: CURRENT_TO.toISOString(),
        },
        asOf: expect.any(String),
        sales: { total: 1150, count: 2 },
        cashCollected: { total: 900, paymentCount: 3 },
      });
      expect(res.body).not.toHaveProperty('grossProfit');
      expect(res.body).not.toHaveProperty('outstanding');
      expect(res.body).not.toHaveProperty('losses');
      expect(dashboardRepository.cogsGroups).not.toHaveBeenCalled();
      expect(dashboardRepository.lossGroups).not.toHaveBeenCalled();
      expect(dashboardRepository.unpaidAggregate).not.toHaveBeenCalled();
    });

    it('returns profit, outstanding and losses to a manager', async () => {
      await authenticate('MANAGER');
      dashboardRepository.salesAggregate.mockImplementation((_businessId, _branchId, from) =>
        Promise.resolve(
          from.getTime() === CURRENT_FROM.getTime()
            ? { total: decimal(1150), taxAmount: decimal(150), count: 2 }
            : { total: decimal(575), taxAmount: decimal(75), count: 1 },
        ),
      );
      dashboardRepository.cashAggregate.mockResolvedValue({ total: decimal(900), count: 3 });
      dashboardRepository.unpaidAggregate.mockResolvedValue({
        all: { total: decimal(200), count: 2 },
        overdue: { total: decimal(80), count: 1 },
      });

      const res = await request(app)
        .get(`${BASE}/summary?from=${CURRENT_FROM.toISOString()}&to=${CURRENT_TO.toISOString()}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(dashboardRepository.salesAggregate).toHaveBeenCalledWith(
        'b-1',
        'br-1',
        PREVIOUS_FROM,
        CURRENT_FROM,
      );
      expect(dashboardRepository.cogsGroups).toHaveBeenCalledTimes(2);
      expect(dashboardRepository.lossGroups).toHaveBeenCalledTimes(1);
      expect(res.body).toMatchObject({
        grossProfit: { value: 1000, previous: 500, deltaPercent: 100 },
        sales: { total: 1150, count: 2 },
        cashCollected: { total: 900, paymentCount: 3 },
        outstanding: {
          total: 200,
          count: 2,
          overdue: { total: 80, count: 1 },
        },
        losses: { total: 0, count: 0 },
      });
    });
  });

  describe('GET /api/businesses/:businessId/dashboard/trend', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get(
        `${BASE}/trend?from=${TREND_FROM.toISOString()}&to=${TREND_TO.toISOString()}`,
      );

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.UNAUTHORIZED } });
      expect(dashboardRepository.salesByTimestamp).not.toHaveBeenCalled();
    });

    it('refuses staff before reading the repository', async () => {
      await authenticate('CASHIER');

      const res = await request(app)
        .get(`${BASE}/trend?from=${TREND_FROM.toISOString()}&to=${TREND_TO.toISOString()}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.FORBIDDEN } });
      expect(dashboardRepository.salesByTimestamp).not.toHaveBeenCalled();
    });

    it('rejects an unknown bucket before reading the repository', async () => {
      await authenticate('MANAGER');

      const res = await request(app)
        .get(
          `${BASE}/trend?from=${TREND_FROM.toISOString()}&to=${TREND_TO.toISOString()}&bucket=week`,
        )
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.BAD_REQUEST } });
      expect(dashboardRepository.salesByTimestamp).not.toHaveBeenCalled();
    });

    it('returns bucketed points to a manager', async () => {
      await authenticate('MANAGER');
      dashboardRepository.salesByTimestamp.mockResolvedValue([
        {
          saleDatetime: new Date('2026-06-01T00:30:00.000Z'),
          total: decimal(110),
          taxAmount: decimal(10),
        },
      ]);

      const res = await request(app)
        .get(`${BASE}/trend?from=${TREND_FROM.toISOString()}&to=${TREND_TO.toISOString()}`)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        period: {
          from: TREND_FROM.toISOString(),
          to: TREND_TO.toISOString(),
        },
        bucket: 'hour',
        points: [
          { start: '2026-06-01T00:00:00.000Z', grossProfit: 100 },
          { start: '2026-06-01T01:00:00.000Z', grossProfit: 0 },
          { start: '2026-06-01T02:00:00.000Z', grossProfit: 0 },
        ],
      });
    });
  });
});

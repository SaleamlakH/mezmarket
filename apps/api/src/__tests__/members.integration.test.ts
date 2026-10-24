import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { AuthRepository } from '../modules/auth/auth.types.js';
import type { BusinessRepository } from '../modules/business/business.types.js';
import type { MembersRepository } from '../modules/members/members.types.js';

const { verifyJwt, authRepository, businessRepository, membersRepository } = vi.hoisted(() => ({
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
  membersRepository: {
    list: vi.fn(),
    getMember: vi.fn(),
    memberSalesAggregate: vi.fn(),
    memberCashAggregate: vi.fn(),
    memberUnpaidCount: vi.fn(),
  } satisfies MembersRepository,
}));

vi.mock('../lib/jwt.js', () => ({ verifyJwt }));
vi.mock('../modules/auth/auth.repository.js', () => ({
  createAuthRepository: () => authRepository,
}));
vi.mock('../modules/business/business.repository.js', () => ({
  createBusinessRepository: () => businessRepository,
}));
vi.mock('../modules/members/members.repository.js', () => ({
  createMembersRepository: () => membersRepository,
}));

import app from '../app.js';
import { ERROR_CODES } from '../shared/errors/app-error.js';

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

describe('members.integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    membersRepository.list.mockResolvedValue([
      {
        id: 'srv-1',
        businessId: 'b-1',
        branchId: 'br-1',
        ownerId: null,
        name: 'Abebe',
        role: 'SERVER',
        active: true,
        createdAt: new Date('2026-03-01T09:00:00.000Z'),
        updatedAt: new Date('2026-03-01T09:00:00.000Z'),
      },
    ]);
  });

  describe('GET /api/businesses/:businessId/members', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get('/api/businesses/b-1/members');

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.UNAUTHORIZED } });
      expect(membersRepository.list).not.toHaveBeenCalled();
    });

    it('lists the resolved business members as picker summaries', async () => {
      await authenticate();

      const res = await request(app)
        .get('/api/businesses/b-1/members')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(membersRepository.list).toHaveBeenCalledWith('b-1', 'br-1', {});
      expect(res.body).toEqual([{ id: 'srv-1', name: 'Abebe', role: 'SERVER' }]);
    });

    it('passes a role filter through to the read', async () => {
      await authenticate();

      const res = await request(app)
        .get('/api/businesses/b-1/members?role=SERVER')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(membersRepository.list).toHaveBeenCalledWith('b-1', 'br-1', { role: 'SERVER' });
    });

    it('rejects a role that is not a member role before the read', async () => {
      await authenticate();

      const res = await request(app)
        .get('/api/businesses/b-1/members?role=BARTENDER')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.BAD_REQUEST } });
      expect(membersRepository.list).not.toHaveBeenCalled();
    });

    it('does not leak the owning business or the timestamps', async () => {
      await authenticate();

      const res = await request(app)
        .get('/api/businesses/b-1/members')
        .set('Authorization', 'Bearer token');

      expect(res.body[0]).not.toHaveProperty('businessId');
      expect(res.body[0]).not.toHaveProperty('branchId');
      expect(res.body[0]).not.toHaveProperty('createdAt');
      expect(res.body[0]).not.toHaveProperty('updatedAt');
    });

    it('answers an empty array when the business has no members', async () => {
      await authenticate();
      membersRepository.list.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/businesses/b-1/members')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER', 'SERVER'] as const)(
      'lets a %s read the members',
      async (role) => {
        await authenticate(role);

        const res = await request(app)
          .get('/api/businesses/b-1/members')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
      },
    );

    it('answers 404 when the caller has no active member in the business', async () => {
      await authenticate();
      businessRepository.getActor.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/members')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(membersRepository.list).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/businesses/:businessId/members/:memberId/performance', () => {
    const PERIOD_QUERY = {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.000Z',
    };

    function resolvePerformanceReads() {
      membersRepository.getMember.mockResolvedValue({
        id: 'm-2',
        businessId: 'b-1',
        branchId: 'br-1',
        ownerId: null,
        name: 'Kebede',
        role: 'SERVER',
        active: true,
        createdAt: new Date('2026-03-01T09:00:00.000Z'),
        updatedAt: new Date('2026-03-01T09:00:00.000Z'),
      });
      membersRepository.memberSalesAggregate.mockResolvedValue({
        total: { toNumber: () => 120.5 },
        count: 2,
      });
      membersRepository.memberCashAggregate.mockResolvedValue({ toNumber: () => 40 });
      membersRepository.memberUnpaidCount.mockResolvedValue(1);
    }

    it.each(['OWNER', 'MANAGER'] as const)(
      'lets a %s read another member in the session branch',
      async (role) => {
        await authenticate(role);
        resolvePerformanceReads();

        const res = await request(app)
          .get('/api/businesses/b-1/members/m-2/performance')
          .query(PERIOD_QUERY)
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
          member: { id: 'm-2', name: 'Kebede', role: 'SERVER' },
          period: PERIOD_QUERY,
          sales: { total: 120.5, count: 2 },
          cashCollected: 40,
          unpaidSalesCount: 1,
        });
        expect(membersRepository.getMember).toHaveBeenCalledWith('b-1', 'br-1', 'm-2');
        expect(membersRepository.memberSalesAggregate).toHaveBeenCalledWith({
          branchId: 'br-1',
          memberId: 'm-2',
          from: new Date('2026-09-01T00:00:00.000Z'),
          to: new Date('2026-09-30T23:59:59.000Z'),
        });
      },
    );

    it.each(['CASHIER', 'SERVER'] as const)('refuses a %s reading another member', async (role) => {
      await authenticate(role);
      resolvePerformanceReads();

      const res = await request(app)
        .get('/api/businesses/b-1/members/m-2/performance')
        .query(PERIOD_QUERY)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.FORBIDDEN } });
      expect(membersRepository.memberSalesAggregate).not.toHaveBeenCalled();
      expect(membersRepository.memberCashAggregate).not.toHaveBeenCalled();
      expect(membersRepository.memberUnpaidCount).not.toHaveBeenCalled();
    });

    it('lets a staff member read their own performance with "me"', async () => {
      await authenticate('CASHIER');
      resolvePerformanceReads();
      membersRepository.getMember.mockResolvedValue({
        id: 'm-1',
        businessId: 'b-1',
        branchId: 'br-1',
        ownerId: null,
        name: 'Abebe',
        role: 'CASHIER',
        active: true,
        createdAt: new Date('2026-03-01T09:00:00.000Z'),
        updatedAt: new Date('2026-03-01T09:00:00.000Z'),
      });

      const res = await request(app)
        .get('/api/businesses/b-1/members/me/performance')
        .query(PERIOD_QUERY)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.member).toEqual({ id: 'm-1', name: 'Abebe', role: 'CASHIER' });
      expect(membersRepository.getMember).toHaveBeenCalledWith('b-1', 'br-1', 'm-1');
    });

    it('answers 404 for a member outside the session scope', async () => {
      await authenticate('OWNER');
      membersRepository.getMember.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/members/other/performance')
        .query(PERIOD_QUERY)
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.NOT_FOUND } });
      expect(membersRepository.memberSalesAggregate).not.toHaveBeenCalled();
    });
  });
});

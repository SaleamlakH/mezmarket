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

const SERVER_RECORD = {
  id: 'srv-1',
  businessId: 'b-1',
  branchId: 'br-1',
  ownerId: null,
  name: 'Abebe',
  role: 'SERVER',
  active: true,
  createdAt: new Date('2026-03-01T09:00:00.000Z'),
  updatedAt: new Date('2026-03-01T09:00:00.000Z'),
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

describe('members.integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    membersRepository.list.mockResolvedValue([SERVER_RECORD]);
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
});

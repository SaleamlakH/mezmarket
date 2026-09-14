import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { ERROR_CODES } from '../shared/errors/app-error.js';
import type { AuthRepository } from '../modules/auth/auth.types.js';
import type { OwnerRepository } from '../modules/owner/owner.types.js';
import app from '../app.js';

const { verifyJwt, authRepository, ownerRepository } = vi.hoisted(() => ({
  verifyJwt: vi.fn(),
  authRepository: {
    findIdentity: vi.fn(),
    createIdentity: vi.fn(),
  } satisfies AuthRepository,
  ownerRepository: {
    findOwnerById: vi.fn(),
    updateOwner: vi.fn(),
  } satisfies OwnerRepository,
}));

vi.mock('../lib/jwt.js', () => ({ verifyJwt }));

vi.mock('../modules/auth/auth.repository.js', () => ({
  createAuthRepository: () => authRepository,
}));

vi.mock('../modules/owner/owner.repository.js', () => ({
  createOwnerRepository: () => ownerRepository,
}));

async function authenticate(ownerId = 'owner-1') {
  verifyJwt.mockResolvedValue({ sub: 'user-1', email: 'user@test.com' });
  authRepository.findIdentity.mockResolvedValue({
    id: 'user-1',
    ownerId,
    providerUserId: 'user-1',
  });
}

describe('owner.integration', () => {
  describe('GET /api/owner', () => {
    it('rejects with 401 when the token is missing', async () => {
      const res = await request(app).get('/api/owner');

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        error: { code: ERROR_CODES.UNAUTHORIZED, message: expect.any(String) },
      });
      expect(ownerRepository.findOwnerById).not.toHaveBeenCalled();
    });

    it('returns the owner profile', async () => {
      await authenticate('o-1');
      ownerRepository.findOwnerById.mockResolvedValue({ id: 'o-1', name: 'Test' });

      const res = await request(app).get('/api/owner').set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'o-1', name: 'Test' });

      expect(ownerRepository.findOwnerById).toHaveBeenCalledWith('o-1');
    });

    it('returns 404 when the owner does not exist', async () => {
      await authenticate('o-2');
      ownerRepository.findOwnerById.mockResolvedValue(null);

      const res = await request(app).get('/api/owner').set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        error: { code: ERROR_CODES.NOT_FOUND, message: expect.any(String) },
      });
    });
  });

  describe('PUT /api/owner', () => {
    it('rejects with 401 when the token is missing', async () => {
      const res = await request(app).put('/api/owner').send({ name: 'Jane Doe' });

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        error: { code: ERROR_CODES.UNAUTHORIZED, message: expect.any(String) },
      });
      expect(ownerRepository.updateOwner).not.toHaveBeenCalled();
    });

    it('updates and returns the owner profile', async () => {
      await authenticate('o-1');
      ownerRepository.findOwnerById.mockResolvedValue({ id: 'o-1', name: 'Test' });
      ownerRepository.updateOwner.mockResolvedValue({ id: 'o-1', name: 'Jane Doe' });

      const res = await request(app)
        .put('/api/owner')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Jane Doe' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'o-1', name: 'Jane Doe' });
      expect(ownerRepository.updateOwner).toHaveBeenCalledWith('o-1', { name: 'Jane Doe' });
    });

    it('rejects invalid field values with 400', async () => {
      await authenticate('o-1');

      const res = await request(app)
        .put('/api/owner')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: expect.any(String),
          details: { name: expect.any(String) },
        },
      });
      expect(ownerRepository.updateOwner).not.toHaveBeenCalled();
    });

    it('rejects an empty body with 400', async () => {
      await authenticate('o-1');

      const res = await request(app)
        .put('/api/owner')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        error: { code: ERROR_CODES.BAD_REQUEST, message: expect.any(String) },
      });
      expect(ownerRepository.updateOwner).not.toHaveBeenCalled();
    });

    it('rejects unknown fields with 400', async () => {
      await authenticate('o-1');

      const res = await request(app)
        .put('/api/owner')
        .set('Authorization', 'Bearer valid-token')
        .send({ id: 'o-123' });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        error: { code: ERROR_CODES.BAD_REQUEST, message: expect.any(String) },
      });
      expect(ownerRepository.updateOwner).not.toHaveBeenCalled();
    });

    it('returns 404 when the owner does not exist', async () => {
      await authenticate('o-2');
      ownerRepository.findOwnerById.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/owner')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Jane Doe' });

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        error: { code: ERROR_CODES.NOT_FOUND, message: expect.any(String) },
      });
      expect(ownerRepository.updateOwner).not.toHaveBeenCalled();
    });
  });
});

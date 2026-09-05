import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { AppError } from '../shared/errors/app-error.js';
import { ERROR_CODES } from '../shared/errors/app-error.js';
import type { AuthRepository } from '../modules/auth/auth.types.js';

const { verifyJwt, authRepository } = vi.hoisted(() => ({
  verifyJwt: vi.fn(),
  authRepository: {
    findIdentity: vi.fn(),
    createIdentity: vi.fn(),
  } satisfies AuthRepository,
}));

vi.mock('../lib/jwt.js', () => ({ verifyJwt }));
vi.mock('../modules/auth/auth.repository.js', () => ({
  createAuthRepository: () => authRepository,
}));

import app from '../app.js';

describe('auth.integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects /api routes without an Authorization header', async () => {
    const res = await request(app).get('/api/businesses');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
    expect(verifyJwt).not.toHaveBeenCalled();
    expect(authRepository.findIdentity).not.toHaveBeenCalled();
  });

  it('rejects /api routes with a non-Bearer scheme', async () => {
    const res = await request(app).get('/api/businesses').set('Authorization', 'Basic abc123');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
    expect(authRepository.findIdentity).not.toHaveBeenCalled();
  });

  it('rejects /api routes when JWT verification fails', async () => {
    verifyJwt.mockRejectedValue(new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid token', 401));

    const res = await request(app).get('/api/businesses').set('Authorization', 'Bearer bad-token');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
    expect(authRepository.findIdentity).not.toHaveBeenCalled();
  });

  it('propagates an error thrown while resolving the identity', async () => {
    verifyJwt.mockResolvedValue({ sub: 'user-1', email: 'user@test.com' });
    authRepository.findIdentity.mockRejectedValue(
      new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
    );

    const res = await request(app).get('/api/businesses').set('Authorization', 'Bearer token');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
  });

  it('keeps GET /health public without a token', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
  });
});

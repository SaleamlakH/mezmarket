import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAuthMiddleware } from '../auth.middleware.js';
import { errorHandler } from '../../../shared/errors/error-handler.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';
import type { VerifyJwt } from '../../../lib/jwt.js';
import type { AuthService } from '../auth.types.js';

function mockVerifyJwt(): VerifyJwt {
  return vi.fn();
}

function mockAuthService(): AuthService {
  return { resolve: vi.fn() };
}

function createApp(verifyJwt: VerifyJwt, authService: AuthService) {
  const app = express();
  app.use(createAuthMiddleware(verifyJwt, authService));
  app.get('/protected', (req, res) => {
    res.json({ ownerId: (req as express.Request).auth?.ownerId });
  });
  app.use(errorHandler);
  return app;
}

describe('auth.middleware', () => {
  let verifyJwt: VerifyJwt;
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    verifyJwt = mockVerifyJwt();
    authService = mockAuthService();
  });

  it('returns 401 when no Authorization header', async () => {
    const app = createApp(verifyJwt, authService);

    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('returns 401 when header is not Bearer', async () => {
    const app = createApp(verifyJwt, authService);

    const res = await request(app).get('/protected').set('Authorization', 'Basic abc123');

    expect(res.status).toBe(401);
  });

  it('returns 401 when JWT verification fails', async () => {
    vi.mocked(verifyJwt).mockRejectedValue(
      new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid token', 401),
    );
    const app = createApp(verifyJwt, authService);

    const res = await request(app).get('/protected').set('Authorization', 'Bearer bad-token');

    expect(res.status).toBe(401);
  });

  it('calls next and attaches ownerId on success', async () => {
    vi.mocked(verifyJwt).mockResolvedValue({ sub: 'user-1', email: 'a@b.com' });
    vi.mocked(authService.resolve).mockResolvedValue({
      id: 'id-1',
      ownerId: 'owner-1',
      providerUserId: 'user-1',
    });
    const app = createApp(verifyJwt, authService);

    const res = await request(app).get('/protected').set('Authorization', 'Bearer good-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ownerId: 'owner-1' });
    expect(authService.resolve).toHaveBeenCalledWith('user-1', 'a@b.com');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyJwt } from '../jwt.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../shared/errors/app-error.js';
import { jwtVerify, createRemoteJWKSet } from 'jose';

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'keyset'),
  jwtVerify: vi.fn(),
}));

describe('verifyJwt', () => {
  const original = process.env.SUPABASE_JWKS_URL;

  beforeEach(() => {
    process.env.SUPABASE_JWKS_URL = 'https://example.test/jwks.json';
    vi.mocked(jwtVerify).mockReset();
    vi.mocked(createRemoteJWKSet).mockClear();
  });

  afterEach(() => {
    process.env.SUPABASE_JWKS_URL = original;
  });

  it('returns the payload on success', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: 'user-1', email: 'a@b.com' },
      protectedHeader: {},
    } as never);

    const result = await verifyJwt('token');

    expect(result).toEqual({ sub: 'user-1', email: 'a@b.com' });
  });

  it('throws AppError UNAUTHORIZED when verification fails', async () => {
    vi.mocked(jwtVerify).mockRejectedValue(new Error('invalid signature'));

    await expect(verifyJwt('bad-token')).rejects.toEqual(
      new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid token', 401),
    );
  });

  it('throws AppError UNAUTHORIZED when sub is missing', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { email: 'a@b.com' },
      protectedHeader: {},
    } as never);

    await expect(verifyJwt('token')).rejects.toEqual(
      new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid token', 401),
    );
  });
});

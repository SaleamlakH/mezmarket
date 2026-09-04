import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AppError } from '../shared/errors/app-error.js';
import { ERROR_CODES } from '../shared/errors/app-error.js';

export interface JwtPayload {
  sub: string;
  email?: string;
}

export async function verifyJwt(token: string): Promise<JwtPayload> {
  const remoteJWKSet = createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL));

  try {
    const { payload } = await jwtVerify(token, remoteJWKSet);

    if (typeof payload.sub !== 'string') {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid token', 401);
    }

    const email = typeof payload.email === 'string' ? payload.email : undefined;

    return email ? { sub: payload.sub, email } : { sub: payload.sub };
  } catch {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid token', 401);
  }
}

export type VerifyJwt = typeof verifyJwt;

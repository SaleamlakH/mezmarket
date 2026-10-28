import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AppError } from '../shared/errors/app-error.js';
import { ERROR_CODES } from '../shared/errors/app-error.js';

export interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
}

export async function verifyJwt(token: string): Promise<JwtPayload> {
  const remoteJWKSet = createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL));

  try {
    const { payload } = await jwtVerify(token, remoteJWKSet);

    if (typeof payload.sub !== 'string') {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid token', 401);
    }

    const email = typeof payload.email === 'string' ? payload.email : undefined;
    const metadata = payload.user_metadata;
    const rawName =
      typeof metadata === 'object' && metadata !== null
        ? (metadata as { full_name?: unknown }).full_name
        : undefined;
    const name = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : undefined;

    return {
      sub: payload.sub,
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
    };
  } catch {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid token', 401);
  }
}

export type VerifyJwt = typeof verifyJwt;

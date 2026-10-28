import type { Request, Response, NextFunction } from 'express';
import type { VerifyJwt } from '../../lib/jwt.js';
import type { AuthService } from './auth.types.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../shared/errors/app-error.js';

export function createAuthMiddleware(verifyJwt: VerifyJwt, authService: AuthService) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Missing token', 401);
    }

    const token = header.slice(7);
    const payload = await verifyJwt(token);
    const identity = await authService.resolve(payload.sub, payload.email, payload.name);

    req.auth = { ownerId: identity.ownerId };
    next();
  };
}

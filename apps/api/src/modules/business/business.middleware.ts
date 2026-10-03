import type { NextFunction, Request, Response } from 'express';
import { validateCreateBusiness } from '@mez/validation';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import type { BusinessMemberRole, BusinessService } from './business.types.js';

export function validateBusinessInput(req: Request, res: Response, next: NextFunction) {
  const result = validateCreateBusiness(req.body);
  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }
  res.locals.validated = result.data;
  next();
}

export function createAuthorizeBusiness(businessService: BusinessService) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const ownerId = req.auth?.ownerId;

    if (!ownerId) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401);
    }

    const businessId = req.params.businessId as string;

    if (!businessId) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, 'Missing business id', 400);
    }

    const scope = await businessService.resolveScope(ownerId, businessId);
    req.auth = {
      ownerId: req.auth?.ownerId as string,
      businessId: scope.businessId,
      branchId: scope.branchId,
      memberId: scope.memberId,
      role: scope.role,
    };
    next();
  };
}

/**
 * Gates an already-scoped route on the acting member's role. Runs after the
 * authorize middleware, so the role it reads is the one resolved for this
 * business rather than anything the request carried.
 *
 * A request that reached this without a resolved role was never scoped to a
 * member at all, which is an unauthenticated request rather than a
 * disallowed one — hence 401 rather than 403.
 */
export function requireBusinessRole(roles: BusinessMemberRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.auth?.role;

    if (!role) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401);
    }

    if (!roles.includes(role)) {
      throw new AppError(
        ERROR_CODES.FORBIDDEN,
        'You do not have permission to perform this action',
        403,
      );
    }

    next();
  };
}

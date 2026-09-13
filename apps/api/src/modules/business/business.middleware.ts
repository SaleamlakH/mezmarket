import type { NextFunction, Request, Response } from 'express';
import { validateCreateBusiness } from '@mez/validation';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import type { BusinessService } from './business.types.js';

export function validateBusinessInput(req: Request, _res: Response, next: NextFunction) {
  const result = validateCreateBusiness(req.body);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validBody = result.data;
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
    };
    next();
  };
}

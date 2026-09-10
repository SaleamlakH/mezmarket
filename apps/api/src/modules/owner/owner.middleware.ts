import type { Request, Response, NextFunction } from 'express';
import { validateUpdateOwnerValues } from '@mez/validation';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';

export function validateOwnerUpdate(req: Request, _res: Response, next: NextFunction) {
  const result = validateUpdateOwnerValues(req.body);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validBody = result.data;
  next();
}

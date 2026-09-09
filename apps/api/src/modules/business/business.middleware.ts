import type { NextFunction, Request, Response } from 'express';
import { validateCreateBusiness } from '@mez/validation';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';

export function validateBusinessInput(req: Request, res: Response, next: NextFunction) {
  const result = validateCreateBusiness(req.body);
  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }
  res.locals.validated = result.data;
  next();
}

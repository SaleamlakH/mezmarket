import type { NextFunction, Request, Response } from 'express';
import { validateCreateSale, validatePayment } from '@mez/validation';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';

export function validateSaleCreateInput(req: Request, _res: Response, next: NextFunction) {
  const result = validateCreateSale(req.body);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validBody = result.data;
  next();
}

export function validateSalePaymentInput(req: Request, _res: Response, next: NextFunction) {
  const result = validatePayment(req.body);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validBody = result.data;
  next();
}

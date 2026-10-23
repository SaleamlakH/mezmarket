import type { NextFunction, Request, Response } from 'express';
import { validatePaymentSummaryQuery as parsePaymentSummaryQuery } from '@mez/validation';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';

export function validatePaymentSummaryQuery(req: Request, _res: Response, next: NextFunction) {
  const result = parsePaymentSummaryQuery(req.query);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validQuery = result.data;
  next();
}

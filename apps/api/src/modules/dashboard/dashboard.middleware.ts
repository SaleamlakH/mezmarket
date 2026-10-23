import type { NextFunction, Request, Response } from 'express';
import { validatePeriodQuery, validateTrendQuery } from '@mez/validation';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';

export function validateDashboardSummaryQuery(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = validatePeriodQuery(req.query);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validQuery = result.data;
  next();
}

export function validateDashboardTrendQuery(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = validateTrendQuery(req.query);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validQuery = result.data;
  next();
}

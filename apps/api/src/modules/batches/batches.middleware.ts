import type { NextFunction, Request, Response } from 'express';
import {
  validateCreateBatch,
  validateProductInventoryDetailQuery,
  validateProductInventoryListQuery,
} from '@mez/validation';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';

export function validateBatchCreateInput(req: Request, res: Response, next: NextFunction) {
  const result = validateCreateBatch(req.body);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validBody = result.data;
  next();
}

export function validateInventoryListFilters(req: Request, _res: Response, next: NextFunction) {
  const result = validateProductInventoryListQuery(req.query);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validQuery = result.data;
  next();
}

export function validateInventoryDetailFilters(req: Request, _res: Response, next: NextFunction) {
  const result = validateProductInventoryDetailQuery(req.query);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validQuery = result.data;
  next();
}

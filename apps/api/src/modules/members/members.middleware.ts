import type { NextFunction, Request, Response } from 'express';
import {
  validateMemberListQuery,
  validateMemberPerformanceQuery as parseMemberPerformanceQuery,
} from '@mez/validation';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';

export function validateMemberListFilters(req: Request, _res: Response, next: NextFunction) {
  const result = validateMemberListQuery(req.query);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validQuery = result.data;
  next();
}

export function validateMemberPerformanceQuery(req: Request, _res: Response, next: NextFunction) {
  const result = parseMemberPerformanceQuery(req.query);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validQuery = result.data;
  next();
}

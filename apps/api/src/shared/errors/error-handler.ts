import type { Request, Response, NextFunction } from 'express';
import { isAppError, ERROR_CODES } from './app-error.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  void _next;

  if (isAppError(err)) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
  });
}

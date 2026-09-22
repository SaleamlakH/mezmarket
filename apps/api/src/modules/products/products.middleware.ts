import type { NextFunction, Request, Response } from 'express';
import { validateCreateProduct } from '@mez/validation';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import type { ProductService } from './products.types.js';

export function validateProductInput(req: Request, _res: Response, next: NextFunction) {
  const result = validateCreateProduct(req.body);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validBody = result.data;
  next();
}

export function createUploadResolver(productsService: ProductService) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    // creating upload doesn't require resolving upload id
    if (req.method === 'POST') return next();

    const recordId = req.params.recordId;

    if (typeof recordId === 'string') {
      const uploadId = await productsService.resolveUploadId(recordId, req.auth?.businessId);
      req.params.uploadId = uploadId;
    } else {
      req.uploadIds = await productsService.resolveUploadIds(
        req.auth?.businessId,
        req.auth?.branchId,
      );
    }

    next();
  };
}

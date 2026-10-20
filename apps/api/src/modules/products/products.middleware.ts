import type { NextFunction, Request, Response } from 'express';
import {
  validateCreateProduct,
  validateCreateProductUnit,
  validateProductListQuery,
  validateUpdateProduct,
  validateUpdateProductActive,
  validateUpdateProductUnits,
} from '@mez/validation';
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

export function validateProductUnitInput(req: Request, _res: Response, next: NextFunction) {
  const result = validateCreateProductUnit(req.body);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validBody = result.data;
  next();
}

export function validateProductUpdateInput(req: Request, _res: Response, next: NextFunction) {
  const result = validateUpdateProduct(req.body);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validBody = result.data;
  next();
}

export function validateProductUnitsUpdateInput(req: Request, _res: Response, next: NextFunction) {
  const result = validateUpdateProductUnits(req.body);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validBody = result.data;
  next();
}

export function validateProductActiveInput(req: Request, _res: Response, next: NextFunction) {
  const result = validateUpdateProductActive(req.body);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validBody = result.data;
  next();
}

export function validateProductIdParam(req: Request, _res: Response, next: NextFunction) {
  const value = req.params.productId;
  const productId = Array.isArray(value) ? value[0] : value;

  if (!productId) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Missing product id', 400);
  }

  req.params.productId = productId;
  next();
}

export function validateProductListFilters(req: Request, _res: Response, next: NextFunction) {
  const result = validateProductListQuery(req.query);

  if (result.errors) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, result.errors);
  }

  req.validQuery = result.data;
  next();
}

export function createUploadResolver(productsService: ProductService) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    // creating upload doesn't require resolving upload id
    if (req.method === 'POST') return next();

    const rawRecordId = req.params.recordId;
    const recordId = Array.isArray(rawRecordId) ? rawRecordId[0] : rawRecordId;

    if (req.method === 'PUT') {
      if (!recordId) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, 'Missing record id', 400);
      }

      req.params.recordId = recordId;

      // Replacing a record's file reuses the one it already shows, if any; a record
      // with no file yet mints a fresh upload and claim downstream.
      const target = await productsService.resolveUploadTarget(recordId, req.auth?.businessId);
      if (target.uploadId) {
        req.params.uploadId = target.uploadId;
      } else {
        delete req.params.uploadId;
      }
    } else if (recordId) {
      req.params.recordId = recordId;
      req.params.uploadId = await productsService.resolveUploadId(recordId, req.auth?.businessId);
    } else {
      req.uploadIds = await productsService.resolveUploadIds(
        req.auth?.businessId,
        req.auth?.branchId,
      );
    }

    next();
  };
}

import type { NextFunction, Request, Response } from 'express';
import type { ProductService } from './products.types.js';

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

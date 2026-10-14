import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { BatchController } from './batches.controller.js';

/** Reads are open to any member; only the write is role-gated and validated. */
export function createBatchRouter(
  controller: BatchController,
  authorizeBusiness: (req: Request, res: Response, next: NextFunction) => void,
  requireBatchWriteRole: (req: Request, res: Response, next: NextFunction) => void,
  validateBatchInput: (req: Request, res: Response, next: NextFunction) => void,
): Router {
  const router = Router();

  router.get(
    '/businesses/:businessId/inventory/batches',
    authorizeBusiness,
    controller.listBatches,
  );
  router.get(
    '/businesses/:businessId/inventory/batches/:batchId',
    authorizeBusiness,
    controller.getBatchDetail,
  );

  router.post(
    '/businesses/:businessId/inventory/batches',
    authorizeBusiness,
    requireBatchWriteRole,
    validateBatchInput,
    controller.createBatch,
  );

  router.get(
    '/businesses/:businessId/inventory/products',
    authorizeBusiness,
    controller.listProductInventorySummaries,
  );

  router.get(
    '/businesses/:businessId/inventory/products/:productId',
    authorizeBusiness,
    controller.getProductInventoryDetail,
  );

  return router;
}

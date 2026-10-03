import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { BatchController } from './batches.controller.js';

/**
 * Both routes run behind the business's own authorization: which business is
 * addressed comes from the path, and — for the write — the acting member's
 * role has to allow it. Only the write carries a body, so only it needs its
 * input validated. Reading a batch is open to any member of the business.
 */
export function createBatchRouter(
  controller: BatchController,
  authorizeBusiness: (req: Request, res: Response, next: NextFunction) => void,
  requireBatchWriteRole: (req: Request, res: Response, next: NextFunction) => void,
  validateBatchInput: (req: Request, res: Response, next: NextFunction) => void,
): Router {
  const router = Router();

  router.get('/businesses/:businessId/batches', authorizeBusiness, controller.listBatches);
  router.post(
    '/businesses/:businessId/batches',
    authorizeBusiness,
    requireBatchWriteRole,
    validateBatchInput,
    controller.createBatch,
  );

  return router;
}

import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { PaymentsController } from './payments.controller.js';

/** The payment breakdown is a read any member of the business may run. */
export function createPaymentsRouter(
  controller: PaymentsController,
  authorizeBusiness: (req: Request, res: Response, next: NextFunction) => void,
  validateSummaryQuery: (req: Request, res: Response, next: NextFunction) => void,
): Router {
  const router = Router();

  router.get(
    '/businesses/:businessId/payments/summary',
    authorizeBusiness,
    validateSummaryQuery,
    controller.getSummary,
  );

  return router;
}

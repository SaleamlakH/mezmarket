import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { SaleController } from './sales.controller.js';

/** Reads are open to any member; only the create is role-gated and validated. */
export function createSalesRouter(
  controller: SaleController,
  authorizeBusiness: (req: Request, res: Response, next: NextFunction) => void,
  requireSaleWriteRole: (req: Request, res: Response, next: NextFunction) => void,
  validateSaleInput: (req: Request, res: Response, next: NextFunction) => void,
): Router {
  const router = Router();

  router.get('/businesses/:businessId/sales', authorizeBusiness, controller.listSales);
  router.post(
    '/businesses/:businessId/sales',
    authorizeBusiness,
    requireSaleWriteRole,
    validateSaleInput,
    controller.createSale,
  );

  return router;
}

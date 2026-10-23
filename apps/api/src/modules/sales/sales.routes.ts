import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { SaleController } from './sales.controller.js';

/** Reads are open to any member; the create and payment writes are role-gated and validated. */
export function createSalesRouter(
  controller: SaleController,
  authorizeBusiness: (req: Request, res: Response, next: NextFunction) => void,
  requireSaleWriteRole: (req: Request, res: Response, next: NextFunction) => void,
  validateSaleInput: (req: Request, res: Response, next: NextFunction) => void,
  validatePaymentInput: (req: Request, res: Response, next: NextFunction) => void,
  validateSaleListQuery: (req: Request, res: Response, next: NextFunction) => void,
): Router {
  const router = Router();

  router.get(
    '/businesses/:businessId/sales',
    authorizeBusiness,
    validateSaleListQuery,
    controller.listSales,
  );
  router.get('/businesses/:businessId/sales/:saleId', authorizeBusiness, controller.getSale);
  router.post(
    '/businesses/:businessId/sales',
    authorizeBusiness,
    requireSaleWriteRole,
    validateSaleInput,
    controller.createSale,
  );
  router.post(
    '/businesses/:businessId/sales/:saleId/payments',
    authorizeBusiness,
    requireSaleWriteRole,
    validatePaymentInput,
    controller.recordPayment,
  );

  return router;
}

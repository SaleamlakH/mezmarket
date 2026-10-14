import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { CustomerController } from './customers.controller.js';

/** Reads are open to any member; the create is role-gated and validated. */
export function createCustomersRouter(
  controller: CustomerController,
  authorizeBusiness: (req: Request, res: Response, next: NextFunction) => void,
  requireCustomerWriteRole: (req: Request, res: Response, next: NextFunction) => void,
  validateCustomerInput: (req: Request, res: Response, next: NextFunction) => void,
): Router {
  const router = Router();

  router.get('/businesses/:businessId/customers', authorizeBusiness, controller.listCustomers);
  router.post(
    '/businesses/:businessId/customers',
    authorizeBusiness,
    requireCustomerWriteRole,
    validateCustomerInput,
    controller.createCustomer,
  );

  return router;
}

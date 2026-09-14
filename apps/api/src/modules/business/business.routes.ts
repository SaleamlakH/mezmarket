import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { BusinessController } from './business.controller.js';

export function createBusinessRouter(
  controller: BusinessController,
  validateBusinessInput: (req: Request, res: Response, next: NextFunction) => void,
  validateBusinessUpdateInput: (req: Request, res: Response, next: NextFunction) => void,
): Router {
  const router = Router();

  router.get('/businesses', controller.listBusinesses);
  router.post('/businesses', validateBusinessInput, controller.createBusiness);
  router.get('/businesses/:businessId', controller.getBusiness);
  router.put('/businesses/:businessId', validateBusinessUpdateInput, controller.updateBusiness);

  return router;
}

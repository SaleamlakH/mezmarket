import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { ProductController } from './products.controller.js';

export function createProductRouter(
  controller: ProductController,
  authorizeBusiness: (req: Request, res: Response, next: NextFunction) => void,
): Router {
  const router = Router();

  router.get('/businesses/:businessId/products', authorizeBusiness, controller.listProducts);

  router.get(
    '/businesses/:businessId/products/:productId/units',
    authorizeBusiness,
    controller.listProductUnits,
  );

  return router;
}

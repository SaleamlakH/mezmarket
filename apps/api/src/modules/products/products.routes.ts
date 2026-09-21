import { Router, type NextFunction, type Request, type Response } from 'express';
import type { ProductController } from './products.controller.js';

export function createProductsRouter(
  controller: ProductController,
  authorizeBusiness: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  uploadsRouter: Router,
): Router {
  const router = Router();

  router.get('/businesses/:businessId/products', authorizeBusiness, controller.listProducts);
  router.post('/businesses/:businessId/products', authorizeBusiness, controller.createProduct);
  router.get(
    '/businesses/:businessId/products/:productId',
    authorizeBusiness,
    controller.getProduct,
  );

  router.use('/businesses/:businessId/products', authorizeBusiness, uploadsRouter);

  return router;
}

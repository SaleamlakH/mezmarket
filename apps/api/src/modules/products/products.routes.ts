import { Router, type NextFunction, type Request, type Response } from 'express';
import type { ProductController } from './products.controller.js';

type Middleware = (req: Request, res: Response, next: NextFunction) => void;

export function createProductsRouter(
  controller: ProductController,
  authorizeBusiness: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  validateProductIdParam: Middleware,
  validateProductInput: Middleware,
  validateProductListFilters: Middleware,
  validateProductUpdateInput: Middleware,
  validateProductUnitInput: Middleware,
  validateProductUnitsUpdateInput: Middleware,
  validateProductActiveInput: Middleware,
  uploadsRouter: Router,
): Router {
  const router = Router();

  router.get(
    '/businesses/:businessId/products',
    authorizeBusiness,
    validateProductListFilters,
    controller.listProducts,
  );
  router.post(
    '/businesses/:businessId/products',
    authorizeBusiness,
    validateProductInput,
    controller.createProduct,
  );
  router.get(
    '/businesses/:businessId/products/:productId',
    authorizeBusiness,
    validateProductIdParam,
    controller.getProduct,
  );
  router.put(
    '/businesses/:businessId/products/:productId',
    authorizeBusiness,
    validateProductIdParam,
    validateProductUpdateInput,
    controller.updateProduct,
  );
  router.patch(
    '/businesses/:businessId/products/:productId/active',
    authorizeBusiness,
    validateProductIdParam,
    validateProductActiveInput,
    controller.setProductActive,
  );

  router.use('/businesses/:businessId/products', authorizeBusiness, uploadsRouter);

  router.get(
    '/businesses/:businessId/products/:productId/units',
    authorizeBusiness,
    validateProductIdParam,
    controller.listProductUnits,
  );
  router.post(
    '/businesses/:businessId/products/:productId/units',
    authorizeBusiness,
    validateProductIdParam,
    validateProductUnitInput,
    controller.createProductUnit,
  );
  router.put(
    '/businesses/:businessId/products/:productId/units',
    authorizeBusiness,
    validateProductIdParam,
    validateProductUnitsUpdateInput,
    controller.updateProductUnits,
  );

  return router;
}

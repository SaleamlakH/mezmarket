import {
  Router,
  type NextFunction,
  type Request,
  type Response,
  type Router as RouterType,
} from 'express';
import type { OwnerController } from './owner.controller.js';

export function createOwnerRoutes(
  controller: OwnerController,
  validateOwnerUpdate: (req: Request, res: Response, next: NextFunction) => void,
): RouterType {
  const router = Router();

  router.get('/owner', controller.getOwner);
  router.put('/owner', validateOwnerUpdate, controller.updateOwner);

  return router;
}

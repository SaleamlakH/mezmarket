import { Router, type Router as RouterType } from 'express';
import type { OwnerController } from './owner.controller.js';

export function createOwnerRoutes(controller: OwnerController): RouterType {
  const router = Router();

  router.get('/owner', controller.getOwner);
  router.put('/owner', controller.updateOwner);

  return router;
}

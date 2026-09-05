import { Router } from 'express';
import type { BusinessController } from './business.controller.js';

export function createBusinessRouter(controller: BusinessController): Router {
  const router = Router();

  router.get('/businesses', controller.listBusinesses);
  router.post('/businesses', controller.createBusiness);

  return router;
}

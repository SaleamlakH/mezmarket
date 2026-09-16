import { Router } from 'express';
import type { UnitController } from './units.controller.js';

export function createUnitsRouter(controller: UnitController): Router {
  const router = Router();

  router.get('/units', controller.listUnits);

  return router;
}

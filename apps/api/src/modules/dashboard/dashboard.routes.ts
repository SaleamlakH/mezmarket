import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { DashboardController } from './dashboard.controller.js';

/** Attention and summary are open to members; the role shaping happens in the service. */
export function createDashboardRouter(
  controller: DashboardController,
  authorizeBusiness: (req: Request, res: Response, next: NextFunction) => void,
  requireManager: (req: Request, res: Response, next: NextFunction) => void,
  validateSummaryQuery: (req: Request, res: Response, next: NextFunction) => void,
  validateTrendQuery: (req: Request, res: Response, next: NextFunction) => void,
): Router {
  const router = Router();

  router.get(
    '/businesses/:businessId/dashboard/attention',
    authorizeBusiness,
    controller.getAttention,
  );

  router.get(
    '/businesses/:businessId/dashboard/summary',
    authorizeBusiness,
    validateSummaryQuery,
    controller.getSummary,
  );

  // The trend is manager tier only; staff receives a 403 from the role gate.
  router.get(
    '/businesses/:businessId/dashboard/trend',
    authorizeBusiness,
    requireManager,
    validateTrendQuery,
    controller.getTrend,
  );

  return router;
}

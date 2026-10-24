import type { Request, Response } from 'express';
import type {
  BusinessMemberRole,
  ReportingPeriodQueryFilters,
  TrendQueryFilters,
} from '@mez/types';
import type { DashboardActor, DashboardService } from './dashboard.types.js';

export type DashboardController = {
  /** Answers the attention snapshot for the authenticated member. */
  getAttention(req: Request, res: Response): Promise<void>;
  /** Answers the period summary for the authenticated member. */
  getSummary(req: Request, res: Response): Promise<void>;
  /** Answers the bucketed trend for the authenticated member. */
  getTrend(req: Request, res: Response): Promise<void>;
};

/** The scope and role the authorize middleware resolved onto the request. */
function actorOf(req: Request): DashboardActor {
  return {
    businessId: req.auth?.businessId as string,
    branchId: req.auth?.branchId as string,
    memberId: req.auth?.memberId as string,
    role: req.auth?.role as BusinessMemberRole,
  };
}

export function createDashboardController(service: DashboardService): DashboardController {
  return {
    async getAttention(req, res) {
      const attention = await service.getAttention(actorOf(req));
      res.status(200).json(attention);
    },

    async getSummary(req, res) {
      const filters = req.validQuery as ReportingPeriodQueryFilters;
      const summary = await service.getSummary(actorOf(req), filters);
      res.status(200).json(summary);
    },

    async getTrend(req, res) {
      const filters = req.validQuery as TrendQueryFilters;
      const trend = await service.getTrend(actorOf(req), filters);
      res.status(200).json(trend);
    },
  };
}

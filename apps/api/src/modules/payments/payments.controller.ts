import type { Request, Response } from 'express';
import type { PaymentSummaryQueryFilters } from '@mez/types';
import type { PaymentsService } from './payments.types.js';
import type { Scope } from '../../shared/types/session.types.js';

export type PaymentsController = {
  getSummary(req: Request, res: Response): Promise<void>;
};

/** The business/branch the authorize middleware resolved onto the request. */
function scopeOf(req: Request): Scope {
  return {
    businessId: req.auth?.businessId as string,
    branchId: req.auth?.branchId as string,
  };
}

export function createPaymentsController(service: PaymentsService): PaymentsController {
  return {
    async getSummary(req, res) {
      const summary = await service.getSummary(
        scopeOf(req),
        req.validQuery as PaymentSummaryQueryFilters,
      );
      res.status(200).json(summary);
    },
  };
}

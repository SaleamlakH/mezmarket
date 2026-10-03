import type { Request, Response } from 'express';
import type { BatchActor, BatchService, CreateBatchInput } from './batches.types.js';

export type BatchController = {
  createBatch(req: Request, res: Response): Promise<void>;
  listBatches(req: Request, res: Response): Promise<void>;
};

/**
 * The scope the business module's authorize middleware resolved onto the
 * request by the time a controller runs.
 */
function actorOf(req: Request): BatchActor {
  return {
    businessId: req.auth?.businessId as string,
    branchId: req.auth?.branchId as string,
    memberId: req.auth?.memberId as string,
  };
}

export function createBatchController(service: BatchService): BatchController {
  return {
    async createBatch(req, res) {
      const input = req.validBody as CreateBatchInput;
      const batch = await service.createBatch(actorOf(req), input);
      res.status(201).json(batch);
    },

    async listBatches(req, res) {
      const { businessId, branchId } = actorOf(req);
      const batches = await service.listBatches({ businessId, branchId });
      res.status(200).json(batches);
    },
  };
}

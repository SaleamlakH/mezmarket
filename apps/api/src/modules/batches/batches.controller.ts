import type { Request, Response } from 'express';
import type { ProductInventoryDetailFilters, ProductInventoryListFilters } from '@mez/types';
import type { BatchService, CreateBatchInput } from './batches.types.js';
import type { Actor, Scope } from '../../shared/types/session.types.js';

export type BatchController = {
  createBatch(req: Request, res: Response): Promise<void>;
  listBatches(req: Request, res: Response): Promise<void>;
  getBatchDetail(req: Request, res: Response): Promise<void>;
  listProductInventorySummaries(req: Request, res: Response): Promise<void>;
  getProductInventoryDetail(req: Request, res: Response): Promise<void>;
};

/** The scope the authorize middleware resolved onto the request. */
function actorOf(req: Request): Actor {
  return {
    businessId: req.auth?.businessId as string,
    branchId: req.auth?.branchId as string,
    memberId: req.auth?.memberId as string,
  };
}

function scopeOf(req: Request): Scope {
  const { businessId, branchId } = actorOf(req);
  return { businessId, branchId };
}

export function createBatchController(service: BatchService): BatchController {
  return {
    async createBatch(req, res) {
      const input = req.validBody as CreateBatchInput;
      const batch = await service.createBatch(actorOf(req), input);
      res.status(201).json(batch);
    },

    async listBatches(req, res) {
      const batches = await service.listBatches(scopeOf(req));
      res.status(200).json(batches);
    },

    async getBatchDetail(req, res) {
      const batchId = req.params.batchId as string;
      const batch = await service.getBatchDetail(scopeOf(req), batchId);
      res.status(200).json(batch);
    },

    async listProductInventorySummaries(req, res) {
      const filters = req.validQuery as ProductInventoryListFilters;
      const summaries = await service.listProductInventorySummaries(scopeOf(req), filters);
      res.status(200).json(summaries);
    },

    async getProductInventoryDetail(req, res) {
      const productId = req.params.productId as string;
      const filters = req.validQuery as ProductInventoryDetailFilters;
      const product = await service.getProductInventoryDetail(scopeOf(req), productId, filters);
      res.status(200).json(product);
    },
  };
}

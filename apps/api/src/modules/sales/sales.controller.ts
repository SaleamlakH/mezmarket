import type { Request, Response } from 'express';
import type { CreateSaleInput, SaleService } from './sales.types.js';
import type { Actor, Scope } from '../../shared/types/session.types.js';

export type SaleController = {
  createSale(req: Request, res: Response): Promise<void>;
  listSales(req: Request, res: Response): Promise<void>;
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

export function createSaleController(service: SaleService): SaleController {
  return {
    async createSale(req, res) {
      const sale = await service.createSale(actorOf(req), req.validBody as CreateSaleInput);
      res.status(201).json(sale);
    },

    async listSales(req, res) {
      const sales = await service.listSales(scopeOf(req));
      res.status(200).json(sales);
    },
  };
}

import type { Request, Response } from 'express';
import type { ProductScope, ProductService } from './products.types.js';

export type ProductController = {
  listProducts(req: Request, res: Response): Promise<void>;
  listProductUnits(req: Request, res: Response): Promise<void>;
};

export function createProductController(service: ProductService): ProductController {
  function scopeOf(req: Request): ProductScope {
    return {
      businessId: req.auth?.businessId as string,
      branchId: req.auth?.branchId as string,
    };
  }

  return {
    async listProducts(req, res) {
      const products = await service.listProducts(scopeOf(req));
      res.status(200).json(products);
    },

    async listProductUnits(req, res) {
      const productId = req.params.productId as string;
      const units = await service.listProductUnits(scopeOf(req), productId);
      res.status(200).json(units);
    },
  };
}

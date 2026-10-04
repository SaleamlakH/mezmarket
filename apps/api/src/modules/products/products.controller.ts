import type { Request, Response } from 'express';
import type { CreateProductInput, ProductService, ProductScope } from './products.types.js';

export type ProductController = {
  listProducts(req: Request, res: Response): Promise<void>;
  listProductUnits(req: Request, res: Response): Promise<void>;
  createProduct(req: Request, res: Response): Promise<void>;
  getProduct(req: Request, res: Response): Promise<void>;
};

export function createProductsController(service: ProductService): ProductController {
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

    async createProduct(req: Request, res: Response) {
      const product = await service.createProduct(
        req.auth?.businessId,
        req.auth?.branchId,
        req.validBody as CreateProductInput,
      );
      res.status(201).json(product);
    },

    async getProduct(req: Request, res: Response) {
      const productId = req.params.productId;
      const product = await service.getProduct(
        Array.isArray(productId) ? productId[0] : productId,
        req.auth?.businessId,
        req.auth?.branchId,
      );
      res.status(200).json(product);
    },
  };
}

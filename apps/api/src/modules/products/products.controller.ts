import type { Request, Response } from 'express';
import type { CreateProductInput, ProductService } from './products.types.js';

export type ProductController = {
  listProducts(req: Request, res: Response): Promise<void>;
  createProduct(req: Request, res: Response): Promise<void>;
  getProduct(req: Request, res: Response): Promise<void>;
};

export function createProductsController(service: ProductService): ProductController {
  return {
    async listProducts(req: Request, res: Response) {
      const products = await service.listProducts(req.auth?.businessId, req.auth?.branchId);
      res.status(200).json(products);
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

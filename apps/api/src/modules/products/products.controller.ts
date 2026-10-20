import type { Request, Response } from 'express';
import type {
  CreateProductInput,
  CreateProductUnitInput,
  ProductListFilters,
  ProductScope,
  ProductService,
  UpdateProductInput,
  UpdateProductUnitsInput,
} from './products.types.js';

export type ProductController = {
  listProducts(req: Request, res: Response): Promise<void>;
  listProductUnits(req: Request, res: Response): Promise<void>;
  createProduct(req: Request, res: Response): Promise<void>;
  createProductUnit(req: Request, res: Response): Promise<void>;
  getProduct(req: Request, res: Response): Promise<void>;
  updateProduct(req: Request, res: Response): Promise<void>;
  updateProductUnits(req: Request, res: Response): Promise<void>;
  setProductActive(req: Request, res: Response): Promise<void>;
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
      const products = await service.listProducts(
        scopeOf(req),
        req.validQuery as ProductListFilters,
      );
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

    async createProductUnit(req: Request, res: Response) {
      const unit = await service.createProductUnit(
        req.params.productId as string,
        req.auth?.businessId,
        req.auth?.branchId,
        req.validBody as CreateProductUnitInput,
      );
      res.status(201).json(unit);
    },

    async getProduct(req: Request, res: Response) {
      const product = await service.getProduct(
        req.params.productId as string,
        req.auth?.businessId,
        req.auth?.branchId,
      );
      res.status(200).json(product);
    },

    async updateProduct(req: Request, res: Response) {
      const product = await service.updateProduct(
        req.params.productId as string,
        req.auth?.businessId,
        req.auth?.branchId,
        req.validBody as UpdateProductInput,
      );
      res.status(200).json(product);
    },

    async updateProductUnits(req: Request, res: Response) {
      const result = await service.updateProductUnits(
        req.params.productId as string,
        req.auth?.businessId,
        req.auth?.branchId,
        req.validBody as UpdateProductUnitsInput,
      );
      res.status(200).json(result);
    },

    async setProductActive(req: Request, res: Response) {
      const { active } = req.validBody as { active: boolean };
      const product = await service.setProductActive(
        req.params.productId as string,
        req.auth?.businessId,
        req.auth?.branchId,
        active,
      );
      res.status(200).json(product);
    },
  };
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createProductsController } from '../products.controller.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import type { ProductService } from '../products.types.js';

function mockService(): ProductService {
  return {
    listProducts: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    resolveUploadId: vi.fn(),
    resolveUploadIds: vi.fn(),
  };
}

function mockRes() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    auth: { ownerId: 'owner-1', businessId: 'b-1', branchId: 'br-1' },
    ...overrides,
  } as unknown as Request;
}

describe('products.controller', () => {
  let service: ProductService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService();
  });

  describe('listProducts', () => {
    it('returns 200 with the products from the service', async () => {
      const controller = createProductsController(service);
      const products = [{ id: 'p-1' }];
      vi.mocked(service.listProducts).mockResolvedValue(products as never);
      const res = mockRes();

      await controller.listProducts(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ products });
    });

    it('passes the business and branch ids to the service', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.listProducts).mockResolvedValue([] as never);

      await controller.listProducts(mockReq(), mockRes());

      expect(service.listProducts).toHaveBeenCalledWith('b-1', 'br-1');
    });

    it('propagates service errors', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.listProducts).mockRejectedValue(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );

      await expect(controller.listProducts(mockReq(), mockRes())).rejects.toThrow(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );
    });
  });

  describe('createProduct', () => {
    it('returns 201 with the created product', async () => {
      const controller = createProductsController(service);
      const product = { id: 'p-1', units: [{ id: 'pu-1' }] };
      vi.mocked(service.createProduct).mockResolvedValue(product as never);
      const res = mockRes();

      await controller.createProduct(
        mockReq({ body: { name: 'Sugar', baseUnit: { unitId: 'kg-1', price: '50' } } }),
        res,
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(product);
    });

    it('passes the ids and body to the service', async () => {
      const controller = createProductsController(service);
      const body = { name: 'Sugar', baseUnit: { unitId: 'kg-1', price: '50' } };
      vi.mocked(service.createProduct).mockResolvedValue({ as: 'product' } as never);

      await controller.createProduct(mockReq({ body }), mockRes());

      expect(service.createProduct).toHaveBeenCalledWith('b-1', 'br-1', body);
    });

    it('propagates service errors', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.createProduct).mockRejectedValue(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Bad request', 400),
      );

      await expect(
        controller.createProduct(
          mockReq({ body: { name: 'Sugar', baseUnit: { unitId: 'kg-1', price: '50' } } }),
          mockRes(),
        ),
      ).rejects.toThrow(new AppError(ERROR_CODES.BAD_REQUEST, 'Bad request', 400));
    });
  });

  describe('getProduct', () => {
    it('returns 200 with the product detail', async () => {
      const controller = createProductsController(service);
      const product = { id: 'p-1' };
      vi.mocked(service.getProduct).mockResolvedValue(product as never);
      const res = mockRes();

      await controller.getProduct(mockReq({ params: { productId: 'p-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(product);
    });

    it('passes the product id from params', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.getProduct).mockResolvedValue({ id: 'p-1' } as never);

      await controller.getProduct(mockReq({ params: { productId: 'p-1' } }), mockRes());

      expect(service.getProduct).toHaveBeenCalledWith('p-1', 'b-1', 'br-1');
    });

    it('propagates service errors', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.getProduct).mockRejectedValue(
        new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404),
      );

      await expect(
        controller.getProduct(mockReq({ params: { productId: 'p-1' } }), mockRes()),
      ).rejects.toThrow(new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404));
    });
  });
});

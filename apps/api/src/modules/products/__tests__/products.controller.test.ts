import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createProductsController } from '../products.controller.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import type { ProductService } from '../products.types.js';

function mockService(): ProductService {
  return {
    listProducts: vi.fn(),
    listProductUnits: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    createProductUnit: vi.fn(),
    updateProduct: vi.fn(),
    updateProductUnits: vi.fn(),
    setProductActive: vi.fn(),
    resolveUploadId: vi.fn(),
    resolveUploadTarget: vi.fn(),
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
    it('returns 200 with the summaries the service listed', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.listProducts).mockResolvedValue([] as never);
      const res = mockRes();

      await controller.listProducts(mockReq({ validQuery: { status: 'all' } }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('lists the business and branch the authorize middleware resolved', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.listProducts).mockResolvedValue([] as never);

      await controller.listProducts(mockReq({ validQuery: { status: 'all' } }), mockRes());

      expect(service.listProducts).toHaveBeenCalledWith(
        { businessId: 'b-1', branchId: 'br-1' },
        { status: 'all' },
      );
    });

    it('passes the validated filters to the service', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.listProducts).mockResolvedValue([] as never);

      await controller.listProducts(mockReq({ validQuery: { status: 'inactive' } }), mockRes());

      expect(service.listProducts).toHaveBeenCalledWith(
        { businessId: 'b-1', branchId: 'br-1' },
        { status: 'inactive' },
      );
    });

    it('takes the scope from the request rather than the url', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.listProducts).mockResolvedValue([] as never);

      await controller.listProducts(
        mockReq({
          params: { businessId: 'someone-elses-business' },
          validQuery: { status: 'all' },
        }),
        mockRes(),
      );

      expect(service.listProducts).toHaveBeenCalledWith(
        { businessId: 'b-1', branchId: 'br-1' },
        { status: 'all' },
      );
    });

    it('propagates service errors', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.listProducts).mockRejectedValue(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );

      await expect(
        controller.listProducts(mockReq({ validQuery: { status: 'all' } }), mockRes()),
      ).rejects.toMatchObject({
        code: ERROR_CODES.UNAUTHORIZED,
        statusCode: 401,
        message: expect.any(String),
      });
    });
  });

  describe('listProductUnits', () => {
    it('returns 200 with the units the service listed', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.listProductUnits).mockResolvedValue([] as never);
      const res = mockRes();

      await controller.listProductUnits(mockReq({ params: { productId: 'p-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('passes the product id from the path and the resolved scope', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.listProductUnits).mockResolvedValue([] as never);

      await controller.listProductUnits(mockReq({ params: { productId: 'p-1' } }), mockRes());

      expect(service.listProductUnits).toHaveBeenCalledWith(
        { businessId: 'b-1', branchId: 'br-1' },
        'p-1',
      );
    });

    it('propagates service errors', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.listProductUnits).mockRejectedValue(new Error('db down'));

      await expect(
        controller.listProductUnits(mockReq({ params: { productId: 'p-1' } }), mockRes()),
      ).rejects.toThrow();
    });
  });

  describe('createProduct', () => {
    it('returns 201 with the created product', async () => {
      const controller = createProductsController(service);
      const product = { id: 'p-1', units: [{ id: 'pu-1' }] };
      vi.mocked(service.createProduct).mockResolvedValue(product as never);
      const res = mockRes();

      await controller.createProduct(
        mockReq({ validBody: { name: 'Sugar', baseUnit: { unitId: 'kg-1', price: 50 } } }),
        res,
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(product);
    });

    it('passes the ids and validated body to the service', async () => {
      const controller = createProductsController(service);
      const validBody = { name: 'Sugar', baseUnit: { unitId: 'kg-1', price: 50 } };
      vi.mocked(service.createProduct).mockResolvedValue({ as: 'product' } as never);

      await controller.createProduct(mockReq({ validBody }), mockRes());

      expect(service.createProduct).toHaveBeenCalledWith('b-1', 'br-1', validBody);
    });

    it('propagates service errors', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.createProduct).mockRejectedValue(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Bad request', 400),
      );

      await expect(
        controller.createProduct(
          mockReq({ validBody: { name: 'Sugar', baseUnit: { unitId: 'kg-1', price: 50 } } }),
          mockRes(),
        ),
      ).rejects.toMatchObject({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        message: expect.any(String),
      });
    });
  });

  describe('createProductUnit', () => {
    it('returns 201 with the product carrying the created unit', async () => {
      const controller = createProductsController(service);
      const product = { id: 'p-1', units: [{ id: 'pu-2', name: 'Shot' }] };
      vi.mocked(service.createProductUnit).mockResolvedValue(product as never);
      const res = mockRes();

      await controller.createProductUnit(
        mockReq({ params: { productId: 'p-1' }, validBody: { name: 'Shot' } }),
        res,
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(product);
    });

    it('passes the product id, ids and validated body to the service', async () => {
      const controller = createProductsController(service);
      const validBody = { name: 'Shot', dependsOn: 'BASE', conversionRate: 25 };
      vi.mocked(service.createProductUnit).mockResolvedValue({ id: 'pu-2' } as never);

      await controller.createProductUnit(
        mockReq({ params: { productId: 'p-1' }, validBody }),
        mockRes(),
      );

      expect(service.createProductUnit).toHaveBeenCalledWith('p-1', 'b-1', 'br-1', validBody);
    });

    it('propagates service errors', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.createProductUnit).mockRejectedValue(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400),
      );

      await expect(
        controller.createProductUnit(
          mockReq({ params: { productId: 'p-1' }, validBody: { name: 'Shot' } }),
          mockRes(),
        ),
      ).rejects.toMatchObject({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        message: expect.any(String),
      });
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
      ).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
        message: expect.any(String),
      });
    });
  });

  describe('updateProduct', () => {
    it('returns 200 with the updated product', async () => {
      const controller = createProductsController(service);
      const product = { id: 'p-1', units: [] };
      vi.mocked(service.updateProduct).mockResolvedValue(product as never);
      const res = mockRes();

      await controller.updateProduct(
        mockReq({ params: { productId: 'p-1' }, validBody: { name: 'Brown Sugar' } }),
        res,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(product);
    });

    it('passes the product id, ids and validated body to the service', async () => {
      const controller = createProductsController(service);
      const validBody = { brand: 'Acme' };
      vi.mocked(service.updateProduct).mockResolvedValue({ id: 'p-1' } as never);

      await controller.updateProduct(
        mockReq({ params: { productId: 'p-1' }, validBody }),
        mockRes(),
      );

      expect(service.updateProduct).toHaveBeenCalledWith('p-1', 'b-1', 'br-1', validBody);
    });

    it('propagates service errors', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.updateProduct).mockRejectedValue(
        new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404),
      );

      await expect(
        controller.updateProduct(
          mockReq({ params: { productId: 'p-1' }, validBody: { name: 'Sugar' } }),
          mockRes(),
        ),
      ).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
        message: expect.any(String),
      });
    });
  });

  describe('updateProductUnits', () => {
    it('returns 200 with the updated product', async () => {
      const controller = createProductsController(service);
      const units = [{ id: 'pu-1', price: 80 }];
      const product = { id: 'p-1', units };
      vi.mocked(service.updateProductUnits).mockResolvedValue(product as never);
      const res = mockRes();

      await controller.updateProductUnits(
        mockReq({ params: { productId: 'p-1' }, validBody: { units } }),
        res,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(product);
    });

    it('passes the product id, ids and validated body to the service', async () => {
      const controller = createProductsController(service);
      const validBody = { units: [{ unitRole: 'BASE', id: 'pu-1', price: 80 }] };
      vi.mocked(service.updateProductUnits).mockResolvedValue({ id: 'p-1', units: [] } as never);

      await controller.updateProductUnits(
        mockReq({ params: { productId: 'p-1' }, validBody }),
        mockRes(),
      );

      expect(service.updateProductUnits).toHaveBeenCalledWith('p-1', 'b-1', 'br-1', validBody);
    });

    it('propagates service errors', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.updateProductUnits).mockRejectedValue(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400),
      );

      await expect(
        controller.updateProductUnits(
          mockReq({ params: { productId: 'p-1' }, validBody: { units: [] } }),
          mockRes(),
        ),
      ).rejects.toMatchObject({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        message: expect.any(String),
      });
    });
  });

  describe('setProductActive', () => {
    it('returns 200 with the updated product', async () => {
      const controller = createProductsController(service);
      const product = { id: 'p-1', active: false, units: [] };
      vi.mocked(service.setProductActive).mockResolvedValue(product as never);
      const res = mockRes();

      await controller.setProductActive(
        mockReq({ params: { productId: 'p-1' }, validBody: { active: false } }),
        res,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(product);
    });

    it('passes the product id, ids and the flag to the service', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.setProductActive).mockResolvedValue({ id: 'p-1' } as never);

      await controller.setProductActive(
        mockReq({ params: { productId: 'p-1' }, validBody: { active: true } }),
        mockRes(),
      );

      expect(service.setProductActive).toHaveBeenCalledWith('p-1', 'b-1', 'br-1', true);
    });

    it('propagates service errors', async () => {
      const controller = createProductsController(service);
      vi.mocked(service.setProductActive).mockRejectedValue(
        new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404),
      );

      await expect(
        controller.setProductActive(
          mockReq({ params: { productId: 'p-1' }, validBody: { active: false } }),
          mockRes(),
        ),
      ).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
        message: expect.any(String),
      });
    });
  });
});

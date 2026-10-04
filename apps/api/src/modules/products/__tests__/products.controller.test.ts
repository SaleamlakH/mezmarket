import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createProductController } from '../products.controller.js';
import type { ProductService } from '../products.types.js';

const AUTH = {
  ownerId: 'owner-1',
  businessId: 'b-1',
  branchId: 'br-1',
  memberId: 'm-1',
  role: 'CASHIER',
} as const;

function mockService(): ProductService {
  return { listProducts: vi.fn(), listProductUnits: vi.fn() };
}

describe('products.controller', () => {
  let service: ProductService;
  let controller: ReturnType<typeof createProductController>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService();
    controller = createProductController(service);
  });

  function call(auth: Request['auth'] | undefined, params: Record<string, string> = {}) {
    const req = { auth, params } as unknown as Request;
    const res = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    return { req, res };
  }

  describe('listProducts', () => {
    it('answers 200 with the products the service listed', async () => {
      vi.mocked(service.listProducts).mockResolvedValue([]);
      const { req, res } = call(AUTH);

      await controller.listProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('lists the business and branch the authorize middleware resolved', async () => {
      vi.mocked(service.listProducts).mockResolvedValue([]);
      const { req, res } = call(AUTH);

      await controller.listProducts(req, res);

      expect(service.listProducts).toHaveBeenCalledWith({ businessId: 'b-1', branchId: 'br-1' });
    });

    it('takes the scope from the request rather than the url', async () => {
      vi.mocked(service.listProducts).mockResolvedValue([]);
      const { req, res } = call(AUTH, { businessId: 'someone-elses-business' });

      await controller.listProducts(req, res);

      expect(service.listProducts).toHaveBeenCalledWith({
        businessId: 'b-1',
        branchId: 'br-1',
      });
    });

    it('lets a rejected service call propagate to the error handler', async () => {
      vi.mocked(service.listProducts).mockRejectedValue(new Error('db down'));
      const { req, res } = call(AUTH);

      await expect(controller.listProducts(req, res)).rejects.toThrow('db down');
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('listProductUnits', () => {
    it('answers 200 with the units the service listed', async () => {
      vi.mocked(service.listProductUnits).mockResolvedValue([]);
      const { req, res } = call(AUTH, { productId: 'p-1' });

      await controller.listProductUnits(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('passes the product id from the path and the resolved scope', async () => {
      vi.mocked(service.listProductUnits).mockResolvedValue([]);
      const { req, res } = call(AUTH, { productId: 'p-1' });

      await controller.listProductUnits(req, res);

      expect(service.listProductUnits).toHaveBeenCalledWith(
        { businessId: 'b-1', branchId: 'br-1' },
        'p-1',
      );
    });

    it('lets a rejected service call propagate to the error handler', async () => {
      vi.mocked(service.listProductUnits).mockRejectedValue(new Error('db down'));
      const { req, res } = call(AUTH, { productId: 'p-1' });

      await expect(controller.listProductUnits(req, res)).rejects.toThrow('db down');
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});

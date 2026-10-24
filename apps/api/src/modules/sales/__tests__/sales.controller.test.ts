import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createSaleController } from '../sales.controller.js';
import type { CreateSaleInput, SaleService } from '../sales.types.js';

const AUTH = {
  ownerId: 'owner-1',
  businessId: 'b-1',
  branchId: 'br-1',
  memberId: 'm-1',
  role: 'OWNER',
} as const;

function input(): CreateSaleInput {
  return {
    lines: [{ productId: 'p-tequila', productUnitId: 'pu-bottle', quantity: 2 }],
  };
}

const CREATED = { id: 'sale-1', lines: [{ id: 'sl-1' }] };

function mockService(): SaleService {
  return {
    getSale: vi.fn(),
    createSale: vi.fn(),
    recordPayment: vi.fn(),
    listSales: vi.fn(),
  };
}

describe('sales.controller', () => {
  let service: SaleService;
  let controller: ReturnType<typeof createSaleController>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService();
    controller = createSaleController(service);
  });

  function call(
    auth: Partial<Request['auth']> | undefined,
    validBody?: unknown,
    params: Request['params'] = {},
    validQuery?: unknown,
  ) {
    const req = { auth, validBody, params, validQuery } as unknown as Request;
    const res = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    return { req, res };
  }

  describe('getSale', () => {
    it('answers 200 with the sale the service read', async () => {
      vi.mocked(service.getSale).mockResolvedValue(CREATED as never);
      const { req, res } = call(AUTH, undefined, { saleId: 'sale-1' });

      await controller.getSale(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(CREATED);
    });

    it('hands the service the resolved scope and the sale id from the route', async () => {
      vi.mocked(service.getSale).mockResolvedValue(CREATED as never);
      const { req, res } = call(AUTH, undefined, { saleId: 'sale-9' });

      await controller.getSale(req, res);

      expect(service.getSale).toHaveBeenCalledWith(
        { businessId: 'b-1', branchId: 'br-1', memberId: 'm-1' },
        'sale-9',
      );
    });

    it('lets a rejected service call propagate to the error handler', async () => {
      vi.mocked(service.getSale).mockRejectedValue(new Error('db down'));
      const { req, res } = call(AUTH, undefined, { saleId: 'sale-1' });

      await expect(controller.getSale(req, res)).rejects.toThrow('db down');
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('createSale', () => {
    it('answers 201 with the sale the service created', async () => {
      vi.mocked(service.createSale).mockResolvedValue(CREATED as never);
      const { req, res } = call(AUTH, input());

      await controller.createSale(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(CREATED);
    });

    it('hands the service the resolved scope and the body the validation middleware stored', async () => {
      vi.mocked(service.createSale).mockResolvedValue(CREATED as never);
      const { req, res } = call(AUTH, input());

      await controller.createSale(req, res);

      expect(service.createSale).toHaveBeenCalledWith(
        { businessId: 'b-1', branchId: 'br-1', memberId: 'm-1' },
        input(),
      );
    });

    it('lets a rejected service call propagate to the error handler', async () => {
      vi.mocked(service.createSale).mockRejectedValue(new Error('db down'));
      const { req, res } = call(AUTH, input());

      await expect(controller.createSale(req, res)).rejects.toThrow('db down');
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('recordPayment', () => {
    it('answers 201 with the sale the service recorded against', async () => {
      vi.mocked(service.recordPayment).mockResolvedValue(CREATED as never);
      const { req, res } = call(AUTH, { status: 'PAID' }, { saleId: 'sale-1' });

      await controller.recordPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(CREATED);
    });

    it('hands the service the scope, the sale id and the validated payment body', async () => {
      vi.mocked(service.recordPayment).mockResolvedValue(CREATED as never);
      const { req, res } = call(
        AUTH,
        { status: 'PARTIALLY_PAID', amount: 500 },
        { saleId: 'sale-9' },
      );

      await controller.recordPayment(req, res);

      expect(service.recordPayment).toHaveBeenCalledWith(
        { businessId: 'b-1', branchId: 'br-1', memberId: 'm-1' },
        'sale-9',
        { status: 'PARTIALLY_PAID', amount: 500 },
      );
    });

    it('lets a rejected service call propagate to the error handler', async () => {
      vi.mocked(service.recordPayment).mockRejectedValue(new Error('db down'));
      const { req, res } = call(AUTH, { status: 'PAID' }, { saleId: 'sale-1' });

      await expect(controller.recordPayment(req, res)).rejects.toThrow('db down');
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('listSales', () => {
    it('answers 200 with the sales the service listed', async () => {
      vi.mocked(service.listSales).mockResolvedValue([]);
      const { req, res } = call(AUTH);

      await controller.listSales(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('hands the service the resolved scope and the filters the middleware stored', async () => {
      vi.mocked(service.listSales).mockResolvedValue([]);
      const filters = { status: ['PENDING'] as const, unpaid: true };
      const { req, res } = call(AUTH, undefined, {}, filters);

      await controller.listSales(req, res);

      expect(service.listSales).toHaveBeenCalledWith(
        { businessId: 'b-1', branchId: 'br-1' },
        filters,
      );
    });

    it('lets a rejected service call propagate to the error handler', async () => {
      vi.mocked(service.listSales).mockRejectedValue(new Error('db down'));
      const { req, res } = call(AUTH);

      await expect(controller.listSales(req, res)).rejects.toThrow('db down');
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});

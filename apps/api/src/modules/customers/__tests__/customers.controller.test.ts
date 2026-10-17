import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createCustomersController } from '../customers.controller.js';
import type { CustomerService } from '../customers.types.js';
import type { CreateCustomerInput } from '@mez/types';

const AUTH = {
  ownerId: 'owner-1',
  businessId: 'b-1',
  branchId: 'br-1',
  memberId: 'm-1',
  role: 'CASHIER',
} as const;

const CREATED = { id: 'cust-1', name: 'Abebe' };

function mockService(): CustomerService {
  return {
    listCustomers: vi.fn(),
    createCustomer: vi.fn(),
  };
}

describe('customers.controller', () => {
  let service: CustomerService;
  let controller: ReturnType<typeof createCustomersController>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService();
    controller = createCustomersController(service);
  });

  function call(auth: Partial<Request['auth']> | undefined, validBody?: unknown) {
    const req = { auth, validBody } as unknown as Request;
    const res = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    return { req, res };
  }

  describe('listCustomers', () => {
    it('answers 200 with the customers the service listed', async () => {
      vi.mocked(service.listCustomers).mockResolvedValue([]);
      const { req, res } = call(AUTH);

      await controller.listCustomers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('lists the resolved business', async () => {
      vi.mocked(service.listCustomers).mockResolvedValue([]);
      const { req, res } = call(AUTH);

      await controller.listCustomers(req, res);

      expect(service.listCustomers).toHaveBeenCalledWith('b-1');
    });

    it('lets a rejected service call propagate to the error handler', async () => {
      vi.mocked(service.listCustomers).mockRejectedValue(new Error('db down'));
      const { req, res } = call(AUTH);

      await expect(controller.listCustomers(req, res)).rejects.toThrow('db down');
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('createCustomer', () => {
    it('answers 201 with the customer the service created', async () => {
      vi.mocked(service.createCustomer).mockResolvedValue(CREATED as never);
      const { req, res } = call(AUTH, { name: 'Abebe' });

      await controller.createCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(CREATED);
    });

    it('hands the service the resolved business and the validated body', async () => {
      vi.mocked(service.createCustomer).mockResolvedValue(CREATED as never);
      const body: CreateCustomerInput = { name: 'Abebe', contactPhone: '0911' };
      const { req, res } = call(AUTH, body);

      await controller.createCustomer(req, res);

      expect(service.createCustomer).toHaveBeenCalledWith('b-1', body);
    });

    it('lets a rejected service call propagate to the error handler', async () => {
      vi.mocked(service.createCustomer).mockRejectedValue(new Error('db down'));
      const { req, res } = call(AUTH, { name: 'Abebe' });

      await expect(controller.createCustomer(req, res)).rejects.toThrow('db down');
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});

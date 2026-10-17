import type { Request, Response } from 'express';
import type { CreateCustomerInput } from '@mez/types';
import type { CustomerService } from './customers.types.js';

export type CustomerController = {
  listCustomers(req: Request, res: Response): Promise<void>;
  createCustomer(req: Request, res: Response): Promise<void>;
};

export function createCustomersController(service: CustomerService): CustomerController {
  return {
    async listCustomers(req, res) {
      const customers = await service.listCustomers(req.auth?.businessId as string);
      res.status(200).json(customers);
    },

    async createCustomer(req, res) {
      const customer = await service.createCustomer(
        req.auth?.businessId as string,
        req.validBody as CreateCustomerInput,
      );
      res.status(201).json(customer);
    },
  };
}

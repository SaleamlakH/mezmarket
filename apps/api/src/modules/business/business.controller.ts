import type { Request, Response } from 'express';
import type { BusinessService, CreateBusinessInput } from './business.types.js';

export type BusinessController = {
  listBusinesses(req: Request, res: Response): Promise<void>;
  createBusiness(req: Request, res: Response): Promise<void>;
};

export function createBusinessController(service: BusinessService): BusinessController {
  return {
    async listBusinesses(req: Request, res: Response) {
      const businesses = await service.getBusinesses(req.auth?.ownerId);
      res.status(200).json({ businesses });
    },

    async createBusiness(req: Request, res: Response) {
      const input = res.locals.validated as CreateBusinessInput;
      const result = await service.createBusiness(req.auth?.ownerId, input);
      res.status(201).json(result);
    },
  };
}

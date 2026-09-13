import type { Request, Response } from 'express';
import type {
  BusinessService,
  CreateBusinessInput,
  UpdateBusinessInput,
} from './business.types.js';

export type BusinessController = {
  listBusinesses(req: Request, res: Response): Promise<void>;
  createBusiness(req: Request, res: Response): Promise<void>;
  getBusiness(req: Request, res: Response): Promise<void>;
  updateBusiness(req: Request, res: Response): Promise<void>;
};

export function createBusinessController(service: BusinessService): BusinessController {
  return {
    async listBusinesses(req: Request, res: Response) {
      const businesses = await service.getBusinesses(req.auth?.ownerId);
      res.status(200).json({ businesses });
    },

    async createBusiness(req: Request, res: Response) {
      const input = req.validBody as CreateBusinessInput;
      const result = await service.createBusiness(req.auth?.ownerId, input);
      res.status(201).json(result);
    },

    async getBusiness(req: Request, res: Response) {
      const businessId = req.params.businessId as string;
      const business = await service.getBusiness(businessId, req.auth?.ownerId);
      res.status(200).json({ business });
    },

    async updateBusiness(req: Request, res: Response) {
      const businessId = req.params.businessId as string;
      const input = req.body as UpdateBusinessInput;
      const business = await service.updateBusiness(businessId, req.auth?.ownerId, input);
      res.status(200).json({ business });
    },
  };
}

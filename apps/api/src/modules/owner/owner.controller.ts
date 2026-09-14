import type { Request, Response } from 'express';
import type { OwnerService, UpdateOwnerInput } from './owner.types.js';

export type OwnerController = {
  getOwner(req: Request, res: Response): Promise<void>;
  updateOwner(req: Request, res: Response): Promise<void>;
};

export function createOwnerController(ownerService: OwnerService): OwnerController {
  return {
    async getOwner(req: Request, res: Response) {
      const ownerId = req.auth?.ownerId;
      const owner = await ownerService.getOwner(ownerId);
      res.json(owner);
    },

    async updateOwner(req: Request, res: Response) {
      const ownerId = req.auth?.ownerId;
      const input = req.validBody as UpdateOwnerInput;
      const owner = await ownerService.updateOwner(ownerId, input);
      res.json(owner);
    },
  };
}

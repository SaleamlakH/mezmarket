import type { Request, Response } from 'express';
import type { UnitService } from './units.types.js';

export type UnitController = {
  listUnits(req: Request, res: Response): Promise<void>;
};

export function createUnitsController(service: UnitService): UnitController {
  return {
    async listUnits(_req: Request, res: Response) {
      const dimensions = await service.listUnits();
      res.status(200).json({ dimensions });
    },
  };
}

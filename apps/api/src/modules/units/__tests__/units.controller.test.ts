import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createUnitsController } from '../units.controller.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import type { UnitService } from '../units.types.js';

function mockService(): UnitService {
  return {
    listUnits: vi.fn(),
  };
}

function mockRes() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function mockReq(): Request {
  return {} as Request;
}

describe('units.controller', () => {
  let service: UnitService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService();
  });

  describe('listUnits', () => {
    it('returns 200 with the dimensions from the service', async () => {
      const controller = createUnitsController(service);
      const dimensions = [
        {
          id: 'd-1',
          name: 'Weight',
          units: [{ id: 'kg-1', ratioToReferenceUnit: 1 }],
        },
      ];
      vi.mocked(service.listUnits).mockResolvedValue(dimensions as never);
      const res = mockRes();

      await controller.listUnits(mockReq(), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ dimensions });
    });

    it('propagates service errors', async () => {
      const controller = createUnitsController(service);
      vi.mocked(service.listUnits).mockRejectedValue(
        new AppError(ERROR_CODES.INTERNAL_ERROR, 'Internal error', 500),
      );

      await expect(controller.listUnits(mockReq(), mockRes())).rejects.toThrow(
        new AppError(ERROR_CODES.INTERNAL_ERROR, 'Internal error', 500),
      );
    });
  });
});

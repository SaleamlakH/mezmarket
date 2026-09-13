import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createBusinessController } from '../business.controller.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';
import type { BusinessService, UpdateBusinessInput } from '../business.types.js';

function mockService(): BusinessService {
  return {
    getBusinesses: vi.fn(),
    createBusiness: vi.fn(),
    resolveScope: vi.fn(),
  };
}

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    locals: {},
  } as unknown as Response;
}

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    auth: { ownerId: 'owner-1' },
    params: { businessId: 'b-1' },
    body: {},
    ...overrides,
  } as unknown as Request;
}

describe('business.controller', () => {
  let service: BusinessService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService();
  });

  describe('GET /businesses', () => {
    it('returns 200 with the businesses from the service', async () => {
      const controller = createBusinessController(service);
      const businesses = [{ id: 'b-1' }];
      const res = mockRes();
      vi.mocked(service.getBusinesses).mockResolvedValue(businesses as never);

      await controller.listBusinesses(mockReq(), res);

      expect(service.getBusinesses).toHaveBeenCalledWith('owner-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ businesses });
    });

    it('throws when the service fails', async () => {
      const controller = createBusinessController(service);
      vi.mocked(service.getBusinesses).mockRejectedValue(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );

      await expect(controller.listBusinesses(mockReq(), mockRes())).rejects.toThrow(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );
    });
  });

  describe('POST /businesses', () => {
    it('returns 201 with the service result', async () => {
      const controller = createBusinessController(service);
      const result = { business: {}, branch: {}, member: {} };
      const res = mockRes();
      res.locals.validated = { name: 'Test', currencyCode: 'USD' };
      vi.mocked(service.createBusiness).mockResolvedValue(result as never);

      await controller.createBusiness(mockReq(), res);

      expect(service.createBusiness).toHaveBeenCalledWith('owner-1', {
        name: 'Test',
        currencyCode: 'USD',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it('throws when the service fails', async () => {
      const controller = createBusinessController(service);
      const res = mockRes();
      res.locals.validated = { name: 'Test', currencyCode: 'USD' };
      vi.mocked(service.createBusiness).mockRejectedValue(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );

      await expect(controller.createBusiness(mockReq(), res)).rejects.toThrow(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );
    });
  });

  describe('GET /businesses/:businessId', () => {
    it('returns 200 with the business from the service', async () => {
      const controller = createBusinessController(service);
      const business = { id: 'b-1', name: 'Shop' };
      const res = mockRes();
      const req = mockReq();
      vi.mocked(service.getBusiness).mockResolvedValue(business as never);

      await controller.getBusiness(req, res);

      expect(service.getBusiness).toHaveBeenCalledWith('b-1', 'owner-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ business });
    });

    it('throws when the business is not found or not owned', async () => {
      const controller = createBusinessController(service);
      vi.mocked(service.getBusiness).mockRejectedValue(
        new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404),
      );

      await expect(controller.getBusiness(mockReq(), mockRes())).rejects.toThrow(
        new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404),
      );
    });
  });

  describe('PUT /businesses/:businessId', () => {
    function input(): UpdateBusinessInput {
      return {
        name: 'Shop v2',
        currencyCode: 'USD',
        defaultTaxRate: 15,
        taxDisplayMode: 'INCLUSIVE',
        allowNegativeStock: false,
        lowStockDefaultThreshold: 10,
      };
    }

    it('returns 200 with the updated business', async () => {
      const controller = createBusinessController(service);
      const updated = { id: 'b-1', ...input() };
      const res = mockRes();
      const req = mockReq({ body: input() });
      vi.mocked(service.updateBusiness).mockResolvedValue(updated as never);

      await controller.updateBusiness(req, res);

      expect(service.updateBusiness).toHaveBeenCalledWith('b-1', 'owner-1', input());
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ business: updated });
    });

    it('throws when the business is not found or not owned', async () => {
      const controller = createBusinessController(service);
      vi.mocked(service.updateBusiness).mockRejectedValue(
        new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404),
      );

      await expect(controller.updateBusiness(mockReq(), mockRes())).rejects.toThrow(
        new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404),
      );
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Request, Response } from 'express';
import { createBusinessController } from '../business.controller.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';
import type { BusinessService } from '../business.types.js';

function mockService(): BusinessService {
  return {
    getBusinesses: vi.fn(),
    createBusiness: vi.fn(),
  };
}

function createApp(service: BusinessService, ownerId?: string) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (ownerId) {
      req.auth = { ownerId };
    }
    next();
  });
  const controller = createBusinessController(service);
  app.get('/businesses', controller.listBusinesses);
  app.post(
    '/businesses',
    (req, res, next) => {
      res.locals.validated = req.body;
      next();
    },
    controller.createBusiness,
  );
  return app;
}

describe('business.controller', () => {
  let service: BusinessService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService();
  });

  describe('GET /businesses', () => {
    it('returns 200 with the businesses from the service', async () => {
      const app = createApp(service, 'owner-1');
      const businesses = [{ id: 'b-1' }];
      vi.mocked(service.getBusinesses).mockResolvedValue(businesses as never);

      const res = await request(app).get('/businesses');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ businesses });
    });

    it('throws when the service fails', async () => {
      const controller = createBusinessController(service);
      vi.mocked(service.getBusinesses).mockRejectedValue(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );

      await expect(
        controller.listBusinesses({ auth: { ownerId: 'owner-1' } } as Request, {} as Response),
      ).rejects.toThrow(new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401));
    });
  });

  describe('POST /businesses', () => {
    it('returns 201 with the service result', async () => {
      const app = createApp(service, 'owner-1');
      const result = { business: {}, branch: {}, member: {} };
      vi.mocked(service.createBusiness).mockResolvedValue(result as never);

      const res = await request(app)
        .post('/businesses')
        .send({ name: 'Test', currencyCode: 'USD' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(result);
    });

    it('throws when the service fails', async () => {
      const controller = createBusinessController(service);
      vi.mocked(service.createBusiness).mockRejectedValue(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );

      await expect(
        controller.createBusiness(
          { auth: { ownerId: 'owner-1' } } as Request,
          { locals: { validated: { name: 'Test', currencyCode: 'USD' } } } as unknown as Response,
        ),
      ).rejects.toThrow(new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401));
    });
  });
});

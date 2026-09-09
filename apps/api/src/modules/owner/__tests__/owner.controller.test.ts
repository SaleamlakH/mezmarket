import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createOwnerController } from '../owner.controller.js';
import type { OwnerService, Owner } from '../owner.types.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';

function mockOwnerService(): OwnerService {
  return {
    getOwner: vi.fn(),
    updateOwner: vi.fn(),
  };
}

function mockRes() {
  return {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  };
}

function mockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return { auth: { ownerId: 'owner-1' }, body: {}, ...overrides };
}

function makeOwner(overrides: Partial<Owner> = {}): Owner {
  return {
    id: 'owner-1',
    name: 'John Doe',
    contactEmail: 'john@example.com',
    contactPhone: '+1234567890',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  };
}

describe('owner.controller', () => {
  let service: OwnerService;
  let controller: ReturnType<typeof createOwnerController>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockOwnerService();
    controller = createOwnerController(service);
  });

  describe('getOwner', () => {
    it('returns the owner', async () => {
      const expected = makeOwner();
      vi.mocked(service.getOwner).mockResolvedValue(expected);

      const req = mockReq() as Request;
      const res = mockRes() as unknown as Response;

      await controller.getOwner(req, res);

      expect(service.getOwner).toHaveBeenCalledWith('owner-1');
      expect(res.json).toHaveBeenCalledWith(expected);
    });

    it('throws (forwards) the error when the service rejects', async () => {
      const error = new AppError(ERROR_CODES.NOT_FOUND, 'Owner not found', 404);
      vi.mocked(service.getOwner).mockRejectedValue(error);

      const req = mockReq({ auth: { ownerId: 'missing' } }) as Request;
      const res = mockRes() as unknown as Response;

      await expect(controller.getOwner(req, res)).rejects.toThrow(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('updateOwner', () => {
    it('updates and returns the owner', async () => {
      const updated = makeOwner({ name: 'Jane Doe' });
      vi.mocked(service.updateOwner).mockResolvedValue(updated);

      const req = mockReq({ body: { name: 'Jane Doe' } }) as Request;
      const res = mockRes() as unknown as Response;

      await controller.updateOwner(req, res);

      expect(service.updateOwner).toHaveBeenCalledWith('owner-1', { name: 'Jane Doe' });
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('throws (forwards) the error when the service rejects', async () => {
      const error = new AppError(ERROR_CODES.NOT_FOUND, 'Owner not found', 404);
      vi.mocked(service.updateOwner).mockRejectedValue(error);

      const req = mockReq({ auth: { ownerId: 'missing' }, body: { name: 'Jane Doe' } }) as Request;
      const res = mockRes() as unknown as Response;

      await expect(controller.updateOwner(req, res)).rejects.toThrow(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});

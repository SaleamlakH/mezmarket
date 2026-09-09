import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOwnerService } from '../owner.service.js';
import type { OwnerRepository, Owner } from '../owner.types.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';

function mockRepository(): OwnerRepository {
  return {
    findOwnerById: vi.fn(),
    updateOwner: vi.fn(),
  };
}

function owner(overrides: Partial<Owner> = {}): Owner {
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

describe('owner.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOwner', () => {
    it('returns the owner when found', async () => {
      const repo = mockRepository();
      const service = createOwnerService(repo);
      const expected = owner();

      vi.mocked(repo.findOwnerById).mockResolvedValue(expected);

      const result = await service.getOwner('owner-1');

      expect(result).toEqual(expected);
      expect(repo.findOwnerById).toHaveBeenCalledWith('owner-1');
    });

    it('throws NOT_FOUND when owner does not exist', async () => {
      const repo = mockRepository();
      const service = createOwnerService(repo);

      vi.mocked(repo.findOwnerById).mockResolvedValue(null);

      await expect(service.getOwner('nonexistent')).rejects.toThrow(AppError);
      await expect(service.getOwner('nonexistent')).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
      });
    });

    it('throws UNAUTHORIZED when owner id is missing', async () => {
      const repo = mockRepository();
      const service = createOwnerService(repo);

      await expect(service.getOwner(undefined)).rejects.toThrow(AppError);
      await expect(service.getOwner(undefined)).rejects.toMatchObject({
        code: ERROR_CODES.UNAUTHORIZED,
      });
      expect(repo.findOwnerById).not.toHaveBeenCalled();
    });
  });

  describe('updateOwner', () => {
    it('throws NOT_FOUND when owner does not exist', async () => {
      const repo = mockRepository();
      const service = createOwnerService(repo);

      vi.mocked(repo.findOwnerById).mockResolvedValue(null);

      await expect(service.updateOwner('nonexistent', { name: 'New Name' })).rejects.toThrow(
        AppError,
      );
      await expect(service.updateOwner('nonexistent', { name: 'New Name' })).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
      });
    });

    it('throws UNAUTHORIZED when owner id is missing', async () => {
      const repo = mockRepository();
      const service = createOwnerService(repo);

      await expect(service.updateOwner(undefined, { name: 'New Name' })).rejects.toThrow(AppError);
      await expect(service.updateOwner(undefined, { name: 'New Name' })).rejects.toMatchObject({
        code: ERROR_CODES.UNAUTHORIZED,
      });
      expect(repo.findOwnerById).not.toHaveBeenCalled();
    });

    it('updates and returns the owner', async () => {
      const repo = mockRepository();
      const service = createOwnerService(repo);
      const existing = owner();
      const updated = owner({ name: 'Jane Doe' });

      vi.mocked(repo.findOwnerById).mockResolvedValue(existing);
      vi.mocked(repo.updateOwner).mockResolvedValue(updated);

      const result = await service.updateOwner('owner-1', { name: 'Jane Doe' });

      expect(result).toEqual(updated);
      expect(repo.updateOwner).toHaveBeenCalledWith('owner-1', { name: 'Jane Doe' });
    });
  });
});

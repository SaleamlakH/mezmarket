import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOwnerRepository } from '../owner.repository.js';
import type { Owner } from '../owner.types.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

function createPrismaStub() {
  const owner = { findUnique: vi.fn(), update: vi.fn() };
  const prisma = { owner } as unknown as PrismaClient;
  return { prisma, owner };
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

describe('owner.repository', () => {
  let prisma: PrismaClient;
  let owner: ReturnType<typeof createPrismaStub>['owner'];
  let repo: ReturnType<typeof createOwnerRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    const stub = createPrismaStub();
    prisma = stub.prisma;
    owner = stub.owner;
    repo = createOwnerRepository(prisma);
  });

  describe('factory', () => {
    it('returns the required repository functions', () => {
      expect(typeof repo.findOwnerById).toBe('function');
      expect(typeof repo.updateOwner).toBe('function');
    });
  });

  describe('findOwnerById', () => {
    it('calls owner.findUnique with the owner id', async () => {
      const expected = makeOwner();
      owner.findUnique.mockResolvedValue(expected);

      const result = await repo.findOwnerById('owner-1');

      expect(owner.findUnique).toHaveBeenCalledWith({ where: { id: 'owner-1' } });
      expect(result).toEqual(expected);
    });

    it('returns null when owner not found', async () => {
      owner.findUnique.mockResolvedValue(null);

      const result = await repo.findOwnerById('missing');

      expect(owner.findUnique).toHaveBeenCalledWith({ where: { id: 'missing' } });
      expect(result).toBeNull();
    });
  });

  describe('updateOwner', () => {
    it('calls owner.update with the owner id and data', async () => {
      const data = { name: 'Jane Doe' };
      const updated = makeOwner({ name: 'Jane Doe' });
      owner.update.mockResolvedValue(updated);

      const result = await repo.updateOwner('owner-1', data);

      expect(owner.update).toHaveBeenCalledWith({
        where: { id: 'owner-1' },
        data,
      });
      expect(result).toEqual(updated);
    });
  });
});

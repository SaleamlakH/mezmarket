import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMembersRepository } from '../members.repository.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

function createPrismaStub() {
  const businessMember = { findMany: vi.fn() };
  const prisma = { businessMember } as unknown as PrismaClient;
  return { prisma, businessMember };
}

function memberRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'srv-1',
    businessId: 'b-1',
    branchId: 'br-1',
    ownerId: null,
    name: 'Abebe',
    role: 'SERVER',
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('members.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('reads the branch active members by name', async () => {
      const { prisma, businessMember } = createPrismaStub();
      const repo = createMembersRepository(prisma);
      businessMember.findMany.mockResolvedValue([]);

      await repo.list('b-1', 'br-1', {});

      expect(businessMember.findMany).toHaveBeenCalledWith({
        where: { businessId: 'b-1', branchId: 'br-1', active: true },
        orderBy: { name: 'asc' },
      });
    });

    it('narrows the read to one role when a filter names one', async () => {
      const { prisma, businessMember } = createPrismaStub();
      const repo = createMembersRepository(prisma);
      businessMember.findMany.mockResolvedValue([]);

      await repo.list('b-1', 'br-1', { role: 'SERVER' });

      expect(businessMember.findMany).toHaveBeenCalledWith({
        where: { businessId: 'b-1', branchId: 'br-1', active: true, role: 'SERVER' },
        orderBy: { name: 'asc' },
      });
    });

    it('returns the member rows the query answered with', async () => {
      const { prisma, businessMember } = createPrismaStub();
      const repo = createMembersRepository(prisma);
      const rows = [memberRecord()];
      businessMember.findMany.mockResolvedValue(rows);

      await expect(repo.list('b-1', 'br-1', {})).resolves.toEqual(rows);
    });
  });
});

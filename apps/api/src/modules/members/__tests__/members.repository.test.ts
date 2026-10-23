import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMembersRepository } from '../members.repository.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

function createPrismaStub() {
  const businessMember = { findMany: vi.fn(), findFirst: vi.fn() };
  const sale = { aggregate: vi.fn(), count: vi.fn() };
  const payment = { aggregate: vi.fn() };
  const prisma = { businessMember, sale, payment } as unknown as PrismaClient;
  return { prisma, businessMember, sale, payment };
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

  describe('getMember', () => {
    it('reads one member inside the business and branch with no active filter', async () => {
      const { prisma, businessMember } = createPrismaStub();
      const repo = createMembersRepository(prisma);
      businessMember.findFirst.mockResolvedValue(memberRecord({ id: 'm-2' }));

      const result = await repo.getMember('b-1', 'br-1', 'm-2');

      expect(businessMember.findFirst).toHaveBeenCalledWith({
        where: { id: 'm-2', businessId: 'b-1', branchId: 'br-1' },
      });
      expect(result).toEqual(memberRecord({ id: 'm-2' }));
    });

    it('answers null when the member is outside the business or branch', async () => {
      const { prisma, businessMember } = createPrismaStub();
      const repo = createMembersRepository(prisma);
      businessMember.findFirst.mockResolvedValue(null);

      await expect(repo.getMember('b-1', 'br-1', 'other')).resolves.toBeNull();
    });
  });

  describe('memberSalesAggregate', () => {
    it('sums non-voided branch sales where the member processed or served', async () => {
      const { prisma, sale } = createPrismaStub();
      const repo = createMembersRepository(prisma);
      const total = { toNumber: () => 123.45 };
      sale.aggregate.mockResolvedValue({ _sum: { total }, _count: 3 });

      const result = await repo.memberSalesAggregate({
        branchId: 'br-1',
        memberId: 'm-2',
        from: new Date('2026-09-01T00:00:00.000Z'),
        to: new Date('2026-09-30T23:59:59.000Z'),
      });

      expect(sale.aggregate).toHaveBeenCalledWith({
        where: {
          branchId: 'br-1',
          voidStatus: { not: 'VOIDED' },
          saleDatetime: {
            gte: new Date('2026-09-01T00:00:00.000Z'),
            lte: new Date('2026-09-30T23:59:59.000Z'),
          },
          OR: [{ processedByMemberId: 'm-2' }, { serverMemberId: 'm-2' }],
        },
        _sum: { total: true },
        _count: true,
      });
      expect(result.total).toBe(total);
      expect(result.count).toBe(3);
    });

    it('counts each sale row once, however the member is attached', async () => {
      const { prisma, sale } = createPrismaStub();
      const repo = createMembersRepository(prisma);
      sale.aggregate.mockResolvedValue({ _sum: { total: null }, _count: 1 });

      const result = await repo.memberSalesAggregate({
        branchId: 'br-1',
        memberId: 'm-2',
        from: new Date('2026-09-01T00:00:00.000Z'),
        to: new Date('2026-09-30T23:59:59.000Z'),
      });

      expect(result).toEqual({ total: null, count: 1 });
    });
  });

  describe('memberCashAggregate', () => {
    it('sums the payments the member recorded on non-voided branch sales', async () => {
      const { prisma, payment } = createPrismaStub();
      const repo = createMembersRepository(prisma);
      const amount = { toNumber: () => 40 };
      payment.aggregate.mockResolvedValue({ _sum: { amount } });

      const result = await repo.memberCashAggregate({
        branchId: 'br-1',
        memberId: 'm-2',
        from: new Date('2026-09-01T00:00:00.000Z'),
        to: new Date('2026-09-30T23:59:59.000Z'),
      });

      expect(payment.aggregate).toHaveBeenCalledWith({
        where: {
          businessMemberId: 'm-2',
          paidAt: {
            gte: new Date('2026-09-01T00:00:00.000Z'),
            lte: new Date('2026-09-30T23:59:59.000Z'),
          },
          sale: { branchId: 'br-1', voidStatus: { not: 'VOIDED' } },
        },
        _sum: { amount: true },
      });
      expect(result).toBe(amount);
    });

    it('answers null when the member recorded no cash in the period', async () => {
      const { prisma, payment } = createPrismaStub();
      const repo = createMembersRepository(prisma);
      payment.aggregate.mockResolvedValue({ _sum: { amount: null } });

      await expect(
        repo.memberCashAggregate({
          branchId: 'br-1',
          memberId: 'm-2',
          from: new Date('2026-09-01T00:00:00.000Z'),
          to: new Date('2026-09-30T23:59:59.000Z'),
        }),
      ).resolves.toBeNull();
    });
  });

  describe('memberUnpaidCount', () => {
    it('counts the member period sales that still owe money', async () => {
      const { prisma, sale } = createPrismaStub();
      const repo = createMembersRepository(prisma);
      sale.count.mockResolvedValue(2);

      const result = await repo.memberUnpaidCount({
        branchId: 'br-1',
        memberId: 'm-2',
        from: new Date('2026-09-01T00:00:00.000Z'),
        to: new Date('2026-09-30T23:59:59.000Z'),
      });

      expect(sale.count).toHaveBeenCalledWith({
        where: {
          branchId: 'br-1',
          voidStatus: { not: 'VOIDED' },
          saleDatetime: {
            gte: new Date('2026-09-01T00:00:00.000Z'),
            lte: new Date('2026-09-30T23:59:59.000Z'),
          },
          OR: [{ processedByMemberId: 'm-2' }, { serverMemberId: 'm-2' }],
          balanceDue: { gt: 0 },
        },
      });
      expect(result).toBe(2);
    });
  });
});

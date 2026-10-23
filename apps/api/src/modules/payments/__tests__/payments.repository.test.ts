import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '../../../../generated/prisma/client.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';
import { createPaymentsRepository } from '../payments.repository.js';

const FROM = new Date('2026-02-01T00:00:00.000Z');
const TO = new Date('2026-02-02T00:00:00.000Z');
const FILTERS = { from: FROM, to: TO, groupBy: 'method' } as const;
const SCOPE = { businessId: 'b-1', branchId: 'br-1' };

function createPrismaStub() {
  const payment = { groupBy: vi.fn() };
  const prisma = { payment } as unknown as PrismaClient;
  return { prisma, payment };
}

describe('payments.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('groups the period payments by method with a half-open, branch-scoped, non-voided filter', async () => {
    const { prisma, payment } = createPrismaStub();
    const repository = createPaymentsRepository(prisma);
    payment.groupBy.mockResolvedValue([]);

    await repository.summarizeByMethod(SCOPE, FILTERS);

    expect(payment.groupBy).toHaveBeenCalledWith({
      by: ['method'],
      where: {
        paidAt: { gte: FROM, lt: TO },
        sale: { businessId: 'b-1', branchId: 'br-1', voidStatus: { not: 'VOIDED' } },
      },
      _sum: { amount: true },
      _count: { _all: true },
    });
  });

  it('maps each group to its method, summed amount and row count', async () => {
    const { prisma, payment } = createPrismaStub();
    const repository = createPaymentsRepository(prisma);
    const amount = new Prisma.Decimal('125.50');
    payment.groupBy.mockResolvedValue([{ method: 'CASH', _sum: { amount }, _count: { _all: 2 } }]);

    const groups = await repository.summarizeByMethod(SCOPE, FILTERS);

    expect(groups).toEqual([{ method: 'CASH', total: amount, paymentCount: 2 }]);
    expect(groups[0]?.total.toNumber()).toBe(125.5);
  });

  it('omits a group whose sum is null', async () => {
    const { prisma, payment } = createPrismaStub();
    const repository = createPaymentsRepository(prisma);
    payment.groupBy.mockResolvedValue([
      { method: 'CASH', _sum: { amount: null }, _count: { _all: 0 } },
    ]);

    await expect(repository.summarizeByMethod(SCOPE, FILTERS)).resolves.toEqual([]);
  });
});

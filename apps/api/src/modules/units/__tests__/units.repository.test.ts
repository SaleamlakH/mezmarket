import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUnitsRepository } from '../units.repository.js';
import type { UnitRepository } from '../units.types.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

function createPrismaStub() {
  const dimension = { findMany: vi.fn() };
  const prisma = { dimension } as unknown as PrismaClient;

  return { prisma, dimension };
}

function unit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'kg-1',
    dimensionId: 'd-1',
    name: 'Kilogram',
    symbol: 'kg',
    ratioToReferenceUnit: {},
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function dimensionRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'd-1',
    name: 'Weight',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('units.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an object implementing UnitRepository', () => {
    const { prisma } = createPrismaStub();
    const repo = createUnitsRepository(prisma) satisfies UnitRepository;

    expect(typeof repo.listDimensionsWithUnits).toBe('function');
  });

  describe('listDimensionsWithUnits', () => {
    it('calls findMany with dimensions ordered by name and units by ratio', async () => {
      const { prisma, dimension } = createPrismaStub();
      const repo = createUnitsRepository(prisma);
      dimension.findMany.mockResolvedValue([]);

      await repo.listDimensionsWithUnits();

      expect(dimension.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        include: {
          standardUnits: {
            orderBy: { ratioToReferenceUnit: 'asc' },
          },
        },
      });
    });

    it('returns exactly the records resolved by findMany', async () => {
      const { prisma, dimension } = createPrismaStub();
      const repo = createUnitsRepository(prisma);
      const records = [{ ...dimensionRecord(), standardUnits: [unit()] }];
      dimension.findMany.mockResolvedValue(records);

      const result = await repo.listDimensionsWithUnits();

      expect(result).toEqual(records);
    });
  });
});

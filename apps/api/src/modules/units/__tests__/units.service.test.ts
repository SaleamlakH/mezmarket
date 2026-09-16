import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUnitsService } from '../units.service.js';
import type { UnitRepository, DimensionWithUnitRecord, UnitService } from '../units.types.js';
import type { Decimal } from '../../../../generated/prisma/internal/prismaNamespace.js';

function mockRepository(): UnitRepository {
  return {
    listDimensionsWithUnits: vi.fn(),
  };
}

function decimal(value: number) {
  return { toNumber: () => value };
}

function prismaRecord(overrides: { ratio?: number } = {}): DimensionWithUnitRecord {
  return {
    id: 'd-1',
    name: 'Weight',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    standardUnits: [
      {
        id: 'kg-1',
        dimensionId: 'd-1',
        name: 'Kilogram',
        symbol: 'kg',
        ratioToReferenceUnit: decimal(overrides.ratio ?? 1) as Decimal,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ],
  };
}

describe('units.service', () => {
  let repo: UnitRepository;
  let service: UnitService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = mockRepository();
    service = createUnitsService(repo);
  });

  describe('listUnits', () => {
    it('calls repository.listDimensionsWithUnits', async () => {
      vi.mocked(repo.listDimensionsWithUnits).mockResolvedValue([] as never);

      await service.listUnits();

      expect(repo.listDimensionsWithUnits).toHaveBeenCalledTimes(1);
    });

    it('maps each dimension with its units to the domain shape', async () => {
      vi.mocked(repo.listDimensionsWithUnits).mockResolvedValue([prismaRecord()] as never);

      const result = await service.listUnits();

      expect(result[0]).toMatchObject({
        id: 'd-1',
        name: 'Weight',
        units: [{ id: 'kg-1', ratioToReferenceUnit: 1 }],
      });
    });

    it('keeps a zero ratio as 0', async () => {
      vi.mocked(repo.listDimensionsWithUnits).mockResolvedValue([
        prismaRecord({ ratio: 0 }),
      ] as never);

      const result = await service.listUnits();

      expect(result[0]?.units[0]?.ratioToReferenceUnit).toBe(0);
    });
  });
});

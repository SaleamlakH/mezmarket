import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { DimensionWithUnitRecord, UnitRepository } from './units.types.js';

export function createUnitsRepository(prisma: PrismaClient): UnitRepository {
  return {
    async listDimensionsWithUnits(): Promise<DimensionWithUnitRecord[]> {
      return prisma.dimension.findMany({
        orderBy: { name: 'asc' },
        include: {
          standardUnits: {
            orderBy: { ratioToReferenceUnit: 'asc' },
          },
        },
      });
    },
  };
}

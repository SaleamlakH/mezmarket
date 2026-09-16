import type {
  Dimension,
  StandardUnitRecord,
  Unit,
  UnitRepository,
  UnitService,
} from './units.types.js';

function toUnit(record: StandardUnitRecord): Unit {
  return {
    ...record,
    ratioToReferenceUnit: record.ratioToReferenceUnit.toNumber(),
  };
}

export function createUnitsService(repository: UnitRepository): UnitService {
  return {
    async listUnits(): Promise<Dimension[]> {
      const records = await repository.listDimensionsWithUnits();
      return records.map(({ standardUnits, ...dimension }) => ({
        ...dimension,
        units: standardUnits.map(toUnit),
      }));
    },
  };
}

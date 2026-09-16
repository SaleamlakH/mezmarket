import type {
  Dimension as DimensionRecord,
  StandardUnit as StandardUnitRecord,
} from '../../../generated/prisma/client.js';

export type { StandardUnitRecord };

export type Unit = Omit<StandardUnitRecord, 'ratioToReferenceUnit'> & {
  ratioToReferenceUnit: number;
};

export interface Dimension extends DimensionRecord {
  units: Unit[];
}

export interface DimensionWithUnitRecord extends DimensionRecord {
  standardUnits: StandardUnitRecord[];
}

export type UnitRepository = {
  listDimensionsWithUnits(): Promise<DimensionWithUnitRecord[]>;
};

export type UnitService = {
  listUnits(): Promise<Dimension[]>;
};

import type { Unit, Dimension } from '@mez/types';

import type {
  Dimension as DimensionRecord,
  StandardUnit as StandardUnitRecord,
} from '../../../generated/prisma/client.js';

export type { Unit, Dimension, StandardUnitRecord };

export interface DimensionWithUnitRecord extends DimensionRecord {
  standardUnits: StandardUnitRecord[];
}

export type UnitRepository = {
  listDimensionsWithUnits(): Promise<DimensionWithUnitRecord[]>;
};

export type UnitService = {
  listUnits(): Promise<Dimension[]>;
};

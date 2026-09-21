/**
 * Constrains `T` so every key of `Source` must be present, forcing derived
 * response types to mirror the source type's keys.
 */
type RequireAllKeys<Source, T extends Record<keyof Source, unknown>> = T;

/**
 * Domain shape of a Unit as stored in the database.
 */
export interface Unit {
  id: string;
  dimensionId: string;
  name: string;
  symbol: string;
  ratioToReferenceUnit: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JSON-serialized form sent to the frontend.
 */
export type UnitResponse = RequireAllKeys<
  Unit,
  Omit<Unit, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  }
>;

/**
 * Domain shape of a Dimension as stored in the database.
 */
export interface Dimension {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  units: Unit[];
}

/**
 * JSON-serialized form sent to the frontend.
 */
export type DimensionResponse = RequireAllKeys<
  Dimension,
  Omit<Dimension, 'createdAt' | 'updatedAt' | 'units'> & {
    createdAt: string;
    updatedAt: string;
    units: UnitResponse[];
  }
>;

/**
 * Domain shape of a list units result.
 */
export interface UnitsResult {
  dimensions: Dimension[];
}

/**
 * JSON-serialized form sent to the frontend.
 */
export type UnitsResponse = RequireAllKeys<UnitsResult, { dimensions: DimensionResponse[] }>;

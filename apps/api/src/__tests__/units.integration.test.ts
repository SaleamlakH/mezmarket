import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { UnitRepository } from '../modules/units/units.types.js';
import { AppError, ERROR_CODES } from '../shared/errors/app-error.js';

const { unitsRepository } = vi.hoisted(() => ({
  unitsRepository: {
    listDimensionsWithUnits: vi.fn(),
  } satisfies UnitRepository,
}));

vi.mock('../modules/units/units.repository.js', () => ({
  createUnitsRepository: () => unitsRepository,
}));

import app from '../app.js';

const ISO = '2026-08-01T00:00:00.000Z';

const WIRE_DIMENSION = {
  id: 'd-1',
  name: 'Weight',
  createdAt: ISO,
  updatedAt: ISO,
};

const WIRE_UNIT = {
  id: 'kg-1',
  dimensionId: 'd-1',
  name: 'Kilogram',
  symbol: 'kg',
  ratioToReferenceUnit: 1,
  createdAt: ISO,
  updatedAt: ISO,
};

function unitRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'kg-1',
    dimensionId: 'd-1',
    name: 'Kilogram',
    symbol: 'kg',
    ratioToReferenceUnit: { toNumber: () => 1 },
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

function dimensionRecord(overrides: Record<string, unknown> = {}) {
  return {
    ...WIRE_DIMENSION,
    standardUnits: [unitRecord()],
    ...overrides,
  };
}

describe('units.integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/units', () => {
    it('returns the platform dimensions with their units without a token', async () => {
      unitsRepository.listDimensionsWithUnits.mockResolvedValue([dimensionRecord()]);

      const res = await request(app).get('/api/units');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        dimensions: [{ ...WIRE_DIMENSION, units: [WIRE_UNIT] }],
      });
      expect(unitsRepository.listDimensionsWithUnits).toHaveBeenCalledTimes(1);
    });

    it('returns an empty list when no dimensions exist', async () => {
      unitsRepository.listDimensionsWithUnits.mockResolvedValue([]);

      const res = await request(app).get('/api/units');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ dimensions: [] });
    });

    it('returns INTERNAL_ERROR when the repository fails', async () => {
      unitsRepository.listDimensionsWithUnits.mockRejectedValue(
        new AppError(ERROR_CODES.INTERNAL_ERROR, 'Internal error', 500),
      );

      const res = await request(app).get('/api/units');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: { code: ERROR_CODES.INTERNAL_ERROR, message: expect.any(String) },
      });
    });
  });
});

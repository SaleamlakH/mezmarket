import { describe, it, expect, vi } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import { createUnitsService } from '../unitsService';

describe('unitsService', () => {
  it('listUnits calls GET on the public units endpoint', async () => {
    const client: ApiClient = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() };
    const service = createUnitsService(client);
    const units = {
      dimensions: [
        {
          id: 'd-1',
          name: 'Weight',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          units: [
            {
              id: 'u-1',
              dimensionId: 'd-1',
              name: 'Kilogram',
              symbol: 'kg',
              ratioToReferenceUnit: 1,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      ],
    };

    vi.mocked(client.get).mockResolvedValue(units as never);

    await expect(service.listUnits()).resolves.toEqual(units);
    expect(client.get).toHaveBeenCalledWith('/api/units');
  });
});

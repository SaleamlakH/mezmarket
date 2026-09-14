import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBusinessService } from './businessService';

vi.mock('@/lib/supabase', () => ({
  supabaseClient: { auth: { getSession: vi.fn() } },
}));

import type { BusinessService } from '@/providers/business/types';
import type { ApiClient } from '@/lib/apiClient';
import type { BusinessResponse, CreateBusinessResponse } from '@mez/types';

const client = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as ApiClient;

describe('createBusinessService', () => {
  let service: BusinessService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createBusinessService(client);
  });

  it('listBusinesses calls GET /api/businesses and returns the businesses', async () => {
    const business = {
      id: 'b-1',
      ownerId: 'o-1',
      name: 'Selam Mart',
      currencyCode: 'ETB',
      defaultTaxRate: null,
      taxDisplayMode: 'EXCLUSIVE',
      allowNegativeStock: true,
      lowStockDefaultThreshold: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } satisfies BusinessResponse;
    vi.mocked(client.get).mockResolvedValue({ businesses: [business] });

    const result = await service.listBusinesses();

    expect(client.get).toHaveBeenCalledWith('/api/businesses');
    expect(result).toEqual([business]);
  });

  it('createBusiness posts the input to POST /api/businesses and returns the response', async () => {
    const response: CreateBusinessResponse = {
      business: {} as BusinessResponse,
      branch: {} as never,
      member: {} as never,
    };
    vi.mocked(client.post).mockResolvedValue(response);

    const input = { name: 'Selam Mart', currencyCode: 'ETB' };
    const result = await service.createBusiness(input);

    expect(client.post).toHaveBeenCalledWith('/api/businesses', input);
    expect(result).toBe(response);
  });

  it('getBusiness fetches a single business from GET /api/businesses/:id', async () => {
    const business = {
      id: 'b-1',
      ownerId: 'o-1',
      name: 'Selam Mart',
      currencyCode: 'ETB',
      defaultTaxRate: null,
      taxDisplayMode: 'EXCLUSIVE',
      allowNegativeStock: true,
      lowStockDefaultThreshold: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } satisfies BusinessResponse;
    vi.mocked(client.get).mockResolvedValue({ business });

    const result = await service.getBusiness('b-1');

    expect(client.get).toHaveBeenCalledWith('/api/businesses/b-1');
    expect(result).toBe(business);
  });

  it('updateBusiness sends the input to PUT /api/businesses/:id and returns the business', async () => {
    const updated = {
      id: 'b-1',
      ownerId: 'o-1',
      name: 'Selam Mart 2',
      currencyCode: 'ETB',
      defaultTaxRate: 15,
      taxDisplayMode: 'EXCLUSIVE',
      allowNegativeStock: true,
      lowStockDefaultThreshold: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    } satisfies BusinessResponse;
    vi.mocked(client.put).mockResolvedValue({ business: updated });

    const input = { name: 'Selam Mart 2', defaultTaxRate: 15 };
    const result = await service.updateBusiness('b-1', input);

    expect(client.put).toHaveBeenCalledWith('/api/businesses/b-1', input);
    expect(result).toBe(updated);
  });
});

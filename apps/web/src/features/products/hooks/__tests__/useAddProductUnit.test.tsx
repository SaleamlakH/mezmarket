import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CreateProductUnitInput, UnitsResponse } from '@mez/types';
import { productsService } from '@/features/products/api/productsService';
import { unitsService } from '@/features/products/api/unitsService';
import { useAddProductUnit } from '../useAddProductUnit';
import { makeProduct, makeUnit } from './fixtures';

vi.mock('@/features/products/api/productsService', () => ({
  productsService: {
    createProductUnit: vi.fn(),
  },
}));

vi.mock('@/features/products/api/unitsService', () => ({
  unitsService: {
    listUnits: vi.fn(),
  },
}));

const units: UnitsResponse = {
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

const customInput: CreateProductUnitInput = {
  unitRole: 'CUSTOM',
  name: 'Jigger',
  dependsOn: 'BASE',
  conversionRate: 25,
  purchaseCapable: false,
  sellCapable: true,
  price: 30,
};

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function renderAdd(onAdded = vi.fn()) {
  const client = createClient();
  const hook = renderHook(
    () => useAddProductUnit({ businessId: 'b-1', productId: 'p-1', onAdded }),
    { wrapper: wrapper(client) },
  );
  return { ...hook, client };
}

describe('useAddProductUnit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(unitsService.listUnits).mockResolvedValue(units as never);
  });

  it('exposes the unit reference data once the units query resolves', async () => {
    const { result } = renderAdd();

    await waitFor(() => expect(result.current.dimensions).toEqual(units.dimensions));
  });

  it('publishes the whole returned product into the detail cache', async () => {
    const saved = {
      ...makeProduct(),
      units: [
        ...makeProduct().units,
        makeUnit({
          id: 'pu-9',
          unitRole: 'CUSTOM',
          name: 'Jigger',
          dependsOn: 'BASE',
          conversionRate: 25,
          price: 30,
          purchaseCapable: false,
          sellCapable: true,
        }),
      ],
    };
    vi.mocked(productsService.createProductUnit).mockResolvedValue(saved as never);
    const onAdded = vi.fn();
    const { result, client } = renderAdd(onAdded);

    await act(async () => {
      await result.current.addUnit(customInput);
    });

    expect(productsService.createProductUnit).toHaveBeenCalledWith('b-1', 'p-1', customInput);
    expect(client.getQueryData(['product', 'b-1', 'p-1'])).toEqual(saved);
    expect(onAdded).toHaveBeenCalledWith(customInput);
  });

  it('propagates a failed add without publishing anything', async () => {
    vi.mocked(productsService.createProductUnit).mockRejectedValue(new Error('Add failed'));
    const onAdded = vi.fn();
    const { result, client } = renderAdd(onAdded);

    await act(async () => {
      await expect(result.current.addUnit(customInput)).rejects.toThrow('Add failed');
    });

    expect(client.getQueryData(['product', 'b-1', 'p-1'])).toBeUndefined();
    expect(onAdded).not.toHaveBeenCalled();
  });
});

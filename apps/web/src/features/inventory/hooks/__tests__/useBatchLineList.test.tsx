import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { BatchLineFormValues, BusinessResponse } from '@mez/types';
import type { BusinessContextValue } from '@/providers/business/types';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { catalogKeys } from '@/hooks/useCatalogApi';
import { useBatchLineList } from '../useBatchLineList';
import { products, purchasableUnitsByProductId } from '../../__tests__/fixtures';

vi.mock('@/providers/business/useBusinessContext', () => ({
  useBusinessContext: vi.fn(),
}));

function businessFixture(id: string): BusinessResponse {
  return {
    id,
    ownerId: 'owner_1',
    name: 'Test Business',
    currencyCode: 'ETB',
    defaultTaxRate: null,
    taxDisplayMode: 'EXCLUSIVE',
    allowNegativeStock: true,
    lowStockDefaultThreshold: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function setBusiness(id: string | null) {
  vi.mocked(useBusinessContext).mockReturnValue({
    status: 'ready',
    businesses: [],
    currentBusiness: id === null ? null : businessFixture(id),
    setCurrentBusiness: vi.fn(),
    refetch: vi.fn(),
  } satisfies BusinessContextValue);
}

// Created fresh in beforeEach, referenced (not recreated) by the wrapper on every render.
let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const tequilaLine: BatchLineFormValues = {
  productId: 'prod_tequila',
  productUnitId: 'unit_tequila_bottle',
  purchaseQuantity: '2',
  purchaseUnitCost: '10.5',
};

const oilLine: BatchLineFormValues = {
  productId: 'prod_oil',
  productUnitId: 'unit_oil_bottle',
  purchaseQuantity: '5',
  purchaseUnitCost: '320',
};

describe('useBatchLineList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    setBusiness('b1');
  });

  it('reads the cached products and units of the given lines', () => {
    const tequilaUnits = purchasableUnitsByProductId['prod_tequila'] ?? [];
    queryClient.setQueryData(catalogKeys.products('b1'), products);
    queryClient.setQueryData(catalogKeys.productUnits('b1', 'prod_tequila'), tequilaUnits);

    const { result } = renderHook(() => useBatchLineList([tequilaLine]), { wrapper });

    expect(result.current.cachedProducts).toEqual(products);
    expect(result.current.unitsByProductId['prod_tequila']).toEqual(tequilaUnits);
  });

  it('reads the units of only the products the lines reference', () => {
    const tequilaUnits = purchasableUnitsByProductId['prod_tequila'] ?? [];
    const oilUnits = purchasableUnitsByProductId['prod_oil'] ?? [];
    queryClient.setQueryData(catalogKeys.products('b1'), products);
    queryClient.setQueryData(catalogKeys.productUnits('b1', 'prod_tequila'), tequilaUnits);
    queryClient.setQueryData(catalogKeys.productUnits('b1', 'prod_oil'), oilUnits);

    const { result } = renderHook(() => useBatchLineList([tequilaLine]), { wrapper });

    expect(result.current.unitsByProductId).toEqual({ prod_tequila: tequilaUnits });
  });

  it('returns nothing when nothing has been fetched this session', () => {
    const { result } = renderHook(() => useBatchLineList([tequilaLine, oilLine]), { wrapper });

    expect(result.current.cachedProducts).toBeUndefined();
    expect(result.current.unitsByProductId).toEqual({});
  });

  it('returns nothing without a selected business', () => {
    queryClient.setQueryData(catalogKeys.products('b1'), products);
    setBusiness(null);

    const { result } = renderHook(() => useBatchLineList([tequilaLine]), { wrapper });

    expect(result.current.cachedProducts).toBeUndefined();
    expect(result.current.unitsByProductId).toEqual({});
  });
});

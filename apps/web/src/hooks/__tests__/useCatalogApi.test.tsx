import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type {
  BusinessResponse,
  ProductSummaryResponse,
  ProductUnitOptionResponse,
} from '@mez/types';
import type { BusinessContextValue } from '@/providers/business/types';
import type { CatalogService } from '@/providers/catalog/types';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useCatalogService } from '@/providers/catalog/useCatalogService';
import { catalogKeys, useBusinessProducts, useProductUnits } from '../useCatalogApi';

vi.mock('@/providers/business/useBusinessContext', () => ({
  useBusinessContext: vi.fn(),
}));

vi.mock('@/providers/catalog/useCatalogService', () => ({
  useCatalogService: vi.fn(),
}));

const catalogService = {
  listProducts: vi.fn(),
  getProductUnits: vi.fn(),
  getProductUploadUrls: vi.fn(),
} satisfies CatalogService;

const products: ProductSummaryResponse[] = [
  {
    id: 'prod_tequila',
    name: 'Sierra Tequila',
    brand: 'Sierra',
    currentSealedStock: 46,
    lowStockThreshold: null,
    active: true,
    uploadId: null,
    baseUnitLabel: 'Bottle',
  },
];

const units: ProductUnitOptionResponse[] = [
  {
    id: 'unit_tequila_bottle',
    productId: 'prod_tequila',
    name: 'Bottle',
    purchaseCapable: true,
    sellCapable: true,
    unitRole: 'BASE',
    dependsOn: null,
    conversionRate: null,
    price: 850,
  },
];

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

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useCatalogApi', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createClient();
    setBusiness('b1');
    vi.mocked(useCatalogService).mockReturnValue(catalogService);
  });

  describe('useBusinessProducts', () => {
    it('fetches the catalog products of the current business', async () => {
      catalogService.listProducts.mockResolvedValue(products);

      const { result } = renderHook(() => useBusinessProducts(), {
        wrapper: wrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(catalogService.listProducts).toHaveBeenCalledWith('b1');
      expect(result.current.data).toEqual(products);
      expect(queryClient.getQueryData(catalogKeys.products('b1'))).toEqual(products);
    });

    it('stays idle without a selected business', () => {
      setBusiness(null);

      renderHook(() => useBusinessProducts(), { wrapper: wrapper(queryClient) });

      expect(catalogService.listProducts).not.toHaveBeenCalled();
    });
  });

  describe('useProductUnits', () => {
    it('fetches the units of the given product', async () => {
      catalogService.getProductUnits.mockResolvedValue(units);

      const { result } = renderHook(() => useProductUnits('prod_tequila'), {
        wrapper: wrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(catalogService.getProductUnits).toHaveBeenCalledWith('b1', 'prod_tequila');
      expect(result.current.data).toEqual(units);
      expect(queryClient.getQueryData(catalogKeys.productUnits('b1', 'prod_tequila'))).toEqual(
        units,
      );
    });

    it('stays idle without a product to load', () => {
      const { result } = renderHook(() => useProductUnits(undefined), {
        wrapper: wrapper(queryClient),
      });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(catalogService.getProductUnits).not.toHaveBeenCalled();
    });

    it('serves already fetched units from the cache without refetching', async () => {
      catalogService.getProductUnits.mockResolvedValue(units);

      const first = renderHook(() => useProductUnits('prod_tequila'), {
        wrapper: wrapper(queryClient),
      });
      await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
      first.unmount();

      const second = renderHook(() => useProductUnits('prod_tequila'), {
        wrapper: wrapper(queryClient),
      });

      expect(second.result.current.data).toEqual(units);
      expect(second.result.current.fetchStatus).toBe('idle');
      expect(catalogService.getProductUnits).toHaveBeenCalledTimes(1);
    });
  });
});

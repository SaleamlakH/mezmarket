import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { BusinessResponse } from '@mez/types';
import type { BusinessContextValue } from '@/providers/business/types';
import type { CatalogService } from '@/providers/catalog/types';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useCatalogService } from '@/providers/catalog/useCatalogService';
import { products, sellableUnitsByProductId } from '../../__tests__/fixtures';
import type { SaleDraftLine } from '../..//state/saleDraft';
import { useDraftCatalog } from '../useDraftCatalog';

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

function businessFixture(): BusinessResponse {
  return {
    id: 'b1',
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

function line(productId: string): SaleDraftLine {
  return { id: `l-${productId}`, productId, productUnitId: '', quantity: 1 };
}

function renderDraft(files: SaleDraftLine[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return renderHook(() => useDraftCatalog(files), { wrapper });
}

describe('useDraftCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBusinessContext).mockReturnValue({
      status: 'ready',
      businesses: [],
      currentBusiness: businessFixture(),
      setCurrentBusiness: vi.fn(),
      refetch: vi.fn(),
    } satisfies BusinessContextValue);
    vi.mocked(useCatalogService).mockReturnValue(catalogService);
    catalogService.listProducts.mockResolvedValue(products);
    catalogService.getProductUnits.mockImplementation(
      async (_businessId, productId) => sellableUnitsByProductId[productId] ?? [],
    );
  });

  it('joins the drafted products and their units', async () => {
    const { result } = renderDraft([line('prod_tequila'), line('prod_oil')]);

    await waitFor(() =>
      expect(result.current.productForId('prod_tequila')?.id).toBe('prod_tequila'),
    );
    expect(result.current.productForId('prod_oil')?.id).toBe('prod_oil');
    await waitFor(() =>
      expect(result.current.unitsForProduct('prod_tequila')).toEqual(
        sellableUnitsByProductId.prod_tequila,
      ),
    );
    expect(result.current.unitsForProduct('prod_oil')).toEqual(sellableUnitsByProductId.prod_oil);
  });

  it('requests units only for the products the draft holds', async () => {
    renderDraft([line('prod_tequila')]);

    await waitFor(() =>
      expect(catalogService.getProductUnits).toHaveBeenCalledWith('b1', 'prod_tequila'),
    );

    const requestedProducts = vi
      .mocked(catalogService.getProductUnits)
      .mock.calls.map((call) => call[1]);
    expect(requestedProducts).not.toContain('prod_oil');
    expect(requestedProducts.filter((id) => id === 'prod_tequila')).toHaveLength(1);
  });

  it('answers no units for a product it holds nothing for', async () => {
    const { result } = renderDraft([line('prod_tequila')]);

    await waitFor(() => expect(catalogService.getProductUnits).toHaveBeenCalled());

    expect(result.current.productForId('missing')).toBeUndefined();
    expect(result.current.unitsForProduct('missing')).toEqual([]);
  });
});

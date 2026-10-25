import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { BusinessResponse } from '@mez/types';
import type { BusinessContextValue } from '@/providers/business/types';
import type { CatalogService } from '@/providers/catalog/types';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useCatalogService } from '@/providers/catalog/useCatalogService';
import { products, sellableUnitsByProductId } from '../../__tests__/fixtures';
import { SaleDraftProvider } from '../../state/SaleDraftProvider';
import { useSaleDraft } from '../../state/useSaleDraft';
import { useProductDraftView } from '../useProductDraftView';

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
    taxOnSales: false,
    allowNegativeStock: true,
    lowStockDefaultThreshold: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function render(productId: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <SaleDraftProvider>{children}</SaleDraftProvider>
    </QueryClientProvider>
  );

  return renderHook(() => ({ draft: useSaleDraft(), product: useProductDraftView(productId) }), {
    wrapper,
  });
}

describe('useProductDraftView', () => {
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

  it('exposes the catalog entry, with units only once they are asked for', async () => {
    const { result } = render('prod_tequila');

    await waitFor(() => expect(result.current.product.product?.name).toBe('Sierra Tequila 350 ml'));

    expect(result.current.product.isActive).toBe(false);
    expect(result.current.product.cartItem.lines).toEqual([]);
    expect(result.current.product.units).toEqual([]);
    expect(catalogService.getProductUnits).not.toHaveBeenCalled();

    act(() => result.current.product.requestUnits());

    await waitFor(() =>
      expect(result.current.product.units.map((unit) => unit.id)).toEqual([
        'unit_tequila_bottle',
        'unit_tequila_case',
      ]),
    );
  });

  it('joins committed lines into a cart item with the committed total', async () => {
    const { result } = render('prod_tequila');

    act(() => result.current.draft.setQuantityForProduct('prod_tequila', 'unit_tequila_bottle', 2));

    await waitFor(() => expect(result.current.product.cartItem.total).toBe(1700));
    expect(result.current.product.cartItem.lines).toHaveLength(1);
    expect(result.current.product.lines).toHaveLength(1);
  });

  it('tracks the active line only while the product is the one being worked on', async () => {
    const { result } = render('prod_tequila');

    act(() => result.current.draft.openProduct('prod_tequila', 'unit_tequila_bottle'));

    expect(result.current.product.isActive).toBe(true);
    expect(result.current.product.activeLine?.productUnitId).toBe('unit_tequila_bottle');

    act(() => result.current.draft.closeProduct());

    expect(result.current.product.isActive).toBe(false);
    expect(result.current.product.activeLine).toBeUndefined();
  });
});

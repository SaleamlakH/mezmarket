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
import { useSaleDraftView } from '../useSaleDraftView';

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

function render() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <SaleDraftProvider>{children}</SaleDraftProvider>
    </QueryClientProvider>
  );

  return renderHook(() => ({ draft: useSaleDraft(), view: useSaleDraftView() }), { wrapper });
}

describe('useSaleDraftView', () => {
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

  it('joins the committed lines into cart items with their product, unit and amount', async () => {
    const { result } = render();

    act(() => result.current.draft.setQuantityForProduct('prod_tequila', 'unit_tequila_bottle', 2));

    await waitFor(() => {
      const item = result.current.view.cartItems[0];
      expect(item?.product?.name).toBe('Sierra Tequila 350 ml');
    });

    const line = result.current.view.cartItems[0]?.lines[0];
    expect(line?.unit?.name).toBe('Bottle');
    expect(line?.unitPrice).toBe(850);
    expect(line?.lineTotal).toBe(1700);
    expect(result.current.view.total).toBe(1700);
    expect(result.current.view.itemCount).toBe(1);
    expect(result.current.view.hasLines).toBe(true);
  });

  it('leaves a line without a priced unit out of the totals', async () => {
    const { result } = render();

    act(() => result.current.draft.setQuantityForProduct('prod_tequila', 'unit_missing', 4));

    await waitFor(() => expect(result.current.view.hasLines).toBe(true));

    const line = result.current.view.cartItems[0]?.lines[0];
    expect(line?.unit).toBeUndefined();
    expect(line?.unitPrice).toBeNull();
    expect(line?.lineTotal).toBeNull();
    expect(result.current.view.total).toBe(0);
  });

  it('recomputes as the draft changes', async () => {
    const { result } = render();

    act(() => result.current.draft.setQuantityForProduct('prod_tequila', 'unit_tequila_bottle', 2));
    expect(result.current.view.cartItems).toHaveLength(1);

    act(() => result.current.draft.setQuantityForProduct('prod_oil', 'unit_oil_liter', 3));

    await waitFor(() => expect(result.current.view.cartItems).toHaveLength(2));

    const [tequila, oil] = result.current.view.cartItems;
    expect(tequila?.total).toBe(1700);
    expect(oil?.total).toBe(255);
    expect(result.current.view.total).toBe(1955);
    expect(result.current.view.itemCount).toBe(2);
  });

  it('shows an empty sale when nothing is committed yet', () => {
    const { result } = render();

    expect(result.current.view.cartItems).toEqual([]);
    expect(result.current.view.hasLines).toBe(false);
    expect(result.current.view.total).toBe(0);
    expect(result.current.view.itemCount).toBe(0);
  });
});

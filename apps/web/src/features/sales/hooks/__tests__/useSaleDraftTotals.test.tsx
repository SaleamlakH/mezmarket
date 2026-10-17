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
import { useSaleDraftTotals } from '../useSaleDraftTotals';

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

function businessFixture(overrides: Partial<BusinessResponse> = {}): BusinessResponse {
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
    ...overrides,
  };
}

function setBusiness(business: BusinessResponse | null) {
  vi.mocked(useBusinessContext).mockReturnValue({
    status: 'ready',
    businesses: [],
    currentBusiness: business,
    setCurrentBusiness: vi.fn(),
    refetch: vi.fn(),
  } satisfies BusinessContextValue);
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

  return renderHook(() => ({ draft: useSaleDraft(), totals: useSaleDraftTotals() }), { wrapper });
}

describe('useSaleDraftTotals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCatalogService).mockReturnValue(catalogService);
    catalogService.listProducts.mockResolvedValue(products);
    catalogService.getProductUnits.mockImplementation(
      async (_businessId, productId) => sellableUnitsByProductId[productId] ?? [],
    );
  });

  it('is all zero with an empty draft', () => {
    setBusiness(businessFixture());
    const { result } = render();

    expect(result.current.totals).toMatchObject({ subtotal: 0, taxAmount: 0, total: 0 });
  });

  it('adds tax on top under an exclusive display', async () => {
    setBusiness(businessFixture({ defaultTaxRate: 0.15, taxDisplayMode: 'EXCLUSIVE' }));
    const { result } = render();

    act(() => result.current.draft.setQuantityForProduct('prod_tequila', 'unit_tequila_bottle', 2));

    await waitFor(() => expect(result.current.totals.subtotal).toBe(1700));
    expect(result.current.totals.taxAmount).toBeCloseTo(255);
    expect(result.current.totals.total).toBeCloseTo(1955);
  });

  it('backs tax out of the total under an inclusive display', async () => {
    setBusiness(businessFixture({ defaultTaxRate: 0.15, taxDisplayMode: 'INCLUSIVE' }));
    const { result } = render();

    act(() => result.current.draft.setQuantityForProduct('prod_tequila', 'unit_tequila_bottle', 2));

    await waitFor(() => expect(result.current.totals.total).toBe(1700));
    expect(result.current.totals.subtotal).toBeCloseTo(1700 / 1.15);
  });

  it('falls back to no tax without a configured rate', async () => {
    setBusiness(businessFixture());
    const { result } = render();

    act(() => result.current.draft.setQuantityForProduct('prod_tequila', 'unit_tequila_bottle', 2));

    await waitFor(() => expect(result.current.totals.total).toBe(1700));
    expect(result.current.totals.taxRate).toBe(0);
    expect(result.current.totals.taxDisplayMode).toBe('EXCLUSIVE');
  });
});

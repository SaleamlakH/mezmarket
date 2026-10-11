import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { BusinessResponse, SaleLineFormValues } from '@mez/types';
import type { BusinessContextValue } from '@/providers/business/types';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { catalogKeys } from '@/hooks/useCatalogApi';
import { useSaleLineList } from '../useSaleLineList';
import { products, sellableUnitsByProductId } from '../../__tests__/fixtures';

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

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const tequilaLine: SaleLineFormValues = {
  productId: 'prod_tequila',
  productUnitId: 'unit_tequila_bottle',
  quantity: '2',
};

const oilLine: SaleLineFormValues = {
  productId: 'prod_oil',
  productUnitId: 'unit_oil_liter',
  quantity: '3',
};

/** Seeds the cache the way opening the picker and the line form would. */
function seedCatalog() {
  queryClient.setQueryData(catalogKeys.products('b1'), products);
  for (const [productId, units] of Object.entries(sellableUnitsByProductId)) {
    queryClient.setQueryData(catalogKeys.productUnits('b1', productId), units);
  }
}

describe('useSaleLineList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    setBusiness('b1');
  });

  it('joins each line to its product, unit, unit price and total', () => {
    seedCatalog();

    const { result } = renderHook(() => useSaleLineList([tequilaLine, oilLine]), { wrapper });
    const [first, second] = result.current.rows;

    expect(first?.product?.name).toBe('Sierra Tequila 350 ml');
    expect(first?.unit?.name).toBe('Bottle');
    expect(first?.unitPrice).toBe(850);
    expect(first?.total).toBe(1700);

    expect(second?.unit?.name).toBe('Liter');
    expect(second?.unitPrice).toBe(85);
    expect(second?.total).toBe(255);
  });

  it('leaves a line with an unknown product or unit unresolved', () => {
    seedCatalog();

    const unknown: SaleLineFormValues = {
      productId: 'prod_missing',
      productUnitId: 'unit_missing',
      quantity: '1',
    };

    const { result } = renderHook(() => useSaleLineList([unknown]), { wrapper });
    const row = result.current.rows[0];

    expect(row?.product).toBeUndefined();
    expect(row?.unit).toBeUndefined();
    expect(row?.unitPrice).toBeNull();
    expect(row?.total).toBeNull();
  });

  it('exposes the cached catalog and the units of only the referenced products', () => {
    seedCatalog();

    const { result } = renderHook(() => useSaleLineList([tequilaLine]), { wrapper });

    expect(result.current.products).toEqual(products);
    expect(Object.keys(result.current.unitsByProductId)).toEqual(['prod_tequila']);
    expect(result.current.unitsByProductId['prod_tequila']).toEqual(
      sellableUnitsByProductId['prod_tequila'],
    );
  });

  it('resolves nothing when no catalog has been fetched', () => {
    const { result } = renderHook(() => useSaleLineList([tequilaLine]), { wrapper });
    const row = result.current.rows[0];

    expect(result.current.products).toBeUndefined();
    expect(row?.unitPrice).toBeNull();
    expect(row?.total).toBeNull();
  });

  it('recomputes when the lines change', () => {
    seedCatalog();

    const { result, rerender } = renderHook(({ lines }) => useSaleLineList(lines), {
      wrapper,
      initialProps: { lines: [tequilaLine] as SaleLineFormValues[] },
    });
    expect(result.current.rows).toHaveLength(1);

    rerender({ lines: [tequilaLine, oilLine] as SaleLineFormValues[] });

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows[1]?.total).toBe(255);
  });
});

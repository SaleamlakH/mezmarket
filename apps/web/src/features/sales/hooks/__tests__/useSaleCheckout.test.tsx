import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type {
  BusinessResponse,
  BusinessMemberSummaryResponse,
  CreateSaleResponse,
  CustomerSummaryResponse,
  SaleDetailResponse,
} from '@mez/types';
import type { BusinessContextValue } from '@/providers/business/types';
import type { CatalogService } from '@/providers/catalog/types';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useCatalogService } from '@/providers/catalog/useCatalogService';
import { catalogKeys } from '@/hooks/useCatalogApi';
import { salesService } from '../../api/salesService';
import { products, sale, sellableUnitsByProductId } from '../../__tests__/fixtures';
import type { SaleDraftCatalog } from '../../lib/saleDraftView';
import { EMPTY_PAYMENT, type SaleDraftLine, type SalePaymentDraft } from '../../state/saleDraft';
import { SaleDraftProvider } from '../../state/SaleDraftProvider';
import { useSaleDraft } from '../../state/useSaleDraft';
import { draftSaleValues, useSaleCheckout } from '../useSaleCheckout';

vi.mock('../../api/salesService', () => ({
  salesService: {
    getSales: vi.fn(),
    createSale: vi.fn(),
  },
}));

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

const catalog: SaleDraftCatalog = {
  productForId: (productId) => products.find((product) => product.id === productId),
  unitsForProduct: (productId) => sellableUnitsByProductId[productId] ?? [],
};

function line(overrides: Partial<SaleDraftLine> = {}): SaleDraftLine {
  return {
    id: 'l1',
    productId: 'prod_tequila',
    productUnitId: 'unit_tequila_bottle',
    quantity: 2,
    ...overrides,
  };
}

function payment(overrides: Partial<SalePaymentDraft> = {}): SalePaymentDraft {
  return { ...EMPTY_PAYMENT, ...overrides };
}

const customer: CustomerSummaryResponse = {
  id: 'c1',
  name: 'Ada',
  contactPhone: null,
  contactEmail: null,
};

const server: BusinessMemberSummaryResponse = { id: 's1', name: 'Sam', role: 'SERVER' };

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

describe('draftSaleValues', () => {
  it('snapshots the committed lines with the unit’s sellability', () => {
    const values = draftSaleValues(
      [line(), line({ id: 'l2', quantity: 0 })],
      null,
      null,
      payment(),
      catalog,
    );

    expect(values.lines).toEqual([
      {
        productId: 'prod_tequila',
        productUnitId: 'unit_tequila_bottle',
        quantity: '2',
        sellCapable: true,
      },
    ]);
  });

  it('carries the attached customer and server ids', () => {
    const values = draftSaleValues([line()], customer, server, payment(), catalog);

    expect(values.customerId).toBe('c1');
    expect(values.serverMemberId).toBe('s1');
  });

  it('sends only the status for a pending payment', () => {
    const values = draftSaleValues(
      [line()],
      null,
      null,
      payment({ status: 'PENDING', method: 'CASH', amount: '10' }),
      catalog,
    );

    expect(values.initialPayment).toEqual({ status: 'PENDING' });
  });

  it('carries a partial payment’s amount but leaves a paid one to the server', () => {
    const partial = draftSaleValues(
      [line()],
      null,
      null,
      payment({ status: 'PARTIALLY_PAID', amount: '5', method: 'CARD', methodDetail: 'ref' }),
      catalog,
    );
    expect(partial.initialPayment).toEqual({
      status: 'PARTIALLY_PAID',
      amount: '5',
      method: 'CARD',
      methodDetail: 'ref',
    });

    const paid = draftSaleValues([line()], null, null, payment(), catalog);
    expect(paid.initialPayment).toEqual({ status: 'PAID', method: 'CASH' });
  });
});

describe('useSaleCheckout', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SaleDraftProvider>{children}</SaleDraftProvider>
    </QueryClientProvider>
  );

  function render() {
    return renderHook(() => ({ draft: useSaleDraft(), checkout: useSaleCheckout() }), { wrapper });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    });
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
    vi.mocked(salesService.createSale).mockResolvedValue(sale as CreateSaleResponse);
    // Seeded so the mirrored form values settle before a submit — a later
    // units query reset would clear errors.
    queryClient.setQueryData(catalogKeys.products('b1'), products);
    queryClient.setQueryData(
      catalogKeys.productUnits('b1', 'prod_tequila'),
      sellableUnitsByProductId['prod_tequila'] ?? [],
    );
  });

  it('records the mirrored draft and clears it on finish', async () => {
    const { result } = render();

    act(() => result.current.draft.setQuantityForProduct('prod_tequila', 'unit_tequila_bottle', 2));
    act(() => result.current.checkout.confirm());

    await waitFor(() => expect(result.current.checkout.isSuccess).toBe(true));

    expect(salesService.createSale).toHaveBeenCalledWith('b1', {
      lines: [{ productId: 'prod_tequila', productUnitId: 'unit_tequila_bottle', quantity: 2 }],
      initialPayment: { status: 'PAID', method: 'CASH' },
    });
    expect(result.current.checkout.sale).toEqual(sale as SaleDetailResponse);

    act(() => result.current.checkout.finish());

    expect(result.current.draft.lines).toEqual([]);
    expect(result.current.checkout.isSuccess).toBe(false);
  });

  it('surfaces a partial payment with no amount and does not record', async () => {
    const { result } = render();

    act(() => result.current.draft.setQuantityForProduct('prod_tequila', 'unit_tequila_bottle', 2));
    act(() => result.current.draft.setPaymentStatus('PARTIALLY_PAID'));
    act(() => result.current.checkout.confirm());

    await waitFor(() =>
      expect(result.current.checkout.paymentErrors.amount).toEqual(expect.any(String)),
    );
    expect(salesService.createSale).not.toHaveBeenCalled();
  });

  it('surfaces a recorded payment with no method and does not record', async () => {
    const { result } = render();

    act(() => result.current.draft.setQuantityForProduct('prod_tequila', 'unit_tequila_bottle', 2));
    act(() => result.current.draft.setPaymentMethod(''));
    act(() => result.current.checkout.confirm());

    await waitFor(() =>
      expect(result.current.checkout.paymentErrors.method).toEqual(expect.any(String)),
    );
    expect(salesService.createSale).not.toHaveBeenCalled();
  });

  it('surfaces an empty draft and does not record', async () => {
    const { result } = render();

    act(() => result.current.checkout.confirm());

    await waitFor(() => expect(result.current.checkout.error).toEqual(expect.any(String)));
    expect(salesService.createSale).not.toHaveBeenCalled();
  });
});

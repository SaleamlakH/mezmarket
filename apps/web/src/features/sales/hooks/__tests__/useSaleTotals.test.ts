import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { BusinessResponse, SaleLineFormValues } from '@mez/types';
import type { BusinessContextValue } from '@/providers/business/types';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useSaleTotals } from '../useSaleTotals';

vi.mock('@/providers/business/useBusinessContext', () => ({
  useBusinessContext: vi.fn(),
}));

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

const tequilaLine: SaleLineFormValues = {
  productId: 'prod_tequila',
  productUnitId: 'unit_tequila_bottle',
  quantity: '2',
};

describe('useSaleTotals', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('adds no tax when the business has no rate', () => {
    setBusiness(businessFixture());

    const { result } = renderHook(() => useSaleTotals([tequilaLine]));

    expect(result.current.subtotal).toBe(1700);
    expect(result.current.taxAmount).toBe(0);
    expect(result.current.total).toBe(1700);
    expect(result.current.taxRate).toBe(0);
  });

  it('computes tax on top under an exclusive display', () => {
    setBusiness(businessFixture({ defaultTaxRate: 0.15, taxDisplayMode: 'EXCLUSIVE' }));

    const { result } = renderHook(() => useSaleTotals([tequilaLine]));

    expect(result.current.subtotal).toBe(1700);
    expect(result.current.taxAmount).toBeCloseTo(255);
    expect(result.current.total).toBeCloseTo(1955);
  });

  it('backs tax out of the total under an inclusive display', () => {
    setBusiness(businessFixture({ defaultTaxRate: 0.15, taxDisplayMode: 'INCLUSIVE' }));

    const { result } = renderHook(() => useSaleTotals([tequilaLine]));

    expect(result.current.total).toBe(1700);
    expect(result.current.subtotal).toBeCloseTo(1700 / 1.15);
    expect(result.current.taxAmount).toBeCloseTo(1700 - 1700 / 1.15);
  });

  it('falls back to no tax and an exclusive display without a business', () => {
    setBusiness(null);

    const { result } = renderHook(() => useSaleTotals([tequilaLine]));

    expect(result.current.taxRate).toBe(0);
    expect(result.current.taxDisplayMode).toBe('EXCLUSIVE');
    expect(result.current.total).toBe(1700);
  });

  it('counts only the lines whose unit price is known', () => {
    setBusiness(businessFixture());

    const unknown: SaleLineFormValues = {
      productId: 'prod_missing',
      productUnitId: 'unit_missing',
      quantity: '5',
    };

    const { result } = renderHook(() => useSaleTotals([tequilaLine, unknown]));

    expect(result.current.subtotal).toBe(1700);
  });
});

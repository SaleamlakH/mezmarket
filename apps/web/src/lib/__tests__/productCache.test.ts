import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type {
  ProductSummaryResponse,
  ProductUnitResponse,
  ProductWithUnitsResponse,
} from '@mez/types';
import { catalogKeys } from '@/hooks/useCatalogApi';
import { publishProduct, productKey, toProductSummary } from '../productCache';

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

function makeUnit(
  overrides: Partial<ProductUnitResponse> & Pick<ProductUnitResponse, 'id' | 'unitRole' | 'name'>,
): ProductUnitResponse {
  return {
    productId: 'p-1',
    standardUnitId: null,
    dependsOn: null,
    conversionRate: null,
    price: null,
    purchaseCapable: true,
    sellCapable: true,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

function makeProduct(overrides: Partial<ProductWithUnitsResponse> = {}): ProductWithUnitsResponse {
  return {
    id: 'p-1',
    businessId: 'b-1',
    branchId: 'br-1',
    categoryId: null,
    name: 'Tequila',
    brand: 'Casa',
    description: null,
    trackAsPartial: false,
    lowStockThreshold: 5,
    currentSealedStock: 12,
    active: true,
    uploadId: 'up-1',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    units: [
      makeUnit({ id: 'u-base', unitRole: 'BASE', name: 'Bottle', price: 250 }),
      makeUnit({ id: 'u-mou', unitRole: 'MOU', name: 'Shot', conversionRate: 25, price: 30 }),
    ],
    ...overrides,
  };
}

function makeSummary(
  overrides: Partial<ProductSummaryResponse> & Pick<ProductSummaryResponse, 'id'>,
): ProductSummaryResponse {
  return {
    name: 'Tequila',
    brand: 'Casa',
    currentSealedStock: 12,
    lowStockThreshold: 5,
    active: true,
    baseUnitLabel: 'Bottle',
    uploadId: 'up-1',
    ...overrides,
  };
}

function setup() {
  return new QueryClient();
}

describe('toProductSummary', () => {
  it('projects a product down to the list summary, naming its base unit', () => {
    const product = makeProduct({ id: 'p-9', name: 'Mezcal', active: false });

    expect(toProductSummary(product)).toEqual({
      id: 'p-9',
      name: 'Mezcal',
      brand: 'Casa',
      currentSealedStock: 12,
      lowStockThreshold: 5,
      active: false,
      baseUnitLabel: 'Bottle',
      uploadId: 'up-1',
    });
  });

  it('falls back to an empty base unit label when there is no base unit', () => {
    expect(toProductSummary(makeProduct({ units: [] })).baseUnitLabel).toBe('');
  });
});

describe('publishProduct', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = setup();
  });

  it('writes the product into its own detail cache', () => {
    const product = makeProduct();

    publishProduct(client, 'b-1', product);

    expect(client.getQueryData(productKey('b-1', 'p-1'))).toBe(product);
  });

  it("replaces only this product's row in the product list, keeping order", () => {
    const leading = makeSummary({ id: 'p-0', name: 'Other' });
    const stale = makeSummary({ id: 'p-1', name: 'Stale' });
    const trailing = makeSummary({ id: 'p-2', name: 'Another' });
    client.setQueryData(['products', 'b-1'], [leading, stale, trailing]);

    publishProduct(client, 'b-1', makeProduct({ name: 'Fresh' }));

    const list = client.getQueryData<ProductSummaryResponse[]>(['products', 'b-1']);
    expect(list).toEqual([leading, toProductSummary(makeProduct({ name: 'Fresh' })), trailing]);
    expect(list?.[0]).toBe(leading);
    expect(list?.[2]).toBe(trailing);
  });

  it('replaces the summary in the sales catalog list too', () => {
    const stale = makeSummary({ id: 'p-1', name: 'Stale' });
    client.setQueryData(catalogKeys.products('b-1'), [stale]);

    publishProduct(client, 'b-1', makeProduct({ name: 'Fresh' }));

    expect(client.getQueryData(catalogKeys.products('b-1'))).toEqual([
      toProductSummary(makeProduct({ name: 'Fresh' })),
    ]);
  });

  it('refreshes this product unit options from the saved units', () => {
    client.setQueryData(catalogKeys.productUnits('b-1', 'p-1'), [
      {
        id: 'u-base',
        productId: 'p-1',
        name: 'Bottle',
        purchaseCapable: true,
        sellCapable: true,
        unitRole: 'BASE' as const,
        dependsOn: null,
        conversionRate: null,
        price: 1,
      },
    ]);

    publishProduct(client, 'b-1', makeProduct());

    expect(client.getQueryData(catalogKeys.productUnits('b-1', 'p-1'))).toEqual([
      {
        id: 'u-base',
        productId: 'p-1',
        name: 'Bottle',
        purchaseCapable: true,
        sellCapable: true,
        unitRole: 'BASE',
        dependsOn: null,
        conversionRate: null,
        price: 250,
      },
      {
        id: 'u-mou',
        productId: 'p-1',
        name: 'Shot',
        purchaseCapable: true,
        sellCapable: true,
        unitRole: 'MOU',
        dependsOn: null,
        conversionRate: 25,
        price: 30,
      },
    ]);
  });

  it('leaves caches that have never loaded untouched', () => {
    publishProduct(client, 'b-1', makeProduct());

    expect(client.getQueryData(productKey('b-1', 'p-1'))).not.toBeUndefined();
    expect(client.getQueryData(['products', 'b-1'])).toBeUndefined();
    expect(client.getQueryData(catalogKeys.products('b-1'))).toBeUndefined();
    expect(client.getQueryData(catalogKeys.productUnits('b-1', 'p-1'))).toBeUndefined();
  });

  it('leaves a list that does not hold the product untouched', () => {
    const other = makeSummary({ id: 'p-0', name: 'Other' });
    client.setQueryData(['products', 'b-1'], [other]);

    publishProduct(client, 'b-1', makeProduct());

    const list = client.getQueryData<ProductSummaryResponse[]>(['products', 'b-1']);
    expect(list).toEqual([other]);
    expect(list?.[0]).toBe(other);
  });

  it('does not invalidate or refetch any query', () => {
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const refetch = vi.spyOn(client, 'refetchQueries');

    publishProduct(client, 'b-1', makeProduct());

    expect(invalidate).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
  });
});

import type { ProductUnitResponse, ProductWithUnitsResponse } from '@mez/types';

export const TIMESTAMP = '2026-01-01T00:00:00.000Z';

export function makeUnit(overrides: Partial<ProductUnitResponse>): ProductUnitResponse {
  return {
    id: 'pu-1',
    productId: 'p-1',
    unitRole: 'BASE',
    standardUnitId: 'su-pc',
    name: 'Piece',
    dependsOn: null,
    conversionRate: null,
    price: 250,
    purchaseCapable: true,
    sellCapable: true,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

export function makeProduct(): ProductWithUnitsResponse {
  return {
    id: 'p-1',
    businessId: 'b-1',
    branchId: 'br-1',
    categoryId: null,
    name: 'Honey',
    brand: 'Rosita',
    description: null,
    trackAsPartial: false,
    lowStockThreshold: 5,
    currentSealedStock: 0,
    active: true,
    uploadId: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    units: [
      makeUnit({}),
      makeUnit({
        id: 'pu-2',
        unitRole: 'CUSTOM',
        name: 'Shot',
        dependsOn: 'BASE',
        conversionRate: 25,
        price: null,
        purchaseCapable: true,
        sellCapable: false,
      }),
      makeUnit({
        id: 'pu-3',
        unitRole: 'MOU',
        standardUnitId: 'su-ml',
        name: 'ml',
        dependsOn: 'BASE',
        conversionRate: 750,
        price: 40,
        purchaseCapable: false,
      }),
    ],
  };
}

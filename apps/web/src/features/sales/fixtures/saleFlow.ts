import type { ProductSummaryResponse } from '@mez/types';

/**
 * Placeholder catalog for the new-sale UI while it is being built. This is a
 * runtime fixture, not test data — it stands in for `useBusinessProducts()`
 * until the sale flow is wired to the API, and mirrors that call's shape
 * (`ProductSummaryResponse`) so the cards need no change when it is swapped in.
 *
 * `uploadId` is left null so each card shows its image placeholder rather than
 * waiting on a signed download that has no backing upload here.
 */
export const saleProductsFixture: ProductSummaryResponse[] = [
  {
    id: 'prod_tequila',
    name: 'Sierra Tequila 350 ml',
    brand: 'Sierra',
    currentSealedStock: 46,
    lowStockThreshold: 12,
    active: true,
    uploadId: null,
    baseUnitLabel: 'Bottle',
  },
  {
    id: 'prod_oil',
    name: 'Cooking Oil 5 L',
    brand: 'Generics',
    currentSealedStock: 48,
    lowStockThreshold: 10,
    active: true,
    uploadId: null,
    baseUnitLabel: 'Bottle',
  },
  {
    id: 'prod_water',
    name: 'Ambo Water 2 L',
    brand: 'Ambo',
    currentSealedStock: 120,
    lowStockThreshold: 24,
    active: true,
    uploadId: null,
    baseUnitLabel: 'Bottle',
  },
  {
    id: 'prod_macaroni',
    name: 'Macaroni 500 g',
    brand: 'Azo',
    currentSealedStock: 8,
    lowStockThreshold: 15,
    active: true,
    uploadId: null,
    baseUnitLabel: 'Pack',
  },
  {
    id: 'prod_shiro',
    name: 'Shiro Powder 1 kg',
    brand: 'Mola',
    currentSealedStock: 30,
    lowStockThreshold: 10,
    active: true,
    uploadId: null,
    baseUnitLabel: 'Pack',
  },
  {
    id: 'prod_tomato',
    name: 'Tomato Paste 400 g',
    brand: 'Merti',
    currentSealedStock: 0,
    lowStockThreshold: 6,
    active: true,
    uploadId: null,
    baseUnitLabel: 'Tin',
  },
];

import type { ProductSummaryResponse, ProductUnitOptionResponse } from '@mez/types';

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

/**
 * Placeholder sellable units per product for the new-sale UI. Stands in for
 * `useProductUnits()` until the flow is wired, mirroring that call's shape
 * (`ProductUnitOptionResponse`) so the controls need no change when it swaps in.
 */
export const saleProductUnitsFixture: Record<string, ProductUnitOptionResponse[]> = {
  prod_tequila: [
    {
      id: 'unit_tequila_bottle',
      productId: 'prod_tequila',
      name: 'Bottle',
      unitRole: 'BASE',
      dependsOn: null,
      conversionRate: null,
      purchaseCapable: true,
      sellCapable: true,
      price: 850,
    },
    {
      id: 'unit_tequila_glass',
      productId: 'prod_tequila',
      name: 'Glass',
      unitRole: 'CUSTOM',
      dependsOn: 'BASE',
      conversionRate: 0.1,
      purchaseCapable: false,
      sellCapable: true,
      price: 90,
    },
  ],
  prod_oil: [
    {
      id: 'unit_oil_bottle',
      productId: 'prod_oil',
      name: 'Bottle',
      unitRole: 'BASE',
      dependsOn: null,
      conversionRate: null,
      purchaseCapable: true,
      sellCapable: true,
      price: 400,
    },
    {
      id: 'unit_oil_liter',
      productId: 'prod_oil',
      name: 'Liter',
      unitRole: 'STANDARD',
      dependsOn: 'MOU',
      conversionRate: 1000,
      purchaseCapable: true,
      sellCapable: true,
      price: 85,
    },
  ],
  prod_water: [
    {
      id: 'unit_water_bottle',
      productId: 'prod_water',
      name: 'Bottle',
      unitRole: 'BASE',
      dependsOn: null,
      conversionRate: null,
      purchaseCapable: true,
      sellCapable: true,
      price: 40,
    },
    {
      id: 'unit_water_pack',
      productId: 'prod_water',
      name: 'Pack (6 bottles)',
      unitRole: 'CUSTOM',
      dependsOn: 'BASE',
      conversionRate: 6,
      purchaseCapable: true,
      sellCapable: true,
      price: 200,
    },
  ],
  prod_macaroni: [
    {
      id: 'unit_macaroni_pack',
      productId: 'prod_macaroni',
      name: 'Pack',
      unitRole: 'BASE',
      dependsOn: null,
      conversionRate: null,
      purchaseCapable: true,
      sellCapable: true,
      price: 120,
    },
  ],
  prod_shiro: [
    {
      id: 'unit_shiro_pack',
      productId: 'prod_shiro',
      name: 'Pack',
      unitRole: 'BASE',
      dependsOn: null,
      conversionRate: null,
      purchaseCapable: true,
      sellCapable: true,
      price: 350,
    },
    {
      id: 'unit_shiro_kg',
      productId: 'prod_shiro',
      name: 'Kilogram',
      unitRole: 'STANDARD',
      dependsOn: 'MOU',
      conversionRate: 1000,
      purchaseCapable: true,
      sellCapable: true,
      price: 700,
    },
  ],
  prod_tomato: [
    {
      id: 'unit_tomato_tin',
      productId: 'prod_tomato',
      name: 'Tin',
      unitRole: 'BASE',
      dependsOn: null,
      conversionRate: null,
      purchaseCapable: true,
      sellCapable: true,
      price: 90,
    },
  ],
};

/** The sellable units a fixture product is offered in, or none. */
export function getSaleProductUnits(productId: string): ProductUnitOptionResponse[] {
  return saleProductUnitsFixture[productId] ?? [];
}

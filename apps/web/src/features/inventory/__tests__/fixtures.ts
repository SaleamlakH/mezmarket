import type {
  ProductInventorySummaryResponse,
  ProductUnitOptionResponse,
  StockBatchDetailResponse,
} from '@mez/types';

const FIXTURE_TIMESTAMP = '2026-09-28T08:00:00.000Z';

const makeProduct = (
  product: Omit<ProductInventorySummaryResponse, 'createdAt' | 'updatedAt'>,
): ProductInventorySummaryResponse => ({
  ...product,
  createdAt: FIXTURE_TIMESTAMP,
  updatedAt: FIXTURE_TIMESTAMP,
});

export const products: ProductInventorySummaryResponse[] = [
  makeProduct({
    id: 'prod_tequila',
    name: 'Sierra Tequila 350 ml',
    brand: 'Sierra',
    baseUnitLabel: 'Bottle',
    uploadId: null,
    currentSealedStock: 46,
    lowStockThreshold: 12,
    active: true,
    totalCost: 1240000,
    earliestExpiry: null,
    expiryCount: 0,
    numberOfBatches: 3,
    stockStatus: 'IN_STOCK',
  }),
  makeProduct({
    id: 'prod_oil',
    name: 'Cooking Oil 5 L',
    brand: 'Generics',
    baseUnitLabel: 'Bottle',
    uploadId: 'up_oil',
    currentSealedStock: 48,
    lowStockThreshold: 10,
    active: true,
    totalCost: 178560,
    earliestExpiry: '2026-10-20T00:00:00.000Z',
    expiryCount: 3,
    numberOfBatches: 2,
    stockStatus: 'IN_STOCK',
  }),
];

type PurchasableUnit = Omit<ProductUnitOptionResponse, 'purchaseCapable'> & {
  purchaseCapable: true;
};

/** Purchasable units of one product, keyed by that product's id. */
export const purchasableUnitsByProductId: Record<string, PurchasableUnit[]> = {
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
    },
    {
      id: 'unit_tequila_case',
      productId: 'prod_tequila',
      name: 'Case (12 bottles)',
      unitRole: 'CUSTOM',
      dependsOn: 'BASE',
      conversionRate: 12,
      purchaseCapable: true,
      sellCapable: false,
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
    },
  ],
};

export const batches: StockBatchDetailResponse[] = [
  {
    id: 'batch_2026_09_28',
    businessId: 'biz_demo',
    branchId: 'branch_main',
    batchDate: '2026-09-28T00:00:00.000Z',
    supplierName: 'Mango Wholesale',
    referenceNumber: 'INV-4482',
    confirmedAt: '2026-09-28T00:00:00.000Z',
    receivedBy: { id: 'member_owner', name: 'Demo Owner', role: 'OWNER' },
    receivedByMemberId: 'member_owner',
    lines: [
      {
        id: 'batch_2026_09_28_line_1',
        stockBatchId: 'batch_2026_09_28',
        productId: 'prod_tequila',
        productName: 'Sierra Tequila 350 ml',
        productBrand: 'Sierra',
        purchaseUnit: 'Case (12 bottles)',
        productUnitId: 'unit_tequila_case',
        purchaseQuantity: 12,
        purchaseUnitCost: 4200,
        standardUnit: 'Bottle',
        standardQuantity: 144,
        resolvedStandardUnitId: 'unit_tequila_bottle',
        quantityRemaining: 96,
        expiryDate: '2027-03-12T00:00:00.000Z',
        createdAt: FIXTURE_TIMESTAMP,
        updatedAt: FIXTURE_TIMESTAMP,
      },
      {
        id: 'batch_2026_09_28_line_2',
        stockBatchId: 'batch_2026_09_28',
        productId: 'prod_oil',
        productName: 'Cooking Oil 5 L',
        productBrand: 'Generics',
        purchaseUnit: 'Bottle',
        productUnitId: 'unit_oil_bottle',
        purchaseQuantity: 24,
        purchaseUnitCost: 320,
        standardUnit: 'Bottle',
        standardQuantity: 24,
        resolvedStandardUnitId: 'unit_oil_bottle',
        quantityRemaining: 18,
        expiryDate: '2026-10-20T00:00:00.000Z',
        createdAt: FIXTURE_TIMESTAMP,
        updatedAt: FIXTURE_TIMESTAMP,
      },
    ],
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
  },
];

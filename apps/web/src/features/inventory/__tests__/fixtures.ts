import type {
  ProductInventoryDetailResponse,
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

/**
 * One product's inventory detail: 70 kg of rice across three batch lines, one
 * already expired and one expiring within the week, bought partly by the sack.
 * Batches are newest batch date first, the order the API returns them in.
 */
export const productInventoryDetail: ProductInventoryDetailResponse = {
  id: 'prod_rice',
  name: 'Rice',
  brand: 'Generics',
  baseUnitLabel: 'Kilogram',
  uploadId: null,
  currentSealedStock: 70,
  lowStockThreshold: 10,
  active: true,
  totalCost: 134.2,
  earliestExpiry: '2026-10-09T00:00:00.000Z',
  expiryCount: 2,
  numberOfBatches: 3,
  stockStatus: 'IN_STOCK',
  batches: [
    {
      id: 'batch_rice_0042',
      batchDate: '2026-10-17T00:00:00.000Z',
      supplierName: 'Mango Wholesale',
      referenceNumber: '0042',
      lines: [
        {
          id: 'line_rice_0042',
          purchaseQuantity: 12,
          purchaseUnit: 'Kilogram',
          purchaseUnitCost: 2,
          standardQuantity: 12,
          standardUnit: 'kg',
          quantityRemaining: 12,
          expiryDate: null,
        },
      ],
    },
    {
      id: 'batch_rice_0038',
      batchDate: '2026-10-03T00:00:00.000Z',
      supplierName: 'Mango Wholesale',
      referenceNumber: '0038',
      lines: [
        {
          id: 'line_rice_0038',
          purchaseQuantity: 2,
          purchaseUnit: 'Sack',
          purchaseUnitCost: 95,
          standardQuantity: 100,
          standardUnit: 'kg',
          quantityRemaining: 50,
          expiryDate: '2026-10-24T00:00:00.000Z',
        },
      ],
    },
    {
      id: 'batch_rice_0031',
      batchDate: '2026-09-12T00:00:00.000Z',
      supplierName: 'Mango Wholesale',
      referenceNumber: '0031',
      lines: [
        {
          id: 'line_rice_0031',
          purchaseQuantity: 20,
          purchaseUnit: 'Kilogram',
          purchaseUnitCost: 1.9,
          standardQuantity: 20,
          standardUnit: 'kg',
          quantityRemaining: 8,
          expiryDate: '2026-10-09T00:00:00.000Z',
        },
      ],
    },
  ],
};

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
      price: 850,
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
      price: null,
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

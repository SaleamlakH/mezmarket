import type {
  BusinessMemberSummaryResponse,
  CustomerSummaryResponse,
  ProductSummaryResponse,
  ProductUnitOptionResponse,
} from '@mez/types';

/** Placeholder products for the new-sale UI. */
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

/** Placeholder sellable units per product. */
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

/** Placeholder customers for the attach-customer picker. */
export const saleCustomersFixture: CustomerSummaryResponse[] = [
  {
    id: 'cust_abebe',
    name: 'Abebe Kebede',
    contactPhone: '+251 911 234 567',
    contactEmail: null,
  },
  {
    id: 'cust_hanna',
    name: 'Hanna Tesfaye',
    contactPhone: '+251 912 345 678',
    contactEmail: 'hanna@example.com',
  },
  {
    id: 'cust_dawit',
    name: 'Dawit Alemu',
    contactPhone: null,
    contactEmail: 'dawit.alemu@example.com',
  },
  {
    id: 'cust_meron',
    name: 'Meron Girma',
    contactPhone: '+251 913 456 789',
    contactEmail: null,
  },
];

/** Placeholder servers for the attach-server picker. */
export const saleServersFixture: BusinessMemberSummaryResponse[] = [
  {
    id: 'srv_abel',
    name: 'Abel Yohannes',
    role: 'SERVER',
  },
  {
    id: 'srv_fikir',
    name: 'Fikir Tadesse',
    role: 'SERVER',
  },
  {
    id: 'srv_samuel',
    name: 'Samuel Getahun',
    role: 'SERVER',
  },
];

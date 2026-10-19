import type { QueryClient } from '@tanstack/react-query';
import type {
  ProductSummaryResponse,
  ProductUnitOptionResponse,
  ProductWithUnitsResponse,
} from '@mez/types';
import { catalogKeys } from '@/hooks/useCatalogApi';

export function productKey(businessId: string, productId: string) {
  return ['product', businessId, productId] as const;
}

/**
 * The catalog lists answer with summaries, so a product read or just written is
 * projected down to that shape before it is written into a list cache.
 */
export function toProductSummary(product: ProductWithUnitsResponse): ProductSummaryResponse {
  const baseUnit = product.units.find((unit) => unit.unitRole === 'BASE');
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    currentSealedStock: product.currentSealedStock,
    lowStockThreshold: product.lowStockThreshold,
    active: product.active,
    baseUnitLabel: baseUnit?.name ?? '',
    uploadId: product.uploadId,
  };
}

function toUnitOptions(product: ProductWithUnitsResponse): ProductUnitOptionResponse[] {
  return product.units.map((unit) => ({
    id: unit.id,
    productId: unit.productId,
    name: unit.name,
    purchaseCapable: unit.purchaseCapable,
    sellCapable: unit.sellCapable,
    unitRole: unit.unitRole,
    dependsOn: unit.dependsOn,
    conversionRate: unit.conversionRate,
    price: unit.price,
  }));
}

/**
 * Replaces the cached row for one product, leaving its neighbours and their order
 * untouched. A list that has never loaded is left alone - its next read is fresh.
 */
function replaceSummary(
  products: ProductSummaryResponse[] | undefined,
  summary: ProductSummaryResponse,
): ProductSummaryResponse[] | undefined {
  if (!products) return products;

  let found = false;
  const next = products.map((product) => {
    if (product.id !== summary.id) return product;
    found = true;
    return summary;
  });

  return found ? next : products;
}

/**
 * Writes the server's copy of a product into the caches that already hold it: its
 * own detail query, the product catalog, and its unit options. Only that one
 * product's rows are touched, so no list is refetched and nothing else goes stale.
 */
export function publishProduct(
  queryClient: QueryClient,
  businessId: string,
  product: ProductWithUnitsResponse,
): void {
  const summary = toProductSummary(product);

  queryClient.setQueryData(productKey(businessId, product.id), product);
  queryClient.setQueryData<ProductSummaryResponse[]>(['products', businessId], (old) =>
    replaceSummary(old, summary),
  );
  queryClient.setQueryData<ProductSummaryResponse[]>(catalogKeys.products(businessId), (old) =>
    replaceSummary(old, summary),
  );
  queryClient.setQueryData<ProductUnitOptionResponse[]>(
    catalogKeys.productUnits(businessId, product.id),
    (old) => (old ? toUnitOptions(product) : old),
  );
}

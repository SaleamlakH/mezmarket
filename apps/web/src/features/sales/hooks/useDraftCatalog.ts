import { useMemo } from 'react';
import type { ProductSummaryResponse, ProductUnitOptionResponse } from '@mez/types';
import { useBusinessProducts, useProductUnitsSnapshot } from '@/hooks/useCatalogApi';
import type { SaleDraftCatalog } from '../lib/saleDraftView';
import type { SaleDraftLine } from '../state/saleDraft';

const NO_UNITS: ProductUnitOptionResponse[] = [];

/** The drafted lines joined to the product/unit caches they point at. */
export function useDraftCatalog(lines: SaleDraftLine[]): SaleDraftCatalog {
  const { data: products = [] } = useBusinessProducts();
  const productIds = useMemo(() => [...new Set(lines.map((line) => line.productId))], [lines]);
  const unitsByProduct = useProductUnitsSnapshot(productIds);

  return useMemo(() => {
    const productById = new Map<string, ProductSummaryResponse>(
      products.map((product) => [product.id, product]),
    );
    const unitsById = new Map<string, ProductUnitOptionResponse[]>(
      unitsByProduct.map((entry) => [entry.productId, entry.units]),
    );

    return {
      productForId: (productId) => productById.get(productId),
      unitsForProduct: (productId) => unitsById.get(productId) ?? NO_UNITS,
    };
  }, [products, unitsByProduct]);
}

import { useMemo } from 'react';
import type {
  ProductSummaryResponse,
  ProductUnitOptionResponse,
  SaleLineFormValues,
} from '@mez/types';
import { useQueryClient } from '@tanstack/react-query';
import { catalogKeys } from '@/hooks/useCatalogApi';
import { lineTotal } from '@/lib/lineTotal';
import { useBusinessContext } from '@/providers/business/useBusinessContext';

/** A draft line joined with the catalog entries it points at. */
export interface SaleLineRow {
  line: SaleLineFormValues;
  product: ProductSummaryResponse | undefined;
  unit: ProductUnitOptionResponse | undefined;
  unitPrice: number | null;
  total: number | null;
}

/**
 * The new-sale session's catalog entries for the lines on screen. Product and
 * unit names are read back from the query cache instead of requested again,
 * since opening the picker and the line form already fetched them.
 */
export function useSaleLineList(lines: SaleLineFormValues[]) {
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

  return useMemo(() => {
    const cachedProducts = businessId
      ? queryClient.getQueryData<ProductSummaryResponse[]>(catalogKeys.products(businessId))
      : undefined;

    const unitsByProductId: Record<string, ProductUnitOptionResponse[]> = {};
    if (businessId) {
      for (const productId of new Set(lines.map((line) => line.productId))) {
        const units = queryClient.getQueryData<ProductUnitOptionResponse[]>(
          catalogKeys.productUnits(businessId, productId),
        );
        if (units) unitsByProductId[productId] = units;
      }
    }

    const rows: SaleLineRow[] = lines.map((line) => {
      const product = cachedProducts?.find((entry) => entry.id === line.productId);
      const unit = unitsByProductId[line.productId]?.find(
        (entry) => entry.id === line.productUnitId,
      );
      const unitPrice = unit?.price ?? null;

      return { line, product, unit, unitPrice, total: lineTotal(line.quantity, unitPrice) };
    });

    return { products: cachedProducts, unitsByProductId, rows };
  }, [lines, queryClient, businessId]);
}

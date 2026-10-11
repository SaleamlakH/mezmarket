import type {
  BatchLineFormValues,
  ProductSummaryResponse,
  ProductUnitOptionResponse,
} from '@mez/types';
import { useQueryClient } from '@tanstack/react-query';
import { catalogKeys } from '@/hooks/useCatalogApi';
import { useBusinessContext } from '@/providers/business/useBusinessContext';

/**
 * The add-batch session's catalog entries for the lines on screen. Product
 * and unit names are read back from the query cache instead of requested
 * again, since opening the picker and the line form already fetched them.
 */
export function useBatchLineList(lines: BatchLineFormValues[]) {
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;

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

  return { cachedProducts, unitsByProductId };
}

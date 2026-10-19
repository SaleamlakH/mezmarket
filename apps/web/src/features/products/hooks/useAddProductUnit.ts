import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateProductUnitInput } from '@mez/types';
import { publishProduct } from '@/lib/productCache';
import {
  productsService as defaultProductsService,
  type ProductsService,
} from '../api/productsService';
import { unitsService as defaultUnitsService, type UnitsService } from '../api/unitsService';

export interface UseAddProductUnitOptions {
  businessId: string;
  productId: string;
  service?: ProductsService;
  unitsService?: UnitsService;
  onAdded?: ((input: CreateProductUnitInput) => void) | undefined;
}

/**
 * Adds one unit to an existing product. The response is the whole product, so it is
 * published straight into the detail cache and every card reads the new row.
 */
export function useAddProductUnit({
  businessId,
  productId,
  service = defaultProductsService,
  unitsService = defaultUnitsService,
  onAdded,
}: UseAddProductUnitOptions) {
  const queryClient = useQueryClient();

  const unitsQuery = useQuery({
    queryKey: ['units'],
    queryFn: unitsService.listUnits,
    staleTime: Infinity,
  });

  const addUnit = useCallback(
    async (input: CreateProductUnitInput) => {
      const saved = await service.createProductUnit(businessId, productId, input);
      publishProduct(queryClient, businessId, saved);
      onAdded?.(input);
      return saved;
    },
    [businessId, onAdded, productId, queryClient, service],
  );

  return {
    dimensions: unitsQuery.data?.dimensions ?? [],
    addUnit,
  };
}

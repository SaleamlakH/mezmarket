import { useMemo } from 'react';
import type {
  ProductSummaryResponse,
  ProductUnitOptionResponse,
  SaleLineFormValues,
} from '@mez/types';
import { products, sellableUnitsByProductId } from '../__tests__/fixtures';
import { lineTotal } from '@/lib/lineTotal';

/** A draft line joined with the catalog entries it points at. */
export interface SaleLineRow {
  line: SaleLineFormValues;
  product: ProductSummaryResponse | undefined;
  unit: ProductUnitOptionResponse | undefined;
  unitPrice: number | null;
  total: number | null;
}

/** Joins each draft line to its catalog product and unit; fixtures stand in until the API is wired. */
export function useSaleLineList(lines: SaleLineFormValues[]) {
  return useMemo(() => {
    const unitsByProductId: Record<string, ProductUnitOptionResponse[]> = {};
    for (const productId of new Set(lines.map((line) => line.productId))) {
      unitsByProductId[productId] = sellableUnitsByProductId[productId] ?? [];
    }

    const rows: SaleLineRow[] = lines.map((line) => {
      const product = products.find((entry) => entry.id === line.productId);
      const unit = (sellableUnitsByProductId[line.productId] ?? []).find(
        (entry) => entry.id === line.productUnitId,
      );
      const unitPrice = unit?.price ?? null;

      return { line, product, unit, unitPrice, total: lineTotal(line.quantity, unitPrice) };
    });

    return { products, unitsByProductId, rows };
  }, [lines]);
}

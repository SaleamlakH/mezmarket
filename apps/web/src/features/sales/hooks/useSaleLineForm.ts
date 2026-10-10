import { useCallback, useMemo, useState } from 'react';
import type {
  ProductSummaryResponse,
  ProductUnitOptionResponse,
  SaleLineFormValues,
} from '@mez/types';
import { lineTotal } from '@/lib/lineTotal';

export interface UseSaleLineFormOptions {
  product: ProductSummaryResponse;
  units: ProductUnitOptionResponse[];
  initialLine?: SaleLineFormValues | undefined;
  onSave: (line: SaleLineFormValues) => void;
}

/** A sale line's unit and quantity, with the line total derived from the unit price. Not validated yet. */
export function useSaleLineForm({ product, units, initialLine, onSave }: UseSaleLineFormOptions) {
  const [productUnitId, setProductUnitId] = useState(initialLine?.productUnitId ?? '');
  const [quantity, setQuantity] = useState(initialLine?.quantity ?? '');

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === productUnitId) ?? null,
    [units, productUnitId],
  );

  const unitPrice = selectedUnit?.price ?? null;
  const total = lineTotal(quantity, unitPrice);

  const save = useCallback(() => {
    onSave({
      productId: product.id,
      productUnitId,
      quantity,
      sellCapable: selectedUnit?.sellCapable,
    });
  }, [onSave, product.id, productUnitId, quantity, selectedUnit?.sellCapable]);

  return {
    productUnitId,
    setProductUnitId,
    quantity,
    setQuantity,
    selectedUnit,
    unitPrice,
    total,
    save,
  };
}

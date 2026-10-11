import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import type {
  CreateSaleLineInput,
  ProductSummaryResponse,
  ProductUnitOptionResponse,
  SaleLineFormValues,
} from '@mez/types';
import { createSaleLineSchema } from '@mez/validation';
import { lineTotal } from '@/lib/lineTotal';

export interface UseSaleLineFormOptions {
  product: ProductSummaryResponse;
  units: ProductUnitOptionResponse[];
  initialLine?: SaleLineFormValues | undefined;
  onSave: (line: SaleLineFormValues) => void;
}

/**
 * The blank line for a picked product, or the line being edited with the
 * fast-forward sellable flag seeded from the unit it was already sold in.
 */
function defaultLine(
  productId: string,
  units: ProductUnitOptionResponse[],
  initialLine?: SaleLineFormValues,
): SaleLineFormValues {
  if (!initialLine) return { productId, productUnitId: '', quantity: '' };

  const unit = units.find((entry) => entry.id === initialLine.productUnitId);
  return { ...initialLine, ...(unit ? { sellCapable: unit.sellCapable } : {}) };
}

/** A sale line's unit and quantity, with the line total derived from the unit price. */
export function useSaleLineForm({ product, units, initialLine, onSave }: UseSaleLineFormOptions) {
  const form = useForm<SaleLineFormValues, unknown, CreateSaleLineInput>({
    resolver: zodResolver(createSaleLineSchema),
    defaultValues: defaultLine(product.id, units, initialLine),
    mode: 'onTouched',
  });

  const productUnitId = useWatch({ control: form.control, name: 'productUnitId' });
  const quantity = useWatch({ control: form.control, name: 'quantity' });

  const selectedUnit = units.find((unit) => unit.id === productUnitId) ?? null;
  const unitPrice = selectedUnit?.price ?? null;
  const total = lineTotal(quantity, unitPrice);

  // Carry the fast-forward flag with the picked unit so the schema's
  // sellable-unit check points its error at the unit selector. Set alongside
  // the unit rather than from an effect, so no update lands after mount.
  const setProductUnitId = (value: string) => {
    const unit = units.find((entry) => entry.id === value);
    form.setValue('sellCapable', unit?.sellCapable, { shouldValidate: false });
    form.setValue('productUnitId', value, { shouldValidate: true });
  };

  const setQuantity = (value: string) => {
    form.setValue('quantity', value, { shouldValidate: true });
  };

  const { errors } = form.formState;
  const submit = form.handleSubmit(() => onSave(form.getValues()));

  return {
    form,
    errors,
    submit,
    productUnitId,
    setProductUnitId,
    quantity,
    setQuantity,
    selectedUnit,
    unitPrice,
    total,
  };
}

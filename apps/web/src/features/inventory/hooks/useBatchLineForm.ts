import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import type { BatchLineFormValues, CreateBatchLineInput, ProductSummaryResponse } from '@mez/types';
import { createBatchLineSchema } from '@mez/validation';
import { lineTotal } from '../lib/lineTotal';

const emptyLineFor = (productId: string): BatchLineFormValues => ({
  productId,
  productUnitId: '',
  purchaseQuantity: '',
  purchaseUnitCost: '',
});

export interface UseBatchLineFormOptions {
  product: ProductSummaryResponse;
  initialLine?: BatchLineFormValues | undefined;
  onSave: (line: BatchLineFormValues) => void;
}

export function useBatchLineForm({ product, initialLine, onSave }: UseBatchLineFormOptions) {
  const form = useForm<BatchLineFormValues, unknown, CreateBatchLineInput>({
    resolver: zodResolver(createBatchLineSchema),
    defaultValues: initialLine ?? emptyLineFor(product.id),
    mode: 'onTouched',
  });

  const { errors } = form.formState;
  const total = useWatch({
    control: form.control,
    compute: lineTotal,
  });

  const submit = form.handleSubmit(() => onSave(form.getValues()));

  return {
    form,
    errors,
    submit,
    total,
  };
}

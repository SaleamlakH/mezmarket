import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { BatchFormValues, BatchLineFormValues, CreateBatchInput } from '@mez/types';
import { createBatchSchema } from '@mez/validation';
import { lineTotal } from '../lib/lineTotal';
import { useInventoryData } from './useInventoryData';

const freshDraft = (): BatchFormValues => ({
  batchDate: new Date().toISOString(),
  supplierName: '',
  referenceNumber: '',
  lines: [],
});

function linesRootMessage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const nested = error as { root?: { message?: string }; message?: string };
  return nested.root?.message ?? nested.message;
}

export interface UseAddBatchOptions {
  onClose: () => void;
}

export function useAddBatch({ onClose }: UseAddBatchOptions) {
  const { products, purchasableUnitsByProductId } = useInventoryData();

  const form = useForm<BatchFormValues, unknown, CreateBatchInput>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: freshDraft(),
    mode: 'onTouched',
  });

  const { append, update, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const [isConfirmed, setIsConfirmed] = useState(false);

  const lines = useWatch({ control: form.control, name: 'lines' });
  const { errors } = form.formState;

  const confirm = form.handleSubmit(() => {
    setIsConfirmed(true);
  });

  const close = () => {
    form.reset(freshDraft());
    setIsConfirmed(false);
    onClose();
  };

  return {
    form,
    errors,
    linesError: linesRootMessage(errors.lines),
    isConfirmed,
    confirm,
    dismissConfirmed: () => setIsConfirmed(false),
    close,
    products,
    purchasableUnitsByProductId,
    lines,
    totalAmount: lines.reduce((sum, line) => sum + (lineTotal(line) ?? 0), 0),
    addLine: (line: BatchLineFormValues) => append(line),
    updateLine: (index: number, line: BatchLineFormValues) => update(index, line),
    removeLine: (index: number) => remove(index),
  };
}

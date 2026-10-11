import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { CreateSaleInput, SaleFormValues, SaleLineFormValues } from '@mez/types';
import { createSaleSchema } from '@mez/validation';

const freshDraft = (): SaleFormValues => ({
  saleDatetime: new Date().toISOString(),
  lines: [],
});

function linesRootMessage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const nested = error as { root?: { message?: string }; message?: string };
  return nested.root?.message ?? nested.message;
}

/** The new-sale draft with form-level validation. */
export function useNewSale() {
  const form = useForm<SaleFormValues, unknown, CreateSaleInput>({
    resolver: zodResolver(createSaleSchema),
    defaultValues: freshDraft(),
    mode: 'onTouched',
  });

  const { append, update, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const lines = useWatch({ control: form.control, name: 'lines' });
  const { errors } = form.formState;

  return {
    form,
    linesError: linesRootMessage(errors.lines),
    lines,
    addLine: (line: SaleLineFormValues) => append(line),
    updateLine: (index: number, line: SaleLineFormValues) => update(index, line),
    removeLine: (index: number) => remove(index),
    reset: () => form.reset(freshDraft()),
  };
}

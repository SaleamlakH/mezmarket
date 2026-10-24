import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { validateUpdateBusiness, type UpdateBusinessFormValues } from '@mez/validation';
import type { BusinessResponse, UpdateBusinessInput } from '@mez/types';
import { useForm } from '@/hooks/useForm';
import { businessService } from '@/features/business/api/businessService';

/**
 * Raw form state for the business edit. Numeric fields stay as strings until
 * validation (matching the generic useForm flow); the update payload only
 * carries the fields a user actually set.
 */
export type BusinessEditFormValues = Omit<
  UpdateBusinessFormValues,
  'defaultTaxRate' | 'lowStockDefaultThreshold' | 'allowNegativeStock'
> & {
  defaultTaxRate: number | string;
  lowStockDefaultThreshold: number | string;
  allowNegativeStock: boolean;
};

export function toEditFormValues(business: BusinessResponse): BusinessEditFormValues {
  return {
    ...business,
    defaultTaxRate: business.defaultTaxRate ?? '',
    lowStockDefaultThreshold: business.lowStockDefaultThreshold ?? '',
  };
}

function valuesEqual(a: BusinessEditFormValues, b: BusinessEditFormValues): boolean {
  return (
    a.name === b.name &&
    a.currencyCode === b.currencyCode &&
    String(a.defaultTaxRate) === String(b.defaultTaxRate) &&
    a.taxDisplayMode === b.taxDisplayMode &&
    a.allowNegativeStock === b.allowNegativeStock &&
    String(a.lowStockDefaultThreshold) === String(b.lowStockDefaultThreshold)
  );
}

export function useBusinessEditForm(
  business: BusinessResponse,
  options?: { onSaved?: (updated: BusinessResponse) => void },
) {
  const { onSaved } = options ?? {};
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState<BusinessEditFormValues>(() => toEditFormValues(business));

  const mutation = useMutation({
    mutationFn: (input: UpdateBusinessInput) => businessService.updateBusiness(business.id, input),
  });

  const form = useForm<BusinessEditFormValues, UpdateBusinessFormValues>({
    initialValues: toEditFormValues(business),
    validate: (values) => validateUpdateBusiness(values as unknown as UpdateBusinessFormValues),
    onSubmit: async (data) => {
      const updated = await mutation.mutateAsync(data);
      const next = toEditFormValues(updated);
      setSaved(next);
      void queryClient.invalidateQueries({ queryKey: ['businesses'] });
      onSaved?.(updated);
    },
    onSuccess: () => {},
  });

  const isDirty = useMemo(() => !valuesEqual(form.values, saved), [form.values, saved]);

  return {
    ...form,
    isDirty,
    isSaving: form.status === 'submitting',
    reset: () => form.reset(saved),
  };
}

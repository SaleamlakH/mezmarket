import { useCallback, useEffect, useState } from 'react';
import type { Resolver } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import type {
  ProductFieldsFormValues,
  ProductWithUnitsResponse,
  UpdateProductInput,
} from '@mez/types';
import { updateProductSchema } from '@mez/validation';
import { ApiError } from '@/lib/apiClient';
import { publishProduct } from '@/lib/productCache';
import {
  productsService as defaultProductsService,
  type ProductsService,
} from '../api/productsService';

export interface UseProductFieldsFormOptions {
  businessId: string;
  product: ProductWithUnitsResponse;
  onSaved?: ((message: string) => void) | undefined;
  service?: ProductsService;
}

function fieldsFrom(product: ProductWithUnitsResponse): ProductFieldsFormValues {
  return {
    name: product.name,
    brand: product.brand ?? '',
    description: product.description ?? '',
    lowStockThreshold: product.lowStockThreshold != null ? String(product.lowStockThreshold) : '',
    trackAsPartial: product.trackAsPartial,
    categoryId: product.categoryId ?? '',
  };
}

/**
 * The product's own fields as one editable card: RHF holds the values and the shared
 * update schema decides what may be written. The edit is a full replace, so every
 * field travels — including the category, which this card does not show.
 */
export function useProductFieldsForm({
  businessId,
  product,
  service = defaultProductsService,
  onSaved,
}: UseProductFieldsFormOptions) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const form = useForm<ProductFieldsFormValues, unknown, UpdateProductInput>({
    resolver: zodResolver(updateProductSchema) as Resolver<
      ProductFieldsFormValues,
      unknown,
      UpdateProductInput
    >,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: fieldsFrom(product),
  });

  const { reset, handleSubmit, formState, setError, clearErrors } = form;

  // A product changed elsewhere — a unit added, the photo replaced — gives this card
  // a new server copy, which is the point at which its baseline is refreshed. An
  // edit already in progress is left alone rather than discarded underneath it.
  useEffect(() => {
    if (!form.formState.isDirty) reset(fieldsFrom(product));
  }, [form.formState.isDirty, product, reset]);

  const startEditing = useCallback(() => {
    clearErrors();
    setEditing(true);
  }, [clearErrors]);

  const cancel = useCallback(() => {
    reset(fieldsFrom(product));
    setEditing(false);
  }, [product, reset]);

  const submit = handleSubmit(async (values) => {
    if (!formState.isDirty) {
      setEditing(false);
      return;
    }

    try {
      const saved = await service.updateProduct(businessId, product.id, values);
      publishProduct(queryClient, businessId, saved);
      reset(fieldsFrom(saved));
      setEditing(false);
      onSaved?.('Changes saved.');
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        for (const [field, message] of Object.entries(error.details)) {
          setError(field as keyof ProductFieldsFormValues, { type: 'server', message });
        }
      }
      setError('root', {
        type: 'server',
        message: error instanceof Error ? error.message : 'Something went wrong',
      });
    }
  });

  return {
    form,
    editing,
    startEditing,
    cancel,
    submit,
    isDirty: formState.isDirty,
    isSaving: formState.isSubmitting,
    error: formState.errors.root?.message ?? null,
  };
}

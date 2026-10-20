import { useCallback, useEffect, useState } from 'react';
import type { Resolver } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import type { ProductWithUnitsResponse, UpdateProductActiveInput } from '@mez/types';
import { updateProductActiveSchema } from '@mez/validation';
import { publishProduct } from '@/lib/productCache';
import {
  productsService as defaultProductsService,
  type ProductsService,
} from '../api/productsService';

export interface UseProductActiveFormOptions {
  businessId: string;
  product: ProductWithUnitsResponse;
  onSaved?: ((message: string) => void) | undefined;
  service?: ProductsService;
}

/**
 * The product's availability as its own card. The form holds the next value while the
 * confirmation sheet is open; only confirming writes it.
 */
export function useProductActiveForm({
  businessId,
  product,
  service = defaultProductsService,
  onSaved,
}: UseProductActiveFormOptions) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const form = useForm<UpdateProductActiveInput, unknown, UpdateProductActiveInput>({
    resolver: zodResolver(updateProductActiveSchema) as Resolver<
      UpdateProductActiveInput,
      unknown,
      UpdateProductActiveInput
    >,
    defaultValues: { active: product.active },
  });

  const { reset, handleSubmit, formState, setError, setValue, clearErrors } = form;

  useEffect(() => {
    reset({ active: product.active });
  }, [product.active, reset]);

  const requestToggle = useCallback(() => {
    clearErrors();
    setValue('active', !product.active);
    setConfirmOpen(true);
  }, [clearErrors, product.active, setValue]);

  const cancelToggle = useCallback(() => {
    clearErrors();
    setConfirmOpen(false);
    reset({ active: product.active });
  }, [clearErrors, product.active, reset]);

  const confirm = handleSubmit(async (values) => {
    try {
      const saved = await service.setProductActive(businessId, product.id, values);
      publishProduct(queryClient, businessId, saved);
      reset({ active: saved.active });
      setConfirmOpen(false);
      onSaved?.(saved.active ? 'Product reactivated.' : 'Product deactivated.');
    } catch (error) {
      setError('root', {
        type: 'server',
        message: error instanceof Error ? error.message : 'Something went wrong',
      });
    }
  });

  return {
    active: product.active,
    isSaving: formState.isSubmitting,
    error: formState.errors.root?.message ?? null,
    confirmOpen,
    requestToggle,
    cancelToggle,
    confirm,
  };
}

import { useCallback, useEffect, useState } from 'react';
import type { FieldPath, Resolver } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import type {
  ProductUnitResponse,
  ProductWithUnitsResponse,
  UpdateCustomUnitFormValues,
  UpdateProductUnitsInput,
} from '@mez/types';
import { updateProductUnitsSchema } from '@mez/validation';
import { ApiError } from '@/lib/apiClient';
import { publishProduct } from '@/lib/productCache';
import {
  productsService as defaultProductsService,
  type ProductsService,
} from '../api/productsService';

type CustomUnitRowFormValues = UpdateCustomUnitFormValues & { unitRole: 'CUSTOM' };

export interface CustomUnitsFormValues {
  units: CustomUnitRowFormValues[];
}

export type CustomUnitsFormOutput = UpdateProductUnitsInput;

export interface UseCustomUnitsFormOptions {
  businessId: string;
  product: ProductWithUnitsResponse;
  onSaved?: ((message: string) => void) | undefined;
  service?: ProductsService;
}

function customUnitsFrom(product: ProductWithUnitsResponse): CustomUnitsFormValues {
  return {
    units: product.units
      .filter((unit) => unit.unitRole === 'CUSTOM')
      .map((unit) => {
        const common = {
          unitRole: 'CUSTOM' as const,
          id: unit.id,
          name: unit.name,
          price: unit.price != null ? String(unit.price) : '',
          purchaseCapable: unit.purchaseCapable,
        };

        return unit.sellCapable
          ? { ...common, sellCapable: true as const }
          : { ...common, sellCapable: false as const };
      }),
  };
}

function customUnitRoles(product: ProductWithUnitsResponse): ProductUnitResponse[] {
  return product.units.filter((unit) => unit.unitRole === 'CUSTOM');
}

/**
 * The owner's own units as one card. Their names, prices and capabilities travel as a
 * list to the units endpoint, which is also where the platform units are written.
 */
export function useCustomUnitsForm({
  businessId,
  product,
  service = defaultProductsService,
  onSaved,
}: UseCustomUnitsFormOptions) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const form = useForm<CustomUnitsFormValues, unknown, UpdateProductUnitsInput>({
    resolver: zodResolver(updateProductUnitsSchema) as unknown as Resolver<
      CustomUnitsFormValues,
      unknown,
      UpdateProductUnitsInput
    >,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: customUnitsFrom(product),
  });

  const { reset, handleSubmit, formState, setError, clearErrors } = form;

  useEffect(() => {
    if (!form.formState.isDirty) reset(customUnitsFrom(product));
  }, [form.formState.isDirty, product, reset]);

  const startEditing = useCallback(() => {
    clearErrors();
    setEditing(true);
  }, [clearErrors]);

  const cancel = useCallback(() => {
    reset(customUnitsFrom(product));
    setEditing(false);
  }, [product, reset]);

  const submit = handleSubmit(async (values) => {
    if (!formState.isDirty) {
      setEditing(false);
      return;
    }

    try {
      const saved = await service.updateProductUnits(businessId, product.id, values);
      publishProduct(queryClient, businessId, saved);
      reset(customUnitsFrom(saved));
      setEditing(false);
      onSaved?.('Changes saved.');
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        for (const [field, message] of Object.entries(error.details)) {
          setError(field as FieldPath<CustomUnitsFormValues>, {
            type: 'server',
            message,
          });
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
    units: customUnitRoles(product),
  };
}

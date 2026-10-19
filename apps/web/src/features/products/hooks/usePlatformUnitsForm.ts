import { useCallback, useEffect, useState } from 'react';
import type { FieldPath, Resolver } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import type {
  ProductUnitResponse,
  ProductWithUnitsResponse,
  UpdateProductUnitsInput,
} from '@mez/types';
import { updateProductUnitsSchema } from '@mez/validation';
import { ApiError } from '@/lib/apiClient';
import { publishProduct } from '@/lib/productCache';
import {
  productsService as defaultProductsService,
  type ProductsService,
} from '../api/productsService';

export interface PlatformUnitFormValues {
  unitRole: 'BASE' | 'MOU';
  id: string;
  price: string;
}

export interface PlatformUnitsFormValues {
  units: PlatformUnitFormValues[];
}

export interface UsePlatformUnitsFormOptions {
  businessId: string;
  product: ProductWithUnitsResponse;
  onSaved?: ((message: string) => void) | undefined;
  service?: ProductsService;
}

function unitsFrom(product: ProductWithUnitsResponse): PlatformUnitsFormValues {
  const rows: PlatformUnitFormValues[] = [];

  for (const role of ['BASE', 'MOU'] as const) {
    const unit = product.units.find((candidate) => candidate.unitRole === role);
    if (!unit) continue;
    rows.push({
      unitRole: role,
      id: unit.id,
      price: unit.price != null ? String(unit.price) : '',
    });
  }

  return { units: rows };
}

function platformUnit(
  product: ProductWithUnitsResponse,
  role: 'BASE' | 'MOU',
): ProductUnitResponse | null {
  return product.units.find((unit) => unit.unitRole === role) ?? null;
}

/**
 * The platform-owned units as one card. Both rows travel as a list to the same units
 * endpoint the custom units use; only the selling price is editable.
 */
export function usePlatformUnitsForm({
  businessId,
  product,
  service = defaultProductsService,
  onSaved,
}: UsePlatformUnitsFormOptions) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const form = useForm<PlatformUnitsFormValues, unknown, UpdateProductUnitsInput>({
    resolver: zodResolver(updateProductUnitsSchema) as unknown as Resolver<
      PlatformUnitsFormValues,
      unknown,
      UpdateProductUnitsInput
    >,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: unitsFrom(product),
  });

  const { reset, handleSubmit, formState, setError, clearErrors } = form;

  useEffect(() => {
    if (!form.formState.isDirty) reset(unitsFrom(product));
  }, [form.formState.isDirty, product, reset]);

  const startEditing = useCallback(() => {
    clearErrors();
    setEditing(true);
  }, [clearErrors]);

  const cancel = useCallback(() => {
    reset(unitsFrom(product));
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
      reset(unitsFrom(saved));
      setEditing(false);
      onSaved?.('Changes saved.');
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        for (const [field, message] of Object.entries(error.details)) {
          setError(field as FieldPath<PlatformUnitsFormValues>, {
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
    baseUnit: platformUnit(product, 'BASE'),
    contentUnit: platformUnit(product, 'MOU'),
  };
}

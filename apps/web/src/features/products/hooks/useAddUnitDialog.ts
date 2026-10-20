import { useCallback, useMemo, useState } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type {
  CreateCustomUnitFormValues,
  CreateProductUnitInput,
  DimensionResponse,
  ProductUnitResponse,
} from '@mez/types';
import { createProductUnitSchema } from '@mez/validation';
import { ApiError } from '@/lib/apiClient';

type CustomUnitFormValues = CreateCustomUnitFormValues & { unitRole: 'CUSTOM' };

export interface UseAddCustomUnitFormOptions {
  baseUnit: ProductUnitResponse | null;
  contentUnit: ProductUnitResponse | null;
  onClose: () => void;
  onSubmit: (input: CreateProductUnitInput) => Promise<unknown>;
}

/**
 * The owner's own unit sheet: hold the filled-in unit until it is confirmed, because a
 * unit cannot be deleted after it is written. Validation copy and the payload both come
 * from the shared create-unit schema.
 */
export function useAddCustomUnitForm({
  baseUnit,
  contentUnit,
  onClose,
  onSubmit,
}: UseAddCustomUnitFormOptions) {
  const [pending, setPending] = useState<CreateProductUnitInput | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<CustomUnitFormValues, unknown, CreateProductUnitInput>({
    resolver: zodResolver(createProductUnitSchema as never) as unknown as Resolver<
      CustomUnitFormValues,
      unknown,
      CreateProductUnitInput
    >,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      unitRole: 'CUSTOM',
      name: '',
      dependsOn: 'BASE',
      conversionRate: '',
      price: '',
      purchaseCapable: true,
      sellCapable: true,
    },
  });

  const { control, handleSubmit, setError, clearErrors, formState } = form;
  const errors = formState.errors;

  const baseSymbol = baseUnit?.name ?? 'base unit';
  const contentSymbol = contentUnit?.name ?? 'content unit';
  const dependsOn = useWatch({ control, name: 'dependsOn' });
  const sellCapable = useWatch({ control, name: 'sellCapable' });
  const name = useWatch({ control, name: 'name' });
  const basisLabel = dependsOn === 'MOU' ? contentSymbol : baseSymbol;
  const unitLabel = name.trim() || 'unit';

  const continueToConfirm = handleSubmit((values) => {
    clearErrors();
    setPending(values);
  });

  const back = useCallback(() => {
    setPending(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!pending || isCreating) return;

    setIsCreating(true);
    try {
      await onSubmit(pending);
      onClose();
    } catch (error) {
      // A rejection the server can name a field for belongs on that field, so the form
      // is shown again with the messages in place rather than only at the top.
      if (error instanceof ApiError && error.details) {
        for (const [field, message] of Object.entries(error.details)) {
          setError(field as keyof CustomUnitFormValues, { type: 'server', message });
        }
      }
      setError('root', {
        type: 'server',
        message: error instanceof Error ? error.message : 'Something went wrong',
      });
      setPending(null);
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, onClose, onSubmit, pending, setError]);

  return {
    form,
    errors,
    pending,
    isCreating,
    baseSymbol,
    contentSymbol,
    dependsOn,
    sellCapable,
    basisLabel,
    unitLabel,
    continueToConfirm,
    back,
    confirm,
  };
}

type ContentUnitFormValues = {
  unitRole: 'MOU';
  unitId: string;
  conversionRate: string;
  price: string;
};

export interface UseAddContentUnitFormOptions {
  baseUnit: ProductUnitResponse | null;
  dimensions: DimensionResponse[];
  onClose: () => void;
  onSubmit: (input: CreateProductUnitInput) => Promise<unknown>;
}

/**
 * The content-unit sheet: the units offered are the platform's dimensions, with the
 * base unit's own dimension left out because a conversion needs two dimensions. The
 * filled-in unit waits for confirmation before it is written.
 */
export function useAddContentUnitForm({
  baseUnit,
  dimensions,
  onClose,
  onSubmit,
}: UseAddContentUnitFormOptions) {
  const [pending, setPending] = useState<CreateProductUnitInput | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<ContentUnitFormValues, unknown, CreateProductUnitInput>({
    resolver: zodResolver(createProductUnitSchema as never) as unknown as Resolver<
      ContentUnitFormValues,
      unknown,
      CreateProductUnitInput
    >,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      unitRole: 'MOU',
      unitId: '',
      conversionRate: '',
      price: '',
    },
  });

  const { control, handleSubmit, setError, clearErrors, formState } = form;
  const errors = formState.errors;

  const baseSymbol = baseUnit?.name ?? 'base unit';

  const { groups, symbolByUnitId } = useMemo(() => {
    const dimensionByUnitId = new Map<string, string>();
    const symbols = new Map<string, string>();

    for (const dimension of dimensions) {
      for (const unit of dimension.units) {
        dimensionByUnitId.set(unit.id, dimension.id);
        symbols.set(unit.id, unit.symbol);
      }
    }

    const baseDimensionId = baseUnit?.standardUnitId
      ? dimensionByUnitId.get(baseUnit.standardUnitId)
      : undefined;

    return {
      symbolByUnitId: symbols,
      groups: dimensions
        .filter((dimension) => dimension.id !== baseDimensionId)
        .map((dimension) => ({
          label: dimension.name,
          options: dimension.units.map((unit) => ({ value: unit.id, label: unit.name })),
        }))
        .filter((group) => group.options.length > 0),
    };
  }, [baseUnit, dimensions]);

  const unitSymbol = useCallback(
    (unitId: string) => symbolByUnitId.get(unitId) ?? 'content unit',
    [symbolByUnitId],
  );
  const unitId = useWatch({ control, name: 'unitId' });
  const chosenSymbol = unitSymbol(unitId);

  const continueToConfirm = handleSubmit((values) => {
    clearErrors();
    setPending(values);
  });

  const back = useCallback(() => {
    setPending(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!pending || isCreating) return;

    setIsCreating(true);
    try {
      await onSubmit(pending);
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        for (const [field, message] of Object.entries(error.details)) {
          setError(field as keyof ContentUnitFormValues, { type: 'server', message });
        }
      }
      setError('root', {
        type: 'server',
        message: error instanceof Error ? error.message : 'Something went wrong',
      });
      setPending(null);
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, onClose, onSubmit, pending, setError]);

  return {
    form,
    errors,
    pending,
    isCreating,
    baseSymbol,
    groups,
    chosenSymbol,
    unitSymbol,
    continueToConfirm,
    back,
    confirm,
  };
}

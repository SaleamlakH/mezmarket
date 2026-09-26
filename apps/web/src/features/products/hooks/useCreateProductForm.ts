import { useMemo, useState } from 'react';
import { useForm, type Resolver, type UseFormReturn } from 'react-hook-form';
import type { BaseSyntheticEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import type {
  CreateProductInput,
  CreateProductResponse,
  DimensionResponse,
  ProductWithUnitsResponse,
} from '@mez/types';
import {
  createProductSchema,
  validateCreateUpload,
  type CreateProductFormValues,
  type UploadMimeType,
} from '@mez/validation';
import {
  productsService as defaultProductsService,
  type ProductsService,
} from '../api/productsService';
import { unitsService as defaultUnitsService, type UnitsService } from '../api/unitsService';

function buildUnitIndex(dimensions: DimensionResponse[]) {
  const dimensionByUnitId = new Map<string, string>();
  const unitNames = new Map<string, string>();
  for (const dimension of dimensions) {
    for (const unit of dimension.units) {
      dimensionByUnitId.set(unit.id, dimension.id);
      unitNames.set(unit.id, unit.name);
    }
  }
  return { dimensionByUnitId, unitNames };
}

function validateProductImage(file: File | null): { file: File | null; error: string | null } {
  if (!file) return { file: null, error: null };

  const result = validateCreateUpload({
    record: 'PRODUCT',
    mimeType: file.type as UploadMimeType,
    sizeBytes: file.size,
  });

  if (result.errors) {
    return {
      file: null,
      error: result.errors.mimeType ?? result.errors.sizeBytes ?? 'Unsupported image',
    };
  }
  return { file, error: null };
}

export interface UseCreateProductFormOptions {
  businessId: string;
  onCreated: (product: CreateProductResponse) => void;
  service?: ProductsService;
  unitsService?: UnitsService;
}

export interface UseCreateProductFormReturn extends Omit<
  UseFormReturn<CreateProductFormValues, unknown, CreateProductInput>,
  'handleSubmit'
> {
  handleSubmit: (event?: BaseSyntheticEvent) => Promise<unknown>;
  file: File | null;
  imageError: string | null;
  pickImage: (file: File | null) => void;
  dimensions: DimensionResponse[];
  unitsLoading: boolean;
  dimensionByUnitId: Map<string, string>;
  unitName: (id?: string) => string;
  formError?: string | undefined;
}

export function useCreateProductForm({
  businessId,
  service = defaultProductsService,
  unitsService = defaultUnitsService,
  onCreated,
}: UseCreateProductFormOptions): UseCreateProductFormReturn {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const form = useForm<CreateProductFormValues, unknown, CreateProductInput>({
    resolver: zodResolver(createProductSchema) as Resolver<
      CreateProductFormValues,
      unknown,
      CreateProductInput
    >,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      baseUnit: { unitId: '', dimensionId: '', price: '' },
    },
  });

  const unitsQuery = useQuery({
    queryKey: ['units'],
    queryFn: unitsService.listUnits,
    staleTime: Infinity,
  });

  const dimensions = useMemo(() => unitsQuery.data?.dimensions ?? [], [unitsQuery.data]);
  const unitsLoading = unitsQuery.isLoading;

  const { dimensionByUnitId, unitNames } = useMemo(() => buildUnitIndex(dimensions), [dimensions]);

  const unitName = (id?: string) => (id ? (unitNames.get(id) ?? '') : '');

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      let uploadId: string | undefined;
      if (file) {
        const { upload, uploadUrl } = await service.createProductUpload(businessId, {
          record: 'PRODUCT',
          mimeType: file.type as UploadMimeType,
          sizeBytes: file.size,
        });

        uploadId = upload.id;
        void service.putFile(uploadUrl, file).catch(() => {});
      }

      const created = await service.createProduct(businessId, {
        ...data,
        ...(uploadId ? { uploadId } : undefined),
      });

      queryClient.setQueryData<ProductWithUnitsResponse[]>(['products', businessId], (old) => [
        created,
        ...(old ?? []),
      ]);
      void queryClient.invalidateQueries({ queryKey: ['products', businessId] });
      onCreated(created);
    } catch (error) {
      form.setError('root', {
        type: 'server',
        message: error instanceof Error ? error.message : 'Something went wrong',
      });
    }
  });

  const pickImage = (next: File | null) => {
    const { file: validated, error } = validateProductImage(next);
    setFile(validated);
    setImageError(error);
  };

  return {
    ...form,
    handleSubmit,
    file,
    imageError,
    pickImage,
    dimensions,
    unitsLoading,
    dimensionByUnitId,
    unitName,
    formError: form.formState.errors.root?.message,
  };
}

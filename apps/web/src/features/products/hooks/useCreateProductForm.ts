import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm, type Resolver, type UseFormReturn } from 'react-hook-form';
import type { BaseSyntheticEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import type {
  CreateProductInput,
  CreateProductResponse,
  DimensionResponse,
  ProductSummaryResponse,
} from '@mez/types';
import {
  createProductFormSchema,
  validateCreateUpload,
  type CreateCustomUnitFormValues,
  type CreateProductFormValues,
  type UploadMimeType,
} from '@mez/validation';
import { ApiError } from '@/lib/apiClient';
import { catalogKeys } from '@/hooks/useCatalogApi';
import {
  productsService as defaultProductsService,
  type ProductsService,
} from '../api/productsService';
import { unitsService as defaultUnitsService, type UnitsService } from '../api/unitsService';

/**
 * What an owner is given before they have typed anything: a unit is sellable and
 * buyable unless they say otherwise, and it starts based on the base unit because
 * that is the one every product is guaranteed to have.
 */
/**
 * A fresh unit, offered with both uses already on: a new unit is almost always
 * meant to be traded in, and having to ask twice to get a unit you can sell is
 * friction for no gain.
 *
 * A new object each time rather than one shared literal, because the field array
 * gives every unit it is handed an identity, and two rows built from the same
 * object would be two rows the array cannot tell apart.
 */
function blankUnit(): CreateCustomUnitFormValues {
  return {
    name: '',
    dependsOn: 'BASE',
    conversionRate: '',
    price: '',
    purchaseCapable: true,
    sellCapable: true,
  };
}

function buildUnitIndex(dimensions: DimensionResponse[]) {
  const dimensionByUnitId = new Map<string, string>();
  const unitNames = new Map<string, string>();
  const unitSymbols = new Map<string, string>();
  for (const dimension of dimensions) {
    for (const unit of dimension.units) {
      dimensionByUnitId.set(unit.id, dimension.id);
      unitNames.set(unit.id, unit.name);
      unitSymbols.set(unit.id, unit.symbol);
    }
  }
  return { dimensionByUnitId, unitNames, unitSymbols };
}

/** The catalog list answers with summaries, so a freshly created product is
 * projected down to that shape before it is written into the list cache. */
function toProductSummary(product: CreateProductResponse): ProductSummaryResponse {
  const baseUnit = product.units.find((unit) => unit.unitRole === 'BASE');
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    currentSealedStock: product.currentSealedStock,
    lowStockThreshold: product.lowStockThreshold,
    active: product.active,
    baseUnitLabel: baseUnit?.name ?? '',
    uploadId: product.uploadId,
  };
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

/**
 * The upload authorization for the currently held image, once the backend has
 * answered. Resolved as `null` when the request failed, since a rejected image
 * is dropped from the form rather than blocking the submission.
 */
interface PreparedUpload {
  uploadId: string;
  uploadUrl: string;
  file: File;
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
  previewUrl: string | null;
  imageError: string | null;
  pickImage: (file: File | null) => void;
  dimensions: DimensionResponse[];
  unitsLoading: boolean;
  dimensionByUnitId: Map<string, string>;
  unitName: (id?: string) => string;
  unitSymbol: (id?: string) => string;
  formError?: string | undefined;
  /** The owner's own units for this product: one card each, added and removed here. */
  customUnits: {
    fields: ReadonlyArray<{ id: string }>;
    addUnit: () => void;
    removeUnit: (index: number) => void;
  };
}

export function useCreateProductForm({
  businessId,
  service = defaultProductsService,
  unitsService = defaultUnitsService,
  onCreated,
}: UseCreateProductFormOptions): UseCreateProductFormReturn {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  /**
   * The in-flight upload authorization for the current selection, kept so the
   * submission can wait on it instead of racing it, and the counter that
   * decides which selection is still the current one.
   */
  const [pendingUpload, setPendingUpload] = useState<Promise<PreparedUpload | null> | null>(null);
  const selectionRef = useRef(0);

  // Every preview url is minted in `pickImage` and revoked as soon as it is
  // superseded, so this only has to reclaim the one still held on unmount.
  useEffect(() => {
    if (!previewUrl) return;

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const form = useForm<CreateProductFormValues, unknown, CreateProductInput>({
    resolver: zodResolver(createProductFormSchema) as Resolver<
      CreateProductFormValues,
      unknown,
      CreateProductInput
    >,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      baseUnit: { unitId: '', dimensionId: '', price: '' },
      customUnits: [],
    },
  });

  const {
    fields: unitFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: 'customUnits',
  });

  const addUnit = useCallback(() => {
    append(blankUnit());
  }, [append]);

  const removeUnit = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove],
  );

  const unitsQuery = useQuery({
    queryKey: ['units'],
    queryFn: unitsService.listUnits,
    staleTime: Infinity,
  });

  const dimensions = useMemo(() => unitsQuery.data?.dimensions ?? [], [unitsQuery.data]);
  const unitsLoading = unitsQuery.isLoading;

  const { dimensionByUnitId, unitNames, unitSymbols } = useMemo(
    () => buildUnitIndex(dimensions),
    [dimensions],
  );

  const unitName = (id?: string) => (id ? (unitNames.get(id) ?? '') : '');

  // A product's unit rows are named after the standard unit's symbol rather than its
  // name, so the step that offers those rows to be based on one has to speak in
  // symbols to match what will be stored.
  const unitSymbol = (id?: string) => (id ? (unitSymbols.get(id) ?? '') : '');

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      // Authorization is requested when the file is picked, so by submission
      // time it is either settled or still in flight. Waiting on it keeps the
      // bytes and the reference from splitting across two uploads.
      const prepared = pendingUpload ? await pendingUpload : null;

      if (prepared) {
        void service.putFile(prepared.uploadUrl, prepared.file).catch(() => {});
      }

      const created = await service.createProduct(businessId, {
        ...data,
        ...(prepared ? { uploadId: prepared.uploadId } : undefined),
      });

      queryClient.setQueryData<ProductSummaryResponse[]>(['products', businessId], (old) => [
        toProductSummary(created),
        ...(old ?? []),
      ]);
      void queryClient.invalidateQueries({ queryKey: ['products', businessId] });
      void queryClient.invalidateQueries({ queryKey: catalogKeys.products(businessId) });
      onCreated(created);
    } catch (error) {
      // A rejection the server can name a field for — a unit name already taken on
      // this product — belongs on that field rather than only at the top of the form.
      // Its keys are the same dotted paths the form itself uses, so they can be put
      // straight back on the fields they describe.
      if (error instanceof ApiError && error.details) {
        for (const [field, message] of Object.entries(error.details)) {
          form.setError(
            field as keyof CreateProductFormValues & `customUnits.${number}.${string}`,
            {
              type: 'server',
              message,
            },
          );
        }
      }

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

    if (!validated) {
      setPreviewUrl(null);
      setPendingUpload(null);
      selectionRef.current += 1;
      return;
    }

    setPreviewUrl(URL.createObjectURL(validated));

    // Authorization is requested the moment an acceptable file is chosen, per
    // docs/file-transfer-architecture.md. The counter retires the response of
    // any selection that has since been replaced or cleared.
    const selection = (selectionRef.current += 1);
    const request: Promise<PreparedUpload | null> = service
      .createProductUpload(businessId, {
        record: 'PRODUCT',
        mimeType: validated.type as UploadMimeType,
        sizeBytes: validated.size,
      })
      .then(({ upload, uploadUrl }) => ({ uploadId: upload.id, uploadUrl, file: validated }))
      .catch((error: unknown) => {
        // A superseded selection no longer owns the form, so its failure is
        // dropped along with its response.
        if (selection !== selectionRef.current) return null;

        setFile(null);
        setPreviewUrl(null);
        setImageError(error instanceof Error ? error.message : 'The image could not be prepared');
        return null;
      });

    setPendingUpload(request);
  };

  return {
    ...form,
    handleSubmit,
    file,
    previewUrl,
    imageError,
    pickImage,
    dimensions,
    unitsLoading,
    dimensionByUnitId,
    unitName,
    unitSymbol,
    formError: form.formState.errors.root?.message,
    customUnits: {
      fields: unitFields,
      addUnit,
      removeUnit,
    },
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ProductWithUnitsResponse } from '@mez/types';
import { validateUpdateUpload, type UploadMimeType } from '@mez/validation';
import { imageCache } from '@/lib/imageCache';
import { publishProduct } from '@/lib/productCache';
import {
  productsService as defaultProductsService,
  type ProductsService,
} from '../api/productsService';

interface PreparedUpload {
  uploadId: string;
  uploadUrl: string;
  file: File;
}

export interface UseProductImageFormOptions {
  businessId: string;
  product: ProductWithUnitsResponse;
  onSaved?: ((message: string) => void) | undefined;
  service?: ProductsService;
}

/**
 * The product photo as its own card: a picked file is validated against the upload
 * schema, authorized immediately, and only written when the owner saves it.
 */
export function useProductImageForm({
  businessId,
  product,
  service = defaultProductsService,
  onSaved,
}: UseProductImageFormOptions) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<Promise<PreparedUpload | null> | null>(null);
  const selectionRef = useRef(0);

  // A preview url is minted per selection and revoked when it is superseded or the
  // card unmounts, so exactly one lives at a time.
  useEffect(() => {
    if (!previewUrl) return;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const discard = useCallback(() => {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setPendingUpload(null);
    selectionRef.current += 1;
  }, []);

  const pick = useCallback(
    (next: File | null) => {
      if (!next) {
        discard();
        return;
      }

      const result = validateUpdateUpload({
        record: 'PRODUCT',
        mimeType: next.type as UploadMimeType,
        sizeBytes: next.size,
      });

      if (result.errors) {
        setFile(null);
        setPreviewUrl(null);
        setPendingUpload(null);
        selectionRef.current += 1;
        setError(result.errors.mimeType ?? result.errors.sizeBytes ?? 'Unsupported image');
        return;
      }

      setFile(next);
      setError(null);
      setPreviewUrl(URL.createObjectURL(next));

      // Authorization is requested the moment a usable file is chosen; the counter
      // retires a response for a selection that has since been replaced.
      const selection = (selectionRef.current += 1);
      const request: Promise<PreparedUpload | null> = service
        .updateProductUpload(businessId, product.id, {
          record: 'PRODUCT',
          mimeType: next.type as UploadMimeType,
          sizeBytes: next.size,
        })
        .then(({ upload, uploadUrl }) => ({ uploadId: upload.id, uploadUrl, file: next }))
        .catch((caught: unknown) => {
          if (selection !== selectionRef.current) return null;
          setFile(null);
          setPreviewUrl(null);
          setError(caught instanceof Error ? caught.message : 'The image could not be prepared');
          return null;
        });

      setPendingUpload(request);
    },
    [businessId, discard, product.id, service],
  );

  const save = useCallback(async (): Promise<boolean> => {
    if (isSaving || !file) return false;

    setError(null);
    setIsSaving(true);

    try {
      const prepared = pendingUpload ? await pendingUpload : null;
      if (!prepared) {
        setError('The image could not be prepared. Please choose it again.');
        return false;
      }

      // The bytes go to the same object a reused image already owns, so the cached
      // copy is dropped once they land; a first image has nothing cached to drop.
      await service.putFile(prepared.uploadUrl, prepared.file);
      imageCache.remove(prepared.uploadId);
      void queryClient.invalidateQueries({
        queryKey: ['product-image', businessId, prepared.uploadId],
      });
      void queryClient.invalidateQueries({ queryKey: ['products-uploads', businessId] });

      const next: ProductWithUnitsResponse = { ...product, uploadId: prepared.uploadId };
      publishProduct(queryClient, businessId, next);

      setFile(null);
      setPreviewUrl(null);
      setPendingUpload(null);
      onSaved?.('Photo updated.');
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The image could not be uploaded');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [businessId, file, isSaving, onSaved, pendingUpload, product, queryClient, service]);

  return {
    file,
    previewUrl,
    error,
    isDirty: file !== null,
    isSaving,
    pick,
    discard,
    save,
  };
}

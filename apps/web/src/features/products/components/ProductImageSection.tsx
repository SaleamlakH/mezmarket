import { useRef } from 'react';
import { Image } from 'lucide-react';
import type { DownloadUrlsResponse, ProductWithUnitsResponse } from '@mez/types';
import { UPLOAD_MIME_TYPES } from '@mez/validation';
import { Button } from '@/components/Button';
import { useProductImage } from '@/hooks/useProductImage';
import { useProductImageForm } from '../hooks/useProductImageForm';
import { SectionCard } from '@/components/SectionCard';
import { SectionFooter } from '@/components/SectionFooter';

interface ProductImageSectionProps {
  businessId: string;
  product: ProductWithUnitsResponse;
  uploadUrls: DownloadUrlsResponse | undefined;
  onSaved: (message: string) => void;
}

/** The product photo card, owning its own pick, preview and save lifecycle. */
export function ProductImageSection({
  businessId,
  product,
  uploadUrls,
  onSaved,
}: ProductImageSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const image = useProductImageForm({ businessId, product, onSaved });
  const savedImageUrl = useProductImage(businessId, product.uploadId ?? undefined, uploadUrls);
  const imageUrl = image.previewUrl ?? savedImageUrl ?? null;

  return (
    <SectionCard
      title="Photo"
      subtitle="Shown on the product list and pickers."
      editing={image.isDirty}
      onEdit={() => fileInputRef.current?.click()}
      showEdit={false}
    >
      <div className="flex flex-col items-start gap-3 sm:flex-row">
        <div className="group relative h-40 w-40 shrink-0 overflow-hidden rounded-[13px] border border-(--border) bg-(--field)">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`Photo of ${product.name}`}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-(--text-muted)">
              <Image size={22} aria-hidden />
              <span className="text-[12px] font-semibold text-(--text)">No photo</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/45 text-[12px] font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-(--accent) focus-visible:outline-offset-2"
          >
            {imageUrl ? 'Change photo' : 'Add photo'}
          </button>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <input
            ref={fileInputRef}
            id="product-detail-image"
            name="image"
            type="file"
            accept={UPLOAD_MIME_TYPES.join()}
            className="sr-only"
            onChange={(event) => {
              image.pick(event.target.files?.[0] ?? null);
              event.currentTarget.value = '';
            }}
          />
          {image.error && (
            <p role="alert" className="m-0 text-[11px] font-semibold text-(--danger)">
              {image.error}
            </p>
          )}
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={16} aria-hidden />
            Change photo
          </Button>
        </div>
      </div>

      <SectionFooter
        editing={image.isDirty}
        isDirty={image.isDirty}
        isSaving={image.isSaving}
        error={null}
        onSave={image.save}
        onCancel={image.discard}
      />
    </SectionCard>
  );
}

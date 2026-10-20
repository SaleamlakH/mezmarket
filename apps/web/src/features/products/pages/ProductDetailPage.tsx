import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Toast } from '@/components/Toast';
import { useProductUploadUrls } from '@/hooks/useProductUploadUrls';
import { PRODUCTS_PATH } from '@/layouts/navigation';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { AddUnitDialog, type AddUnitMode } from '../components/AddUnitDialog';
import { AvailabilityCard } from '../components/AvailabilityCard';
import { CustomUnitsCard } from '../components/EditableCustomUnitCard';
import { PlatformUnitsCard } from '../components/PlatformUnitCard';
import { ProductFieldsCard } from '../components/ProductFieldsCard';
import { ProductImageSection } from '../components/ProductImageSection';
import { useAddProductUnit } from '../hooks/useAddProductUnit';
import { useProduct } from '../hooks/useProducts';

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id ?? '';
  const { data: product, isPending, isError, refetch } = useProduct(businessId, productId);
  const { data: uploadUrls } = useProductUploadUrls(businessId);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [addUnitMode, setAddUnitMode] = useState<AddUnitMode | null>(null);

  const { dimensions, addUnit } = useAddProductUnit({
    businessId,
    productId: productId ?? '',
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-4">
        <LoadingState label="Loading product…" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-4">
        <ErrorState
          title="Could not load product"
          description="Something went wrong while fetching this product."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const baseUnit = product.units.find((unit) => unit.unitRole === 'BASE') ?? null;
  const contentUnit = product.units.find((unit) => unit.unitRole === 'MOU') ?? null;

  return (
    <>
      <div className="mx-auto max-w-5xl pb-4">
        <header className="flex items-center gap-2.5">
          <Link to={PRODUCTS_PATH} aria-label="Back to products" title="Back">
            <Button variant="secondary" size="sm" shape="pill">
              <ChevronLeft aria-hidden className="h-5 w-5" />
            </Button>
          </Link>
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-2 text-xl font-bold text-(--text) md:text-2xl"
          >
            <Link to={PRODUCTS_PATH} className="hover:underline">
              Products
            </Link>
            <span className="text-(--text-muted)">/</span>
            <span className="truncate">{product.name}</span>
            {!product.active && <Badge tone="neutral">Inactive</Badge>}
          </nav>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-6">
          <div className="flex flex-col gap-4">
            <ProductImageSection
              businessId={businessId}
              product={product}
              uploadUrls={uploadUrls}
              onSaved={setSuccessMessage}
            />
            <ProductFieldsCard
              businessId={businessId}
              product={product}
              onSaved={setSuccessMessage}
            />
          </div>

          <div className="flex flex-col gap-4">
            <PlatformUnitsCard
              businessId={businessId}
              product={product}
              onSaved={setSuccessMessage}
              onRequestAddContentUnit={() => setAddUnitMode('MOU')}
            />
            <CustomUnitsCard
              businessId={businessId}
              product={product}
              onSaved={setSuccessMessage}
              onRequestAddUnit={() => setAddUnitMode('CUSTOM')}
            />
          </div>
        </div>

        <AvailabilityCard businessId={businessId} product={product} onSaved={setSuccessMessage} />
      </div>

      <AddUnitDialog
        open={addUnitMode !== null}
        mode={addUnitMode ?? 'CUSTOM'}
        baseUnit={baseUnit}
        contentUnit={contentUnit}
        dimensions={dimensions}
        onClose={() => setAddUnitMode(null)}
        onSubmit={async (input) => {
          await addUnit(input);
          setSuccessMessage(input.unitRole === 'MOU' ? 'Content unit added.' : 'Unit added.');
        }}
      />

      {successMessage && (
        <Toast
          message={successMessage}
          variant="success"
          duration={3000}
          position="top-center"
          onDismiss={() => setSuccessMessage(null)}
        />
      )}
    </>
  );
}

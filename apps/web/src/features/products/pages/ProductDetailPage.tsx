import { useState } from 'react';
import { useParams } from 'react-router';
import { Badge } from '@/components/Badge';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { Toast } from '@/components/Toast';
import { useProductUploadUrls } from '@/hooks/useProductUploadUrls';
import { PRODUCTS_PATH } from '@/layouts/navigation';
import { useBackNavigation } from '@/layouts/useNavigationHistory';
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

  const back = useBackNavigation(PRODUCTS_PATH);

  if (isPending) {
    return (
      <PageShell>
        <PageHeader title="Product" subtitle="Products" backTo={back.to} backState={back.state} />
        <LoadingState label="Loading product…" />
      </PageShell>
    );
  }

  if (isError || !product) {
    return (
      <PageShell>
        <PageHeader title="Product" subtitle="Products" backTo={back.to} backState={back.state} />
        <ErrorState
          title="Could not load product"
          description="Something went wrong while fetching this product."
          onRetry={() => void refetch()}
        />
      </PageShell>
    );
  }

  const baseUnit = product.units.find((unit) => unit.unitRole === 'BASE') ?? null;
  const contentUnit = product.units.find((unit) => unit.unitRole === 'MOU') ?? null;

  return (
    <>
      <PageShell>
        <PageHeader
          title={product.name}
          subtitle="Product"
          backTo={back.to}
          backState={back.state}
          actions={!product.active ? <Badge tone="neutral">Inactive</Badge> : undefined}
        />

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-6">
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
      </PageShell>

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

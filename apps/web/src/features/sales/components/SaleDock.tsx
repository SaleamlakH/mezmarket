import { useProductUploadUrls } from '@/hooks/useProductUploadUrls';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { SalePanel } from './SalePanel';

/** The docked sale panel rendered beside the sales route. */
export function SaleDock() {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;
  const { data: uploadUrls } = useProductUploadUrls(businessId);

  return (
    <SalePanel
      businessId={businessId}
      uploadUrls={uploadUrls}
      onConfirm={() => undefined}
      className="overflow-hidden rounded-2xl border border-(--border) bg-(--surface-primary) shadow-(--shadow-md) md:sticky md:top-6 md:max-h-[calc(100dvh-6rem)] lg:max-h-[calc(100dvh-3rem)] md:min-h-[calc(100dvh-6rem)] md:w-[18rem] lg:w-[20rem]"
    />
  );
}

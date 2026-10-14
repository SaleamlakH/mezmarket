import { useProductUploadUrls } from '@/hooks/useProductUploadUrls';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { SalePanel } from './SalePanel';

const DOCK_CLASS =
  'rounded-2xl border border-(--border) bg-(--surface-primary) shadow-(--shadow-md) md:sticky md:top-6 md:max-h-[calc(100dvh-3rem)] md:min-h-[calc(100dvh-6rem)] md:w-[18rem] lg:w-[20rem]';

/**
 * The docked sale panel the app layout renders beside the page for the sales
 * route. It supplies the host styles and business context the container-agnostic
 * `SalePanel` needs.
 */
export function SaleDock() {
  const { currentBusiness } = useBusinessContext();
  const businessId = currentBusiness?.id;
  const { data: uploadUrls } = useProductUploadUrls(businessId);

  return (
    <SalePanel
      businessId={businessId}
      uploadUrls={uploadUrls}
      onConfirm={() => undefined}
      className={DOCK_CLASS}
    />
  );
}

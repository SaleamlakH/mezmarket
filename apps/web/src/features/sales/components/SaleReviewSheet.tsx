import { useEffect } from 'react';
import type { DownloadUrlsResponse } from '@mez/types';
import { Dialog } from '@/components/Dialog';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useSaleDraftView } from '../hooks/useSaleDraftView';
import { SalePanel } from './SalePanel';

export interface SaleReviewSheetProps {
  open: boolean;
  onClose: () => void;
  businessId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  /** Confirms the draft sale. */
  onConfirm: () => void;
}

/** The mobile review sheet: the SalePanel inside a modal dialog. */
export function SaleReviewSheet({
  open,
  onClose,
  businessId,
  uploadUrls,
  onConfirm,
}: SaleReviewSheetProps) {
  const isMobile = useIsMobile();
  const { hasLines } = useSaleDraftView();

  // Close the sheet when the draft empties.
  useEffect(() => {
    if (open && !hasLines) onClose();
  }, [open, hasLines, onClose]);

  if (!open || !isMobile || !hasLines) return null;

  return (
    <Dialog open onClose={onClose} size="md">
      <SalePanel
        businessId={businessId}
        uploadUrls={uploadUrls}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import type { DownloadUrlsResponse } from '@mez/types';
import { Dialog } from '@/components/Dialog';
import { useSaleDraftView } from '../hooks/useSaleDraftView';
import { SalePanel } from './SalePanel';

export interface SaleReviewSheetProps {
  open: boolean;
  onClose: () => void;
  businessId?: string | undefined;
  uploadUrls?: DownloadUrlsResponse | undefined;
  /** Confirm the draft sale — wired up in a later step. */
  onConfirm: () => void;
}

/**
 * The mobile review sheet. Opened from the sticky sale bar, it reuses the
 * `SalePanel` markup inside a modal dialog so both breakpoints share one sale
 * sheet.
 */
export function SaleReviewSheet({
  open,
  onClose,
  businessId,
  uploadUrls,
  onConfirm,
}: SaleReviewSheetProps) {
  const [isMobile, setIsMobile] = useState(false);
  const { hasLines } = useSaleDraftView();

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // The draft can empty underneath the open sheet — clearing it or dropping its
  // last product — which retires the panel itself, so the dialog goes with it.
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
        className="max-h-[calc(92dvh-3rem)]"
        onClose={onClose}
      />
    </Dialog>
  );
}

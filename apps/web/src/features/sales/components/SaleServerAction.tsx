import type { BusinessMemberSummaryResponse } from '@mez/types';
import { UserCog, X } from 'lucide-react';
import { Button } from '@/components/Button';

export interface SaleServerActionProps {
  server: BusinessMemberSummaryResponse | null;
  /** Opens the server picker. */
  onAttach: () => void;
  /** Detaches the current server. */
  onClear: () => void;
}

/** Attaches or clears the sale's server. */
export function SaleServerAction({ server, onAttach, onClear }: SaleServerActionProps) {
  if (!server) {
    return (
      <Button type="button" variant="secondary" size="md" onClick={onAttach}>
        <UserCog size={14} aria-hidden /> Attach server
      </Button>
    );
  }

  return (
    <span className="inline-flex items-stretch overflow-hidden rounded-lg border border-(--accent) bg-(--accent) text-white">
      <button
        type="button"
        onClick={onAttach}
        title="Change server"
        className="focus-ring inline-flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold"
      >
        <UserCog size={13} aria-hidden /> {server.name}
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label="Remove server"
        title="Remove server"
        className="focus-ring inline-flex cursor-pointer items-center border-l border-white/30 px-1.5 transition-colors hover:bg-white/15"
      >
        <X size={13} aria-hidden />
      </button>
    </span>
  );
}

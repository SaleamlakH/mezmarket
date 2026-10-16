import { useState } from 'react';
import type { BusinessMemberSummaryResponse } from '@mez/types';
import { UserCog, X } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListCard } from '@/components/ListCard';
import { LoadingState } from '@/components/LoadingState';
import { useMembers } from '@/hooks/useMembersApi';

export interface ServerPickerDialogProps {
  open: boolean;
  onClose: () => void;
  /** Attaches the picked server. */
  onSelect: (server: BusinessMemberSummaryResponse) => void;
  /** The server already attached to the sale, marked in the list. */
  selectedServerId?: string | null;
}

/** Attaches a server to the sale. */
export function ServerPickerDialog({
  open,
  onClose,
  onSelect,
  selectedServerId,
}: ServerPickerDialogProps) {
  const {
    data: servers = [],
    isPending,
    isError,
    refetch,
  } = useMembers({ role: 'SERVER' }, { enabled: open });
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);

  const activeId = localSelectedId ?? selectedServerId ?? null;

  const close = () => {
    setLocalSelectedId(null);
    onClose();
  };

  const pick = (server: BusinessMemberSummaryResponse) => {
    setLocalSelectedId(server.id);
    onSelect(server);
    close();
  };

  return (
    <Dialog open={open} onClose={close} size="md">
      <header className="sticky top-0 z-10 bg-(--surface-primary) w-full flex shrink-0 items-center justify-between md:mt-2.5 mb-2.5 gap-3 pt-3 pb-2">
        <h2 className="m-0 text-base font-bold text-(--text)">Attach server</h2>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" type="button" onClick={close} aria-label="Close">
            <X size={16} aria-hidden />
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 pb-1">
        {isPending ? (
          <LoadingState label="Loading servers…" />
        ) : isError ? (
          <ErrorState
            title="Could not load servers"
            description="Something went wrong while fetching your servers."
            onRetry={() => void refetch()}
          />
        ) : servers.length === 0 ? (
          <EmptyState
            title="No servers yet"
            description="Invite a member with the server role to attach one to a sale."
          />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {servers.map((server) => (
              <li key={server.id}>
                <button
                  type="button"
                  onClick={() => pick(server)}
                  className="focus-ring block w-full cursor-pointer rounded-xl text-left"
                >
                  <ListCard
                    title={server.name}
                    meta={server.role}
                    icon={<UserCog size={18} aria-hidden />}
                    trailing={
                      activeId === server.id ? <Badge tone="accent">Attached</Badge> : undefined
                    }
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}

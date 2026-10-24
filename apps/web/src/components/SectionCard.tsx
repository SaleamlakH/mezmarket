import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/Button';

export interface SectionCardProps {
  title: string;
  subtitle?: string;
  editing: boolean;
  onEdit: () => void;
  showEdit?: boolean;
  action?: ReactNode;
  children: ReactNode;
}

/**
 * A titled panel with an optional Edit affordance and a slot for a primary action,
 * used for every editable block on a detail page.
 */
export function SectionCard({
  title,
  subtitle,
  editing,
  onEdit,
  showEdit = true,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className="rounded-xl border border-(--border) bg-(--surface-primary) p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-[13px] font-bold text-(--text)">{title}</h2>
          {subtitle && <p className="m-0 mt-0.5 text-[11px] text-(--text-muted)">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {showEdit && !editing && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              shape="square"
              onClick={onEdit}
              aria-label={`Edit ${title}`}
              title="Edit"
            >
              <Pencil aria-hidden className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3">{children}</div>
    </section>
  );
}

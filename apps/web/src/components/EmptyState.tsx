import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-(--border) bg-(--surface-primary)/60 px-6 py-10 text-center">
      <p className="m-0 text-[13px] font-semibold text-(--text)">{title}</p>
      {description && <p className="m-0 text-[11px] text-(--text-muted)">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

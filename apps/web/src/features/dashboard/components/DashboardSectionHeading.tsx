import type { ReactNode } from 'react';

/**
 * Section labels on the dashboard are deliberately quieter than a card title:
 * small and secondary, so the figures below carry the emphasis.
 */
export function DashboardSectionHeading({
  children,
  trailing,
}: {
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-2.5 mt-4 flex items-center justify-between gap-2 first:mt-0">
      <h2 className="m-0 text-[12px] font-semibold text-(--text-muted)">{children}</h2>
      {trailing}
    </div>
  );
}

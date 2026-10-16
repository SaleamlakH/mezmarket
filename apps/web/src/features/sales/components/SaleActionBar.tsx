import type { ReactNode } from 'react';

export interface SaleActionBarProps {
  children: ReactNode;
}

/** The row of sale actions under the panel header. */
export function SaleActionBar({ children }: SaleActionBarProps) {
  return <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">{children}</div>;
}

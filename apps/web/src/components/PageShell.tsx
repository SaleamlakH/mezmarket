import type { ReactNode } from 'react';

export interface PageShellProps {
  children: ReactNode;
  /** Width and spacing classes; the default keeps every app page the same width. */
  className?: string;
}

export function PageShell({ children, className = 'max-w-6xl pb-4' }: PageShellProps) {
  return <div className={`mx-auto w-full ${className}`}>{children}</div>;
}

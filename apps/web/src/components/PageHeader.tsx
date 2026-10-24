import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import type { NavigationHistoryState } from '@/layouts/useNavigationHistory';

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Renders a back control when given. */
  backTo?: string;
  backState?: NavigationHistoryState;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  backTo,
  backState,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <header
      className={`mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 md:items-center ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {backTo && (
          <Link
            to={backTo}
            state={backState}
            aria-label="Back"
            title="Back"
            className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-(--border) bg-(--field) text-(--text) transition-colors hover:border-(--accent) hover:bg-(--accent) hover:text-white"
          >
            <ChevronLeft aria-hidden className="h-5 w-5" />
          </Link>
        )}

        <div className="min-w-0">
          <h1 className="m-0 truncate text-2xl font-bold tracking-tight text-(--text)">{title}</h1>
          {subtitle && <p className="m-0 mt-0.5 text-xs text-(--text-muted)">{subtitle}</p>}
        </div>
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

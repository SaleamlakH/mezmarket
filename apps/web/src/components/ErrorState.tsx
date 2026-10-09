import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this section.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-(--border) bg-(--surface-primary)/60 px-6 py-10 text-center"
    >
      <p className="m-0 text-[13px] font-semibold text-(--text)">{title}</p>
      <p className="m-0 text-xs text-(--text-muted)">{description}</p>
      {onRetry && (
        <div className="mt-1">
          <Button type="button" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

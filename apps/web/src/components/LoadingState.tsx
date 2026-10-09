import { Loader } from './Loader';

export interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-(--border) bg-(--surface-primary)/60 px-6 py-10 text-center"
    >
      <Loader size={24} />
      <p className="m-0 text-xs text-(--text-muted)">{label}</p>
    </div>
  );
}

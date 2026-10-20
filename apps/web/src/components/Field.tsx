import type { ReactNode } from 'react';

export interface FieldProps {
  id?: string;
  label?: string;
  optional?: boolean | undefined;
  muted?: boolean;
  hint?: string | undefined;
  error?: string | undefined;
  /** Tightens the label-to-control gap for dense rows. */
  compact?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({
  id,
  label,
  optional,
  muted = false,
  hint,
  error,
  compact = false,
  className,
  children,
}: FieldProps) {
  return (
    <div className={`flex flex-col ${compact ? 'gap-1' : 'gap-1.5'} ${className ?? ''}`}>
      {label && (
        <label
          htmlFor={id}
          className={`block text-[11px] font-semibold uppercase tracking-[0.08em] ${
            muted ? 'text-(--text-muted)' : 'text-(--text)'
          }`}
        >
          {label}
          {optional && (
            <span className="ml-1 font-medium tracking-normal normal-case text-(--text-muted)">
              (optional)
            </span>
          )}
        </label>
      )}

      {children}

      {error ? (
        <span className="text-[11px] font-semibold text-(--danger)" role="alert">
          {error}
        </span>
      ) : (
        hint && <p className="text-[11px] text-(--text-muted)">{hint}</p>
      )}
    </div>
  );
}

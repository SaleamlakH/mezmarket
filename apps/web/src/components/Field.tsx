import type { ReactNode } from 'react';

export interface FieldProps {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ id, label, hint, error, className, children }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-(--text)"
        >
          {label}
        </label>
      )}

      {children}

      {error ? (
        <span className="text-xs text-(--danger)" role="alert">
          {error}
        </span>
      ) : (
        hint && <p className="mt-1 text-[11px] text-(--text-muted)">{hint}</p>
      )}
    </div>
  );
}

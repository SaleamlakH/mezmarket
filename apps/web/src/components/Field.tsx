interface FieldProps {
  id: string;
  label: string;
  error?: string | undefined;
  className?: string;
  children: React.ReactNode;
}

export function Field({ id, label, error, className, children }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)"
      >
        {label}
      </label>

      {children}

      {error && (
        <span className="text-xs text-(--warning)" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  children: React.ReactNode;
}

type Variant = 'primary' | 'ghost' | 'outline';

export function Button({
  variant = 'primary',
  isLoading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'w-full h-11 rounded-2xl px-4 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variants: Record<Variant, string> = {
    primary:
      'font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:bg-[var(--accent-hover)]',
    ghost:
      'bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] underline underline-offset-2',
    outline:
      'font-bold bg-transparent border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Please wait…</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

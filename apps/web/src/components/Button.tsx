import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'ghost' | 'outline';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  children: ReactNode;
}

const base =
  'focus-ring inline-flex items-center justify-center gap-2 rounded-lg px-4 py-[9px] ' +
  'text-[13px] font-semibold transition-colors disabled:cursor-not-allowed cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-(--accent) text-white hover:bg-(--accent-hover)',
  secondary:
    'bg-transparent text-(--text) border border-(--border) hover:border-(--text) hover:bg-(--surface-primary)',
  text: 'bg-transparent text-(--accent) hover:text-(--accent-hover) hover:underline px-1 py-[9px]',
  ghost: 'bg-transparent text-(--text-muted) hover:text-(--text) underline underline-offset-2',
  outline:
    'bg-transparent border border-(--border) text-(--text) hover:border-(--accent) hover:text-(--accent)',
};

export function Button({
  variant = 'primary',
  isLoading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const idle = disabled
    ? 'border border-(--border) bg-(--surface-secondary) text-(--text-muted) hover:bg-(--surface-secondary) hover:border-(--border)'
    : variants[variant];
  return (
    <button disabled={disabled || isLoading} className={`${base} ${idle} ${className}`} {...rest}>
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

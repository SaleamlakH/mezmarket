import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'ghost' | 'outline' | 'field';
export type ButtonShape = 'pill' | 'square';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** `pill` — the regular text button (default); `square` — a fixed-size icon chip. */
  shape?: ButtonShape;
  size?: ButtonSize;
  isLoading?: boolean;
  children?: ReactNode;
}

const base =
  'focus-ring inline-flex items-center justify-center rounded-lg font-semibold ' +
  'transition-colors disabled:cursor-not-allowed cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]';

const sizes: Record<ButtonSize, string> = {
  sm: 'gap-1 text-xs',
  md: 'gap-1.5 text-xs',
  lg: 'gap-2 text-sm',
};

const shapes: Record<ButtonShape, Record<ButtonSize, string>> = {
  pill: {
    sm: 'px-2 py-1.5',
    md: 'px-2.5 py-2',
    lg: 'px-4 py-[9px]',
  },
  square: {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  },
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-(--accent) text-white hover:bg-(--accent-hover)',
  secondary:
    'bg-(--surface-secondary) text-(--text) border border-(--border) hover:bg-(--surface-primary) hover:border-(--text-muted)',
  text: 'bg-transparent text-(--accent) hover:text-(--accent-hover) hover:underline',
  ghost: 'bg-transparent text-(--text-muted) hover:text-(--text) underline underline-offset-2',
  outline:
    'bg-(--surface-secondary) border border-(--text-muted) text-(--text) hover:bg-(--accent) hover:border-transparent hover:text-white',
  field:
    'bg-(--field) text-(--text) border border-(--border) hover:bg-(--accent) hover:border-transparent hover:text-white focus-visible:bg-(--accent) focus-visible:text-white',
};

export function Button({
  variant = 'primary',
  shape = 'pill',
  size = 'lg',
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
    <button
      disabled={disabled || isLoading}
      className={`${base} ${sizes[size]} ${shapes[shape][size]} ${idle} ${className}`}
      {...rest}
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

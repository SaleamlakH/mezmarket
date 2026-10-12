import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'ghost' | 'outline';
export type ButtonShape = 'pill' | 'square';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** `pill` — the regular text button (default); `square` — a fixed-size icon chip. */
  shape?: ButtonShape;
  /** `sm` — compact; `md` — default. Scales the padding and label. */
  size?: ButtonSize;
  isLoading?: boolean;
  children?: ReactNode;
}

const base =
  'focus-ring inline-flex items-center justify-center rounded-lg font-semibold ' +
  'transition-colors disabled:cursor-not-allowed cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]';

const sizes: Record<ButtonSize, string> = {
  sm: 'gap-1.5 text-xs',
  md: 'gap-2 text-sm',
};

const shapes: Record<ButtonShape, Record<ButtonSize, string>> = {
  pill: {
    sm: 'px-2.5 py-2',
    md: 'px-4 py-[9px]',
  },
  square: {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
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
};

export function Button({
  variant = 'primary',
  shape = 'pill',
  size = 'md',
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

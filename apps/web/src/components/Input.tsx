import type { ComponentPropsWithRef } from 'react';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
  state?: 'default' | 'focus' | 'error' | undefined;
  error?: string | undefined;
  /** The control's size. */
  size?: InputSize;
}

const sizes: Record<InputSize, string> = {
  sm: 'h-7 rounded-lg px-2 text-xs',
  md: 'h-8 rounded-lg px-2.5 text-xs',
  lg: 'h-10 rounded-[13px] px-3.5 text-sm',
};

export function Input({
  id,
  state = 'default',
  error,
  size = 'lg',
  className,
  ...rest
}: InputProps) {
  const hasError = state === 'error' || Boolean(error);
  const border =
    state === 'focus' ? 'border-(--accent)' : hasError ? 'border-(--warning)' : 'border-(--border)';
  return (
    <input
      id={id}
      className={`w-full border bg-(--field) text-(--text) outline-none transition-colors duration-150 placeholder:text-(--text-muted) focus:border-(--accent) ${sizes[size]} ${border} ${className ?? ''}`}
      {...rest}
    />
  );
}

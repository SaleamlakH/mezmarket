import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  state?: 'default' | 'focus' | 'error';
  error?: string;
}

export function Input({ id, state = 'default', error, className, ...rest }: InputProps) {
  const hasError = state === 'error' || Boolean(error);
  const border =
    state === 'focus' ? 'border-(--accent)' : hasError ? 'border-(--warning)' : 'border-(--border)';
  return (
    <input
      id={id}
      className={`w-full rounded-[13px] border bg-(--field) px-3.5 py-3 text-sm text-(--text) outline-none transition-colors duration-150 placeholder:text-(--text-muted) focus:border-(--accent) ${border} ${className}`}
      {...rest}
    />
  );
}

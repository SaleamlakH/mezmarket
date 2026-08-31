import type { ButtonHTMLAttributes, ReactElement } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactElement;
}

export function IconButton({ label, icon, className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-(--border) bg-(--field) text-(--text) transition-colors hover:bg-(--accent) hover:text-white focus-visible:bg-(--accent) focus-visible:text-white ${className}`}
      {...rest}
    >
      {icon}
    </button>
  );
}

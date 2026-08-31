import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  state?: 'default' | 'focus' | 'error';
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  state = 'default',
  options,
  placeholder,
  className = '',
  ...rest
}: SelectProps) {
  const border =
    state === 'focus'
      ? 'border-(--accent)'
      : state === 'error'
        ? 'border-(--danger)'
        : 'border-(--border)';
  return (
    <span className={`relative inline-block w-full text-[13px] ${className}`}>
      <select
        className={`focus-ring w-full cursor-pointer appearance-none rounded-lg border bg-(--field) py-2.5 pl-3 pr-9 text-(--text) outline-none placeholder:text-(--text-muted) ${border}`}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 text-(--text-muted)">
        <ChevronDown size={16} />
      </span>
    </span>
  );
}

import type { ComponentPropsWithRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectProps extends ComponentPropsWithRef<'select'> {
  error?: boolean | undefined;
  placeholder?: string;
  options?: SelectOption[];
  groups?: SelectGroup[];
}

export function Select({
  error,
  placeholder,
  options,
  groups,
  className = '',
  ...rest
}: SelectProps) {
  return (
    <span className={`relative block w-full ${className}`}>
      <select
        aria-invalid={error || undefined}
        className={`w-full cursor-pointer appearance-none rounded-[13px] border bg-(--field) px-3.5 py-3 pr-10 text-sm text-(--text) outline-none transition-colors duration-150 placeholder:text-(--text-muted) focus:border-(--accent) ${
          error ? 'border-(--warning)' : 'border-(--border)'
        }`}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {groups?.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-(--text-muted)"
      />
    </span>
  );
}

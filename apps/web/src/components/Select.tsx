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

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectProps extends Omit<ComponentPropsWithRef<'select'>, 'size'> {
  error?: boolean | undefined;
  placeholder?: string;
  options?: SelectOption[];
  groups?: SelectGroup[];
  /** The control's size. */
  size?: SelectSize;
}

const sizes: Record<SelectSize, string> = {
  sm: 'h-7 rounded-lg pl-2 pr-8 text-xs',
  md: 'h-8 rounded-lg pl-2.5 pr-9 text-xs',
  lg: 'h-10 rounded-[13px] pl-3.5 pr-10 text-sm',
};

export function Select({
  error,
  placeholder,
  options,
  groups,
  size = 'lg',
  className = '',
  ...rest
}: SelectProps) {
  return (
    <span className="relative block w-full">
      <select
        aria-invalid={error || undefined}
        className={`w-full cursor-pointer appearance-none border bg-(--field) text-(--text) outline-none transition-colors duration-150 placeholder:text-(--text-muted) focus:border-(--accent) ${sizes[size]} ${
          error ? 'border-(--warning)' : 'border-(--border)'
        } ${className}`}
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

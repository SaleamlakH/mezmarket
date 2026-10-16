import { Children, cloneElement, isValidElement, useState } from 'react';
import type { MouseEvent, ReactElement, ReactNode } from 'react';

export interface StatusToggleProps<T extends string = string> {
  /** The selected value; pass it to control the toggle. */
  value?: T | null;
  /** The value selected on first render, for an uncontrolled toggle. */
  defaultValue?: T;
  onChange?: (value: T) => void;
  /** Classes for the row that holds the buttons. */
  className?: string;
  /** The buttons, each a `Button` carrying its own `value`. */
  children: ReactNode;
}

/**
 * Picks one of several buttons. It injects `onClick` and `aria-pressed` into its
 * `Button` children, and selects nothing until one is clicked.
 */
export function StatusToggle<T extends string = string>({
  value,
  defaultValue,
  onChange,
  className,
  children,
}: StatusToggleProps<T>) {
  const [uncontrolled, setUncontrolled] = useState<T | null>(defaultValue ?? null);
  const selected = value !== undefined ? value : uncontrolled;

  const select = (next: T) => {
    if (value === undefined) {
      setUncontrolled(next);
    }
    onChange?.(next);
  };

  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;

        const { value: childValue, onClick } = child.props as {
          value?: T;
          onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
        };
        if (childValue === undefined) return child;

        return cloneElement(child as ReactElement<Record<string, unknown>>, {
          'aria-pressed': selected === childValue,
          onClick: (event: MouseEvent<HTMLButtonElement>) => {
            onClick?.(event);
            select(childValue);
          },
        });
      })}
    </div>
  );
}

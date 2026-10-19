import type {
  ComponentPropsWithoutRef,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';

/**
 * A plain table primitive.
 *
 * The panel keeps its own layer colour rather than letting the page
 * background show through, and rows are separated by a rule instead of
 * alternating stripes.
 *
 * The wrapper is only a bordered box: it has no responsive visibility and
 * scrolls nothing. When it shows is the caller's call — callers with a card
 * list for small screens hide it, and callers whose columns can overflow wrap
 * it in a scrolling container.
 */

const HEAD_CELL =
  'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-(--text-muted)';
const BODY_CELL = 'border-t border-(--border) px-3 py-3 align-middle text-sm text-(--text)';

export interface TableProps extends ComponentPropsWithoutRef<'table'> {
  children: ReactNode;
}

export function Table({ children, className = '', ...rest }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-(--border)">
      <table className={`w-full border-collapse bg-(--surface-primary) ${className}`} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, ...rest }: ComponentPropsWithoutRef<'thead'>) {
  return (
    <thead className="bg-(--surface-secondary)" {...rest}>
      {children}
    </thead>
  );
}

export function TableBody({ children, ...rest }: ComponentPropsWithoutRef<'tbody'>) {
  return <tbody {...rest}>{children}</tbody>;
}

export interface TableRowProps extends ComponentPropsWithoutRef<'tr'> {
  children: ReactNode;
}

export function TableRow({ children, ...rest }: TableRowProps) {
  return (
    <tr className="transition-colors hover:bg-(--field)" {...rest}>
      {children}
    </tr>
  );
}

export interface TableHeadCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  variant?: 'column' | 'row';
}

export function TableHeadCell({
  children,
  className = '',
  variant = 'column',
  ...rest
}: TableHeadCellProps) {
  const row = variant === 'row';
  return (
    <th
      scope={row ? 'row' : 'col'}
      className={`${row ? `${BODY_CELL} text-left font-normal` : HEAD_CELL} ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className = '',
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`${BODY_CELL} ${className}`} {...rest}>
      {children}
    </td>
  );
}

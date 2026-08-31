import type { ReactNode } from 'react';

export interface LineItemProps {
  name: string;
  qty?: string;
  amount: string;
}

export function LineItem({ name, qty, amount }: LineItemProps) {
  return (
    <div className="flex justify-between py-1.5 text-[13px]">
      <span className="text-(--text)">
        {name}
        {qty && <span className="ml-2 font-mono text-xs text-(--text-muted)">{qty}</span>}
      </span>
      <span className="whitespace-nowrap font-mono text-(--text)">{amount}</span>
    </div>
  );
}

export interface LineTotalProps {
  label?: string;
  amount: string;
}

export function LineTotal({ label = 'Total', amount }: LineTotalProps) {
  return (
    <div className="mt-1.5 flex justify-between border-t border-dashed border-(--border) pt-2.5 text-sm font-bold">
      <span className="text-(--text)">{label}</span>
      <span className="font-mono text-(--text)">{amount}</span>
    </div>
  );
}

export type SheetSize = 'default' | 'md' | 'lg';

export interface SheetProps {
  title: string;
  children: ReactNode;
  size?: SheetSize;
}

const SHEET_WIDTHS: Record<SheetSize, string> = {
  default: 'max-w-[320px]',
  md: 'max-w-[400px]',
  lg: 'max-w-[480px]',
};

export function Sheet({ title, children, size = 'default' }: SheetProps) {
  return (
    <div
      className={`mx-auto ${SHEET_WIDTHS[size]} rounded-[20px] border border-(--border) bg-(--surface-primary) p-[18px] pb-5 shadow-(--shadow-lg)`}
    >
      <div className="mx-auto mb-3.5 h-1 w-9 rounded border-(--border) bg-(--border)" />
      <p className="m-0 mb-2.5 text-[15px] font-bold text-(--text)">{title}</p>
      {children}
    </div>
  );
}

export interface InvoiceSheetProps {
  title?: string;
  items: LineItemProps[];
  total: string;
  footer?: ReactNode;
}

export function InvoiceSheet({ title = 'Invoice', items, total, footer }: InvoiceSheetProps) {
  return (
    <Sheet title={title}>
      {items.map((item, i) => (
        <LineItem key={i} {...item} />
      ))}
      <LineTotal amount={total} />
      {footer && <div className="mt-3.5 flex flex-col gap-2">{footer}</div>}
    </Sheet>
  );
}

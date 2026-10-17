import type { SaleDetailResponse } from '@mez/types';
import { User } from 'lucide-react';

export interface SaleDetailCustomerSectionProps {
  sale: SaleDetailResponse;
  className?: string;
  /** Draw the block as a bordered card. */
  card?: boolean;
}

function ContactPair({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null;
  href?: string | undefined;
}) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-(--text-muted)">{label}</dt>
      <dd className="m-0 text-(--text)">
        {href ? (
          <a href={href} className="underline underline-offset-2">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

/** The customer's name and contact details. */
export function SaleDetailCustomerSection({
  sale,
  className,
  card,
}: SaleDetailCustomerSectionProps) {
  const customer = sale.customer;
  const hasContact = Boolean(customer?.contactEmail || customer?.contactPhone);
  const surface = card ? 'rounded-xl border border-(--border) bg-(--surface-primary) p-4' : '';

  return (
    <div className={`${surface} ${className ?? ''}`}>
      <h2 className="m-0 text-base font-medium text-(--text)">Customer info</h2>
      {customer ? (
        <>
          <div className="mt-3 flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--surface-secondary) text-(--text-muted)"
            >
              <User size={16} />
            </span>
            <span className="min-w-0 truncate text-sm text-(--text)">{customer.name}</span>
          </div>
          {hasContact ? (
            <dl className="mt-3 flex flex-col gap-3 text-sm">
              <ContactPair
                label="Email address"
                value={customer.contactEmail}
                href={customer.contactEmail ? `mailto:${customer.contactEmail}` : undefined}
              />
              <ContactPair
                label="Phone number"
                value={customer.contactPhone}
                href={customer.contactPhone ? `tel:${customer.contactPhone}` : undefined}
              />
            </dl>
          ) : (
            <p className="m-0 mt-3 text-sm text-(--text-muted)">No contact details</p>
          )}
        </>
      ) : (
        <p className="m-0 mt-3 text-sm text-(--text-muted)">No customer</p>
      )}
    </div>
  );
}

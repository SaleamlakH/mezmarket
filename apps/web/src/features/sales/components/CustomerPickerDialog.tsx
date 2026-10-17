import { useState } from 'react';
import type { CustomerSummaryResponse } from '@mez/types';
import { Plus, User, X } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Field } from '@/components/Field';
import { Input } from '@/components/Input';
import { ListCard } from '@/components/ListCard';
import { LoadingState } from '@/components/LoadingState';
import { SuccessState } from '@/components/SuccessState';
import { useCreateCustomer, useCustomers } from '@/hooks/useCustomersApi';

type Step = 'list' | 'new';

export interface CustomerPickerDialogProps {
  open: boolean;
  onClose: () => void;
  /** Attaches the picked customer. */
  onSelect: (customer: CustomerSummaryResponse) => void;
  /** The customer already attached to the sale, marked in the list. */
  selectedCustomerId?: string | null;
}

/** Attaches a customer to the sale: a picker list and a fast new-customer form. */
export function CustomerPickerDialog({
  open,
  onClose,
  onSelect,
  selectedCustomerId,
}: CustomerPickerDialogProps) {
  const { data: customers = [], isPending, isError, refetch } = useCustomers({ enabled: open });
  const createCustomer = useCreateCustomer();

  const [step, setStep] = useState<Step>('list');
  const [created, setCreated] = useState<CustomerSummaryResponse | null>(null);
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const activeId = localSelectedId ?? selectedCustomerId ?? null;

  const close = () => {
    setStep('list');
    setCreated(null);
    setName('');
    setPhone('');
    setEmail('');
    onClose();
  };

  const pick = (customer: CustomerSummaryResponse) => {
    setLocalSelectedId(customer.id);
    onSelect(customer);
    close();
  };

  const saveNew = () => {
    createCustomer.mutate(
      {
        name: name.trim(),
        ...(phone.trim() !== '' ? { contactPhone: phone.trim() } : {}),
        ...(email.trim() !== '' ? { contactEmail: email.trim() } : {}),
      },
      {
        onSuccess: (customer) => {
          setLocalSelectedId(customer.id);
          setCreated(customer);
          onSelect(customer);
          setName('');
          setPhone('');
          setEmail('');
          setStep('list');
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={close} size="md">
      <header className="sticky top-0 z-10 bg-(--surface-primary) w-full flex shrink-0 items-center justify-between md:mt-2.5 mb-2.5 gap-3 pt-3 pb-2">
        <h2 className="m-0 text-base font-bold text-(--text)">
          {step === 'new' ? 'New customer' : 'Attach customer'}
        </h2>

        <div className="flex gap-3">
          {step !== 'new' && !created && (
            <Button variant="primary" size="sm" onClick={() => setStep('new')}>
              <Plus size={14} aria-hidden /> Add New
            </Button>
          )}

          <Button variant="secondary" size="sm" type="button" onClick={close} aria-label="Close">
            <X size={16} aria-hidden />
          </Button>
        </div>
      </header>

      {step === 'new' ? (
        <form
          className="flex flex-col gap-4 pb-1"
          onSubmit={(event) => {
            event.preventDefault();
            saveNew();
          }}
        >
          <Field id="customerName" label="Name">
            <Input
              id="customerName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Customer name"
            />
          </Field>

          <Field id="customerPhone" label="Phone" optional>
            <Input
              id="customerPhone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Phone number"
            />
          </Field>

          <Field id="customerEmail" label="Email" optional>
            <Input
              id="customerEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
            />
          </Field>

          {createCustomer.isError && (
            <p role="alert" className="m-0 text-[13px] font-semibold text-(--danger)">
              {createCustomer.error instanceof Error
                ? createCustomer.error.message
                : 'Could not save the customer'}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="grow"
              onClick={() => setStep('list')}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="grow"
              disabled={name.trim() === '' || createCustomer.isPending}
            >
              {createCustomer.isPending ? 'Saving…' : 'Save customer'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3 pb-1">
          {created ? (
            <SuccessState>
              <p className="m-0 text-[13px] font-semibold text-(--text)">Customer added</p>

              <div className="flex flex-col">
                <span className="text-sm font-semibold text-(--text)">{created.name}</span>
                {created.contactPhone && (
                  <span className="font-mono text-xs text-(--text-muted)">
                    {created.contactPhone}
                  </span>
                )}
                {created.contactEmail && (
                  <span className="font-mono text-xs text-(--text-muted)">
                    {created.contactEmail}
                  </span>
                )}
              </div>

              <Button type="button" variant="secondary" onClick={close}>
                Done
              </Button>
            </SuccessState>
          ) : isPending ? (
            <LoadingState label="Loading customers…" />
          ) : isError ? (
            <ErrorState
              title="Could not load customers"
              description="Something went wrong while fetching your customers."
              onRetry={() => void refetch()}
            />
          ) : customers.length === 0 ? (
            <EmptyState
              title="No customers yet"
              description="Add a customer to attach it to the sale."
              action={
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setStep('new')}
                >
                  <Plus size={14} aria-hidden /> Add new customer
                </Button>
              }
            />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {customers.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => pick(customer)}
                    className="focus-ring block w-full cursor-pointer rounded-xl text-left"
                  >
                    <ListCard
                      title={customer.name}
                      meta={customer.contactPhone ?? customer.contactEmail ?? 'No contact'}
                      icon={<User size={18} aria-hidden />}
                      trailing={
                        activeId === customer.id ? <Badge tone="accent">Attached</Badge> : undefined
                      }
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dialog>
  );
}

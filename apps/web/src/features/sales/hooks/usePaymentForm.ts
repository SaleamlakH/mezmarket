import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import type { BaseSyntheticEvent } from 'react';
import type { PaymentFormValues, PaymentStatus, RecordPaymentInput } from '@mez/types';
import type { FieldErrors } from '@mez/validation';
import { recordPaymentSchema } from '@mez/validation';
import { useRecordPayment } from './useSalesApi';

/** How the details page's payment buttons map onto a payment status. */
export type PaymentMode = 'paid' | 'partial';

const STATUS_BY_MODE: Record<PaymentMode, PaymentStatus> = {
  paid: 'PAID',
  partial: 'PARTIALLY_PAID',
};

export interface UsePaymentFormReturn extends Omit<
  UseFormReturn<PaymentFormValues, unknown, RecordPaymentInput>,
  'handleSubmit'
> {
  submit: (event?: BaseSyntheticEvent) => Promise<void>;
  isPending: boolean;
  paymentErrors: FieldErrors<PaymentFormValues>;
  serverError: string | null;
}

/**
 * The record-payment form: validates against the shared payment rules and
 * sends the payload they produce. Remounted per mode, so the defaults hold.
 */
export function usePaymentForm(
  saleId: string,
  mode: PaymentMode,
  onRecorded: () => void,
): UsePaymentFormReturn {
  const { mutate, isPending, error } = useRecordPayment(saleId);

  const form = useForm<PaymentFormValues, unknown, RecordPaymentInput>({
    resolver: zodResolver(recordPaymentSchema),
    mode: 'onTouched',
    defaultValues: { status: STATUS_BY_MODE[mode], amount: '', methodDetail: '' },
  });

  const submit = form.handleSubmit((input) => {
    mutate(input, { onSuccess: onRecorded });
  });

  const { errors } = form.formState;
  const paymentErrors: FieldErrors<PaymentFormValues> = {
    ...(errors.amount?.message ? { amount: errors.amount.message } : {}),
    ...(errors.method?.message ? { method: errors.method.message } : {}),
    ...(errors.methodDetail?.message ? { methodDetail: errors.methodDetail.message } : {}),
  };

  return {
    ...form,
    submit,
    isPending,
    paymentErrors,
    serverError: error instanceof Error ? error.message : null,
  };
}

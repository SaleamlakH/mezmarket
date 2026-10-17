import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import type {
  BusinessMemberSummaryResponse,
  CreateSaleInput,
  CreateSaleResponse,
  CustomerSummaryResponse,
  PaymentFormValues,
  SaleFormValues,
  SaleLineFormValues,
} from '@mez/types';
import type { FieldErrors } from '@mez/validation';
import { createSaleSchema } from '@mez/validation';
import { paymentPayload } from '../lib/paymentPayload';
import type { SaleDraftCatalog } from '../lib/saleDraftView';
import { isCommitted, type SaleDraftLine, type SalePaymentDraft } from '../state/saleDraft';
import { useSaleDraft } from '../state/useSaleDraft';
import { useDraftCatalog } from './useDraftCatalog';
import { useCreateSale } from './useSalesApi';

/**
 * Snapshots the reducer's draft into the form values `createSaleSchema` reads;
 * each line carries the chosen unit's `sellCapable` flag.
 */
export function draftSaleValues(
  lines: SaleDraftLine[],
  customer: CustomerSummaryResponse | null,
  server: BusinessMemberSummaryResponse | null,
  payment: SalePaymentDraft,
  catalog: SaleDraftCatalog,
): SaleFormValues {
  const formLines: SaleLineFormValues[] = lines.filter(isCommitted).map((line) => {
    const unit = catalog
      .unitsForProduct(line.productId)
      .find((entry) => entry.id === line.productUnitId);
    return {
      productId: line.productId,
      productUnitId: line.productUnitId,
      quantity: String(line.quantity),
      ...(unit ? { sellCapable: unit.sellCapable } : {}),
    };
  });

  return {
    lines: formLines,
    initialPayment: paymentPayload({
      status: payment.status,
      amount: payment.amount,
      methodDetail: payment.methodDetail,
      ...(payment.method ? { method: payment.method } : {}),
    }),
    ...(customer ? { customerId: customer.id } : {}),
    ...(server ? { serverMemberId: server.id } : {}),
  };
}

/** The message a root-level error carries, wherever RHF nested it. */
function rootMessage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const nested = error as { root?: { message?: string }; message?: string };
  return nested.root?.message ?? nested.message;
}

/** The checkout the sale panel drives: validate the draft, then record it. */
export interface SaleCheckout {
  /** Validates the draft and, when it passes, records the sale. */
  confirm: () => void;
  /** A record request is in flight. */
  isSubmitting: boolean;
  /** Whether the sale was recorded, so the panel shows its result. */
  isSuccess: boolean;
  /** The recorded sale, once there is one. */
  sale: CreateSaleResponse | undefined;
  /** The first reason the draft could not be recorded, if any. */
  error: string | null;
  /** The payment's per-field errors, for the payment fields to point at. */
  paymentErrors: FieldErrors<PaymentFormValues>;
  /** Clears the draft and the checkout — the success step's Done. */
  finish: () => void;
}

/**
 * The new-sale checkout: the reducer holds the truth, the form mirrors it via
 * `values` and validates on confirm; the success write stands until `finish`.
 */
export function useSaleCheckout(): SaleCheckout {
  const { lines, customer, server, payment, clear } = useSaleDraft();
  const catalog = useDraftCatalog(lines);
  const { mutate, reset, data, isPending, isSuccess, isError, error } = useCreateSale();

  // Mirrors the draft into the form; an equal snapshot with fresh identities
  // is a no-op to RHF's deep compare.
  const values = useMemo(
    () => draftSaleValues(lines, customer, server, payment, catalog),
    [lines, customer, server, payment, catalog],
  );

  const form = useForm<SaleFormValues, unknown, CreateSaleInput>({
    resolver: zodResolver(createSaleSchema),
    values,
    mode: 'onTouched',
  });

  const confirm = useCallback(() => {
    void form.handleSubmit((input) => mutate(input))();
  }, [form, mutate]);

  const finish = useCallback(() => {
    reset();
    clear();
  }, [reset, clear]);

  const { errors } = form.formState;
  const validationError = rootMessage(errors.lines) ?? undefined;

  const paymentError = errors.initialPayment;
  const paymentErrors: FieldErrors<PaymentFormValues> = {
    ...(paymentError?.amount?.message ? { amount: paymentError.amount.message } : {}),
    ...(paymentError?.method?.message ? { method: paymentError.method.message } : {}),
    ...(paymentError?.methodDetail?.message
      ? { methodDetail: paymentError.methodDetail.message }
      : {}),
  };

  const requestError = isError
    ? error instanceof Error
      ? error.message
      : 'Could not record the sale'
    : undefined;

  return {
    confirm,
    isSubmitting: isPending,
    isSuccess,
    sale: data,
    error: validationError ?? requestError ?? null,
    paymentErrors,
    finish,
  };
}

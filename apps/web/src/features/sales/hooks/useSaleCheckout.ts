import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useMemo } from 'react';
import { useForm, type FieldErrors as FormFieldErrors } from 'react-hook-form';
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
import { ApiError } from '@/lib/apiClient';
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

/** The message a single field error carries, when it has one. */
function fieldMessage(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const field = error as { message?: unknown };
  return typeof field.message === 'string' ? field.message : undefined;
}

/** The client-side line errors, keyed by the draft line they belong to. */
function validationLineErrors(
  errors: FormFieldErrors<SaleFormValues>,
  lines: SaleDraftLine[],
): Record<string, string> {
  const fieldErrors = Array.isArray(errors.lines) ? errors.lines : [];
  const lineErrors: Record<string, string> = {};

  lines.filter(isCommitted).forEach((line, index) => {
    const entry = fieldErrors[index] as Record<string, unknown> | undefined;
    const message =
      fieldMessage(entry?.productUnitId) ??
      fieldMessage(entry?.productId) ??
      fieldMessage(entry?.quantity);

    if (message) lineErrors[line.id] = message;
  });

  return lineErrors;
}

/**
 * Splits the API's field-path details back onto the draft: a line's
 * `productUnitId` path points at that line, while its `productId` path points
 * at the cart item.
 */
function apiDetailErrors(
  error: unknown,
  lines: SaleDraftLine[],
): { lineErrors: Record<string, string>; productErrors: Record<string, string> } {
  const lineErrors: Record<string, string> = {};
  const productErrors: Record<string, string> = {};

  if (!(error instanceof ApiError) || !error.details) {
    return { lineErrors, productErrors };
  }

  const details = error.details;

  lines.filter(isCommitted).forEach((line, index) => {
    const unitMessage = details[`lines.${index}.productUnitId`];
    if (unitMessage) lineErrors[line.id] = unitMessage;

    const productMessage = details[`lines.${index}.productId`];
    if (productMessage) productErrors[line.productId] = productMessage;
  });

  return { lineErrors, productErrors };
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
  /** Per-line errors, keyed by the draft line they point at. */
  lineErrors: Record<string, string>;
  /** Per-product stock errors, keyed by the product they point at. */
  productErrors: Record<string, string>;
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

  const apiErrors = apiDetailErrors(error, lines);

  return {
    confirm,
    isSubmitting: isPending,
    isSuccess,
    sale: data,
    error: validationError ?? requestError ?? null,
    paymentErrors,
    lineErrors: { ...validationLineErrors(errors, lines), ...apiErrors.lineErrors },
    productErrors: apiErrors.productErrors,
    finish,
  };
}

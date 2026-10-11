import type { BusinessMemberSummaryResponse, TaxDisplayMode } from '../business/business.types.js';
import type { RequireAllKeys } from '../shared/require-all-keys.js';

/**
 * How far a sale has been settled, derived from the payments recorded against
 * it. Mirrors the `PaymentStatus` Prisma enum.
 */
export type PaymentStatus = 'PAID' | 'PENDING' | 'PARTIALLY_PAID';

/**
 * Whether a sale has been reversed. Mirrors the `VoidStatus` Prisma enum. A
 * void is a full reversal; a refund is recorded per line through
 * `SaleLine.refunded`/`refundRestocked`.
 */
export type VoidStatus = 'NONE' | 'VOIDED';

/**
 * How a payment was made. Mirrors the `PaymentMethod` Prisma enum.
 */
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'OTHER';

/**
 * Domain shape of a Sale as stored in the database.
 */
export interface Sale {
  id: string;
  businessId: string;
  branchId: string;
  invoiceNumber: string;
  processedByMemberId: string;
  serverMemberId: string | null;
  customerId: string | null;
  discount: number | null;
  taxRateApplied: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  balanceDue: number;
  voidStatus: VoidStatus;
  voidReason: string | null;
  saleDatetime: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JSON-serialized form of a Sale sent to the frontend.
 */
export type SaleResponse = RequireAllKeys<
  Sale,
  Omit<Sale, 'saleDatetime' | 'createdAt' | 'updatedAt'> & {
    saleDatetime: string;
    createdAt: string;
    updatedAt: string;
  }
>;

/**
 * Domain shape of a SaleLine as stored in the database.
 *
 * The product's name, the unit as sold, the unit it resolved to, the quantity
 * in that unit and the unit price are all snapshots taken at the moment of
 * sale, so a later rename, or a change to a unit's name, factor or price,
 * never rewrites a past line.
 *
 * No line subtotal is stored — it is `quantity × unitPrice`, derived where it
 * is needed.
 */
export interface SaleLine {
  id: string;
  saleId: string;
  productId: string;
  /** Snapshot of the product's name at the time of sale. */
  productName: string;
  productUnitId: string | null;
  soldUnit: string;
  quantity: number;
  standardUnit: string;
  quantityInStandardUnit: number;
  resolvedStandardUnitId: string | null;
  unitPrice: number;
  containerId: string | null;
  refunded: boolean;
  refundRestocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JSON-serialized form of a SaleLine sent to the frontend.
 */
export type SaleLineResponse = RequireAllKeys<
  SaleLine,
  Omit<SaleLine, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  }
>;

/**
 * Domain shape of a Payment as stored in the database.
 */
export interface Payment {
  id: string;
  saleId: string;
  amount: number;
  businessMemberId: string;
  method: PaymentMethod;
  methodDetail: string | null;
  paidAt: Date;
  createdAt: Date;
}

/**
 * JSON-serialized form of a Payment sent to the frontend.
 */
export type PaymentResponse = RequireAllKeys<
  Payment,
  Omit<Payment, 'paidAt' | 'createdAt'> & {
    paidAt: string;
    createdAt: string;
  }
>;

/**
 * A sale line joined with the product's brand for display. The product name is
 * a snapshot on the line itself, so it is not re-added here.
 */
export type SaleLineDetailResponse = SaleLineResponse & {
  productBrand: string | null;
};

/**
 * Return shape of a sale detail request, and of the create, edit, void and
 * refund endpoints so a freshly written sale reads back the same way.
 */
export type SaleDetailResponse = SaleResponse & {
  lines: SaleLineDetailResponse[];
  payments: PaymentResponse[];
  processedBy: BusinessMemberSummaryResponse;
  /** Server attribution — the member who took the order, if any. */
  servedBy: BusinessMemberSummaryResponse | null;
  /** Inline summary of the attached customer; deliberately not a named type. */
  customer: { id: string; name: string } | null;
};

/**
 * A row of the browseable sale history: the header fields a list shows,
 * without the lines or payments.
 */
export type SaleSummaryResponse = Pick<
  SaleResponse,
  'id' | 'invoiceNumber' | 'saleDatetime' | 'total' | 'paymentStatus' | 'voidStatus'
> & {
  itemCount: number;
  productNames: string[];
  processedBy: BusinessMemberSummaryResponse;
  servedBy: BusinessMemberSummaryResponse | null;
  /** Inline summary of the attached customer; deliberately not a named type. */
  customer: { id: string; name: string } | null;
};

/**
 * Domain form of a sale-history row, using `Date` for the timestamp. Mirrors
 * `SaleSummaryResponse` the way `SaleDetailResult` mirrors `SaleDetailResponse`:
 * the read carries the header fields and a light preview of the lines (their
 * count and product names), never the lines or payments themselves.
 */
export type SaleSummaryResult = Pick<
  Sale,
  'id' | 'invoiceNumber' | 'saleDatetime' | 'total' | 'paymentStatus' | 'voidStatus'
> & {
  itemCount: number;
  productNames: string[];
  processedBy: BusinessMemberSummaryResponse;
  servedBy: BusinessMemberSummaryResponse | null;
  /** Inline summary of the attached customer; deliberately not a named type. */
  customer: { id: string; name: string } | null;
};

/**
 * The invoice view. Built only from what is on the sale plus the business's
 * display settings, never from current product data, so it never changes
 * meaning after the fact.
 */
export type SaleInvoiceResponse = SaleDetailResponse & {
  business: {
    name: string;
    currencyCode: string;
    taxDisplayMode: TaxDisplayMode;
  };
  branch: {
    name: string;
    address: string | null;
  };
};

/**
 * A sale line joined with the product's brand, using domain Date types.
 */
export type SaleLineDetailResult = SaleLine & {
  productBrand: string | null;
};

/**
 * Domain result shape returned by fetch, create, edit, void and refund
 * operations. Dates are retained as `Date` instances (not serialized to
 * strings).
 */
export type SaleDetailResult = Sale & {
  lines: SaleLineDetailResult[];
  payments: Payment[];
  processedBy: BusinessMemberSummaryResponse;
  /** Server attribution — the member who took the order, if any. */
  servedBy: BusinessMemberSummaryResponse | null;
  /** Inline summary of the attached customer; deliberately not a named type. */
  customer: { id: string; name: string } | null;
};

/**
 * API result types for the write operations (domain shape).
 */
export type CreateSaleResult = SaleDetailResult;
export type UpdateSaleResult = SaleDetailResult;
export type VoidSaleResult = SaleDetailResult;
export type RefundSaleResult = SaleDetailResult;

/**
 * JSON-serialized forms sent to the frontend.
 */
export type CreateSaleResponse = SaleDetailResponse;
export type UpdateSaleResponse = SaleDetailResponse;
export type VoidSaleResponse = SaleDetailResponse;
export type RefundSaleResponse = SaleDetailResponse;

/**
 * Filters a sale-history request may carry.
 */
export interface SaleListFilters {
  status?: PaymentStatus;
  /** ISO 8601 instant lower bound, inclusive. */
  from?: string;
  /** ISO 8601 instant upper bound, inclusive. */
  to?: string;
  productId?: string;
}

/**
 * A line as submitted. `productUnitId` identifies the unit the product is sold
 * in — the unit label, the standard-unit equivalent and the unit price are all
 * resolved and snapshotted server-side, never typed in by the user.
 */
export type CreateSaleLineInput = Pick<SaleLine, 'productId' | 'quantity'> & {
  productUnitId: string;
};

/**
 * A payment as submitted. The method is optional to record; `OTHER` is its
 * default when none is given.
 */
export interface PaymentInput {
  amount: number;
  method?: PaymentMethod;
  methodDetail?: string;
}

/**
 * Request payload for creating and confirming a sale in one action. Stock is
 * drawn, the invoice is produced and the payment status is derived as part of
 * the same write.
 *
 * A payment is optional; a sale with none confirmed against it is `PENDING`.
 * An omitted `saleDatetime` defaults to the moment it is confirmed.
 */
export interface CreateSaleInput {
  /** ISO 8601 instant the sale happened. */
  saleDatetime?: Date;
  lines: CreateSaleLineInput[];
  initialPayment?: PaymentInput;
}

/**
 * A sale line as submitted when editing a sale. An `id` updates that existing
 * line in place; a line without one is inserted. Existing lines left out of the
 * payload are removed.
 */
export type UpdateSaleLineInput = CreateSaleLineInput & {
  id?: string;
};

/**
 * Request payload for editing a sale. Lines are updated in place, never
 * replaced wholesale. Totals, amount paid, balance due and status are
 * recalculated after every edit.
 */
export type UpdateSaleInput = Omit<CreateSaleInput, 'lines' | 'initialPayment'> & {
  lines: UpdateSaleLineInput[];
};

/**
 * Request payload for recording a payment against an existing sale.
 *
 * The target sale is not part of this payload — it is the sale named by the
 * route (`POST /api/businesses/:businessId/sales/:saleId/payments`), so a
 * payment can never be posted against a sale the path did not name.
 */
export type RecordPaymentInput = PaymentInput;

/**
 * Request payload for voiding a sale — a full reversal that shouldn't have
 * happened. A reason is always required.
 */
export interface VoidSaleInput {
  reason: string;
}

/**
 * A per-line restock override for a refund. A line left out of the refund
 * follows its product's default behavior.
 */
export interface RefundSaleLineInput {
  lineId: string;
  restock: boolean;
}

/**
 * Request payload for refunding a sale — it happened, the goods came back. A
 * reason is always required.
 */
export interface RefundSaleInput {
  reason: string;
  lines?: RefundSaleLineInput[];
}

/**
 * Raw values a sale line row holds before validation: the quantity is text,
 * which is what an input hands over.
 */
export type SaleLineFormValues = Omit<CreateSaleLineInput, 'quantity'> & {
  quantity: string;
  /**
   * for Fast-forward check only: whether the chosen unit can be sold
   */
  sellCapable?: boolean | undefined;
};

/**
 * Raw values a payment row holds before validation.
 */
export type PaymentFormValues = Omit<PaymentInput, 'amount'> & {
  amount: string;
};

/**
 * Raw values the new-sale form holds before validation.
 */
export type SaleFormValues = Omit<CreateSaleInput, 'saleDatetime' | 'lines' | 'initialPayment'> & {
  /** UTC ISO 8601 instant, as a date picker produces. */
  saleDatetime?: string | undefined;
  lines: SaleLineFormValues[];
  initialPayment?: PaymentFormValues | undefined;
};

/**
 * A line row in the edit-sale form additionally carries the id of the line it
 * updates; a row without one is a newly added line.
 */
export type UpdateSaleLineFormValues = SaleLineFormValues & {
  id?: string | undefined;
};

/**
 * Raw values the edit-sale form holds before validation.
 */
export type UpdateSaleFormValues = Omit<SaleFormValues, 'lines'> & {
  lines: UpdateSaleLineFormValues[];
};

/**
 * Raw values the void form holds before validation. Every field is already
 * plain, so it is the payload shape itself.
 */
export type VoidSaleFormValues = VoidSaleInput;

/**
 * A refund line row as entered. Every field is already plain.
 */
export type RefundSaleLineFormValues = RefundSaleLineInput;

/**
 * Raw values the refund form holds before validation.
 */
export type RefundSaleFormValues = RefundSaleInput;

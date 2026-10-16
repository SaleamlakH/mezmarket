import { createContext } from 'react';
import type {
  BusinessMemberSummaryResponse,
  CustomerSummaryResponse,
  PaymentMethod,
  PaymentStatus,
} from '@mez/types';

/** A line being built for the new sale (UI-only). */
export interface SaleDraftLine {
  id: string;
  productId: string;
  productUnitId: string;
  quantity: number;
}

/** Whether a draft line holds a quantity, and so counts toward the sale. */
export function isCommitted(line: { quantity: number }): boolean {
  return line.quantity > 0;
}

/** The payment being recorded for the draft. */
export interface SalePaymentDraft {
  status: PaymentStatus;
  /** The amount as typed. */
  amount: string;
  /** Whether the cashier typed an amount. */
  amountEdited: boolean;
  /** How the sale is paid. */
  method: PaymentMethod | '';
  methodDetail: string;
}

export const EMPTY_PAYMENT: SalePaymentDraft = {
  status: 'PAID',
  amount: '',
  amountEdited: false,
  method: 'CASH',
  methodDetail: '',
};

export interface SaleDraftContextValue {
  lines: SaleDraftLine[];
  /** The product whose controls are open. */
  activeProductId: string | null;
  /** The line the unit selector and stepper edit. */
  activeLineId: string | null;
  /** The customer attached to the sale. */
  customer: CustomerSummaryResponse | null;
  /** The server attached to the sale. */
  server: BusinessMemberSummaryResponse | null;
  /** The payment being recorded. */
  payment: SalePaymentDraft;
  openProduct: (productId: string, defaultUnitId: string) => void;
  closeProduct: () => void;
  setUnit: (unitId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeActiveLine: () => void;
  /** Removes one line by id. */
  removeLine: (lineId: string) => void;
  /** Removes every line the product holds. */
  removeProduct: (productId: string) => void;
  /** Drops every line. */
  clear: () => void;
  linesForProduct: (productId: string) => SaleDraftLine[];
  /** Attaches the customer. */
  attachCustomer: (customer: CustomerSummaryResponse) => void;
  /** Detaches the customer. */
  clearCustomer: () => void;
  /** Attaches the server. */
  attachServer: (server: BusinessMemberSummaryResponse) => void;
  /** Detaches the server. */
  clearServer: () => void;
  /** Picks the payment status. */
  setPaymentStatus: (status: PaymentStatus) => void;
  /** Writes the amount. */
  setPaymentAmount: (amount: string) => void;
  setPaymentMethod: (method: PaymentMethod | '') => void;
  setPaymentDetail: (detail: string) => void;
  /** Sets a product's active line unit. */
  setUnitForProduct: (productId: string, unitId: string) => void;
  /** Sets a product's active line quantity. */
  setQuantityForProduct: (productId: string, defaultUnitId: string, quantity: number) => void;
}

export const SaleDraftContext = createContext<SaleDraftContextValue | null>(null);

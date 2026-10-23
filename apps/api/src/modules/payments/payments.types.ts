import type { PaymentMethod, PaymentSummaryQueryFilters, PaymentSummaryResponse } from '@mez/types';
import type { Scope } from '../../shared/types/session.types.js';
import type { StoredDecimal } from '../../shared/types/decimal.types.js';

export type {
  PaymentMethodSummary,
  PaymentSummaryQueryFilters,
  PaymentSummaryResponse,
} from '@mez/types';

/**
 * One method's grouped payments over a reporting period. The repository keeps
 * the summed amount as the `Decimal` the column stores, so the service can add
 * the groups without dropping back to floating point.
 */
export type PaymentMethodTotal = {
  method: PaymentMethod;
  total: StoredDecimal;
  paymentCount: number;
};

export type PaymentsRepository = {
  /** One group per method that took a payment in the period, scoped to the branch. */
  summarizeByMethod(
    scope: Scope,
    filters: PaymentSummaryQueryFilters,
  ): Promise<PaymentMethodTotal[]>;
};

export type PaymentsService = {
  /** The payment breakdown for the period, derived from the method groups. */
  getSummary(scope: Scope, filters: PaymentSummaryQueryFilters): Promise<PaymentSummaryResponse>;
};

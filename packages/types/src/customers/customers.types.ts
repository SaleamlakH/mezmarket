import type { RequireAllKeys } from '../shared/require-all-keys.js';

/**
 * Domain shape of a Customer as stored in the database. A customer is a
 * business-owned, no-login reference — a name plus optional contact — that a
 * sale can be attributed to.
 */
export interface Customer {
  id: string;
  businessId: string;
  name: string;
  contactPhone: string | null;
  contactEmail: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JSON-serialized form of a Customer sent to the frontend.
 */
export type CustomerResponse = RequireAllKeys<
  Customer,
  Omit<Customer, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  }
>;

/**
 * A customer narrowed to what a picker or a sale record shows: the name and the
 * optional contact, without the timestamps or the owning business.
 */
export type CustomerSummary = Pick<Customer, 'id' | 'name' | 'contactPhone' | 'contactEmail'>;

/**
 * JSON-serialized form of a CustomerSummary. It carries no timestamps, so it
 * needs no conversion.
 */
export type CustomerSummaryResponse = CustomerSummary;

/**
 * A customer as submitted: a required name and the optional contact details.
 * The business the customer belongs to comes from the resolved session, never
 * the body.
 */
export interface CreateCustomerInput {
  name: string;
  contactPhone?: string;
  contactEmail?: string;
}

/**
 * Raw values the new-customer form holds before validation: the name and the
 * optional contact details, already plain text. The optionals carry an explicit
 * `undefined` because a blank field hands one over, which `CreateCustomerInput`
 * alone would not admit.
 */
export type CustomerFormValues = {
  name: string;
  contactPhone?: string | undefined;
  contactEmail?: string | undefined;
};

/**
 * Domain shape of a created Customer.
 */
export type CreateCustomerResult = Customer;

/**
 * JSON-serialized form sent to the frontend.
 */
export type CreateCustomerResponse = CustomerResponse;

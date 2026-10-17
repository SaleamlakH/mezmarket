import type { ZodType } from 'zod';
import z from 'zod';
import type { CreateCustomerInput, CustomerFormValues } from '@mez/types';
import { blankIsUnset, optionalText, requiredText, withoutUnset } from './helpers.js';

/**
 * An email left blank is no contact rather than an empty string; anything
 * present must be a valid address.
 */
const contactEmailSchema = z
  .string()
  .trim()
  .transform(blankIsUnset)
  .optional()
  .pipe(z.email('Enter a valid email address').optional());

/**
 * Creates a business-owned customer reference. The parsed output is the API's
 * `CreateCustomerInput`; the owning business comes from the resolved session,
 * never the body.
 */
export const createCustomerSchema = z
  .object({
    name: requiredText('Name is required').max(80, 'Name must be 80 characters or less'),
    contactPhone: optionalText(30, 'Phone number must be 30 characters or less'),
    contactEmail: contactEmailSchema,
  })
  .transform(withoutUnset) satisfies ZodType<CreateCustomerInput, CustomerFormValues>;

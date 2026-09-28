import type { ZodType } from 'zod';
import type { CreateProductInput, CreateUploadInput } from '@mez/types';
import type { FieldErrors, ValidationResult } from './types.js';
import {
  loginSchema,
  signupSchema,
  type LoginFormValues,
  type SignupFormValues,
} from './schema/auth.schema.js';
import { updateOwnerSchema, type UpdateOwnerFormValues } from './schema/owner.schema.js';
import {
  createBusinessSchema,
  updateBusinessSchema,
  type CreateBusinessFormValues,
  type UpdateBusinessFormValues,
} from './schema/business.schema.js';
import { createProductSchema } from './schema/product.schema.js';
import { createUploadSchema, type CreateUploadClientInput } from './schema/upload.schema.js';

/**
 * Parses `input` against `schema` and flattens any failure into one
 * message per field path: `address.city` for a nested field,
 * `lines.0.purchaseQuantity` for a field inside a list, and `_root` for a
 * problem with the value as a whole. The first message for a path wins.
 */
export function validateInput<T>(schema: ZodType<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) return { data: result.data, errors: null };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_root';
    if (!errors[key]) errors[key] = issue.message;
  }

  return { data: null, errors: errors as FieldErrors<T> };
}

export function validateLoginValues(values: LoginFormValues) {
  return validateInput(loginSchema, values);
}

export function validateSignupValues(values: SignupFormValues) {
  return validateInput(signupSchema, values);
}

export function validateCreateBusiness(values: CreateBusinessFormValues) {
  return validateInput(createBusinessSchema, values) as ValidationResult<CreateBusinessFormValues>;
}

export function validateUpdateOwnerValues(values: UpdateOwnerFormValues) {
  return validateInput(updateOwnerSchema, values);
}

export function validateUpdateBusiness(
  values: UpdateBusinessFormValues,
): ValidationResult<UpdateBusinessFormValues> {
  return validateInput(updateBusinessSchema, values) as ValidationResult<UpdateBusinessFormValues>;
}

export function validateCreateProduct(values: unknown) {
  return validateInput(createProductSchema, values) as ValidationResult<CreateProductInput>;
}

export function validateCreateUpload(values: CreateUploadClientInput) {
  return validateInput(createUploadSchema, values) as ValidationResult<CreateUploadInput>;
}

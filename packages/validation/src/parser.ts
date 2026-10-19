import type { ZodType } from 'zod';
import type { FieldErrors, ValidationResult } from './types.js';
import { updateOwnerSchema, type UpdateOwnerFormValues } from './schema/owner.schema.js';
import { createUploadSchema, type CreateUploadClientInput } from './schema/upload.schema.js';
import type {
  BatchFormValues,
  BatchLineFormValues,
  CreateProductInput,
  CustomerFormValues,
  CreateUploadInput,
  PaymentFormValues,
  RefundSaleFormValues,
  RefundSaleLineFormValues,
  SaleFormValues,
  SaleLineFormValues,
  MemberListFilters,
  ProductInventoryDetailFilters,
  ProductInventoryListFilters,
  UpdateBatchFormValues,
  UpdateBatchLineFormValues,
  UpdateSaleFormValues,
  UpdateSaleLineFormValues,
  VoidSaleFormValues,
} from '@mez/types';
import {
  loginSchema,
  signupSchema,
  type LoginFormValues,
  type SignupFormValues,
} from './schema/auth.schema.js';
import {
  createBatchLineSchema,
  createBatchSchema,
  updateBatchLineSchema,
  updateBatchSchema,
} from './schema/batch.schema.js';
import {
  createBusinessSchema,
  updateBusinessSchema,
  type CreateBusinessFormValues,
  type UpdateBusinessFormValues,
} from './schema/business.schema.js';
import { createCustomerSchema } from './schema/customer.schema.js';
import { createProductSchema } from './product/create.schema.js';
import {
  createSaleLineSchema,
  createSaleSchema,
  recordPaymentSchema,
  refundSaleLineSchema,
  refundSaleSchema,
  updateSaleLineSchema,
  updateSaleSchema,
  voidSaleSchema,
} from './schema/sales.schema.js';
import { memberListQuerySchema } from './schema/member.schema.js';
import {
  productInventoryDetailQuerySchema,
  productInventoryListQuerySchema,
} from './schema/inventory.schema.js';

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

export function validateCreateCustomer(values: CustomerFormValues) {
  return validateInput(createCustomerSchema, values);
}

export function validateCreateUpload(values: CreateUploadClientInput) {
  return validateInput(createUploadSchema, values) as ValidationResult<CreateUploadInput>;
}
export function validateCreateBatch(values: BatchFormValues) {
  return validateInput(createBatchSchema, values);
}

export function validateUpdateBatch(values: UpdateBatchFormValues) {
  return validateInput(updateBatchSchema, values);
}

export function validateBatchLine(values: BatchLineFormValues) {
  return validateInput(createBatchLineSchema, values);
}

export function validateUpdateBatchLine(values: UpdateBatchLineFormValues) {
  return validateInput(updateBatchLineSchema, values);
}

export function validateCreateSale(values: SaleFormValues) {
  return validateInput(createSaleSchema, values);
}

export function validateSaleLine(values: SaleLineFormValues) {
  return validateInput(createSaleLineSchema, values);
}

export function validateUpdateSale(values: UpdateSaleFormValues) {
  return validateInput(updateSaleSchema, values);
}

export function validateUpdateSaleLine(values: UpdateSaleLineFormValues) {
  return validateInput(updateSaleLineSchema, values);
}

export function validatePayment(values: PaymentFormValues) {
  return validateInput(recordPaymentSchema, values);
}

export function validateVoidSale(values: VoidSaleFormValues) {
  return validateInput(voidSaleSchema, values);
}

export function validateRefundSale(values: RefundSaleFormValues) {
  return validateInput(refundSaleSchema, values);
}

export function validateRefundSaleLine(values: RefundSaleLineFormValues) {
  return validateInput(refundSaleLineSchema, values);
}

export function validateMemberListQuery(values: unknown) {
  return validateInput(memberListQuerySchema, values) as ValidationResult<MemberListFilters>;
}

export function validateProductInventoryListQuery(values: unknown) {
  return validateInput(
    productInventoryListQuerySchema,
    values,
  ) as ValidationResult<ProductInventoryListFilters>;
}

export function validateProductInventoryDetailQuery(values: unknown) {
  return validateInput(
    productInventoryDetailQuerySchema,
    values,
  ) as ValidationResult<ProductInventoryDetailFilters>;
}

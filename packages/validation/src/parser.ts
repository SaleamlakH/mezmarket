import type { ZodType } from 'zod';
import type { FieldErrors, ValidationResult } from './types.js';
import { updateOwnerSchema, type UpdateOwnerFormValues } from './schema/owner.schema.js';
import {
  createUploadSchema,
  type CreateUploadClientInput,
  updateUploadSchema,
  type UpdateUploadClientInput,
} from './schema/upload.schema.js';
import type {
  BatchFormValues,
  BatchLineFormValues,
  CustomerFormValues,
  CreateUploadInput,
  ForgotPasswordFormValues,
  LoginFormValues,
  NewPasswordFormValues,
  PaymentFormValues,
  PaymentSummaryQueryFilters,
  RefundSaleFormValues,
  RefundSaleLineFormValues,
  ReportingPeriodQueryFilters,
  SaleFormValues,
  SaleLineFormValues,
  SaleListFilters,
  SignupFormValues,
  MemberListFilters,
  ProductInventoryDetailFilters,
  ProductInventoryListFilters,
  StockBatchListFilters,
  TrendQueryFilters,
  UpdateBatchFormValues,
  UpdateBatchLineFormValues,
  UpdateSaleFormValues,
  UpdateSaleLineFormValues,
  UpdateUploadInput,
  VoidSaleFormValues,
} from '@mez/types';
import {
  forgotPasswordSchema,
  loginSchema,
  newPasswordSchema,
  signupSchema,
} from './schema/auth.schema.js';
import {
  createBatchLineSchema,
  createBatchSchema,
  batchListQuerySchema,
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
import { updateProductActiveSchema, updateProductSchema } from './product/fields.schema.js';
import { productListQuerySchema } from './product/filters.schema.js';
import { createProductUnitSchema, updateProductUnitsSchema } from './product/units.schema.js';
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
import {
  memberPerformanceQuerySchema,
  paymentSummaryQuerySchema,
  periodQuerySchema,
  trendQuerySchema,
} from './schema/reporting.schema.js';
import { saleListFiltersSchema } from './schema/sales-list.schema.js';

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

export function validateForgotPasswordValues(values: ForgotPasswordFormValues) {
  return validateInput(forgotPasswordSchema, values);
}

export function validateNewPasswordValues(values: NewPasswordFormValues) {
  return validateInput(newPasswordSchema, values);
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
  return validateInput(createProductSchema, values);
}

export function validateCreateProductUnit(values: unknown) {
  return validateInput(createProductUnitSchema, values);
}

export function validateProductListQuery(values: unknown) {
  return validateInput(productListQuerySchema, values);
}

export function validateUpdateProduct(values: unknown) {
  return validateInput(updateProductSchema, values);
}

export function validateUpdateProductUnits(values: unknown) {
  return validateInput(updateProductUnitsSchema, values);
}

export function validateUpdateProductActive(values: unknown) {
  return validateInput(updateProductActiveSchema, values);
}

export function validateCreateCustomer(values: CustomerFormValues) {
  return validateInput(createCustomerSchema, values);
}

export function validateCreateUpload(values: CreateUploadClientInput) {
  return validateInput(createUploadSchema, values) as ValidationResult<CreateUploadInput>;
}

export function validateUpdateUpload(values: UpdateUploadClientInput) {
  return validateInput(updateUploadSchema, values) as ValidationResult<UpdateUploadInput>;
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

export function validatePeriodQuery(values: unknown) {
  return validateInput(periodQuerySchema, values) as ValidationResult<ReportingPeriodQueryFilters>;
}

export function validateMemberPerformanceQuery(values: unknown) {
  return validateInput(
    memberPerformanceQuerySchema,
    values,
  ) as ValidationResult<ReportingPeriodQueryFilters>;
}

export function validateTrendQuery(values: unknown) {
  return validateInput(trendQuerySchema, values) as ValidationResult<TrendQueryFilters>;
}

export function validatePaymentSummaryQuery(values: unknown) {
  return validateInput(
    paymentSummaryQuerySchema,
    values,
  ) as ValidationResult<PaymentSummaryQueryFilters>;
}

export function validateSaleListFilters(values: unknown) {
  return validateInput(saleListFiltersSchema, values) as ValidationResult<SaleListFilters>;
}

export function validateBatchListFilters(values: unknown) {
  return validateInput(batchListQuerySchema, values) as ValidationResult<StockBatchListFilters>;
}

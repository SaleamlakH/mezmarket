import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  CreateBusinessInput,
  CreateCustomUnitFormValues,
  CreateProductFormValues,
  CreateUploadInput,
  ProductListFilters,
  UpdateCustomUnitFormValues,
  UpdateUploadInput,
} from '@mez/types';
import {
  type FieldErrors,
  validateLoginValues,
  validateSignupValues,
  type LoginFormValues,
  type SignupFormValues,
  validateCreateBusiness,
  type CreateBusinessFormValues,
  validateUpdateOwnerValues,
  type UpdateOwnerFormValues,
  validateCreateProduct,
  validateCreateProductUnit,
  validateUpdateProduct,
  validateUpdateProductUnits,
  validateUpdateProductActive,
  createProductSchema,
  createProductFormSchema,
  createProductUnitSchema,
  updateProductSchema,
  updateProductUnitsSchema,
  updateProductActiveSchema,
  productListQuerySchema,
  PRODUCT_LIST_STATUSES,
  validateProductListQuery,
  validateCreateUpload,
  type CreateUploadClientInput,
  validateUpdateUpload,
  type UpdateUploadClientInput,
  createUploadSchema,
  updateUploadSchema,
  type ValidationResult,
  createBatchSchema,
  updateBatchSchema,
  createBatchLineSchema,
  updateBatchLineSchema,
  validateCreateBatch,
  validateUpdateBatch,
  validateBatchLine,
  validateUpdateBatchLine,
  PAYMENT_METHODS,
  createSaleSchema,
  updateSaleSchema,
  createSaleLineSchema,
  updateSaleLineSchema,
  recordPaymentSchema,
  voidSaleSchema,
  refundSaleSchema,
  refundSaleLineSchema,
  validateCreateSale,
  validateUpdateSale,
  validateSaleLine,
  validateUpdateSaleLine,
  validatePayment,
  validateVoidSale,
  validateRefundSale,
  validateRefundSaleLine,
  BUSINESS_MEMBER_ROLES,
  memberListQuerySchema,
  validateMemberListQuery,
} from '../index.js';

describe('index', () => {
  it('exports validateLoginForm', () => {
    expect(validateLoginValues).toBeDefined();
  });

  it('exports validateSignupForm', () => {
    expect(validateSignupValues).toBeDefined();
  });

  it('exports validateCreateBusiness', () => {
    expect(validateCreateBusiness).toBeDefined();
  });

  it('exports validateUpdateOwnerValues', () => {
    expect(validateUpdateOwnerValues).toBeDefined();
  });

  it('exports validateCreateProduct', () => {
    expect(validateCreateProduct).toBeDefined();
  });

  it('exports validateCreateUpload', () => {
    expect(validateCreateUpload).toBeDefined();
  });

  it('exports LoginFormValues', () => {
    expectTypeOf<LoginFormValues>().toBeObject();
  });

  it('exports SignupFormValues', () => {
    expectTypeOf<SignupFormValues>().toBeObject();
  });

  it('exports CreateBusinessFormValues', () => {
    expectTypeOf<CreateBusinessFormValues>().toEqualTypeOf<CreateBusinessInput>();
  });

  it('exports createProductFormSchema and createProductSchema', () => {
    expect(createProductFormSchema).toBeDefined();
    expect(createProductSchema).toBeDefined();
  });

  it('exports updateProductSchema and updateProductActiveSchema', () => {
    expect(updateProductSchema).toBeDefined();
    expect(updateProductActiveSchema).toBeDefined();
  });

  it('exports updateProductUnitsSchema', () => {
    expect(updateProductUnitsSchema).toBeDefined();
  });

  it('exports createProductUnitSchema and validateCreateProductUnit', () => {
    expect(createProductUnitSchema).toBeDefined();
    expect(validateCreateProductUnit).toBeDefined();
  });

  it('exports validateUpdateProductUnits', () => {
    expect(validateUpdateProductUnits).toBeDefined();
  });

  it('exports validateUpdateProduct', () => {
    expect(validateUpdateProduct).toBeDefined();
  });

  it('exports validateUpdateProductActive', () => {
    expect(validateUpdateProductActive).toBeDefined();
  });

  it('exports productListQuerySchema and validateProductListQuery', () => {
    expect(productListQuerySchema).toBeDefined();
    expect(validateProductListQuery).toBeDefined();
  });

  it('exports PRODUCT_LIST_STATUSES', () => {
    expect(PRODUCT_LIST_STATUSES).toContain('active');
    expect(PRODUCT_LIST_STATUSES).toContain('all');
  });

  it('carries the list filters as a status', () => {
    expectTypeOf<ProductListFilters['status']>().toEqualTypeOf<'active' | 'inactive' | 'all'>();
  });

  it('holds the form rate as text and the price only when sellable', () => {
    type SellableCreateUnit = Extract<CreateCustomUnitFormValues, { sellCapable: true }>;
    type PurchaseOnlyCreateUnit = Extract<CreateCustomUnitFormValues, { sellCapable: false }>;
    type SellableUpdateUnit = Extract<UpdateCustomUnitFormValues, { sellCapable: true }>;
    type PurchaseOnlyUpdateUnit = Extract<UpdateCustomUnitFormValues, { sellCapable: false }>;

    expectTypeOf<SellableCreateUnit['conversionRate']>().toEqualTypeOf<string>();
    expectTypeOf<SellableCreateUnit['price']>().toEqualTypeOf<string>();
    expectTypeOf<PurchaseOnlyCreateUnit['price']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<SellableUpdateUnit['price']>().toEqualTypeOf<string>();
    expectTypeOf<PurchaseOnlyUpdateUnit['price']>().toEqualTypeOf<string | undefined>();
  });

  it('carries the custom units as a field on the create-product shape', () => {
    expectTypeOf<CreateProductFormValues['customUnits']>().toEqualTypeOf<
      CreateCustomUnitFormValues[]
    >();
  });

  it('exports CreateUploadClientInput', () => {
    expectTypeOf<CreateUploadClientInput>().toBeObject();
  });

  it('derives CreateUploadClientInput from @mez/types', () => {
    expectTypeOf<CreateUploadClientInput>().toMatchTypeOf<CreateUploadInput>();
  });

  it('exports validateUpdateUpload', () => {
    expect(validateUpdateUpload).toBeDefined();
  });

  it('exports createUploadSchema and updateUploadSchema', () => {
    expect(createUploadSchema).toBeDefined();
    expect(updateUploadSchema).toBeDefined();
  });

  it('derives UpdateUploadClientInput from @mez/types', () => {
    expectTypeOf<UpdateUploadClientInput>().toMatchTypeOf<UpdateUploadInput>();
  });

  it('exports UpdateOwnerFormValues', () => {
    expectTypeOf<UpdateOwnerFormValues>().toBeObject();
  });

  it('exports createBatchSchema', () => {
    expect(createBatchSchema).toBeDefined();
  });

  it('exports updateBatchSchema', () => {
    expect(updateBatchSchema).toBeDefined();
  });

  it('exports validateCreateBatch', () => {
    expect(validateCreateBatch).toBeDefined();
  });

  it('exports validateUpdateBatch', () => {
    expect(validateUpdateBatch).toBeDefined();
  });

  it('exports createBatchLineSchema', () => {
    expect(createBatchLineSchema).toBeDefined();
  });

  it('exports updateBatchLineSchema', () => {
    expect(updateBatchLineSchema).toBeDefined();
  });

  it('exports validateBatchLine', () => {
    expect(validateBatchLine).toBeDefined();
  });

  it('exports validateUpdateBatchLine', () => {
    expect(validateUpdateBatchLine).toBeDefined();
  });

  it('exports PAYMENT_METHODS', () => {
    expect(PAYMENT_METHODS).toContain('CASH');
  });

  it('exports createSaleSchema', () => {
    expect(createSaleSchema).toBeDefined();
  });

  it('exports updateSaleSchema', () => {
    expect(updateSaleSchema).toBeDefined();
  });

  it('exports createSaleLineSchema', () => {
    expect(createSaleLineSchema).toBeDefined();
  });

  it('exports updateSaleLineSchema', () => {
    expect(updateSaleLineSchema).toBeDefined();
  });

  it('exports recordPaymentSchema', () => {
    expect(recordPaymentSchema).toBeDefined();
  });

  it('exports voidSaleSchema', () => {
    expect(voidSaleSchema).toBeDefined();
  });

  it('exports refundSaleSchema', () => {
    expect(refundSaleSchema).toBeDefined();
  });

  it('exports refundSaleLineSchema', () => {
    expect(refundSaleLineSchema).toBeDefined();
  });

  it('exports validateCreateSale', () => {
    expect(validateCreateSale).toBeDefined();
  });

  it('exports validateUpdateSale', () => {
    expect(validateUpdateSale).toBeDefined();
  });

  it('exports validateSaleLine', () => {
    expect(validateSaleLine).toBeDefined();
  });

  it('exports validateUpdateSaleLine', () => {
    expect(validateUpdateSaleLine).toBeDefined();
  });

  it('exports validatePayment', () => {
    expect(validatePayment).toBeDefined();
  });

  it('exports validateVoidSale', () => {
    expect(validateVoidSale).toBeDefined();
  });

  it('exports validateRefundSale', () => {
    expect(validateRefundSale).toBeDefined();
  });

  it('exports validateRefundSaleLine', () => {
    expect(validateRefundSaleLine).toBeDefined();
  });

  it('exports BUSINESS_MEMBER_ROLES', () => {
    expect(BUSINESS_MEMBER_ROLES).toContain('SERVER');
  });

  it('exports memberListQuerySchema', () => {
    expect(memberListQuerySchema).toBeDefined();
  });

  it('exports validateMemberListQuery', () => {
    expect(validateMemberListQuery).toBeDefined();
  });

  it('exports FieldErrors', () => {
    expectTypeOf<FieldErrors<string>>().toBeObject();
  });

  it('exports ValidationResult', () => {
    expectTypeOf<ValidationResult<string>>().toBeObject();
  });
});

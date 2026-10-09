import { describe, it, expect, expectTypeOf } from 'vitest';
import type { CreateBusinessInput, CreateUploadInput } from '@mez/types';
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
  type CreateProductFormValues,
  type CreateCustomUnitFormValues,
  createProductSchema,
  createProductFormSchema,
  validateCreateUpload,
  type CreateUploadClientInput,
  type ValidationResult,
  createBatchSchema,
  updateBatchSchema,
  createBatchLineSchema,
  updateBatchLineSchema,
  validateCreateBatch,
  validateUpdateBatch,
  validateBatchLine,
  validateUpdateBatchLine,
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

  it('exports CreateProductFormValues', () => {
    expectTypeOf<CreateProductFormValues>().toBeObject();
  });

  it('exports createProductFormSchema and createProductSchema', () => {
    expect(createProductFormSchema).toBeDefined();
    expect(createProductSchema).toBeDefined();
  });

  it('holds the form rate and price as text, and the input as numbers', () => {
    expectTypeOf<CreateCustomUnitFormValues['conversionRate']>().toEqualTypeOf<string>();
    expectTypeOf<CreateCustomUnitFormValues['price']>().toEqualTypeOf<string>();
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

  it('exports FieldErrors', () => {
    expectTypeOf<FieldErrors<string>>().toBeObject();
  });

  it('exports ValidationResult', () => {
    expectTypeOf<ValidationResult<string>>().toBeObject();
  });
});

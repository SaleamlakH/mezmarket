import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  CreateBaseUnitInput,
  CreateBusinessInput,
  CreateMouInput,
  CreateUploadInput,
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
  type CreateProductFormValues,
  validateCreateUpload,
  type CreateUploadClientInput,
  type ValidationResult,
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

  it('derives CreateProductFormValues unit inputs from @mez/types', () => {
    expectTypeOf<CreateProductFormValues['baseUnit']>().toMatchTypeOf<CreateBaseUnitInput>();
    expectTypeOf<NonNullable<CreateProductFormValues['mou']>>().toMatchTypeOf<CreateMouInput>();
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

  it('exports FieldErrors', () => {
    expectTypeOf<FieldErrors<string>>().toBeObject();
  });

  it('exports ValidationResult', () => {
    expectTypeOf<ValidationResult<string>>().toBeObject();
  });
});

import { describe, it, expect, expectTypeOf } from 'vitest';
import {
  type FieldErrors,
  validateLoginValues,
  validateSignupValues,
  type LoginFormValues,
  type SignupFormValues,
  type ValidationResult,
} from '../index.js';

describe('index', () => {
  it('exports validateLoginForm', () => {
    expect(validateLoginValues).toBeDefined();
  });

  it('exports validateSignupForm', () => {
    expect(validateSignupValues).toBeDefined();
  });

  it('exports LoginFormValues', () => {
    expectTypeOf<LoginFormValues>().toBeObject();
  });

  it('exports SignupFormValues', () => {
    expectTypeOf<SignupFormValues>().toBeObject();
  });

  it('exports FieldErrors', () => {
    expectTypeOf<FieldErrors<string>>().toBeObject();
  });

  it('exports ValidationResult', () => {
    expectTypeOf<ValidationResult<string>>().toBeObject();
  });
});

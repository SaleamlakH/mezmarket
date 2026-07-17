import type { ZodType } from 'zod';
import type { FieldErrors, ValidationResult } from './types.js';
import {
  loginSchema,
  signupSchema,
  type LoginFormValues,
  type SignupFormValues,
} from './schema/auth.schema.js';

function validateInput<T>(schema: ZodType<T>, input: unknown): ValidationResult<T> {
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

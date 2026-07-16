import z from 'zod';
import type { LoginCredentials, SignupCredentials } from '@mez/types';

export type LoginFormValues = LoginCredentials;
export interface SignupFormValues extends SignupCredentials {
  confirmPassword: string;
}

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email address');

const passwordSchema = z.string().trim().min(8, 'Password must be at least 8 characters');

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
}) satisfies z.ZodType<LoginFormValues>;

// Signup schema
const signupPasswordSchema = passwordSchema
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[0-9]/, 'Include at least one number');

export const signupSchema = z
  .object({
    email: emailSchema,
    password: signupPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords don't match",
    path: ['confirmPassword'],
  }) satisfies z.ZodType<SignupFormValues>;

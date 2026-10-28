import z from 'zod';
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  NewPasswordFormValues,
  SignupFormValues,
} from '@mez/types';

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

export const forgotPasswordSchema = z.object({
  email: emailSchema,
}) satisfies z.ZodType<ForgotPasswordFormValues>;

export const newPasswordSchema = z
  .object({
    password: signupPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords don't match",
    path: ['confirmPassword'],
  }) satisfies z.ZodType<NewPasswordFormValues>;

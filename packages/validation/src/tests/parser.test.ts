import { describe, it, expect } from 'vitest';
import {
  validateForgotPasswordValues,
  validateLoginValues,
  validateNewPasswordValues,
  validateSignupValues,
  validateUpdateOwnerValues,
} from '../parser.js';

describe('parser', () => {
  describe('validateLoginValues', () => {
    it('should validate valid login values', () => {
      const result = validateLoginValues({ email: 'test@example.com', password: 'password123' });
      expect(result.data).toEqual({ email: 'test@example.com', password: 'password123' });
      expect(result.errors).toBeNull();
    });

    it('should invalidate invalid login values', () => {
      const result = validateLoginValues({ email: 'invalid-email', password: 'short' });
      expect(result.data).toBeNull();
      expect(result.errors).toEqual({
        email: 'Enter a valid email address',
        password: 'Password must be at least 8 characters',
      });
    });
  });

  describe('validateSignupValues', () => {
    it('should validate valid signup values', () => {
      const result = validateSignupValues({
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      expect(result.data).toEqual({
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      expect(result.errors).toBeNull();
    });

    it('should invalidate invalid signup values', () => {
      const result = validateSignupValues({
        email: 'invalid-email',
        password: 'short',
        confirmPassword: 'do not match',
      });

      expect(result.data).toBeNull();

      expect(result.errors).toEqual({
        email: 'Enter a valid email address',
        password: 'Password must be at least 8 characters',
        confirmPassword: "Passwords don't match",
      });
    });
  });

  describe('validateForgotPasswordValues', () => {
    it('should validate a valid email', () => {
      const result = validateForgotPasswordValues({ email: 'test@example.com' });
      expect(result.data).toEqual({ email: 'test@example.com' });
      expect(result.errors).toBeNull();
    });

    it('should invalidate an invalid email', () => {
      const result = validateForgotPasswordValues({ email: 'invalid-email' });
      expect(result.data).toBeNull();
      expect(result.errors).toHaveProperty('email');
    });
  });

  describe('validateNewPasswordValues', () => {
    it('should validate a new password and confirmation', () => {
      const result = validateNewPasswordValues({
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      expect(result.data).toEqual({
        password: 'Password123',
        confirmPassword: 'Password123',
      });
      expect(result.errors).toBeNull();
    });

    it('should invalidate a weak password and mismatch', () => {
      const result = validateNewPasswordValues({
        password: 'short',
        confirmPassword: 'do not match',
      });

      expect(result.data).toBeNull();
      expect(result.errors).toHaveProperty('password');
      expect(result.errors).toHaveProperty('confirmPassword');
    });
  });

  describe('validateUpdateOwnerValues', () => {
    it('should accept only the name field', () => {
      const result = validateUpdateOwnerValues({ name: 'John' });
      expect(result.data).toEqual({ name: 'John' });
      expect(result.errors).toBeNull();
    });

    it('should accept only the contactEmail field', () => {
      const result = validateUpdateOwnerValues({ contactEmail: 'john@example.com' });
      expect(result.data).toEqual({ contactEmail: 'john@example.com' });
      expect(result.errors).toBeNull();
    });

    it('should accept only the contactPhone field', () => {
      const result = validateUpdateOwnerValues({ contactPhone: '+1234567890' });
      expect(result.data).toEqual({ contactPhone: '+1234567890' });
      expect(result.errors).toBeNull();
    });

    it('should accept explicit nulls to clear optional fields', () => {
      const result = validateUpdateOwnerValues({
        name: 'John',
        contactEmail: null,
        contactPhone: null,
      });
      expect(result.data).toEqual({
        name: 'John',
        contactEmail: null,
        contactPhone: null,
      });
      expect(result.errors).toBeNull();
    });

    it('should reject an empty object', () => {
      const result = validateUpdateOwnerValues({});
      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ _root: 'At least one field must be provided' });
    });

    it('should reject an empty name', () => {
      const result = validateUpdateOwnerValues({ name: '' });
      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ name: 'Name is required' });
    });

    it('should reject an invalid contact email', () => {
      const result = validateUpdateOwnerValues({ contactEmail: 'not-an-email' });
      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ contactEmail: 'Enter a valid email address' });
    });

    it('should reject an empty contact phone', () => {
      const result = validateUpdateOwnerValues({ contactPhone: '' });
      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ contactPhone: 'Phone number is required' });
    });

    it('should reject unknown fields', () => {
      const result = validateUpdateOwnerValues({
        name: 'John',
        // @ts-expect-error unknown field must be rejected at runtime
        id: 'owner-1',
      });
      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ _root: 'Unrecognized key: "id"' });
    });
  });
});

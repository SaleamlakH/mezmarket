import { describe, it, expect } from 'vitest';
import { validateLoginValues, validateSignupValues } from '../parser.js';

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
});

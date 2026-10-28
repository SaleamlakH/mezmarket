import { describe, expect, it } from 'vitest';
import { changePasswordSchema } from '../schema/auth.schema.js';

describe('changePasswordSchema', () => {
  it('accepts matching, valid passwords', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldSecret123',
      newPassword: 'NewSecret123',
      confirmPassword: 'NewSecret123',
    });

    expect(result.success).toBe(true);
  });

  it('requires the current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: ' ',
      newPassword: 'NewSecret123',
      confirmPassword: 'NewSecret123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['currentPassword'],
            message: expect.any(String),
          }),
        ]),
      );
    }
  });

  it('requires a strong new password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldSecret123',
      newPassword: 'weak',
      confirmPassword: 'weak',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['newPassword'] })]),
      );
    }
  });

  it('rejects a mismatched confirmation', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldSecret123',
      newPassword: 'NewSecret123',
      confirmPassword: 'Different123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['confirmPassword'],
            message: expect.any(String),
          }),
        ]),
      );
    }
  });
});

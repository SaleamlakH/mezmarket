import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseAuthService } from './supabaseAuthService';
import type { SupabaseClient } from '@supabase/supabase-js';

// Fake Supabase client
function createFakeSupabaseClient() {
  return {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      verifyOtp: vi.fn(),
      resend: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  };
}

describe('createSupabaseAuthService', () => {
  let fakeClient: ReturnType<typeof createFakeSupabaseClient>;
  let service: ReturnType<typeof createSupabaseAuthService>;

  beforeEach(() => {
    fakeClient = createFakeSupabaseClient();
    fakeClient.auth.signOut.mockResolvedValue({ error: null });
    service = createSupabaseAuthService(fakeClient as unknown as SupabaseClient);
  });

  describe('getSession', () => {
    it('returns authenticated status with user when a session exists', async () => {
      fakeClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'u1', email: 'a@b.com' },
            access_token: 'should-not-leak',
          },
        },
        error: null,
      });

      const result = await service.getSession();

      expect(result).toEqual({
        status: 'authenticated',
        user: { id: 'u1', email: 'a@b.com', emailVerifiedAt: null },
      });
    });

    it('returns guest status with null user when no session exists', async () => {
      fakeClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await service.getSession();

      expect(result.status).toBe('guest');
      expect(result.user).toBeNull();
    });

    it('throw error when supabase returns an error fetching session', async () => {
      fakeClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'network error' },
      });

      await expect(service.getSession()).rejects.toThrow();
    });
  });

  describe('onAuthStateChange', () => {
    it('maps every emitted session and returns an unsubscribe function', () => {
      const unsubscribe = vi.fn();
      let emit: ((event: string, session: unknown) => void) | undefined;
      fakeClient.auth.onAuthStateChange.mockImplementation(
        (callback: (event: string, session: unknown) => void) => {
          emit = callback;
          return { data: { subscription: { unsubscribe } } };
        },
      );

      const listener = vi.fn();
      const stop = service.onAuthStateChange(listener);

      emit?.('SIGNED_IN', {
        user: { id: 'u1', email: 'a@b.com', email_confirmed_at: '2026-01-01T00:00:00Z' },
      });

      expect(listener).toHaveBeenCalledWith({
        status: 'authenticated',
        user: { id: 'u1', email: 'a@b.com', emailVerifiedAt: '2026-01-01T00:00:00Z' },
      });

      emit?.('SIGNED_OUT', null);

      expect(listener).toHaveBeenLastCalledWith({ status: 'guest', user: null });

      stop();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('signOut', () => {
    it('signs out of the local session by default', async () => {
      await service.signOut();

      expect(fakeClient.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });

    it('supports signing out globally', async () => {
      await service.signOut('global');

      expect(fakeClient.auth.signOut).toHaveBeenCalledWith({ scope: 'global' });
    });

    it('throws when supabase returns an error', async () => {
      fakeClient.auth.signOut.mockResolvedValue({
        error: { name: 'AuthError', message: 'network error' },
      });

      await expect(service.signOut()).rejects.toThrow('network error');
    });

    it('treats an already-ended session as a successful sign out', async () => {
      fakeClient.auth.signOut.mockResolvedValue({
        error: { name: 'AuthSessionMissingError', message: 'Auth session missing!' },
      });

      await expect(service.signOut()).resolves.toBeUndefined();
    });
  });

  describe('signInWithEmail', () => {
    const credentials = { email: 'a@b.com', password: 'secret123' };

    it('resolves with void on success and calls supabase with correct args', async () => {
      fakeClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'u1' }, session: {} },
        error: null,
      });

      const result = await service.signInWithEmail(credentials);

      expect(fakeClient.auth.signOut).not.toHaveBeenCalled();
      expect(fakeClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'secret123',
      });

      expect(result).toBeUndefined();
    });

    it('throws when supabase returns an error', async () => {
      fakeClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(service.signInWithEmail(credentials)).rejects.toThrow();
    });

    it('preserves the email_not_confirmed code for the login flow', async () => {
      fakeClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed', code: 'email_not_confirmed' },
      });

      await expect(service.signInWithEmail(credentials)).rejects.toMatchObject({
        code: 'email_not_confirmed',
        message: 'Email not confirmed',
      });
    });

    it('throws when the underlying call rejects (e.g. network error)', async () => {
      fakeClient.auth.signInWithPassword.mockRejectedValue(new Error('network down'));

      await expect(service.signInWithEmail(credentials)).rejects.toThrow();
    });
  });

  describe('signUpWithEmail', () => {
    const credentials = {
      name: 'Jane Doe',
      email: 'a@b.com',
      password: 'secret123',
    };

    it('returns the created user with a null verification timestamp', async () => {
      fakeClient.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'u1',
            email: 'a@b.com',
            email_confirmed_at: null,
            identities: [{}],
          },
          session: null,
        },
        error: null,
      });

      const result = await service.signUpWithEmail(credentials);

      expect(fakeClient.auth.signUp).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'secret123',
        options: { data: { full_name: 'Jane Doe' } },
      });
      expect(result).toEqual({ id: 'u1', email: 'a@b.com', emailVerifiedAt: null });
    });

    it('returns the created user when signup auto-confirms the email', async () => {
      fakeClient.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'u1',
            email: 'a@b.com',
            email_confirmed_at: '2026-01-01T00:00:00Z',
            identities: [{}],
          },
          session: { access_token: 'token' },
        },
        error: null,
      });

      const result = await service.signUpWithEmail(credentials);

      expect(result).toEqual({
        id: 'u1',
        email: 'a@b.com',
        emailVerifiedAt: '2026-01-01T00:00:00Z',
      });
    });

    it('rejects an obfuscated duplicate user with an empty identities list', async () => {
      fakeClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'fake', email: 'a@b.com', email_confirmed_at: null, identities: [] },
          session: null,
        },
        error: null,
      });

      await expect(service.signUpWithEmail(credentials)).rejects.toMatchObject({
        code: 'email_exists',
        message: expect.any(String),
      });
    });

    it('maps provider signup errors such as email already registered', async () => {
      fakeClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered', code: 'user_already_exists' },
      });

      await expect(service.signUpWithEmail(credentials)).rejects.toMatchObject({
        code: 'user_already_exists',
        message: 'User already registered',
      });
    });

    it('throws when signup succeeds without a user', async () => {
      fakeClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      await expect(service.signUpWithEmail(credentials)).rejects.toMatchObject({
        message: expect.any(String),
      });
    });

    it('throws when the underlying call rejects (e.g. network error)', async () => {
      fakeClient.auth.signUp.mockRejectedValue(new Error('network down'));

      await expect(service.signUpWithEmail(credentials)).rejects.toThrow();
    });
  });

  describe('verifyOtp', () => {
    it('verifies a signup email code', async () => {
      fakeClient.auth.verifyOtp.mockResolvedValue({ data: {}, error: null });

      await service.verifyOtp({ email: 'a@b.com', token: '123456', type: 'email' });

      expect(fakeClient.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'a@b.com',
        token: '123456',
        type: 'email',
      });
    });

    it('verifies a password recovery code', async () => {
      fakeClient.auth.verifyOtp.mockResolvedValue({ data: {}, error: null });

      await service.verifyOtp({ email: 'a@b.com', token: '123456', type: 'recovery' });

      expect(fakeClient.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'a@b.com',
        token: '123456',
        type: 'recovery',
      });
    });

    it('throws when the provider rejects the token', async () => {
      fakeClient.auth.verifyOtp.mockResolvedValue({
        data: {},
        error: { message: 'Token has expired or is invalid' },
      });

      await expect(
        service.verifyOtp({ email: 'a@b.com', token: '000000', type: 'email' }),
      ).rejects.toThrow('Token has expired or is invalid');
    });

    it('reports an invalid email address with a friendly message', async () => {
      fakeClient.auth.verifyOtp.mockResolvedValue({
        data: {},
        error: { message: 'Email address is invalid', code: 'email_address_invalid' },
      });

      await expect(
        service.verifyOtp({ email: 'a@b.com', token: '123456', type: 'email' }),
      ).rejects.toThrow('Email address is invalid');
    });

    it('reports an expired code with a friendly message', async () => {
      fakeClient.auth.verifyOtp.mockResolvedValue({
        data: {},
        error: { message: 'Token has expired or is invalid', code: 'otp_expired' },
      });

      await expect(
        service.verifyOtp({ email: 'a@b.com', token: '123456', type: 'recovery' }),
      ).rejects.toThrow('Token has expired or is invalid');
    });
  });

  describe('resendSignupOtp', () => {
    it('requests a new signup code for the email', async () => {
      fakeClient.auth.resend.mockResolvedValue({ data: {}, error: null });

      await service.resendSignupOtp('a@b.com');

      expect(fakeClient.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'a@b.com',
      });
    });

    it('throws when the provider cannot resend the code', async () => {
      fakeClient.auth.resend.mockResolvedValue({
        data: {},
        error: { message: 'For security purposes, you can only request this after 60 seconds' },
      });

      await expect(service.resendSignupOtp('a@b.com')).rejects.toThrow(/60 seconds/);
    });

    it('reports a missing account when the email does not exist', async () => {
      fakeClient.auth.resend.mockResolvedValue({
        data: {},
        error: { message: 'User not found', code: 'user_not_found' },
      });

      await expect(service.resendSignupOtp('missing@b.com')).rejects.toThrow('User not found');
    });

    it('reports when resend is rate limited', async () => {
      fakeClient.auth.resend.mockResolvedValue({
        data: {},
        error: { message: 'Email rate limit exceeded', code: 'over_email_send_rate_limit' },
      });

      await expect(service.resendSignupOtp('a@b.com')).rejects.toThrow('Email rate limit exceeded');
    });
  });

  describe('requestPasswordReset', () => {
    it('requests a recovery code for the email', async () => {
      fakeClient.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      await service.requestPasswordReset('a@b.com');

      expect(fakeClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.com');
    });

    it('throws when the provider cannot send the recovery code', async () => {
      fakeClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: { message: 'Email rate limit exceeded', code: 'over_email_send_rate_limit' },
      });

      await expect(service.requestPasswordReset('a@b.com')).rejects.toThrow(
        'Email rate limit exceeded',
      );
    });
  });

  describe('updatePassword', () => {
    it('updates the password for the recovery session', async () => {
      fakeClient.auth.updateUser.mockResolvedValue({ data: {}, error: null });

      await service.updatePassword('NewSecret123');

      expect(fakeClient.auth.updateUser).toHaveBeenCalledWith({ password: 'NewSecret123' });
    });

    it('throws when the provider rejects the new password', async () => {
      fakeClient.auth.updateUser.mockResolvedValue({
        data: {},
        error: { message: 'New password should be different from the old password' },
      });

      await expect(service.updatePassword('NewSecret123')).rejects.toThrow(
        'New password should be different from the old password',
      );
    });
  });
});

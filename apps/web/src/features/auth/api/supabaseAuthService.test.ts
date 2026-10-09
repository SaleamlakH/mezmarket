import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseAuthService } from './supabaseAuthService';
import type { SupabaseClient } from '@supabase/supabase-js';

// Fake Supabase client
function createFakeSupabaseClient() {
  return {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
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
        user: { id: 'u1', email: 'a@b.com' },
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

  describe('signInWithEmail', () => {
    const credentials = { email: 'a@b.com', password: 'secret123' };

    it('resolves with void on success and calls supabase with correct args', async () => {
      fakeClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'u1' }, session: {} },
        error: null,
      });

      const result = await service.signInWithEmail(credentials);

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

    it('throws when the underlying call rejects (e.g. network error)', async () => {
      fakeClient.auth.signInWithPassword.mockRejectedValue(new Error('network down'));

      await expect(service.signInWithEmail(credentials)).rejects.toThrow();
    });
  });

  describe('signUpWithEmail', () => {
    const credentials = {
      email: 'a@b.com',
      password: 'secret123',
    };

    it('resolves with void on success and calls supabase with correct args', async () => {
      fakeClient.auth.signUp.mockResolvedValue({
        data: { user: { id: 'u1' }, session: {} },
        error: null,
      });

      const result = await service.signUpWithEmail(credentials);

      expect(fakeClient.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'a@b.com', password: 'secret123' }),
      );
      expect(result).toBeUndefined();
    });

    it('throws when supabase returns an error (e.g. email already registered)', async () => {
      fakeClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      await expect(service.signUpWithEmail(credentials)).rejects.toThrow();
    });

    it('throws when the underlying call rejects (e.g. network error)', async () => {
      fakeClient.auth.signUp.mockRejectedValue(new Error('network down'));

      await expect(service.signUpWithEmail(credentials)).rejects.toThrow();
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { useVerifyEmailFlow } from '../useVerifyEmailFlow';
import { RESEND_COOLDOWN_MS, pendingVerification } from '../../lib/pendingOtp';
import type { AuthContextValue, AuthSession } from '@/providers/auth-provider/types';
import type { ChangeEvent } from 'react';

vi.mock('@/providers/auth-provider/useAuthContext');
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: vi.fn() };
});

const guestSession: AuthSession = { status: 'guest', user: null };

function submitEvent() {
  return { preventDefault: vi.fn() } as unknown as ChangeEvent<HTMLFormElement>;
}

describe('useVerifyEmailFlow logic', () => {
  const mockVerify = vi.fn();
  const mockResend = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    pendingVerification.clear();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    mockAuthSession(guestSession);
  });

  function mockAuthSession(session: AuthSession) {
    vi.mocked(useAuthContext).mockReturnValue({
      session,
      verifyOtp: mockVerify,
      resendSignupOtp: mockResend,
    } as Partial<AuthContextValue> as AuthContextValue);
  }

  it('redirects to signup when there is no verification email', async () => {
    renderHook(() => useVerifyEmailFlow());

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/signup', { replace: true }));
  });

  it('does not load verification from the authenticated session without pending state', async () => {
    mockAuthSession({
      status: 'authenticated',
      user: { id: 'u1', email: 'a@b.com', emailVerifiedAt: null },
    });

    const { result } = renderHook(() => useVerifyEmailFlow());

    expect(result.current.email).toBeNull();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/signup', { replace: true }));
  });

  it('redirects home when the current user is already verified', async () => {
    mockAuthSession({
      status: 'authenticated',
      user: { id: 'u1', email: 'a@b.com', emailVerifiedAt: '2026-01-01T00:00:00Z' },
    });

    renderHook(() => useVerifyEmailFlow());

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }));
    expect(mockNavigate).not.toHaveBeenCalledWith('/signup', { replace: true });
  });

  it('derives the email and countdowns from the pending verification', () => {
    pendingVerification.start('a@b.com', Date.now() - 61_000);

    const { result } = renderHook(() => useVerifyEmailFlow());

    expect(result.current.email).toBe('a@b.com');
    expect(result.current.resendInSeconds).toBe(0);
  });

  it('ignores submit until a complete code is entered', async () => {
    pendingVerification.start('a@b.com');

    const { result } = renderHook(() => useVerifyEmailFlow());
    act(() => result.current.setCode('12345'));

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('verifies the code, clears pending state, and navigates home', async () => {
    pendingVerification.start('a@b.com');
    mockVerify.mockResolvedValue(undefined);

    const { result } = renderHook(() => useVerifyEmailFlow());
    act(() => result.current.setCode('123456'));

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(mockVerify).toHaveBeenCalledWith({ email: 'a@b.com', token: '123456', type: 'email' });
    expect(pendingVerification.get()).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    expect(result.current.isSubmitting).toBe(false);
  });

  it('exposes the provider error when verification fails', async () => {
    pendingVerification.start('a@b.com');
    mockVerify.mockRejectedValue(new Error('User not found'));

    const { result } = renderHook(() => useVerifyEmailFlow());
    act(() => result.current.setCode('123456'));

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(result.current.error).toBe('User not found');
    expect(mockNavigate).not.toHaveBeenCalledWith('/', { replace: true });
    expect(result.current.isSubmitting).toBe(false);
  });

  it('blocks resend during the cooldown', async () => {
    pendingVerification.start('a@b.com');

    const { result } = renderHook(() => useVerifyEmailFlow());

    await act(async () => {
      await result.current.handleResend();
    });

    expect(mockResend).not.toHaveBeenCalled();
  });

  it('resends a code and restarts the cooldown', async () => {
    pendingVerification.start('a@b.com', Date.now() - RESEND_COOLDOWN_MS - 1_000);
    mockResend.mockResolvedValue(undefined);

    const { result } = renderHook(() => useVerifyEmailFlow());
    act(() => result.current.setCode('123456'));

    await act(async () => {
      await result.current.handleResend();
    });

    const pending = pendingVerification.get();
    expect(mockResend).toHaveBeenCalledWith('a@b.com');
    expect(pending?.sentAt).toBeGreaterThan(Date.now() - 1_000);
    expect(result.current.code).toBe('');
    expect(result.current.resendInSeconds).toBeGreaterThan(0);
    expect(result.current.isResending).toBe(false);
  });

  it('exposes the provider error when resend fails', async () => {
    pendingVerification.start('a@b.com', Date.now() - RESEND_COOLDOWN_MS - 1_000);
    mockResend.mockRejectedValue(new Error('User not found'));

    const { result } = renderHook(() => useVerifyEmailFlow());

    await act(async () => {
      await result.current.handleResend();
    });

    expect(result.current.error).toBe('User not found');
    expect(result.current.isResending).toBe(false);
  });

  it('clears an error on the next verification attempt', async () => {
    pendingVerification.start('a@b.com');
    mockVerify.mockRejectedValueOnce(new Error('Invalid code')).mockResolvedValue(undefined);

    const { result } = renderHook(() => useVerifyEmailFlow());
    act(() => result.current.setCode('123456'));

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });
    expect(result.current.error).toBe('Invalid code');

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(result.current.error).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { usePasswordResetFlow } from '../usePasswordResetFlow';
import { pendingPasswordReset } from '../../lib/pendingOtp';
import { RESEND_COOLDOWN_MS } from '../../lib/pendingOtp';
import type { AuthContextValue, AuthSession } from '@/providers/auth-provider/types';
import type { ChangeEvent } from 'react';

vi.mock('@/providers/auth-provider/useAuthContext');
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: vi.fn() };
});

function submitEvent() {
  return { preventDefault: vi.fn() } as unknown as ChangeEvent<HTMLFormElement>;
}

const guestSession: AuthSession = { status: 'guest', user: null };

describe('usePasswordResetFlow', () => {
  const mockRequest = vi.fn();
  const mockVerify = vi.fn();
  const mockUpdate = vi.fn();
  const mockSignOut = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    pendingPasswordReset.clear();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    mockAuthSession(guestSession);
  });

  function mockAuthSession(session: AuthSession) {
    vi.mocked(useAuthContext).mockReturnValue({
      session,
      requestPasswordReset: mockRequest,
      verifyOtp: mockVerify,
      updatePassword: mockUpdate,
      signOut: mockSignOut,
    } as Partial<AuthContextValue> as AuthContextValue);
  }

  function renderFlow() {
    return renderHook(() => {
      const flow = usePasswordResetFlow();
      return {
        ...flow,
        emailError: flow.emailForm.formState.errors.email?.message,
        emailRootError: flow.emailForm.formState.errors.root?.message,
        passwordError: flow.newPasswordForm.formState.errors.confirmPassword?.message,
        passwordRootError: flow.newPasswordForm.formState.errors.root?.message,
      };
    });
  }

  function registerEmailForm(result: ReturnType<typeof renderFlow>['result']) {
    act(() => result.current.emailForm.register('email'));
  }

  function registerPasswordForm(result: ReturnType<typeof renderFlow>['result']) {
    act(() => {
      result.current.newPasswordForm.register('password');
      result.current.newPasswordForm.register('confirmPassword');
    });
  }

  it('starts on the email step without a pending reset', () => {
    const { result } = renderFlow();

    expect(result.current.step).toBe('email');
  });

  it('starts on the code step when a reset is pending', () => {
    pendingPasswordReset.start('a@b.com');

    const { result } = renderFlow();

    expect(result.current.step).toBe('code');
    expect(result.current.email).toBe('a@b.com');
  });

  it('moves from email to code when the reset email is sent', async () => {
    mockRequest.mockResolvedValue(undefined);

    const { result } = renderFlow();
    registerEmailForm(result);
    act(() => result.current.emailForm.setValue('email', 'a@b.com'));

    await act(async () => {
      await result.current.emailForm.submit();
    });

    expect(result.current.step).toBe('code');
    expect(result.current.email).toBe('a@b.com');
    expect(pendingPasswordReset.get()?.email).toBe('a@b.com');
  });

  it('does not request a code for an invalid email', async () => {
    const { result } = renderFlow();
    registerEmailForm(result);
    act(() => result.current.emailForm.setValue('email', 'not-an-email'));

    await act(async () => {
      await result.current.emailForm.submit();
    });

    expect(mockRequest).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.emailError).toBeTruthy());
  });

  it('stays on the email step when the provider rejects the request', async () => {
    mockRequest.mockRejectedValue(new Error('Email rate limit exceeded'));

    const { result } = renderFlow();
    registerEmailForm(result);
    act(() => result.current.emailForm.setValue('email', 'a@b.com'));

    await act(async () => {
      await result.current.emailForm.submit();
    });

    expect(result.current.step).toBe('email');
    await waitFor(() => expect(result.current.emailRootError).toBe('Email rate limit exceeded'));
  });

  it('moves from code to password when the code is verified', async () => {
    pendingPasswordReset.start('a@b.com');
    mockVerify.mockResolvedValue(undefined);

    const { result } = renderFlow();
    act(() => result.current.codeForm.setCode('123456'));

    await act(async () => {
      await result.current.codeForm.handleSubmit(submitEvent());
    });

    expect(result.current.step).toBe('password');
    expect(pendingPasswordReset.get()?.email).toBe('a@b.com');
  });

  it('stays on the code step when the code is rejected', async () => {
    pendingPasswordReset.start('a@b.com');
    mockVerify.mockRejectedValue(new Error('Token has expired or is invalid'));

    const { result } = renderFlow();
    act(() => result.current.codeForm.setCode('123456'));

    await act(async () => {
      await result.current.codeForm.handleSubmit(submitEvent());
    });

    expect(result.current.step).toBe('code');
    expect(result.current.codeForm.error).toBe('Token has expired or is invalid');
  });

  it('resends the recovery code and restarts the cooldown', async () => {
    pendingPasswordReset.start('a@b.com', Date.now() - RESEND_COOLDOWN_MS - 1_000);
    mockRequest.mockResolvedValue(undefined);

    const { result } = renderFlow();
    act(() => result.current.codeForm.setCode('123456'));

    await act(async () => {
      await result.current.codeForm.handleResend();
    });

    expect(mockRequest).toHaveBeenCalledWith('a@b.com');
    expect(pendingPasswordReset.get()?.sentAt).toBeGreaterThan(Date.now() - 1_000);
    expect(result.current.codeForm.code).toBe('');
    expect(result.current.codeForm.resendInSeconds).toBeGreaterThan(0);
  });

  it('finishes the flow after the password is updated', async () => {
    pendingPasswordReset.start('a@b.com');
    mockUpdate.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);

    const { result } = renderFlow();
    registerPasswordForm(result);
    act(() => result.current.newPasswordForm.setValue('password', 'NewSecret123'));
    act(() => result.current.newPasswordForm.setValue('confirmPassword', 'NewSecret123'));

    await act(async () => {
      await result.current.newPasswordForm.submit();
    });

    expect(mockUpdate).toHaveBeenCalledWith('NewSecret123');
    expect(mockSignOut).toHaveBeenCalledWith('global');
    expect(pendingPasswordReset.get()).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      replace: true,
      state: { passwordReset: true },
    });
  });

  it('does not submit a mismatched password confirmation', async () => {
    pendingPasswordReset.start('a@b.com');

    const { result } = renderFlow();
    registerPasswordForm(result);
    act(() => result.current.newPasswordForm.setValue('password', 'NewSecret123'));
    act(() => result.current.newPasswordForm.setValue('confirmPassword', 'Different123'));

    await act(async () => {
      await result.current.newPasswordForm.submit();
    });

    expect(mockUpdate).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.passwordError).toBeTruthy());
  });

  it('exposes the provider error when the password update fails', async () => {
    pendingPasswordReset.start('a@b.com');
    mockVerify.mockResolvedValue(undefined);
    mockUpdate.mockRejectedValue(new Error('New password should be different'));

    const { result } = renderFlow();
    act(() => result.current.codeForm.setCode('123456'));
    await act(async () => {
      await result.current.codeForm.handleSubmit(submitEvent());
    });

    registerPasswordForm(result);
    act(() => result.current.newPasswordForm.setValue('password', 'NewSecret123'));
    act(() => result.current.newPasswordForm.setValue('confirmPassword', 'NewSecret123'));

    await act(async () => {
      await result.current.newPasswordForm.submit();
    });

    await waitFor(() =>
      expect(result.current.passwordRootError).toBe('New password should be different'),
    );
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(result.current.step).toBe('password');
  });

  it('restarts the flow from the code step', () => {
    pendingPasswordReset.start('a@b.com');

    const { result } = renderFlow();
    act(() => result.current.restart());

    expect(result.current.step).toBe('email');
    expect(result.current.email).toBeNull();
    expect(pendingPasswordReset.get()).toBeNull();
  });

  it('redirects authenticated users who are not resetting their password', async () => {
    mockAuthSession({
      status: 'authenticated',
      user: { id: 'u1', email: 'a@b.com', emailVerifiedAt: '2026-01-01T00:00:00Z' },
    });

    renderFlow();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('does not redirect an authenticated recovery session in progress', () => {
    pendingPasswordReset.start('a@b.com');
    mockAuthSession({
      status: 'authenticated',
      user: { id: 'u1', email: 'a@b.com', emailVerifiedAt: '2026-01-01T00:00:00Z' },
    });

    renderFlow();

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

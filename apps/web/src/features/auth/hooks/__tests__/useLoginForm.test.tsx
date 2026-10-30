import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { useLoginForm } from '../useLoginForm';
import { AuthFlowError } from '../../lib/authErrors';
import { pendingVerification } from '../../lib/pendingOtp';
import type { AuthContextValue, AuthSession } from '@/providers/auth-provider/types';
import type { SubmitEvent } from 'react';

vi.mock('@/providers/auth-provider/useAuthContext');
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: vi.fn() };
});

const guestSession: AuthSession = { status: 'guest', user: null };
const values = { email: 'a@b.com', password: 'Secret123' };

function submitEvent() {
  return { preventDefault: vi.fn() } as unknown as SubmitEvent<HTMLFormElement>;
}

describe('useLoginForm logic', () => {
  const mockSignIn = vi.fn();
  const mockResend = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    pendingVerification.clear();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useAuthContext).mockReturnValue({
      session: guestSession,
      signInWithEmail: mockSignIn,
      resendSignupOtp: mockResend,
    } as Partial<AuthContextValue> as AuthContextValue);
  });

  function renderForm() {
    return renderHook(() => useLoginForm());
  }

  function fillForm(result: { current: ReturnType<typeof useLoginForm> }) {
    act(() => result.current.reset(values));
  }

  it('navigates to the dashboard after a successful login', async () => {
    mockSignIn.mockResolvedValue(undefined);
    const { result } = renderForm();
    fillForm(result);

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(mockSignIn).toHaveBeenCalledWith(values);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    expect(mockResend).not.toHaveBeenCalled();
  });

  it('resends, stores pending state, and navigates to verify for an unconfirmed email', async () => {
    mockSignIn.mockRejectedValue(new AuthFlowError('Email not confirmed', 'email_not_confirmed'));
    mockResend.mockResolvedValue(undefined);
    const { result } = renderForm();
    fillForm(result);

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(mockResend).toHaveBeenCalledWith('a@b.com');
    expect(pendingVerification.get()).toMatchObject({ email: 'a@b.com' });
    expect(mockNavigate).toHaveBeenCalledWith('/verify-email', {
      replace: true,
      state: { verificationSent: true },
    });
    expect(result.current.formError).toBeNull();
  });

  it('stays on login and shows the resend error when the code cannot be sent', async () => {
    mockSignIn.mockRejectedValue(new AuthFlowError('Email not confirmed', 'email_not_confirmed'));
    mockResend.mockRejectedValue(
      new AuthFlowError('Email rate limit exceeded', 'over_email_send_rate_limit'),
    );
    const { result } = renderForm();
    fillForm(result);

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(result.current.formError).toBe('Email rate limit exceeded');
    expect(pendingVerification.get()).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows other login errors without resending or navigating', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid login credentials'));
    const { result } = renderForm();
    fillForm(result);

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(mockResend).not.toHaveBeenCalled();
    expect(result.current.formError).toBe('Invalid login credentials');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

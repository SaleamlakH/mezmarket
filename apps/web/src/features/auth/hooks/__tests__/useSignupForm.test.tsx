import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { useSignupForm } from '../useSignupForm';
import { pendingVerification } from '../../lib/pendingOtp';
import type { AuthContextValue, AuthSession } from '@/providers/auth-provider/types';
import type { SubmitEvent } from 'react';

vi.mock('@/providers/auth-provider/useAuthContext');
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: vi.fn() };
});

const guestSession: AuthSession = { status: 'guest', user: null };
const values = {
  name: 'Jane Doe',
  email: 'a@b.com',
  password: 'Secret123',
  confirmPassword: 'Secret123',
};

function submitEvent() {
  return { preventDefault: vi.fn() } as unknown as SubmitEvent<HTMLFormElement>;
}

describe('useSignupForm logic', () => {
  const mockSignUp = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    pendingVerification.clear();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useAuthContext).mockReturnValue({
      session: guestSession,
      signUpWithEmail: mockSignUp,
    } as Partial<AuthContextValue> as AuthContextValue);
  });

  function renderForm() {
    return renderHook(() => useSignupForm());
  }

  function fillForm(result: { current: ReturnType<typeof useSignupForm> }) {
    act(() => result.current.reset(values));
  }

  it('stores pending verification and navigates to verify when email is unconfirmed', async () => {
    mockSignUp.mockResolvedValue({ id: 'u1', email: 'a@b.com', emailVerifiedAt: null });
    const { result } = renderForm();
    fillForm(result);

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'a@b.com',
      password: 'Secret123',
    });
    expect(pendingVerification.get()).toMatchObject({ email: 'a@b.com' });
    expect(mockNavigate).toHaveBeenCalledWith('/verify-email', {
      replace: true,
      state: { verificationSent: true },
    });
  });

  it('navigates to the dashboard when signup auto-confirms the email', async () => {
    mockSignUp.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      emailVerifiedAt: '2026-01-01T00:00:00Z',
    });
    const { result } = renderForm();
    fillForm(result);

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(pendingVerification.get()).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('shows the signup error and does not navigate', async () => {
    mockSignUp.mockRejectedValue(new Error('Weak password'));
    const { result } = renderForm();
    fillForm(result);

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(result.current.formError).toBe('Weak password');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not call signup when the form is invalid', async () => {
    const { result } = renderForm();
    act(() =>
      result.current.reset({
        name: 'Jane Doe',
        email: 'not-an-email',
        password: 'x',
        confirmPassword: 'x',
      }),
    );

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('waits for the provider response before navigating', async () => {
    let resolveSignUp!: (user: { id: string; email: string; emailVerifiedAt: null }) => void;
    mockSignUp.mockReturnValue(
      new Promise((resolve) => {
        resolveSignUp = resolve;
      }),
    );
    const { result } = renderForm();
    fillForm(result);

    act(() => {
      void result.current.handleSubmit(submitEvent());
    });

    expect(mockNavigate).not.toHaveBeenCalled();

    await act(async () => {
      resolveSignUp({ id: 'u1', email: 'a@b.com', emailVerifiedAt: null });
      await Promise.resolve();
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });
});

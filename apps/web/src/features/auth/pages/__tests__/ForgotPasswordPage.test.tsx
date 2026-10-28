import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router';
import { ForgotPasswordPage } from '../ForgotPasswordPage';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { pendingPasswordReset } from '../../lib/pendingOtp';
import type { AuthContextValue } from '@/providers/auth-provider/types';

vi.mock('@/providers/auth-provider/useAuthContext');
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: vi.fn() };
});

describe('ForgotPasswordPage', () => {
  const mockRequest = vi.fn();
  const mockVerify = vi.fn();
  const mockUpdate = vi.fn();
  const mockSignOut = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    pendingPasswordReset.clear();
    vi.mocked(useAuthContext).mockReturnValue({
      session: { status: 'guest', user: null },
      requestPasswordReset: mockRequest,
      verifyOtp: mockVerify,
      updatePassword: mockUpdate,
      signOut: mockSignOut,
    } as Partial<AuthContextValue> as AuthContextValue);
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );
  }

  async function enterCode(user: ReturnType<typeof userEvent.setup>) {
    const firstDigit = screen.getByLabelText(/verification code digit 1/i);
    await user.click(firstDigit);
    await user.paste('123456');
  }

  it('starts with the email step and requests a reset code', async () => {
    mockRequest.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('button', { name: /send reset code/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /send reset code/i }));

    await waitFor(() => expect(screen.getByText(/enter reset code/i)).toBeInTheDocument());
    expect(mockRequest).toHaveBeenCalledWith('a@b.com');
    expect(pendingPasswordReset.get()?.email).toBe('a@b.com');
  });

  it('shows only the OTP step after requesting a code', () => {
    pendingPasswordReset.start('a@b.com');
    renderPage();

    expect(screen.getByRole('group', { name: /verification code/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify code/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^new password$/i)).not.toBeInTheDocument();
  });

  it('verifies the OTP before showing the new password form', async () => {
    pendingPasswordReset.start('a@b.com');
    mockVerify.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await enterCode(user);
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument());
    expect(mockVerify).toHaveBeenCalledWith({
      email: 'a@b.com',
      token: '123456',
      type: 'recovery',
    });
    expect(screen.queryByRole('group', { name: /verification code/i })).not.toBeInTheDocument();
  });

  it('finishes the flow from the new password step', async () => {
    pendingPasswordReset.start('a@b.com');
    mockUpdate.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await enterCode(user);
    await user.click(screen.getByRole('button', { name: /verify code/i }));
    await waitFor(() => expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/^new password$/i), 'NewSecret123');
    await user.type(screen.getByLabelText(/^confirm new password$/i), 'NewSecret123');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('NewSecret123'));
    expect(mockSignOut).toHaveBeenCalledWith('global');
    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      replace: true,
      state: { passwordReset: true },
    });
  });

  it('stays on the email step when the provider rejects the request', async () => {
    mockRequest.mockRejectedValue(new Error('Email rate limit exceeded'));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /send reset code/i }));

    expect(await screen.findByText(/email rate limit exceeded/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset code/i })).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupPage } from '../SignupPage';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { useNavigate, MemoryRouter } from 'react-router';
import type { AuthContextValue } from '@/providers/auth-provider/types';

vi.mock('@/providers/auth-provider/useAuthContext');
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: vi.fn() };
});

describe('LoginPage', () => {
  const mockSignUp = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthContext).mockReturnValue({
      signUpWithEmail: mockSignUp,
      session: { status: 'guest', user: null },
    } as Partial<AuthContextValue> as AuthContextValue);
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  const renderSignupPage = () => {
    return render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );
  };

  it('renders email, password and confirm password fields and a submit button', () => {
    renderSignupPage();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('allows typing into fields', async () => {
    const user = userEvent.setup();
    renderSignupPage();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/^confirm password/i);

    await user.type(emailInput, 'a@b.com');
    await user.type(passwordInput, 'secret123');
    await user.type(confirmPasswordInput, 'secret123');

    expect(emailInput).toHaveValue('a@b.com');
    expect(passwordInput).toHaveValue('secret123');
    expect(confirmPasswordInput).toHaveValue('secret123');
  });

  it('shows a validation error and does not call signUpWithEmail on invalid input', async () => {
    const user = userEvent.setup();
    renderSignupPage();

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls signUpWithEmail with entered credentials on valid submit', async () => {
    mockSignUp.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderSignupPage();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password/i), 'Secret123');
    await user.type(screen.getByLabelText(/^confirm password/i), 'Secret123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'Secret123',
        confirmPassword: 'Secret123',
      }),
    );
  });

  it('navigates to home after a successful login', async () => {
    mockSignUp.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderSignupPage();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password/i), 'Secret123');
    await user.type(screen.getByLabelText(/^confirm password/i), 'Secret123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('shows a form-level error when signInWithEmail throws, and does not navigate', async () => {
    mockSignUp.mockRejectedValue(new Error('Email already exist'));
    const user = userEvent.setup();
    renderSignupPage();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password/i), 'Wrong123');
    await user.type(screen.getByLabelText(/^confirm password/i), 'Wrong123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/email already exist/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('disables the submit button while the request is in flight', async () => {
    let resolveSignIn: (values?: unknown) => void;
    mockSignUp.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );

    const user = userEvent.setup();
    const { container } = renderSignupPage();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password/i), 'Secret123');
    await user.type(screen.getByLabelText(/^confirm password/i), 'Secret123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    const submitButton = container.querySelector('button[type="submit"]');
    expect(submitButton).toBeDisabled();

    act(() => {
      resolveSignIn();
    });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });
});

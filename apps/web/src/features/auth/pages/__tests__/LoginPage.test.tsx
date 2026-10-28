import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../LoginPage';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { useNavigate, MemoryRouter } from 'react-router';
import type { AuthContextValue } from '@/providers/auth-provider/types';

vi.mock('@/providers/auth-provider/useAuthContext');
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: vi.fn() };
});

describe('LoginPage', () => {
  const mockSignIn = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthContext).mockReturnValue({
      signInWithEmail: mockSignIn,
      session: { status: 'guest', user: null },
    } as Partial<AuthContextValue> as AuthContextValue);

    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  const renderLoginPage = () => {
    return render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
  };

  it('renders email and password fields and a submit button', () => {
    renderLoginPage();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('links to the forgot password page', () => {
    renderLoginPage();

    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  it('shows a success notice after completing a password reset', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { passwordReset: true } }]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/password updated/i)).toBeInTheDocument();
  });

  it('allows typing into the email and password fields', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'a@b.com');
    await user.type(passwordInput, 'secret123');

    expect(emailInput).toHaveValue('a@b.com');
    expect(passwordInput).toHaveValue('secret123');
  });

  it('shows a validation error and does not call signInWithEmail on invalid input', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('calls signInWithEmail with entered credentials on valid submit', async () => {
    mockSignIn.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret123' }),
    );
  });

  it('navigates to home after a successful login', async () => {
    mockSignIn.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('shows a form-level error when signInWithEmail throws, and does not navigate', async () => {
    mockSignIn.mockRejectedValue(new Error('Invalid login credentials'));
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/invalid login credentials/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('disables the submit button while the request is in flight', async () => {
    let resolveSignIn: (values?: unknown) => void;
    mockSignIn.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );

    const user = userEvent.setup();
    const { container } = renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    const submitButton = container.querySelector('button[type="submit"]');
    expect(submitButton).toBeDisabled();

    act(() => {
      resolveSignIn();
    });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });
});

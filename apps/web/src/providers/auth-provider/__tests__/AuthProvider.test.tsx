import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { AuthProvider } from '../AuthProvider';
import { useAuthContext } from '../useAuthContext';
import type { AuthService, AuthSession } from '../types';

function createFakeAuthService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    getSession: vi.fn().mockResolvedValue({ status: 'guest', user: null } satisfies AuthSession),
    onAuthStateChange: vi.fn().mockReturnValue(vi.fn()),
    signInWithEmail: vi.fn().mockResolvedValue(undefined),
    signUpWithEmail: vi
      .fn()
      .mockResolvedValue({ id: 'u1', email: 'a@b.com', emailVerifiedAt: null }),
    verifyOtp: vi.fn().mockResolvedValue(undefined),
    resendSignupOtp: vi.fn().mockResolvedValue(undefined),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('AuthProvider', () => {
  it('wires the injected service through to consumers via context', async () => {
    const fakeService = createFakeAuthService({
      getSession: vi.fn().mockResolvedValue({
        status: 'authenticated',
        user: { id: 'u1', email: 'a@b.com' },
      }),
    });

    function Probe() {
      const { session } = useAuthContext();
      if (session.status === 'loading') return <div>loading</div>;
      return <div>{session.status === 'authenticated' ? session.user?.email : 'guest'}</div>;
    }

    render(
      <AuthProvider authService={fakeService}>
        <Probe />
      </AuthProvider>,
    );

    // loading state
    expect(screen.getByText('loading')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('a@b.com')).toBeInTheDocument());
    expect(fakeService.getSession).toHaveBeenCalledTimes(1);
  });
});

describe('useAuthContext', () => {
  it('throws a clear error when used outside of AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuthContext());
    }).toThrow(/useAuthContext must be used within an AuthProvider/i);

    spy.mockRestore();
  });

  it('returns the exact context value when used inside AuthProvider', async () => {
    const fakeService = createFakeAuthService({
      getSession: vi.fn().mockResolvedValue({
        status: 'authenticated',
        user: { id: 'u1', email: 'a@b.com' },
      }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider authService={fakeService}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => expect(result.current.session.status).toBe('authenticated'));

    expect(result.current.session.user).toEqual({ id: 'u1', email: 'a@b.com' });

    expect(result.current.signInWithEmail).toBe(fakeService.signInWithEmail);
    expect(result.current.signUpWithEmail).toBe(fakeService.signUpWithEmail);
  });
});

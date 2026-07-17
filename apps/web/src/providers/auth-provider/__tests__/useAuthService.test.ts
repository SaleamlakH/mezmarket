import { describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuthService } from '../useAuthService';
import type { AuthService, AuthSession } from '@mez/types';

function createFakeAuthService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    getSession: vi.fn().mockResolvedValue({ status: 'guest', user: null } satisfies AuthSession),
    signInWithEmail: vi.fn().mockResolvedValue(undefined),
    signUpWithEmail: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('useAuthService', () => {
  it('calls getSession exactly once on mount', async () => {
    const fakeService = createFakeAuthService();

    renderHook(() => useAuthService(fakeService));

    await waitFor(() => expect(fakeService.getSession).toHaveBeenCalledTimes(1));
  });

  it('starts in a loading state before getSession resolves', async () => {
    let resolveSession: (value: AuthSession) => void;
    const pending = new Promise<AuthSession>((resolve) => {
      resolveSession = resolve;
    });
    const fakeService = createFakeAuthService({
      getSession: vi.fn().mockReturnValue(pending),
    });

    const { result } = renderHook(() => useAuthService(fakeService));

    expect(result.current.session.status).toBe('loading');

    await act(async () => {
      resolveSession({ status: 'authenticated', user: { id: 'u1', email: 'a@b.com' } });
    });

    await waitFor(() => expect(result.current.session.status).toBe('authenticated'));
  });

  it('reflects an authenticated session returned by getSession', async () => {
    const fakeService = createFakeAuthService({
      getSession: vi.fn().mockResolvedValue({
        status: 'authenticated',
        user: { id: 'u1', email: 'a@b.com' },
      }),
    });

    const { result } = renderHook(() => useAuthService(fakeService));

    await waitFor(() => expect(result.current.session.status).toBe('authenticated'));
    expect(result.current.session.user).toEqual({ id: 'u1', email: 'a@b.com' });
  });

  it('reflects a guest session returned by getSession', async () => {
    const fakeService = createFakeAuthService(); // default guest

    const { result } = renderHook(() => useAuthService(fakeService));

    await waitFor(() => expect(result.current.session.status).toBe('guest'));
    expect(result.current.session.user).toBeNull();
  });

  it('falls back to a guest session when getSession throws', async () => {
    const fakeService = createFakeAuthService({
      getSession: vi.fn().mockRejectedValue('network error'),
    });

    const { result } = renderHook(() => useAuthService(fakeService));

    await waitFor(() => expect(result.current.session.status).toBe('guest'));
    expect(result.current.session.user).toBeNull();
  });

  it('exposes signInWithEmail as a direct pass-through reference to the injected service', async () => {
    const fakeService = createFakeAuthService();

    const { result } = renderHook(() => useAuthService(fakeService));

    await waitFor(() => {
      expect(result.current.signInWithEmail).toBe(fakeService.signInWithEmail);
    });
  });

  it('exposes signUpWithEmail as a direct pass-through reference to the injected service', async () => {
    const fakeService = createFakeAuthService();

    const { result } = renderHook(() => useAuthService(fakeService));

    await waitFor(() => {
      expect(result.current.signUpWithEmail).toBe(fakeService.signUpWithEmail);
    });
  });

  it('does not call signInWithEmail or signUpWithEmail on its own at any point', async () => {
    const fakeService = createFakeAuthService();

    renderHook(() => useAuthService(fakeService));

    await waitFor(() => expect(fakeService.getSession).toHaveBeenCalledTimes(1));
    expect(fakeService.signInWithEmail).not.toHaveBeenCalled();
    expect(fakeService.signUpWithEmail).not.toHaveBeenCalled();
  });
});

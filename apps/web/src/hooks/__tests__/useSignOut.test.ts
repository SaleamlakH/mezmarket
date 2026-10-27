import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { useSignOut } from '../useSignOut';

vi.mock('@/providers/auth-provider/useAuthContext');

describe('useSignOut', () => {
  const signOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthContext).mockReturnValue({
      signOut,
    } as unknown as ReturnType<typeof useAuthContext>);
  });

  it('logs out the local session and tracks the pending state', async () => {
    let resolveSignOut: () => void;
    signOut.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSignOut = resolve;
      }),
    );
    const { result } = renderHook(() => useSignOut());

    let signOutPromise: Promise<void>;
    act(() => {
      signOutPromise = result.current.signOut();
    });

    expect(signOut).toHaveBeenCalledWith('local');
    expect(result.current.isSigningOut).toBe(true);

    await act(async () => {
      resolveSignOut();
      await signOutPromise;
    });

    expect(result.current.isSigningOut).toBe(false);
  });

  it('stores the error and leaves the pending state when logging out fails', async () => {
    signOut.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.error).toBe('network down');
    expect(result.current.isSigningOut).toBe(false);
  });

  it('uses a fallback message when the failure is not an Error', async () => {
    signOut.mockRejectedValueOnce('offline');
    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.error).toBeDefined();
  });

  it('clears the error', async () => {
    signOut.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      await result.current.signOut();
    });
    act(() => result.current.clearError());

    expect(result.current.error).toBeNull();
  });

  it('ignores a second request while logging out', async () => {
    let resolveSignOut: () => void;
    signOut.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSignOut = resolve;
      }),
    );
    const { result } = renderHook(() => useSignOut());

    let signOutPromise: Promise<void>;
    act(() => {
      signOutPromise = result.current.signOut();
    });
    await act(async () => {
      await result.current.signOut();
    });

    expect(signOut).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSignOut();
      await signOutPromise;
    });
  });
});

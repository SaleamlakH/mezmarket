import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { useChangePasswordForm } from '../useChangePasswordForm';
import type { AuthContextValue } from '@/providers/auth-provider/types';

vi.mock('@/providers/auth-provider/useAuthContext');
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: vi.fn() };
});

describe('useChangePasswordForm', () => {
  const mockUpdate = vi.fn();
  const mockSignOut = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useAuthContext).mockReturnValue({
      updatePassword: mockUpdate,
      signOut: mockSignOut,
    } as Partial<AuthContextValue> as AuthContextValue);
  });

  function renderForm() {
    return renderHook(() => useChangePasswordForm());
  }

  function fillValidValues(result: ReturnType<typeof renderForm>['result']) {
    act(() => {
      result.current.form.setValue('currentPassword', 'OldSecret123');
      result.current.form.setValue('newPassword', 'NewSecret123');
      result.current.form.setValue('confirmPassword', 'NewSecret123');
    });
  }

  it('updates the password and signs out everywhere', async () => {
    mockUpdate.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);

    const { result } = renderForm();
    fillValidValues(result);

    await act(async () => {
      await result.current.form.submit();
    });

    expect(mockUpdate).toHaveBeenCalledWith('NewSecret123', 'OldSecret123');
    expect(mockSignOut).toHaveBeenCalledWith('global');
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('does not submit invalid values', async () => {
    const { result } = renderForm();

    act(() => {
      result.current.form.setValue('currentPassword', '');
      result.current.form.setValue('newPassword', 'weak');
      result.current.form.setValue('confirmPassword', 'different');
    });

    await act(async () => {
      await result.current.form.submit();
    });

    expect(mockUpdate).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.form.formState.errors.currentPassword?.message).toBeTruthy();
    expect(result.current.form.formState.errors.newPassword?.message).toBeTruthy();
    expect(result.current.form.formState.errors.confirmPassword?.message).toBeTruthy();
  });

  it('reports a rejected current password without signing out', async () => {
    mockUpdate.mockRejectedValue(new Error('Invalid login credentials'));

    const { result } = renderForm();
    fillValidValues(result);

    await act(async () => {
      await result.current.form.submit();
    });

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.error).toBe('Invalid login credentials'));
  });

  it('reports when the global sign out fails without trying a local sign out', async () => {
    mockUpdate.mockResolvedValue(undefined);
    mockSignOut.mockRejectedValue(new Error('network'));

    const { result } = renderForm();
    fillValidValues(result);

    await act(async () => {
      await result.current.form.submit();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith('global');
    expect(mockNavigate).not.toHaveBeenCalled();
    await waitFor(() => expect(typeof result.current.error).toBe('string'));
  });

  it('clears the root error', async () => {
    mockUpdate.mockRejectedValue(new Error('Invalid login credentials'));

    const { result } = renderForm();
    fillValidValues(result);

    await act(async () => {
      await result.current.form.submit();
    });
    await waitFor(() => expect(result.current.error).toBe('Invalid login credentials'));

    act(() => result.current.clearError());

    expect(result.current.error).toBeNull();
  });
});

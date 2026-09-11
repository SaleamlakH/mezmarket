import { describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useOwnerProfile } from '../useOwnerProfile';
import type { OwnerApi } from '../../api/ownerApi';
import type { OwnerResponse } from '@mez/types';

const profile: OwnerResponse = {
  id: 'o1',
  name: 'Ada',
  contactEmail: 'ada@example.com',
  contactPhone: '+1234567890',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

const nextProfile: OwnerResponse = {
  ...profile,
  name: 'Ada L.',
  updatedAt: '2024-03-01T00:00:00.000Z',
};

function createFakeApi(overrides: Partial<OwnerApi> = {}): OwnerApi {
  return {
    getOwnerProfile: vi.fn(),
    updateOwnerProfile: vi.fn(),
    ...overrides,
  };
}

describe('useOwnerProfile', () => {
  it('fetches the profile on mount and exits the loading state', async () => {
    const api = createFakeApi({ getOwnerProfile: vi.fn().mockResolvedValue(profile) });

    const { result } = renderHook(() => useOwnerProfile(api));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(api.getOwnerProfile).toHaveBeenCalledTimes(1);
    expect(result.current.profile).toEqual(profile);
    expect(result.current.error).toBeNull();
  });

  it('starts in the loading state until the request resolves', async () => {
    let resolveGet: (value: OwnerResponse) => void;
    const pending = new Promise<OwnerResponse>((resolve) => {
      resolveGet = resolve;
    });
    const api = createFakeApi({ getOwnerProfile: vi.fn().mockReturnValue(pending) });

    const { result } = renderHook(() => useOwnerProfile(api));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.profile).toBeNull();

    await act(async () => {
      resolveGet(profile);
    });

    await waitFor(() => expect(result.current.profile).toEqual(profile));
    expect(result.current.isLoading).toBe(false);
  });

  it('records the error and leaves the profile empty when fetching fails', async () => {
    const api = createFakeApi({
      getOwnerProfile: vi.fn().mockRejectedValue(new Error('boom')),
    });

    const { result } = renderHook(() => useOwnerProfile(api));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('boom');
    expect(result.current.profile).toBeNull();
  });

  it('applyProfile replaces the profile and clears any error', async () => {
    const api = createFakeApi({ getOwnerProfile: vi.fn().mockResolvedValue(profile) });
    const { result } = renderHook(() => useOwnerProfile(api));
    await waitFor(() => expect(result.current.profile).toEqual(profile));

    act(() => result.current.applyProfile(nextProfile));

    expect(result.current.profile).toEqual(nextProfile);
    expect(result.current.error).toBeNull();
  });

  it('refetch reloads from the api, showing loading while in flight', async () => {
    const getOwnerProfile = vi.fn().mockResolvedValue(profile);
    const api = createFakeApi({ getOwnerProfile });
    const { result } = renderHook(() => useOwnerProfile(api));
    await waitFor(() => expect(result.current.profile).toEqual(profile));

    let resolveRefetch: (value: OwnerResponse) => void;
    const pending = new Promise<OwnerResponse>((resolve) => {
      resolveRefetch = resolve;
    });
    getOwnerProfile.mockReturnValueOnce(pending);

    let refetchPromise: Promise<void> | undefined;
    act(() => {
      refetchPromise = result.current.refetch();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => {
      resolveRefetch(nextProfile);
      await refetchPromise;
    });

    expect(result.current.profile).toEqual(nextProfile);
    expect(result.current.isLoading).toBe(false);
  });

  it('ignores the fetched profile after unmount', async () => {
    let resolveGet: (value: OwnerResponse) => void;
    const pending = new Promise<OwnerResponse>((resolve) => {
      resolveGet = resolve;
    });
    const api = createFakeApi({ getOwnerProfile: vi.fn().mockReturnValue(pending) });

    const { result, unmount } = renderHook(() => useOwnerProfile(api));
    unmount();

    await act(async () => {
      resolveGet(profile);
    });

    expect(result.current.profile).toBeNull();
    expect(api.getOwnerProfile).toHaveBeenCalledTimes(1);
  });
});

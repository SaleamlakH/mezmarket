import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOwnerProfileForm } from '../useOwnerProfileForm';
import type { OwnerApi } from '../../api/ownerApi';
import type { OwnerResponse } from '@mez/types';

const profile: OwnerResponse = {
  id: 'o1',
  name: 'Ada',
  contactEmail: null,
  contactPhone: '+1234567890',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

function fakeEvent() {
  return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}

function createFakeApi(overrides: Partial<OwnerApi> = {}): OwnerApi {
  return {
    getOwnerProfile: vi.fn(),
    updateOwnerProfile: vi.fn(),
    ...overrides,
  };
}

describe('useOwnerProfileForm', () => {
  it('seeds the form with the profile values', () => {
    const api = createFakeApi();
    const { result } = renderHook(() => useOwnerProfileForm(api, profile, vi.fn()));

    expect(result.current.values).toEqual({
      name: profile.name,
      contactEmail: profile.contactEmail,
      contactPhone: profile.contactPhone,
    });
    expect(result.current.hasChanges).toBe(false);
  });

  it('tracks hasChanges as the values diverge from and return to the profile', () => {
    const api = createFakeApi();
    const { result } = renderHook(() => useOwnerProfileForm(api, profile, vi.fn()));

    act(() => result.current.handleChange('name', 'Ada L.'));
    expect(result.current.hasChanges).toBe(true);

    act(() => result.current.handleChange('name', profile.name));
    expect(result.current.hasChanges).toBe(false);
  });

  it('submits the sanitized payload and calls onSaved with the updated profile', async () => {
    const updated: OwnerResponse = {
      ...profile,
      name: 'Ada L.',
      updatedAt: '2024-03-01T00:00:00.000Z',
    };
    const api = createFakeApi({ updateOwnerProfile: vi.fn().mockResolvedValue(updated) });
    const onSaved = vi.fn();
    const { result } = renderHook(() => useOwnerProfileForm(api, profile, onSaved));

    act(() => result.current.handleChange('name', 'Ada L.'));

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(api.updateOwnerProfile).toHaveBeenCalledWith({
      name: 'Ada L.',
      contactEmail: null,
      contactPhone: profile.contactPhone,
    });
    expect(onSaved).toHaveBeenCalledWith(updated);
  });

  it('does not call onSaved and surfaces the error when the update fails', async () => {
    const api = createFakeApi({
      updateOwnerProfile: vi.fn().mockRejectedValue(new Error('Server exploded')),
    });
    const onSaved = vi.fn();
    const { result } = renderHook(() => useOwnerProfileForm(api, profile, onSaved));

    act(() => result.current.handleChange('name', 'Ada L.'));

    await act(async () => {
      await result.current.handleSubmit(fakeEvent());
    });

    expect(api.updateOwnerProfile).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.submitError).toBe('Server exploded');
    expect(result.current.isSubmitting).toBe(false);
  });
});

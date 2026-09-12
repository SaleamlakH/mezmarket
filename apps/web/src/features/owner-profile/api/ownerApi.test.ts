import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOwnerApi } from './ownerApi';
import type { ApiClient } from '@/lib/apiClient';
import type { OwnerApi } from './ownerApi';
import type { OwnerResponse } from '@mez/types';

const profile: OwnerResponse = {
  id: 'o1',
  name: 'Ada',
  contactEmail: 'ada@example.com',
  contactPhone: '+1234567890',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

const client = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as ApiClient;

describe('createOwnerApi', () => {
  let api: OwnerApi;

  beforeEach(() => {
    vi.clearAllMocks();
    api = createOwnerApi(client);
  });

  it('getOwnerProfile calls GET /api/owner and returns the profile', async () => {
    vi.mocked(client.get).mockResolvedValue(profile);

    const result = await api.getOwnerProfile();

    expect(client.get).toHaveBeenCalledWith('/api/owner');
    expect(result).toEqual(profile);
  });

  it('updateOwnerProfile PUTs the input to /api/owner and returns the updated profile', async () => {
    const updated: OwnerResponse = {
      ...profile,
      name: 'Ada L.',
      updatedAt: '2024-03-01T00:00:00.000Z',
    };
    vi.mocked(client.put).mockResolvedValue(updated);

    const input = { name: 'Ada L.' };
    const result = await api.updateOwnerProfile(input);

    expect(client.put).toHaveBeenCalledWith('/api/owner', input);
    expect(result).toEqual(updated);
  });

  it('propagates errors from the underlying client', async () => {
    vi.mocked(client.get).mockRejectedValue(new Error('boom'));

    await expect(api.getOwnerProfile()).rejects.toThrow('boom');
  });
});

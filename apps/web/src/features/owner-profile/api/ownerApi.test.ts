import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOwnerApi } from './ownerApi';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OwnerResponse } from '@mez/types';

const API_URL = 'https://api.example.com';
const ENDPOINT = `${API_URL}/api/owner`;

const profile: OwnerResponse = {
  id: 'o1',
  name: 'Ada',
  contactEmail: 'ada@example.com',
  contactPhone: '+1234567890',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

function createFakeClient() {
  return { auth: { getSession: vi.fn() } };
}

function responseMock(body: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 400,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe('createOwnerApi', () => {
  const fakeClient = createFakeClient();
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', API_URL);
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    fakeClient.auth.getSession.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe('getOwnerProfile', () => {
    const authHeader = {
      Authorization: 'Bearer tok-123',
      'Content-Type': 'application/json',
    };

    it('fetches the profile with the session token and returns the parsed body', async () => {
      fakeClient.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'tok-123' } },
        error: null,
      });
      fetchMock.mockResolvedValue(responseMock(profile));

      const api = createOwnerApi(fakeClient as unknown as SupabaseClient);
      const result = await api.getOwnerProfile();

      expect(fetchMock).toHaveBeenCalledWith(ENDPOINT, { headers: authHeader });
      expect(result).toEqual(profile);
    });

    it('throws Not authenticated when there is no session', async () => {
      fakeClient.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

      const api = createOwnerApi(fakeClient as unknown as SupabaseClient);

      await expect(api.getOwnerProfile()).rejects.toThrow('Not authenticated');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws Not authenticated when the session has no access token', async () => {
      fakeClient.auth.getSession.mockResolvedValue({ data: { session: {} }, error: null });

      const api = createOwnerApi(fakeClient as unknown as SupabaseClient);

      await expect(api.getOwnerProfile()).rejects.toThrow('Not authenticated');
    });

    it('throws the server message when the response is not ok', async () => {
      fakeClient.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'tok-123' } },
        error: null,
      });
      fetchMock.mockResolvedValue(responseMock({ message: 'Forbidden' }, false));

      const api = createOwnerApi(fakeClient as unknown as SupabaseClient);

      await expect(api.getOwnerProfile()).rejects.toThrow('Forbidden');
    });

    it('falls back to a generic message when the error body is not JSON', async () => {
      fakeClient.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'tok-123' } },
        error: null,
      });
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('syntax error')),
      });

      const api = createOwnerApi(fakeClient as unknown as SupabaseClient);

      await expect(api.getOwnerProfile()).rejects.toThrow('Failed to load profile');
    });
  });

  describe('updateOwnerProfile', () => {
    const authHeader = {
      Authorization: 'Bearer tok-123',
      'Content-Type': 'application/json',
    };
    const input = { name: 'Ada L.', contactEmail: null };

    it('PUTs the payload with the session token and returns the updated profile', async () => {
      fakeClient.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'tok-123' } },
        error: null,
      });
      const updated = { ...profile, ...input, updatedAt: '2024-03-01T00:00:00.000Z' };
      fetchMock.mockResolvedValue(responseMock(updated));

      const api = createOwnerApi(fakeClient as unknown as SupabaseClient);
      const result = await api.updateOwnerProfile(input);

      expect(fetchMock).toHaveBeenCalledWith(ENDPOINT, {
        method: 'PUT',
        headers: authHeader,
        body: JSON.stringify(input),
      });
      expect(result).toEqual(updated);
    });

    it('throws the server message when the response is not ok', async () => {
      fakeClient.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'tok-123' } },
        error: null,
      });
      fetchMock.mockResolvedValue(responseMock({ message: 'Name already taken' }, false));

      const api = createOwnerApi(fakeClient as unknown as SupabaseClient);

      await expect(api.updateOwnerProfile(input)).rejects.toThrow('Name already taken');
    });

    it('falls back to a generic message when the error body is not JSON', async () => {
      fakeClient.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'tok-123' } },
        error: null,
      });
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('syntax error')),
      });

      const api = createOwnerApi(fakeClient as unknown as SupabaseClient);

      await expect(api.updateOwnerProfile(input)).rejects.toThrow('Failed to update profile');
    });

    it('throws Not authenticated when there is no session', async () => {
      fakeClient.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

      const api = createOwnerApi(fakeClient as unknown as SupabaseClient);

      await expect(api.updateOwnerProfile(input)).rejects.toThrow('Not authenticated');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});

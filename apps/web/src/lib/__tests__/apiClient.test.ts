import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiClient, apiGet, apiPatch, apiPost, apiPut } from '@/lib/apiClient';

const { mockGetSession } = vi.hoisted(() => ({ mockGetSession: vi.fn() }));

vi.mock('@/lib/supabase', () => ({
  supabaseClient: { auth: { getSession: mockGetSession } },
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiClient', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
      error: null,
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mockFetch.mockReset();
    mockGetSession.mockReset();
  });

  describe('apiGet', () => {
    it('sends the bearer token and returns the parsed body on success', async () => {
      const payload = { businesses: [] };
      mockFetch.mockResolvedValue(jsonResponse(payload));

      const result = await apiGet('/businesses');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/businesses',
        expect.objectContaining({ method: 'GET' }),
      );

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer token-123');

      expect(result).toEqual(payload);
    });

    it('omits the Authorization header when there is no session token', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
      mockFetch.mockResolvedValue(jsonResponse({ businesses: [] }));

      await apiGet('/businesses');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });

    it('continues without an Authorization header when getSession fails', async () => {
      mockGetSession.mockRejectedValue(new Error('network down'));
      const payload = { businesses: [] };
      mockFetch.mockResolvedValue(jsonResponse(payload));

      const result = await apiGet('/businesses');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
      expect(result).toEqual(payload);
    });

    it('continues without an Authorization header when getSession returns an error', async () => {
      mockGetSession.mockResolvedValue({ data: null, error: { message: 'token expired' } });
      mockFetch.mockResolvedValue(jsonResponse({ businesses: [] }));

      await apiGet('/businesses');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('apiPost', () => {
    it('sends a JSON body with the content type header', async () => {
      const payload = { id: 'b-1' };
      mockFetch.mockResolvedValue(jsonResponse(payload, 201));

      const body = { name: 'Selam Mart', currencyCode: 'ETB' };
      const result = await apiPost('/businesses', body);

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
      expect(init.body).toBe(JSON.stringify(body));

      expect(result).toEqual(payload);
    });
  });

  describe('apiPut', () => {
    it('sends a JSON body with PUT method', async () => {
      const payload = { id: 'o-1' };
      mockFetch.mockResolvedValue(jsonResponse(payload, 200));

      const body = { name: 'Ada L.' };
      const result = await apiPut('/owner', body);

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(init.method).toBe('PUT');
      expect(headers['Content-Type']).toBe('application/json');
      expect(init.body).toBe(JSON.stringify(body));

      expect(result).toEqual(payload);
    });
  });

  describe('apiPatch', () => {
    it('sends a JSON body with PATCH method', async () => {
      const payload = { id: 'p-1', active: false };
      mockFetch.mockResolvedValue(jsonResponse(payload, 200));

      const body = { active: false };
      const result = await apiPatch('/businesses/b-1/products/p-1/active', body);

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(init.method).toBe('PATCH');
      expect(headers['Content-Type']).toBe('application/json');
      expect(init.body).toBe(JSON.stringify(body));

      expect(result).toEqual(payload);
    });

    it('surfaces the error envelope the same way as the other verbs', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404),
      );

      const error = (await apiPatch('/businesses/b-1/products/ghost/active', {
        active: false,
      }).catch((e) => e)) as ApiError;

      expect(error).toBeInstanceOf(ApiError);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.status).toBe(404);
    });
  });

  describe('apiClient object', () => {
    it('exposes patch alongside the other verbs', () => {
      expect(apiClient.patch).toBe(apiPatch);
    });
  });

  describe('error handling', () => {
    it('throws an ApiError with code, message, and details from the error envelope', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: 'BAD_REQUEST',
              message: 'Invalid request',
              details: { name: 'Business name is required' },
            },
          },
          400,
        ),
      );

      const error = (await apiGet('/businesses').catch((e) => e)) as ApiError;

      expect(error).toBeInstanceOf(ApiError);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Invalid request');
      expect(error.details).toEqual({ name: 'Business name is required' });
      expect(error.status).toBe(400);
    });

    it('falls back to defaults when the response is not JSON', async () => {
      mockFetch.mockResolvedValue(new Response('server error', { status: 502 }));

      const error = (await apiGet('/businesses').catch((e) => e)) as ApiError;

      expect(error).toBeInstanceOf(ApiError);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('Something went wrong');
      expect(error.status).toBe(502);
    });

    it('falls back to defaults when the envelope is empty', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 500));

      const error = (await apiGet('/businesses').catch((e) => e)) as ApiError;

      expect(error).toBeInstanceOf(ApiError);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.message).toBe('Something went wrong');
    });
  });
});

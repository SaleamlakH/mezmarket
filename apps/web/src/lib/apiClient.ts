import { supabaseClient } from './supabase';

export interface ApiErrorOptions {
  code: string;
  message: string;
  details?: Record<string, string>;
  status: number;
}

export class ApiError extends Error {
  readonly code: string;
  readonly details?: Record<string, string>;
  readonly status: number;

  constructor({ code, message, details, status }: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    if (details) this.details = details;
    this.status = status;
  }
}

interface ErrorEnvelope {
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

async function getAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data?.session) return null;
    return data.session.access_token ?? null;
  } catch {
    return null;
  }
}

interface sendRequestArgs {
  path: string;
  request: RequestInit;
}

async function sendRequest({ path, request = {} }: sendRequestArgs) {
  const token = await getAccessToken();

  return fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...request.headers,
    },
    ...request,
  });
}

export async function apiRequest<TResponse>(
  path: string,
  request: RequestInit = {},
): Promise<TResponse> {
  const response = await sendRequest({ path, request });

  const body = (await response.json().catch(() => null)) as TResponse | ErrorEnvelope | null;

  if (!response.ok) {
    const envelope = (body as ErrorEnvelope | null)?.error;
    throw new ApiError({
      code: envelope?.code ?? 'INTERNAL_ERROR',
      message: envelope?.message ?? 'Something went wrong',
      status: response.status,
      ...(envelope?.details && { details: envelope.details }),
    });
  }

  return body as TResponse;
}

export function apiGet<TResponse>(path: string): Promise<TResponse> {
  return apiRequest<TResponse>(path, { method: 'GET' });
}

export function apiPost<TResponse>(path: string, body: unknown): Promise<TResponse> {
  return apiRequest<TResponse>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPut<TResponse>(path: string, body: unknown): Promise<TResponse> {
  return apiRequest<TResponse>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export function apiPatch<TResponse>(path: string, body: unknown): Promise<TResponse> {
  return apiRequest<TResponse>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export interface ApiClient {
  get<TResponse>(path: string): Promise<TResponse>;
  post<TResponse>(path: string, body: unknown): Promise<TResponse>;
  put<TResponse>(path: string, body: unknown): Promise<TResponse>;
  patch<TResponse>(path: string, body: unknown): Promise<TResponse>;
}

export const apiClient: ApiClient = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
};

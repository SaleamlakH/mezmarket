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

export async function apiRequest<TResponse>(
  path: string,
  req: RequestInit = {},
): Promise<TResponse> {
  const token = await getAccessToken();

  const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...req.headers,
    },
    ...req,
  });

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

export interface ApiClient {
  get<TResponse>(path: string): Promise<TResponse>;
  post<TResponse>(path: string, body: unknown): Promise<TResponse>;
}

export const apiClient: ApiClient = {
  get: apiGet,
  post: apiPost,
};

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CatalogService } from '@/providers/catalog/types';
import type { DownloadUrlsResponse } from '@mez/types';
import { useCatalogService } from '@/providers/catalog/useCatalogService';
import { useProductUploadUrls } from '../useProductUploadUrls';

vi.mock('@/providers/catalog/useCatalogService', () => ({
  useCatalogService: vi.fn(),
}));

const getProductUploadUrls = vi.fn();

function service(): CatalogService {
  return {
    listProducts: vi.fn(),
    getProductUnits: vi.fn(),
    getProductUploadUrls,
  };
}

function urls(entries: Record<string, string | null>): DownloadUrlsResponse {
  return Object.entries(entries).map(([uploadId, url]) => ({ uploadId, url }));
}

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useProductUploadUrls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCatalogService).mockReturnValue(service());
  });

  it('does not call the service without a business id', () => {
    renderHook(() => useProductUploadUrls(undefined), { wrapper: wrapper(createClient()) });

    expect(getProductUploadUrls).not.toHaveBeenCalled();
  });

  it('fetches the signed url list once for the business and exposes it', async () => {
    const signed = urls({ 'up-1': 'https://cdn.example/1.jpg', 'up-2': null });
    getProductUploadUrls.mockResolvedValue(signed);
    const client = createClient();

    const { result } = renderHook(() => useProductUploadUrls('b-1'), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.data).toEqual(signed));
    expect(getProductUploadUrls).toHaveBeenCalledWith('b-1');
  });

  it('surfaces a failed signing request so it can be retried', async () => {
    getProductUploadUrls.mockRejectedValue(new Error('offline'));
    const client = createClient();

    renderHook(() => useProductUploadUrls('b-1'), { wrapper: wrapper(client) });

    // The signing list gates every image query, so a swallowed failure here would
    // leave the whole grid on placeholders with no error surfaced anywhere.
    await waitFor(() =>
      expect(client.getQueryState(['products-uploads', 'b-1'])?.status).toBe('error'),
    );
  });
});

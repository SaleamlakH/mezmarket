import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DownloadUrlsResponse } from '@mez/types';
import { useProductImage } from '../useProductImage';
import { imageCache } from '@/lib/imageCache';

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

function okResponse() {
  return { ok: true, blob: async () => new Blob(['image']) };
}

const BOTH = urls({
  'up-1': 'https://cdn.example/1.jpg',
  'up-2': 'https://cdn.example/2.jpg',
});

function useTwoImages(businessId: string, uploadUrls: DownloadUrlsResponse) {
  return {
    first: useProductImage(businessId, 'up-1', uploadUrls),
    second: useProductImage(businessId, 'up-2', uploadUrls),
  } as const;
}

describe('useProductImage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    imageCache.clear();
    fetchMock.mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    imageCache.clear();
  });

  it('returns the cached object url without requesting anything', async () => {
    imageCache.set('up-1', new Blob(['cached']));
    const client = createClient();

    const { result } = renderHook(() => useProductImage('b-1', 'up-1', BOTH), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current).toMatch(/^blob:preview\/\d+$/));
    // Dropping the !cachedUrl guard would re-download every image on every visit,
    // which is the one thing the session cache exists to prevent.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('downloads on first reference and exposes the object url', async () => {
    const client = createClient();

    const { result } = renderHook(() => useProductImage('b-1', 'up-1', BOTH), {
      wrapper: wrapper(client),
    });

    // Starts empty so the card renders its placeholder rather than a broken image.
    expect(result.current).toBeUndefined();

    await waitFor(() => expect(result.current).toMatch(/^blob:preview\/\d+$/));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example/1.jpg');
    expect(imageCache.has('up-1')).toBe(true);
  });

  it('keeps a successful download out of the error state', async () => {
    const client = createClient();

    renderHook(() => useProductImage('b-1', 'up-1', BOTH), { wrapper: wrapper(client) });

    await waitFor(() => expect(imageCache.has('up-1')).toBe(true));
    // A queryFn resolving to undefined is itself an error in react query, so the
    // success path has to be pinned or a void return slips through unnoticed.
    expect(client.getQueryState(['product-image', 'b-1', 'up-1'])?.status).toBe('success');
  });

  it('requests nothing until the signing list has a url for the id', async () => {
    const client = createClient();

    const { result, rerender } = renderHook(
      ({ uploadUrls }: { uploadUrls: DownloadUrlsResponse }) =>
        useProductImage('b-1', 'up-1', uploadUrls),
      { initialProps: { uploadUrls: urls({ 'up-1': null }) }, wrapper: wrapper(client) },
    );

    // A freshly created product is not in the signed list yet. The query has to
    // wait rather than error, or the card errors instead of staying on its
    // placeholder until the invalidate brings the url through.
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
    expect(result.current).toBeUndefined();
    // A disabled query still holds a cache entry, so idle fetch status is what
    // proves it is waiting rather than erroring on the missing url.
    expect(client.getQueryState(['product-image', 'b-1', 'up-1'])?.fetchStatus).toBe('idle');

    rerender({ uploadUrls: BOTH });

    await waitFor(() => expect(result.current).toMatch(/^blob:preview\/\d+$/));
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example/1.jpg');
  });

  it('surfaces a non-ok response so the image query can retry it', async () => {
    fetchMock.mockResolvedValue({ ok: false, blob: async () => new Blob(['not an image']) });
    const client = createClient();

    renderHook(() => useProductImage('b-1', 'up-1', BOTH), { wrapper: wrapper(client) });

    // A swallowed failure would cache the error body as if it were the image, and
    // the session cache would then serve that broken blob for the rest of the day.
    await waitFor(() =>
      expect(client.getQueryState(['product-image', 'b-1', 'up-1'])?.status).toBe('error'),
    );
    expect(imageCache.has('up-1')).toBe(false);
  });

  it('reports a failed download on that image query only', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.endsWith('1.jpg') ? Promise.reject(new Error('offline')) : Promise.resolve(okResponse()),
    );
    const client = createClient();

    const { result } = renderHook(() => useTwoImages('b-1', BOTH), {
      wrapper: wrapper(client),
    });

    // Per image queries are the point: one broken image must not block or fail its
    // neighbours, which a single batched download could not guarantee.
    await waitFor(() =>
      expect(client.getQueryState(['product-image', 'b-1', 'up-1'])?.status).toBe('error'),
    );
    await waitFor(() => expect(result.current.second).toMatch(/^blob:preview\/\d+$/));
    expect(imageCache.has('up-1')).toBe(false);
    expect(imageCache.has('up-2')).toBe(true);
  });

  it('does not re-request a warm image after the card remounts', async () => {
    const client = createClient();

    const first = renderHook(() => useProductImage('b-1', 'up-1', BOTH), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(imageCache.has('up-1')).toBe(true));
    const cachedUrl = first.result.current;
    first.unmount();

    const second = renderHook(() => useProductImage('b-1', 'up-1', BOTH), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(second.result.current).toBe(cachedUrl));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import { createProductsService } from '../productsService';

function makeClient(): ApiClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  };
}

describe('productsService', () => {
  const client = makeClient();
  const service = createProductsService(client);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('listProducts calls GET on the business products endpoint', async () => {
    vi.mocked(client.get).mockResolvedValue([] as never);
    await service.listProducts('b-1');
    expect(client.get).toHaveBeenCalledWith('/api/businesses/b-1/products');
  });

  it('createProduct posts the input to the business products endpoint', async () => {
    const input = {
      name: 'Buna coffee',
      brand: null,
      description: null,
      lowStockThreshold: null,
      trackAsPartial: false,
      categoryId: null,
      baseUnit: { unitId: 'u-1', price: 120 },
    };
    vi.mocked(client.post).mockResolvedValue({ product: input } as never);
    await service.createProduct('b-1', input);

    expect(client.post).toHaveBeenCalledWith(
      '/api/businesses/b-1/products',
      expect.objectContaining({ name: 'Buna coffee', baseUnit: { unitId: 'u-1', price: 120 } }),
    );
  });

  it('createProductUpload posts upload metadata to the uploads endpoint', async () => {
    const meta = { record: 'PRODUCT', mimeType: 'image/jpeg', sizeBytes: 42 } as const;
    vi.mocked(client.post).mockResolvedValue({
      upload: { id: 'up-1' },
      uploadUrl: 'https://presigned',
    } as never);
    await service.createProductUpload('b-1', meta);

    expect(client.post).toHaveBeenCalledWith('/api/businesses/b-1/products/uploads', meta);
  });

  it('getProductUnits calls GET on the product units endpoint', async () => {
    vi.mocked(client.get).mockResolvedValue([] as never);
    await service.getProductUnits('b-1', 'p-1');

    expect(client.get).toHaveBeenCalledWith('/api/businesses/b-1/products/p-1/units');
  });

  it('getProductUploadUrls calls GET on the urls endpoint', async () => {
    vi.mocked(client.get).mockResolvedValue([{ uploadId: 'up-1', url: 'https://cdn/1' }] as never);
    await service.getProductUploadUrls('b-1');

    expect(client.get).toHaveBeenCalledWith('/api/businesses/b-1/products/uploads/urls');
  });

  it('putFile PUTs the file body to the presigned URL', async () => {
    const file = new File(['abc'], 'bag.png', { type: 'image/png' });
    const ok = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', ok);

    await service.putFile('https://presigned/url', file);

    expect(ok).toHaveBeenCalledWith(
      'https://presigned/url',
      expect.objectContaining({
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'image/png' },
      }),
    );
  });

  it('putFile throws a friendly error when the upload fails', async () => {
    const file = new File(['abc'], 'bag.png', { type: 'image/png' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(service.putFile('https://presigned/url', file)).rejects.toThrow(
      'The image could not be uploaded. Please try again.',
    );
  });
});

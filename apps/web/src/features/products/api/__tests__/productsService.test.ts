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

  it('listProducts carries the status filter in the query string', async () => {
    vi.mocked(client.get).mockResolvedValue([] as never);
    await service.listProducts('b-1', 'all');
    expect(client.get).toHaveBeenCalledWith('/api/businesses/b-1/products?status=all');
  });

  it('getProduct calls GET on the single product endpoint', async () => {
    vi.mocked(client.get).mockResolvedValue({ id: 'p-1' } as never);
    await service.getProduct('b-1', 'p-1');

    expect(client.get).toHaveBeenCalledWith('/api/businesses/b-1/products/p-1');
  });

  it('updateProduct PUTs the full input to the single product endpoint', async () => {
    const input = {
      name: 'Buna',
      brand: null,
      description: null,
      lowStockThreshold: null,
      trackAsPartial: false,
      categoryId: null,
    };
    vi.mocked(client.put).mockResolvedValue({ id: 'p-1' } as never);
    await service.updateProduct('b-1', 'p-1', input);

    expect(client.put).toHaveBeenCalledWith('/api/businesses/b-1/products/p-1', input);
  });

  it('updateProductUnits PUTs the role-tagged rows to the units endpoint', async () => {
    const input = {
      units: [{ unitRole: 'BASE' as const, id: 'pu-1', price: 40 }],
    };
    vi.mocked(client.put).mockResolvedValue({ units: [], errors: {} } as never);
    await service.updateProductUnits('b-1', 'p-1', input);

    expect(client.put).toHaveBeenCalledWith('/api/businesses/b-1/products/p-1/units', input);
  });

  it('createProductUnit POSTs one unit to the units endpoint', async () => {
    const input = {
      unitRole: 'CUSTOM',
      name: 'Shot',
      dependsOn: 'BASE',
      conversionRate: 25,
      purchaseCapable: false,
      sellCapable: true,
      price: 30,
    } as const;
    vi.mocked(client.post).mockResolvedValue({ id: 'pu-9', name: 'Shot' } as never);

    await service.createProductUnit('b-1', 'p-1', input);

    expect(client.post).toHaveBeenCalledWith('/api/businesses/b-1/products/p-1/units', input);
  });

  it('setProductActive PATCHes the active endpoint', async () => {
    vi.mocked(client.patch).mockResolvedValue({ id: 'p-1' } as never);
    await service.setProductActive('b-1', 'p-1', { active: false });

    expect(client.patch).toHaveBeenCalledWith('/api/businesses/b-1/products/p-1/active', {
      active: false,
    });
  });

  it('updateProductUpload PUTs upload metadata to the product uploads endpoint', async () => {
    const meta = { record: 'PRODUCT', mimeType: 'image/jpeg', sizeBytes: 42 } as const;
    vi.mocked(client.put).mockResolvedValue({
      upload: { id: 'up-1' },
      uploadUrl: 'https://presigned',
    } as never);
    await service.updateProductUpload('b-1', 'p-1', meta);

    expect(client.put).toHaveBeenCalledWith('/api/businesses/b-1/products/p-1/uploads', meta);
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

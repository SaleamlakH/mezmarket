import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DownloadUrlsResponse } from '@mez/types';
import { ProductStockList } from '../ProductStockList';
import { products } from '../../__tests__/fixtures';

const uploadUrls: DownloadUrlsResponse = [
  { uploadId: 'up_oil', url: 'https://cdn.example/oil.jpg' },
];

function renderList() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ProductStockList
        products={products}
        currency="ETB"
        businessId="b1"
        uploadUrls={uploadUrls}
      />
    </QueryClientProvider>,
  );
}

describe('ProductStockList images', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['image']) }),
    );
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('renders the photo of a product that has one', async () => {
    renderList();

    // Both the wide table cell and the narrow card render the thumb, so the
    // photo has to come through in each rather than only one layout.
    const images = await screen.findAllByAltText('Cooking Oil 5 L');
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image.getAttribute('src')).toMatch(/^blob:/);
    }
  });

  it('falls back to a placeholder for a product without a photo', () => {
    renderList();

    expect(screen.queryAllByAltText('Sierra Tequila 350 ml')).toHaveLength(0);
  });
});

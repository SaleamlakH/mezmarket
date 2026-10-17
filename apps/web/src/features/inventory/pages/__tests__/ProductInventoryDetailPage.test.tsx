import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ProductInventoryDetailPage } from '../ProductInventoryDetailPage';
import { useProductInventoryDetail } from '../../hooks/useInventoryApi';
import { productInventoryDetail } from '../../__tests__/fixtures';

vi.mock('../../hooks/useInventoryApi', () => ({
  useProductInventoryDetail: vi.fn(),
}));

vi.mock('@/hooks/useCurrency', () => ({ useCurrency: () => 'ETB' }));

const mockedUseDetail = vi.mocked(useProductInventoryDetail);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/inventory/products/prod_rice']}>
      <Routes>
        <Route path="/inventory/products/:productId" element={<ProductInventoryDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProductInventoryDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseDetail.mockReturnValue({
      data: productInventoryDetail,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
  });

  it('reads the product and its batch line count in the header', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Rice' })).toBeInTheDocument();
    expect(screen.getByText(/Base unit: Kilogram · 3 batch lines/)).toBeInTheDocument();
  });

  it('shows the summary metrics and the expiry warning', () => {
    renderPage();

    expect(screen.getByText('On hand')).toBeInTheDocument();
    expect(screen.getByText('Stock value')).toBeInTheDocument();
    expect(screen.getByText('Avg cost/Kilogram')).toBeInTheDocument();
    expect(screen.getByText(/expires within 7 days/)).toBeInTheDocument();
  });

  it('lists the stock by unit and the batch lines', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Stock by unit' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Batch lines' })).toBeInTheDocument();
  });

  it('shows a loading state while the product is being fetched', () => {
    mockedUseDetail.mockReturnValue({ isPending: true, data: undefined } as never);

    renderPage();

    expect(screen.getByText('Loading product…')).toBeInTheDocument();
  });

  it('shows an error state when the read fails', () => {
    mockedUseDetail.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
      refetch: vi.fn(),
    } as never);

    renderPage();

    expect(screen.getByText('Could not load product')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { BusinessGate } from '@/layouts/BusinessGate';
import type { BusinessResponse } from '@mez/types';

vi.mock('@/providers/business/useBusinessContext');

function business(id: string, name: string): BusinessResponse {
  return {
    id,
    ownerId: 'o1',
    name,
    currencyCode: 'ETB',
    defaultTaxRate: null,
    taxDisplayMode: 'EXCLUSIVE',
    allowNegativeStock: true,
    lowStockDefaultThreshold: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const b1 = business('b1', 'Selam');

function renderWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/businesses/new" element={<div>Business Creation</div>} />
        <Route element={<BusinessGate />}>
          <Route path="/" element={<div>Gated Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('BusinessGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBusinessContext).mockReturnValue({
      status: 'ready',
      businesses: [b1],
      currentBusiness: b1,
      setCurrentBusiness: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it('shows a loading state while the business query is pending', () => {
    vi.mocked(useBusinessContext).mockReturnValue({
      status: 'loading',
      businesses: [],
      currentBusiness: null,
      setCurrentBusiness: vi.fn(),
      refetch: vi.fn(),
    });

    renderWithRoutes();

    expect(screen.queryByText('Gated Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Business Creation')).not.toBeInTheDocument();
  });

  it('shows an error message and retry when the business query fails', () => {
    const refetch = vi.fn();
    vi.mocked(useBusinessContext).mockReturnValue({
      status: 'error',
      businesses: [],
      currentBusiness: null,
      setCurrentBusiness: vi.fn(),
      refetch,
    });

    renderWithRoutes();

    expect(screen.getByText(/could not load your business/i)).toBeInTheDocument();
    expect(screen.queryByText('Gated Content')).not.toBeInTheDocument();

    screen.getByRole('button', { name: /retry/i }).click();
    expect(refetch).toHaveBeenCalled();
  });

  it('redirects to business creation when there is no current business', () => {
    vi.mocked(useBusinessContext).mockReturnValue({
      status: 'ready',
      businesses: [],
      currentBusiness: null,
      setCurrentBusiness: vi.fn(),
      refetch: vi.fn(),
    });

    renderWithRoutes();

    expect(screen.getByText('Business Creation')).toBeInTheDocument();
    expect(screen.queryByText('Gated Content')).not.toBeInTheDocument();
  });

  it('renders the gated content when a current business is loaded', () => {
    renderWithRoutes();

    expect(screen.getByText('Gated Content')).toBeInTheDocument();
    expect(screen.queryByText('Business Creation')).not.toBeInTheDocument();
  });
});

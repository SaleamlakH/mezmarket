import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BusinessContextValue } from '@/providers/business/types';
import type { CatalogService } from '@/providers/catalog/types';
import { BatchLineForm, type BatchLineFormProps } from '../BatchLineForm';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useCatalogService } from '@/providers/catalog/useCatalogService';
import { products, purchasableUnitsByProductId } from '../../__tests__/fixtures';

vi.mock('@/providers/business/useBusinessContext', () => ({
  useBusinessContext: vi.fn(),
}));

vi.mock('@/providers/catalog/useCatalogService', () => ({
  useCatalogService: vi.fn(),
}));

const getProductUnits = vi.fn();

const catalogService = {
  listProducts: vi.fn(),
  getProductUnits,
  getProductUploadUrls: vi.fn(),
} satisfies CatalogService;

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Missing ${what}`);
  return value;
}

const product = must(products[0], 'a product');
const productUnits = must(purchasableUnitsByProductId[product.id], 'units for the product');

function renderForm(overrides: Partial<BatchLineFormProps> = {}) {
  const onSave = vi.fn();
  const onCancel = vi.fn();

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <BatchLineForm
        product={product}
        currency="ETB"
        submitLabel="Add line"
        onSave={onSave}
        onCancel={onCancel}
        {...overrides}
      />
    </QueryClientProvider>,
  );

  return { onSave, onCancel };
}

describe('BatchLineForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBusinessContext).mockReturnValue({
      status: 'ready',
      businesses: [],
      currentBusiness: {
        id: 'b1',
        ownerId: 'owner_1',
        name: 'Test Business',
        currencyCode: 'ETB',
        defaultTaxRate: null,
        taxOnSales: false,
        allowNegativeStock: true,
        lowStockDefaultThreshold: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      setCurrentBusiness: vi.fn(),
      refetch: vi.fn(),
    } satisfies BusinessContextValue);
    vi.mocked(useCatalogService).mockReturnValue(catalogService);
    getProductUnits.mockResolvedValue(productUnits);
  });

  it('lists the purchasable units in the unit selector once they load', async () => {
    renderForm();

    const select = await screen.findByLabelText('Bought in');
    expect(select).toBeEnabled();
    for (const unit of productUnits) {
      expect(screen.getByRole('option', { name: unit.name })).toBeInTheDocument();
    }
    expect(getProductUnits).toHaveBeenCalledTimes(1);
  });

  it('shows an error with a retry that refetches the units', async () => {
    getProductUnits.mockRejectedValue(new Error('network failure'));
    const user = userEvent.setup();
    renderForm();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load units.');
    expect(getProductUnits).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(getProductUnits).toHaveBeenCalledTimes(2);
  });

  it('disables the selector when the product has no purchasable units', async () => {
    getProductUnits.mockResolvedValue([]);
    renderForm();

    const select = await screen.findByLabelText('Bought in');
    expect(select).toBeDisabled();
    expect(screen.getByRole('option', { name: 'No units available' })).toBeInTheDocument();
  });
});

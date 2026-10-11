import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BusinessContextValue } from '@/providers/business/types';
import type { CatalogService } from '@/providers/catalog/types';
import { SaleLineForm, type SaleLineFormProps } from '../SaleLineForm';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useCatalogService } from '@/providers/catalog/useCatalogService';
import { products, sellableUnitsByProductId } from '../../__tests__/fixtures';

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
const productUnits = must(sellableUnitsByProductId[product.id], 'units for the product');

function renderForm(overrides: Partial<SaleLineFormProps> = {}) {
  const onSave = vi.fn();
  const onCancel = vi.fn();

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SaleLineForm
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

describe('SaleLineForm', () => {
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
        taxDisplayMode: 'EXCLUSIVE',
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

  it('lists only the sellable units in the unit selector once they load', async () => {
    renderForm();

    const select = await screen.findByLabelText('Sold in');
    expect(select).toBeEnabled();
    expect(screen.getByRole('option', { name: 'Bottle' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Case (12 bottles)' })).not.toBeInTheDocument();
    expect(getProductUnits).toHaveBeenCalledTimes(1);
  });

  it('shows a loading placeholder instead of the selector while units load', () => {
    getProductUnits.mockReturnValue(new Promise(() => {}));
    renderForm();

    expect(screen.getByRole('status', { name: 'Loading units…' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Sold in')).not.toBeInTheDocument();
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

  it('disables the selector when the product has no sellable units', async () => {
    getProductUnits.mockResolvedValue([must(productUnits[1], 'the non-sellable unit')]);
    renderForm();

    const select = await screen.findByLabelText('Sold in');
    expect(select).toBeDisabled();
    expect(screen.getByRole('option', { name: 'No units available' })).toBeInTheDocument();
  });

  it('shows the unit price once a unit is chosen and the line total once a quantity is typed', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(await screen.findByLabelText('Sold in'), 'unit_tequila_bottle');
    expect(screen.getByText(/850\.00/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Quantity'), '2');
    expect(screen.getByText(/1,?700\.00/)).toBeInTheDocument();
  });
});

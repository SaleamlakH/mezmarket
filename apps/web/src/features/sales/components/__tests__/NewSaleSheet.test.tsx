import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CreateSaleResponse } from '@mez/types';
import type { BusinessContextValue } from '@/providers/business/types';
import type { CatalogService } from '@/providers/catalog/types';
import { NewSaleSheet } from '../NewSaleSheet';
import { salesService } from '../../api/salesService';
import { catalogKeys } from '@/hooks/useCatalogApi';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useCatalogService } from '@/providers/catalog/useCatalogService';
import { products, sale, sellableUnitsByProductId } from '../../__tests__/fixtures';

vi.mock('@/hooks/useCurrency', () => ({ useCurrency: () => 'ETB' }));

vi.mock('../../api/salesService', () => ({
  salesService: {
    getSales: vi.fn(),
    createSale: vi.fn(),
  },
}));

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

beforeAll(() => {
  window.HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
});

describe('NewSaleSheet', () => {
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
    catalogService.listProducts.mockResolvedValue(products);
    catalogService.getProductUploadUrls.mockResolvedValue([]);
    vi.mocked(salesService.createSale).mockResolvedValue(sale as CreateSaleResponse);
    getProductUnits.mockImplementation((_businessId, productId) =>
      Promise.resolve(sellableUnitsByProductId[productId] ?? []),
    );
  });

  const renderSheet = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const onClose = vi.fn();
    const onRecorded = vi.fn();

    render(
      <QueryClientProvider client={client}>
        <NewSaleSheet open onClose={onClose} onRecorded={onRecorded} />
      </QueryClientProvider>,
    );

    return { client, onClose, onRecorded };
  };

  const addTequilaLine = async (user: UserEvent) => {
    await user.click(screen.getByRole('button', { name: /Add line/ }));
    await user.click(await screen.findByRole('button', { name: /Sierra Tequila/ }));
    await user.selectOptions(await screen.findByLabelText('Sold in'), 'unit_tequila_bottle');
    await user.type(screen.getByLabelText('Quantity'), '2');
    await user.click(screen.getByRole('button', { name: 'Add line' }));
  };

  it('shows the form-level error as a banner and does not record when there are no lines', async () => {
    const user = userEvent.setup();
    const { onClose, onRecorded } = renderSheet();

    await user.click(screen.getByRole('button', { name: 'Record sale' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(salesService.createSale).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onRecorded).not.toHaveBeenCalled();
  });

  it('lists a saved line with its unit, unit price and total', async () => {
    const user = userEvent.setup();
    renderSheet();

    await addTequilaLine(user);

    expect(await screen.findByText('Sierra Tequila 350 ml')).toBeInTheDocument();
    expect(screen.getByText('2 Bottle')).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  }, 15_000);

  it('blocks a line with no unit and points the error at the unit selector', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: /Add line/ }));
    await user.click(await screen.findByRole('button', { name: /Sierra Tequila/ }));
    await user.type(screen.getByLabelText('Quantity'), '2');
    await user.click(screen.getByRole('button', { name: 'Add line' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('2 Bottle')).toBeNull();
  }, 15_000);

  it('blocks a line with no quantity', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: /Add line/ }));
    await user.click(await screen.findByRole('button', { name: /Sierra Tequila/ }));
    await user.selectOptions(await screen.findByLabelText('Sold in'), 'unit_tequila_bottle');
    await user.click(screen.getByRole('button', { name: 'Add line' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  }, 15_000);

  it('records a valid sale with its lines and closes the sheet', async () => {
    const user = userEvent.setup();
    const { onClose, onRecorded } = renderSheet();

    await addTequilaLine(user);
    await user.click(screen.getByRole('button', { name: 'Record sale' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRecorded).toHaveBeenCalledTimes(1);
    expect(salesService.createSale).toHaveBeenCalledWith(
      'b1',
      expect.objectContaining({
        lines: [
          expect.objectContaining({
            productId: 'prod_tequila',
            productUnitId: 'unit_tequila_bottle',
            quantity: 2,
          }),
        ],
      }),
    );
  }, 15_000);

  it('shows an error and no confirmation when recording the sale fails', async () => {
    vi.mocked(salesService.createSale).mockRejectedValue(new Error('network failure'));
    const user = userEvent.setup();
    const { onClose, onRecorded } = renderSheet();

    await addTequilaLine(user);
    await user.click(screen.getByRole('button', { name: 'Record sale' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not record the sale');
    expect(alert).toHaveTextContent('Check your connection and try again.');
    expect(onClose).not.toHaveBeenCalled();
    expect(onRecorded).not.toHaveBeenCalled();
  }, 15_000);

  it('shows the loading state while the product list loads', async () => {
    catalogService.listProducts.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: /Add line/ }));

    expect(screen.getByRole('status', { name: 'Loading products…' })).toBeInTheDocument();
  });

  it('shows the error state when the product list fails to load', async () => {
    catalogService.listProducts.mockRejectedValue(new Error('network failure'));
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: /Add line/ }));

    expect(await screen.findByText('Could not load products')).toBeInTheDocument();
  });

  it('shows the loading state for the unit selector while units load', async () => {
    getProductUnits.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: /Add line/ }));
    await user.click(await screen.findByRole('button', { name: /Sierra Tequila/ }));

    expect(screen.getByRole('status', { name: 'Loading units…' })).toBeInTheDocument();
  }, 15_000);

  it('does not request the products until the picker is opened', async () => {
    const user = userEvent.setup();
    renderSheet();

    expect(catalogService.listProducts).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Add line/ }));

    expect(await screen.findByRole('button', { name: /Sierra Tequila/ })).toBeInTheDocument();
    expect(catalogService.listProducts).toHaveBeenCalledTimes(1);
  }, 15_000);

  it('does not request the units until the line form is opened', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: /Add line/ }));
    await screen.findByRole('button', { name: /Sierra Tequila/ });

    expect(getProductUnits).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Sierra Tequila/ }));

    expect(await screen.findByLabelText('Sold in')).toBeInTheDocument();
    expect(getProductUnits).toHaveBeenCalledTimes(1);
  }, 15_000);

  it('expires the product and unit caches when the sheet closes', async () => {
    const { client, onClose } = renderSheet();
    const user = userEvent.setup();

    await addTequilaLine(user);
    expect(client.getQueryData(catalogKeys.products('b1'))).toBeDefined();
    expect(client.getQueryData(catalogKeys.productUnits('b1', 'prod_tequila'))).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(catalogKeys.products('b1'))).toBeUndefined();
    expect(client.getQueryData(catalogKeys.productUnits('b1', 'prod_tequila'))).toBeUndefined();
  }, 15_000);
});

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { StockBatchDetailResponse } from '@mez/types';
import type { BusinessContextValue } from '@/providers/business/types';
import type { CatalogService } from '@/providers/catalog/types';
import { AddBatchSheet } from '../AddBatchSheet';
import { inventoryService } from '../../api/inventoryService';
import { catalogKeys } from '@/hooks/useCatalogApi';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useCatalogService } from '@/providers/catalog/useCatalogService';
import { batches, products, purchasableUnitsByProductId } from '../../__tests__/fixtures';

vi.mock('../../api/inventoryService', () => ({
  inventoryService: {
    getBatches: vi.fn(),
    getInventoryProducts: vi.fn(),
    createBatch: vi.fn(),
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

vi.mock('@/hooks/useCurrency', () => ({ useCurrency: () => 'ETB' }));

beforeAll(() => {
  window.HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
});

describe('AddBatchSheet', () => {
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
    catalogService.listProducts.mockResolvedValue(products);
    catalogService.getProductUploadUrls.mockResolvedValue([]);
    vi.mocked(inventoryService.createBatch).mockResolvedValue(
      batches[0] as StockBatchDetailResponse,
    );
    getProductUnits.mockImplementation((_businessId, productId) =>
      Promise.resolve(purchasableUnitsByProductId[productId] ?? []),
    );
  });

  const renderSheet = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const onClose = vi.fn();

    render(
      <QueryClientProvider client={client}>
        <AddBatchSheet open onClose={onClose} />
      </QueryClientProvider>,
    );

    return { client, onClose };
  };

  const addTequilaLine = async (user: UserEvent) => {
    await user.click(screen.getByRole('button', { name: /Add product line/ }));
    await user.click(await screen.findByRole('button', { name: /Sierra Tequila/ }));
    await user.selectOptions(await screen.findByLabelText('Bought in'), 'unit_tequila_bottle');
    await user.type(screen.getByLabelText('Quantity'), '2');
    await user.type(screen.getByLabelText('Unit cost'), '10.5');
    await user.click(screen.getByRole('button', { name: 'Add line' }));
  };

  it('shows an error and does not confirm when the batch has no product lines', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: 'Confirm batch' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one product line');
    expect(screen.queryByText('Batch recorded')).toBeNull();
    expect(inventoryService.createBatch).not.toHaveBeenCalled();
  });

  it('shows an error and does not confirm when the batch date is cleared', async () => {
    const user = userEvent.setup();
    renderSheet();

    fireEvent.change(screen.getByLabelText('Batch date'), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: 'Confirm batch' }));

    expect(await screen.findByText('Batch date is required')).toBeInTheDocument();
    expect(screen.queryByText('Batch recorded')).toBeNull();
  });

  it('lists a saved product line on the batch with its total and unit name', async () => {
    const user = userEvent.setup();
    renderSheet();

    await addTequilaLine(user);

    expect(await screen.findByText('Sierra Tequila 350 ml')).toBeInTheDocument();
    expect(screen.getByText('2 Bottle')).toBeInTheDocument();
    expect(screen.getByText('Batch total')).toBeInTheDocument();
    expect(getProductUnits).toHaveBeenCalledTimes(1);
  }, 15_000);

  it('reuses the cached units when a saved line is edited again', async () => {
    const user = userEvent.setup();
    renderSheet();

    await addTequilaLine(user);
    expect(getProductUnits).toHaveBeenCalledTimes(1);

    await user.click(await screen.findByRole('button', { name: /^Sierra Tequila/ }));

    expect(await screen.findByLabelText('Bought in')).toHaveValue('unit_tequila_bottle');
    expect(getProductUnits).toHaveBeenCalledTimes(1);
  }, 15_000);

  it('confirms a batch and closes the sheet', async () => {
    const user = userEvent.setup();
    const { onClose } = renderSheet();

    await addTequilaLine(user);
    await user.click(screen.getByRole('button', { name: 'Confirm batch' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(inventoryService.createBatch).toHaveBeenCalledTimes(1);
    expect(inventoryService.createBatch).toHaveBeenCalledWith(
      'b1',
      expect.objectContaining({ lines: [expect.objectContaining({ productId: 'prod_tequila' })] }),
    );
  }, 15_000);

  it('shows an error and no confirmation when recording the batch fails', async () => {
    vi.mocked(inventoryService.createBatch).mockRejectedValue(new Error('network failure'));
    const user = userEvent.setup();
    renderSheet();

    await addTequilaLine(user);
    await user.click(screen.getByRole('button', { name: 'Confirm batch' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not record the batch');
    expect(alert).toHaveTextContent('Check your connection and try again.');
    expect(screen.queryByText('Batch recorded')).toBeNull();
  }, 15_000);

  it('does not request the products until the picker is opened', async () => {
    const user = userEvent.setup();
    renderSheet();

    expect(catalogService.listProducts).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Add product line/ }));

    expect(await screen.findByRole('button', { name: /Sierra Tequila/ })).toBeInTheDocument();
    expect(catalogService.listProducts).toHaveBeenCalledTimes(1);
  }, 15_000);

  it('does not request the units until the line form is opened', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole('button', { name: /Add product line/ }));
    await screen.findByRole('button', { name: /Sierra Tequila/ });

    expect(getProductUnits).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Sierra Tequila/ }));

    expect(await screen.findByLabelText('Bought in')).toBeInTheDocument();
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

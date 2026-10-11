import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BusinessContextValue } from '@/providers/business/types';
import type { CatalogService } from '@/providers/catalog/types';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { useCatalogService } from '@/providers/catalog/useCatalogService';
import { NewSaleSheet } from '../NewSaleSheet';

vi.mock('@/hooks/useCurrency', () => ({ useCurrency: () => 'ETB' }));

vi.mock('@/providers/business/useBusinessContext', () => ({
  useBusinessContext: vi.fn(),
}));

vi.mock('@/providers/catalog/useCatalogService', () => ({
  useCatalogService: vi.fn(),
}));

const catalogService = {
  listProducts: vi.fn(),
  getProductUnits: vi.fn(),
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
    catalogService.getProductUploadUrls.mockResolvedValue([]);
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

  it('records a valid sale and closes the sheet', async () => {
    const user = userEvent.setup();
    const { onClose, onRecorded } = renderSheet();

    await addTequilaLine(user);
    await user.click(screen.getByRole('button', { name: 'Record sale' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRecorded).toHaveBeenCalledTimes(1);
  }, 15_000);
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BusinessResponse } from '@mez/types';
import { BusinessEditForm } from '../BusinessEditForm';
import { businessService } from '@/features/business/api/businessService';

vi.mock('@/features/business/api/businessService', () => ({
  businessService: {
    listBusinesses: vi.fn(),
    createBusiness: vi.fn(),
    getBusiness: vi.fn(),
    updateBusiness: vi.fn(),
  },
}));

function business(): BusinessResponse {
  return {
    id: 'b-1',
    ownerId: 'o-1',
    name: 'Selam Mart',
    currencyCode: 'ETB',
    defaultTaxRate: 15,
    taxOnSales: false,
    allowNegativeStock: true,
    lowStockDefaultThreshold: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('BusinessEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = (
    props: {
      business?: BusinessResponse;
      onCancel?: () => void;
      onSaved?: (updated: BusinessResponse) => void;
    } = {},
  ) =>
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <BusinessEditForm
          business={props.business ?? business()}
          onCancel={props.onCancel ?? vi.fn()}
          onSaved={props.onSaved ?? vi.fn()}
        />
      </QueryClientProvider>,
    );

  it('pre-fills fields with the current business values', () => {
    renderForm();

    expect(screen.getByLabelText('Name')).toHaveValue('Selam Mart');
    expect(screen.getByLabelText('Currency')).toHaveValue('ETB');
    expect(screen.getByLabelText('Currency')).toHaveAttribute('maxlength', '3');
    expect(screen.getByLabelText(/default tax rate/i)).toHaveValue(15);
    expect(screen.getByRole('switch', { name: /tax on sales/i })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: /allow sales beyond stock/i })).toBeChecked();
    expect(screen.getByLabelText('Low-stock alert')).toHaveValue(10);
  });

  it('shows Save disabled until a value changes', async () => {
    const user = userEvent.setup();
    renderForm();

    const save = screen.getByRole('button', { name: /save/i });
    expect(save).toBeDisabled();

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Selam Mart 2');

    expect(save).toBeEnabled();
  });

  it('submits the updated fields and calls onSaved with the updated business', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const updated = { ...business(), name: 'Selam Mart 2' };
    vi.mocked(businessService.updateBusiness).mockResolvedValue(updated as never);
    renderForm({ onSaved });

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Selam Mart 2');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(businessService.updateBusiness).toHaveBeenCalledWith(
        'b-1',
        expect.objectContaining({ name: 'Selam Mart 2' }),
      ),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
  });

  it('submits the allowNegativeStock toggle value', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    vi.mocked(businessService.updateBusiness).mockResolvedValue(business() as never);
    renderForm({ onSaved });

    const toggle = screen.getByRole('switch', { name: /allow sales beyond stock/i });
    await user.click(toggle);

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(businessService.updateBusiness).toHaveBeenCalledWith(
        'b-1',
        expect.objectContaining({ allowNegativeStock: false }),
      ),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('submits taxOnSales when the tax toggle is turned on', async () => {
    const user = userEvent.setup();
    vi.mocked(businessService.updateBusiness).mockResolvedValue(business() as never);
    renderForm();

    await user.click(screen.getByRole('switch', { name: /tax on sales/i }));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(businessService.updateBusiness).toHaveBeenCalledWith(
        'b-1',
        expect.objectContaining({ taxOnSales: true, defaultTaxRate: 15 }),
      ),
    );
  });

  it('calls onCancel and does not submit when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderForm({ onCancel });

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Something else');

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(businessService.updateBusiness).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows an error message when the update fails', async () => {
    const user = userEvent.setup();
    vi.mocked(businessService.updateBusiness).mockRejectedValue(
      new Error('Failed to save') as never,
    );
    renderForm();

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Selam Mart 3');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/failed to save/i)).toBeInTheDocument();
  });

  it('shows a validation error for an invalid currency code', async () => {
    const user = userEvent.setup();
    renderForm();

    const currencyInput = screen.getByLabelText('Currency');
    await user.clear(currencyInput);
    await user.type(currencyInput, 'X');

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText('Enter a valid 3-letter ISO currency code')).toBeInTheDocument();
  });
});

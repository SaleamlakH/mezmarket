import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNavigate, MemoryRouter } from 'react-router';
import { CreateBusinessPage } from '../CreateBusinessPage';
import { businessService } from '@/features/business/api/businessService';
import { useBusinessContext } from '@/providers/business/useBusinessContext';

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useNavigate: vi.fn() };
});

vi.mock('@/features/business/api/businessService', () => ({
  businessService: { listBusinesses: vi.fn(), createBusiness: vi.fn() },
}));

vi.mock('@/providers/business/useBusinessContext', () => ({
  useBusinessContext: vi.fn(),
}));

describe('CreateBusinessPage', () => {
  const mockNavigate = vi.fn();
  const mockSetCurrentBusiness = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useBusinessContext).mockReturnValue({
      setCurrentBusiness: mockSetCurrentBusiness,
    } as unknown as ReturnType<typeof useBusinessContext>);
    vi.mocked(businessService.createBusiness).mockResolvedValue({
      business: { id: 'b-1' },
    } as never);
  });

  const renderPage = () =>
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <CreateBusinessPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it('renders only the required fields and hides optional settings by default', () => {
    renderPage();

    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create business/i })).toBeInTheDocument();

    expect(screen.queryByLabelText(/default tax rate/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /tax on sales/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/low stock threshold/i)).not.toBeInTheDocument();
  });

  it('reveals optional fields when "Optional settings" is toggled', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /optional settings/i }));

    expect(screen.getByLabelText(/default tax rate/i)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /tax on sales/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/low stock threshold/i)).toBeInTheDocument();
  });

  it('shows a validation error and does not submit on invalid input', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/currency/i), 'X');
    await user.click(screen.getByRole('button', { name: /create business/i }));

    expect(await screen.findByText(/business name is required/i)).toBeInTheDocument();
    expect(businessService.createBusiness).not.toHaveBeenCalled();
  });

  it('requires a tax rate when tax on sales is turned on', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/business name/i), 'Selam Mart');
    await user.type(screen.getByLabelText(/currency/i), 'ETB');
    await user.click(screen.getByRole('button', { name: /optional settings/i }));
    await user.click(screen.getByRole('switch', { name: /tax on sales/i }));
    await user.click(screen.getByRole('button', { name: /create business/i }));

    expect(await screen.findByText('Tax Rate is required if added to sales')).toBeInTheDocument();
    expect(businessService.createBusiness).not.toHaveBeenCalled();
  });

  it('submits the tax rate and taxOnSales toggle together', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/business name/i), 'Selam Mart');
    await user.type(screen.getByLabelText(/currency/i), 'ETB');
    await user.click(screen.getByRole('button', { name: /optional settings/i }));
    await user.type(screen.getByLabelText(/default tax rate/i), '15');
    await user.click(screen.getByRole('switch', { name: /tax on sales/i }));
    await user.click(screen.getByRole('button', { name: /create business/i }));

    await waitFor(() =>
      expect(businessService.createBusiness).toHaveBeenCalledWith(
        expect.objectContaining({ defaultTaxRate: 15, taxOnSales: true }),
      ),
    );
  });

  it('submits transformed values, sets the new business, and navigates to the dashboard on success', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/business name/i), 'Selam Mart');
    await user.type(screen.getByLabelText(/currency/i), 'etb');
    await user.click(screen.getByRole('button', { name: /create business/i }));

    await waitFor(() =>
      expect(businessService.createBusiness).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Selam Mart', currencyCode: 'ETB' }),
      ),
    );

    await waitFor(() => expect(mockSetCurrentBusiness).toHaveBeenCalledWith('b-1'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
  });

  it('shows a form-level error when creation fails and does not navigate', async () => {
    vi.mocked(businessService.createBusiness).mockRejectedValue(new Error('Something went wrong'));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/business name/i), 'Selam Mart');
    await user.type(screen.getByLabelText(/currency/i), 'ETB');
    await user.click(screen.getByRole('button', { name: /create business/i }));

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { AddBatchSheet } from '../AddBatchSheet';

vi.mock('../../hooks/useCurrency', () => ({ useCurrency: () => 'ETB' }));

beforeAll(() => {
  window.HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
});

describe('AddBatchSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSheet = () => render(<AddBatchSheet open onClose={vi.fn()} />);

  const addTequilaLine = async (user: UserEvent) => {
    await user.click(screen.getByRole('button', { name: /Add product line/ }));
    await user.click(screen.getByRole('button', { name: /Sierra Tequila/ }));
    await user.selectOptions(screen.getByLabelText('Bought in'), 'unit_tequila_bottle');
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
  });

  it('shows an error and does not confirm when the batch date is cleared', async () => {
    const user = userEvent.setup();
    renderSheet();

    fireEvent.change(screen.getByLabelText('Batch date'), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: 'Confirm batch' }));

    expect(await screen.findByText('Batch date is required')).toBeInTheDocument();
    expect(screen.queryByText('Batch recorded')).toBeNull();
  });

  it('lists a saved product line on the batch with its total', async () => {
    const user = userEvent.setup();
    renderSheet();

    await addTequilaLine(user);

    expect(await screen.findByText('Sierra Tequila 350 ml')).toBeInTheDocument();
    expect(screen.getByText('Batch total')).toBeInTheDocument();
  }, 15_000);

  it('confirms a batch that has a product line and shows the confirmation', async () => {
    const user = userEvent.setup();
    renderSheet();

    await addTequilaLine(user);
    await user.click(screen.getByRole('button', { name: 'Confirm batch' }));

    expect(screen.getByText('Batch recorded')).toBeInTheDocument();
  }, 15_000);
});

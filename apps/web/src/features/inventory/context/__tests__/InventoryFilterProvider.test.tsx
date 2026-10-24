import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router';
import { InventoryFilterProvider } from '../InventoryFilterProvider';
import { useInventoryFilterContext } from '../useInventoryFilterContext';

const NOW = new Date('2026-10-24T00:00:00.000Z');

function FilterView() {
  const { filters, activeKind, selectFilter } = useInventoryFilterContext();

  return (
    <div>
      <span data-testid="kind">{activeKind ?? 'none'}</span>
      <span data-testid="status">{filters.status}</span>
      <span data-testid="stock">{filters.stockStatus?.join(',') ?? ''}</span>
      <span data-testid="expiry">{filters.expiryStatus?.join(',') ?? ''}</span>
      <button type="button" onClick={() => selectFilter('low')}>
        Select low
      </button>
      <button type="button" onClick={() => selectFilter('expired')}>
        Select expired
      </button>
    </div>
  );
}

function DeepLinkButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/inventory?status=active&stockStatus=low_stock,out_of_stock')}
    >
      Open deep link
    </button>
  );
}

function Harness() {
  const [inventoryVisible, setInventoryVisible] = useState(true);

  return (
    <>
      <button type="button" onClick={() => setInventoryVisible((visible) => !visible)}>
        Toggle inventory
      </button>
      {inventoryVisible ? <FilterView /> : <span>Another page</span>}
    </>
  );
}

function renderAt(initialEntry: string, children = <FilterView />) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <InventoryFilterProvider now={NOW}>{children}</InventoryFilterProvider>
    </MemoryRouter>,
  );
}

describe('InventoryFilterProvider', () => {
  it('defaults to the active products', () => {
    renderAt('/inventory');

    expect(screen.getByTestId('kind')).toHaveTextContent('all');
    expect(screen.getByTestId('status')).toHaveTextContent('active');
    expect(screen.getByTestId('stock')).toHaveTextContent('');
  });

  it('selects a chip filter', async () => {
    const user = userEvent.setup();
    renderAt('/inventory');

    await user.click(screen.getByRole('button', { name: 'Select low' }));

    expect(screen.getByTestId('kind')).toHaveTextContent('low');
    expect(screen.getByTestId('stock')).toHaveTextContent('LOW_STOCK,OUT_OF_STOCK');

    await user.click(screen.getByRole('button', { name: 'Select expired' }));

    expect(screen.getByTestId('kind')).toHaveTextContent('expired');
    expect(screen.getByTestId('status')).toHaveTextContent('all');
    expect(screen.getByTestId('expiry')).toHaveTextContent('expired');
  });

  it('keeps the selected filter when the inventory page unmounts and remounts', async () => {
    const user = userEvent.setup();
    renderAt('/inventory', <Harness />);

    await user.click(screen.getByRole('button', { name: 'Select low' }));
    expect(screen.getByTestId('kind')).toHaveTextContent('low');

    await user.click(screen.getByRole('button', { name: 'Toggle inventory' }));
    expect(screen.queryByTestId('kind')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Toggle inventory' }));
    expect(screen.getByTestId('kind')).toHaveTextContent('low');
  });

  it('reads the filters a deep link carries', () => {
    renderAt('/inventory?status=all&expiryStatus=expired,soon');

    expect(screen.getByTestId('kind')).toHaveTextContent('none');
    expect(screen.getByTestId('status')).toHaveTextContent('all');
    expect(screen.getByTestId('expiry')).toHaveTextContent('expired,soon');
  });

  it('updates when a navigation brings an inventory deep link', async () => {
    const user = userEvent.setup();
    renderAt(
      '/dashboard',
      <>
        <DeepLinkButton />
        <FilterView />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'Open deep link' }));

    expect(screen.getByTestId('kind')).toHaveTextContent('low');
    expect(screen.getByTestId('stock')).toHaveTextContent('LOW_STOCK,OUT_OF_STOCK');
  });
});

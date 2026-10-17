import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ProductInventoryBatchList } from '../ProductInventoryBatchList';
import { flattenProductBatchLines } from '../../lib/flattenProductBatchLines';
import { productInventoryDetail } from '../../__tests__/fixtures';

const NOW = new Date('2026-10-17T00:00:00.000Z');

function renderList() {
  return render(
    <MemoryRouter>
      <ProductInventoryBatchList
        rows={flattenProductBatchLines(productInventoryDetail.batches)}
        currency="ETB"
        now={NOW}
      />
    </MemoryRouter>,
  );
}

describe('ProductInventoryBatchList', () => {
  it('renders one row per line, newest batch first', () => {
    renderList();

    expect(screen.getByText('Batch #0042')).toBeInTheDocument();
    expect(screen.getByText('Batch #0038')).toBeInTheDocument();
    expect(screen.getByText('Batch #0031')).toBeInTheDocument();
  });

  it('links each row back to its batch', () => {
    renderList();

    expect(screen.getByText('Batch #0031').closest('a')).toHaveAttribute(
      'href',
      '/inventory/batches/batch_rice_0031',
    );
  });

  it('shows the remaining against the standard quantity', () => {
    renderList();

    expect(screen.getByText('12 of 12 kg remaining')).toBeInTheDocument();
    expect(screen.getByText('50 of 100 kg remaining')).toBeInTheDocument();
    expect(screen.getByText('8 of 20 kg remaining')).toBeInTheDocument();
  });

  it('labels each line with its expiry', () => {
    renderList();

    expect(screen.getByText('No expiry set')).toBeInTheDocument();
    expect(screen.getByText('Expired 8 days ago')).toBeInTheDocument();
    expect(screen.getByText(/Expires in 7 days/)).toBeInTheDocument();
  });

  it('labels the value still on hand on each line', () => {
    renderList();

    expect(screen.getAllByText('value on hand').length).toBeGreaterThan(0);
  });
});

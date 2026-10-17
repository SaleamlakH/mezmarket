import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductInventoryExpiryAlert } from '../ProductInventoryExpiryAlert';

function renderAlert(expiredQuantity: number, soonQuantity: number) {
  return render(
    <ProductInventoryExpiryAlert totals={{ expiredQuantity, soonQuantity }} baseUnitLabel="kg" />,
  );
}

describe('ProductInventoryExpiryAlert', () => {
  it('names both quantities when some are expired and some are expiring soon', () => {
    renderAlert(8, 50);

    expect(
      screen.getByText('8 kg is expired and 50 kg expires within 7 days.'),
    ).toBeInTheDocument();
  });

  it('says only the expired part when nothing is expiring soon', () => {
    renderAlert(8, 0);

    expect(screen.getByText('8 kg is expired.')).toBeInTheDocument();
  });

  it('says only the soon part when nothing has expired', () => {
    renderAlert(0, 50);

    expect(screen.getByText('50 kg expires within 7 days.')).toBeInTheDocument();
  });

  it('renders nothing when all stock is fine', () => {
    const { container } = renderAlert(0, 0);

    expect(container).toBeEmptyDOMElement();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductInventoryMetrics } from '../ProductInventoryMetrics';
import { productInventoryDetail } from '../../__tests__/fixtures';

function renderMetrics(expiringSoonCount: number) {
  return render(
    <ProductInventoryMetrics
      product={productInventoryDetail}
      currency="ETB"
      expiringSoonCount={expiringSoonCount}
    />,
  );
}

describe('ProductInventoryMetrics', () => {
  it('shows the four headline numbers', () => {
    renderMetrics(1);

    expect(screen.getByText('On hand')).toBeInTheDocument();
    expect(screen.getByText('Stock value')).toBeInTheDocument();
    expect(screen.getByText('Avg cost/Kilogram')).toBeInTheDocument();
    expect(screen.getByText('Expiring soon')).toBeInTheDocument();
  });

  it('counts the lots expiring soon', () => {
    renderMetrics(2);

    expect(screen.getByText('2 lots')).toBeInTheDocument();
  });

  it('says none when no lot is expiring soon', () => {
    renderMetrics(0);

    expect(screen.getByText('None')).toBeInTheDocument();
  });
});

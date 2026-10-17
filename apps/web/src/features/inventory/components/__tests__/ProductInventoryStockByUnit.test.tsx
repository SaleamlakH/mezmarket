import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductInventoryStockByUnit } from '../ProductInventoryStockByUnit';
import { flattenProductBatchLines } from '../../lib/flattenProductBatchLines';
import { groupLinesByUnit } from '../../lib/groupLinesByUnit';
import { productInventoryDetail } from '../../__tests__/fixtures';

function renderStockByUnit() {
  const groups = groupLinesByUnit(flattenProductBatchLines(productInventoryDetail.batches));
  return render(<ProductInventoryStockByUnit groups={groups} baseUnitLabel="Kilogram" />);
}

describe('ProductInventoryStockByUnit', () => {
  it('lists each unit the stock was bought in, with its remaining quantity', () => {
    renderStockByUnit();

    expect(screen.getByText('Kilogram')).toBeInTheDocument();
    expect(screen.getByText('Sack')).toBeInTheDocument();
    expect(screen.getByText('20 kg')).toBeInTheDocument();
    expect(screen.getByText('50 kg')).toBeInTheDocument();
  });

  it('names the base equivalent of a non-base unit', () => {
    renderStockByUnit();

    expect(screen.getByText('(50 kg)')).toBeInTheDocument();
  });

  it('renders nothing without any stock to show', () => {
    const { container } = render(
      <ProductInventoryStockByUnit groups={[]} baseUnitLabel="Kilogram" />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

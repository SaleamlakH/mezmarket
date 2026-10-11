import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { SaleLineFormValues } from '@mez/types';
import { useSaleLineList } from '../useSaleLineList';
import { products, sellableUnitsByProductId } from '../../__tests__/fixtures';

const tequilaLine: SaleLineFormValues = {
  productId: 'prod_tequila',
  productUnitId: 'unit_tequila_bottle',
  quantity: '2',
};

const oilLine: SaleLineFormValues = {
  productId: 'prod_oil',
  productUnitId: 'unit_oil_liter',
  quantity: '3',
};

describe('useSaleLineList', () => {
  it('joins each line to its product, unit, unit price and total', () => {
    const { result } = renderHook(() => useSaleLineList([tequilaLine, oilLine]));
    const [first, second] = result.current.rows;

    expect(first?.product?.name).toBe('Sierra Tequila 350 ml');
    expect(first?.unit?.name).toBe('Bottle');
    expect(first?.unitPrice).toBe(850);
    expect(first?.total).toBe(1700);

    expect(second?.unit?.name).toBe('Liter');
    expect(second?.unitPrice).toBe(85);
    expect(second?.total).toBe(255);
  });

  it('leaves a line with an unknown product or unit unresolved', () => {
    const unknown: SaleLineFormValues = {
      productId: 'prod_missing',
      productUnitId: 'unit_missing',
      quantity: '1',
    };

    const { result } = renderHook(() => useSaleLineList([unknown]));
    const row = result.current.rows[0];

    expect(row?.product).toBeUndefined();
    expect(row?.unit).toBeUndefined();
    expect(row?.unitPrice).toBeNull();
    expect(row?.total).toBeNull();
  });

  it('exposes the catalog and the units of only the referenced products', () => {
    const { result } = renderHook(() => useSaleLineList([tequilaLine]));

    expect(result.current.products).toEqual(products);
    expect(Object.keys(result.current.unitsByProductId)).toEqual(['prod_tequila']);
    expect(result.current.unitsByProductId['prod_tequila']).toEqual(
      sellableUnitsByProductId['prod_tequila'],
    );
  });

  it('recomputes when the lines change', () => {
    const { result, rerender } = renderHook(({ lines }) => useSaleLineList(lines), {
      initialProps: { lines: [tequilaLine] as SaleLineFormValues[] },
    });
    expect(result.current.rows).toHaveLength(1);

    rerender({ lines: [tequilaLine, oilLine] as SaleLineFormValues[] });

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows[1]?.total).toBe(255);
  });
});

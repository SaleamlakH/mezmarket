import { describe, it, expect } from 'vitest';
import type { SaleDraftLine } from '../../state/saleDraft';
import { buildCartItems, buildCartItem, toCartItemLine } from '../saleDraftView';

function line(overrides: Partial<SaleDraftLine> & Pick<SaleDraftLine, 'id'>): SaleDraftLine {
  return {
    productId: 'prod_tequila',
    productUnitId: 'unit_tequila_bottle',
    quantity: 1,
    ...overrides,
  };
}

describe('toCartItemLine', () => {
  it('joins a line with its unit and amount', () => {
    const view = toCartItemLine(line({ id: 'l1', quantity: 2 }));

    expect(view.unit?.name).toBe('Bottle');
    expect(view.unitPrice).toBe(850);
    expect(view.lineTotal).toBe(1700);
  });

  it('carries a null amount when the unit is unknown or priceless', () => {
    const missing = toCartItemLine(line({ id: 'l2', productUnitId: 'unit_missing' }));
    expect(missing.unit).toBeUndefined();
    expect(missing.unitPrice).toBeNull();
    expect(missing.lineTotal).toBeNull();
  });
});

describe('buildCartItem', () => {
  it('keeps only committed lines and totals them', () => {
    const item = buildCartItem(
      [
        line({ id: 'l1', quantity: 2 }),
        line({ id: 'l2', productUnitId: 'unit_tequila_glass', quantity: 1 }),
        line({ id: 'l3', quantity: 0 }),
      ],
      'prod_tequila',
    );

    expect(item.lines.map((entry) => entry.line.id)).toEqual(['l1', 'l2']);
    expect(item.total).toBe(1790);
  });

  it('treats an unpriced unit as contributing nothing', () => {
    const item = buildCartItem(
      [line({ id: 'l1', productUnitId: 'unit_missing', quantity: 4 })],
      'prod_tequila',
    );

    expect(item.lines[0]?.lineTotal).toBeNull();
    expect(item.total).toBe(0);
  });
});

describe('buildCartItems', () => {
  it('groups committed lines by product in first-seen order, skipping empty ones', () => {
    const items = buildCartItems([
      line({ id: 'l1', quantity: 2 }),
      line({ id: 'l2', productId: 'prod_oil', productUnitId: 'unit_oil_bottle', quantity: 1 }),
      line({ id: 'l3', productUnitId: 'unit_tequila_glass', quantity: 1 }),
      line({ id: 'l4', productId: 'prod_water', productUnitId: 'unit_water_bottle', quantity: 0 }),
    ]);

    expect(items.map((item) => item.productId)).toEqual(['prod_tequila', 'prod_oil']);
    expect(items[0]?.total).toBe(1790);
    expect(items[1]?.total).toBe(400);
    expect(items[0]?.product?.name).toBe('Sierra Tequila 350 ml');
  });

  it('is empty when no line is committed', () => {
    expect(buildCartItems([line({ id: 'l1', quantity: 0 })])).toEqual([]);
  });
});

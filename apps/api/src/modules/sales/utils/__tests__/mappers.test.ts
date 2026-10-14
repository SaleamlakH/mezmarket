import { describe, it, expect } from 'vitest';
import type { SaleRecordSummary, SaleRecordWithDetail } from '../../sales.types.js';
import type { Prisma } from '../../../../../generated/prisma/client.js';
import { toSaleDetail, toSaleSummary } from '../mappers.js';

/** Stands in for a `Decimal` column: the mappers only ever call toNumber. */
function decimal(value: number): Prisma.Decimal {
  return { toNumber: () => value } as unknown as Prisma.Decimal;
}

function saleLine() {
  return {
    id: 'sl-1',
    saleId: 'sale-1',
    productId: 'p-tequila',
    productName: 'Sierra Tequila 350 ml',
    productUnitId: 'pu-bottle',
    soldUnit: 'Bottle',
    quantity: decimal(2),
    standardUnit: 'pc',
    quantityInStandardUnit: decimal(2),
    resolvedStandardUnitId: 'su-pc',
    unitPrice: decimal(950),
    containerId: null,
    refunded: false,
    refundRestocked: false,
    createdAt: new Date('2026-02-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T10:00:00.000Z'),
  };
}

function saleRecord(overrides: Partial<SaleRecordWithDetail> = {}): SaleRecordWithDetail {
  return {
    id: 'sale-1',
    businessId: 'b-1',
    branchId: 'br-1',
    invoiceNumber: '1',
    processedByMemberId: 'm-1',
    serverMemberId: null,
    customerId: null,
    saleDatetime: new Date('2026-02-01T09:00:00.000Z'),
    discount: decimal(50),
    taxRateApplied: decimal(0.15),
    subtotal: decimal(1900),
    taxAmount: decimal(285),
    total: decimal(2185),
    paymentStatus: 'PENDING',
    amountPaid: decimal(0),
    balanceDue: decimal(2185),
    voidStatus: 'NONE',
    voidReason: null,
    createdAt: new Date('2026-02-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T10:00:00.000Z'),
    lines: [{ ...saleLine(), product: { brand: 'Sierra' } }],
    payments: [
      {
        id: 'pay-1',
        saleId: 'sale-1',
        amount: decimal(500),
        paidAt: new Date('2026-02-01T10:00:00.000Z'),
        businessMemberId: 'm-1',
        method: 'CASH',
        methodDetail: null,
        createdAt: new Date('2026-02-01T10:00:00.000Z'),
      },
    ],
    processedByMember: { id: 'm-1', name: 'me', role: 'OWNER' },
    serverMember: null,
    customer: null,
    ...overrides,
  };
}

function saleSummary(overrides: Partial<SaleRecordSummary> = {}): SaleRecordSummary {
  return {
    id: 'sale-1',
    businessId: 'b-1',
    branchId: 'br-1',
    invoiceNumber: '1',
    processedByMemberId: 'm-1',
    serverMemberId: null,
    customerId: null,
    saleDatetime: new Date('2026-02-01T09:00:00.000Z'),
    discount: null,
    taxRateApplied: decimal(0.15),
    subtotal: decimal(1900),
    taxAmount: decimal(285),
    total: decimal(2185),
    paymentStatus: 'PENDING',
    amountPaid: decimal(0),
    balanceDue: decimal(2185),
    voidStatus: 'NONE',
    voidReason: null,
    createdAt: new Date('2026-02-01T10:00:00.000Z'),
    updatedAt: new Date('2026-02-01T10:00:00.000Z'),
    lines: [saleLine()],
    processedByMember: { id: 'm-1', name: 'me', role: 'OWNER' },
    serverMember: null,
    customer: null,
    ...overrides,
  };
}

describe('toSaleDetail', () => {
  it('flattens decimals and relations into the wire detail', () => {
    const detail = toSaleDetail(saleRecord());

    expect(detail).toMatchObject({
      id: 'sale-1',
      discount: 50,
      subtotal: 1900,
      taxAmount: 285,
      total: 2185,
      amountPaid: 0,
      balanceDue: 2185,
      processedBy: { id: 'm-1', name: 'me', role: 'OWNER' },
      servedBy: null,
      customer: null,
    });
    expect(detail.lines[0]).toMatchObject({
      quantity: 2,
      quantityInStandardUnit: 2,
      unitPrice: 950,
      productBrand: 'Sierra',
    });
    expect(detail.payments[0]).toMatchObject({ amount: 500, method: 'CASH' });
  });

  it('carries a null discount through', () => {
    expect(toSaleDetail(saleRecord({ discount: null })).discount).toBeNull();
  });
});

describe('toSaleSummary', () => {
  it('maps a stored sale to a history row without lines or payments', () => {
    const [row] = [toSaleSummary(saleSummary())];

    expect(row).toMatchObject({
      id: 'sale-1',
      invoiceNumber: '1',
      total: 2185,
      paymentStatus: 'PENDING',
      voidStatus: 'NONE',
      itemCount: 1,
      productNames: ['Sierra Tequila 350 ml'],
      processedBy: { id: 'm-1', name: 'me', role: 'OWNER' },
    });
    expect(row).not.toHaveProperty('lines');
    expect(row).not.toHaveProperty('payments');
  });

  it('counts every line but names each product once', () => {
    const base = saleLine();
    const row = toSaleSummary(
      saleSummary({
        lines: [
          { ...base, id: 'sl-1' },
          { ...base, id: 'sl-2', productName: 'Cooking Oil 5 L' },
          { ...base, id: 'sl-3', productUnitId: 'pu-case' },
        ],
      }),
    );

    expect(row.itemCount).toBe(3);
    expect(row.productNames).toEqual(['Sierra Tequila 350 ml', 'Cooking Oil 5 L']);
  });
});

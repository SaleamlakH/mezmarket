import { describe, it, expect, expectTypeOf } from 'vitest';
import type { input, output } from 'zod';
import type {
  CreateSaleInput,
  CreateSaleLineInput,
  PaymentFormValues,
  PaymentMethod,
  RecordPaymentInput,
  RefundSaleFormValues,
  RefundSaleInput,
  RefundSaleLineFormValues,
  RefundSaleLineInput,
  SaleFormValues,
  SaleLineFormValues,
  UpdateSaleFormValues,
  UpdateSaleInput,
  UpdateSaleLineFormValues,
  UpdateSaleLineInput,
  VoidSaleInput,
} from '@mez/types';
import {
  createSaleLineSchema,
  createSaleSchema,
  recordPaymentSchema,
  refundSaleLineSchema,
  refundSaleSchema,
  updateSaleLineSchema,
  updateSaleSchema,
  voidSaleSchema,
} from '../schema/sales.schema.js';
import {
  validateCreateSale,
  validateInput,
  validatePayment,
  validateRefundSale,
  validateRefundSaleLine,
  validateSaleLine,
  validateUpdateSale,
  validateUpdateSaleLine,
  validateVoidSale,
} from '../parser.js';

const SALE_DATETIME = '2026-01-05T00:00:00.000Z';

function line(overrides: Partial<UpdateSaleLineFormValues> = {}): UpdateSaleLineFormValues {
  return { productId: 'product-1', productUnitId: 'unit-1', quantity: '2', ...overrides };
}

function sale(overrides: Partial<SaleFormValues> = {}): SaleFormValues {
  return { lines: [line()], ...overrides };
}

describe('validateCreateSale', () => {
  it('parses a single line sale, reading the quantity the API expects', () => {
    const result = validateCreateSale(sale());

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      lines: [{ productId: 'product-1', productUnitId: 'unit-1', quantity: 2 }],
    });
  });

  it('parses the sale date and an initial payment', () => {
    const result = validateCreateSale(
      sale({
        saleDatetime: SALE_DATETIME,
        initialPayment: {
          status: 'PARTIALLY_PAID',
          amount: '20.50',
          method: 'CASH',
          methodDetail: '  ref 1  ',
        },
      }),
    );

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      saleDatetime: new Date(SALE_DATETIME),
      lines: [{ productId: 'product-1', productUnitId: 'unit-1', quantity: 2 }],
      initialPayment: {
        status: 'PARTIALLY_PAID',
        amount: 20.5,
        method: 'CASH',
        methodDetail: 'ref 1',
      },
    });
  });

  it('drops a payment block that was left untouched', () => {
    const result = validateCreateSale(
      sale({ initialPayment: { status: '' } as unknown as PaymentFormValues }),
    );

    expect(result.errors).toBeNull();
    expect(result.data).not.toHaveProperty('initialPayment');
  });

  it('fails a recorded payment with no method', () => {
    const result = validateInput(createSaleSchema, {
      lines: [line({ quantity: '2' })],
      initialPayment: { status: 'PAID', amount: '5', method: '', methodDetail: '   ' },
    });

    expect(result.errors).toEqual({ 'initialPayment.method': 'Select a payment method' });
  });

  it('strips a blank payment detail', () => {
    const result = validateInput(createSaleSchema, {
      lines: [line({ quantity: '2' })],
      initialPayment: { status: 'PAID', amount: '5', method: 'CASH', methodDetail: '   ' },
    });

    expect(result.errors).toBeNull();
    expect(result.data?.initialPayment).toEqual({ status: 'PAID', amount: 5, method: 'CASH' });
  });

  it('parses a paid payment with no amount, leaving the server to settle it', () => {
    const result = validateInput(createSaleSchema, {
      lines: [line({ quantity: '2' })],
      initialPayment: { status: 'PAID', method: 'CASH' },
    });

    expect(result.errors).toBeNull();
    expect(result.data?.initialPayment).toEqual({ status: 'PAID', method: 'CASH' });
  });

  it('requires an amount for a partial payment', () => {
    const result = validateInput(createSaleSchema, {
      lines: [line({ quantity: '2' })],
      initialPayment: { status: 'PARTIALLY_PAID', method: 'CASH' },
    });

    expect(result.errors).toEqual({ 'initialPayment.amount': expect.any(String) });
  });

  it('refuses an amount on a pending sale', () => {
    const result = validateInput(createSaleSchema, {
      lines: [line({ quantity: '2' })],
      initialPayment: { status: 'PENDING', amount: '5' },
    });

    expect(result.errors).toEqual({ 'initialPayment.amount': expect.any(String) });
  });

  it('rounds the quantity and the payment amount to the precision the columns store', () => {
    const result = validateCreateSale(
      sale({
        lines: [line({ quantity: '1.23456789' })],
        initialPayment: { status: 'PARTIALLY_PAID', amount: '10.126', method: 'CASH' },
      }),
    );

    expect(result.errors).toBeNull();
    expect(result.data?.lines[0]?.quantity).toBe(1.2346);
    expect(result.data?.initialPayment?.amount).toBe(10.13);
  });

  it('leaves the sale date out when it is blank', () => {
    const result = validateCreateSale(sale({ saleDatetime: '' }));

    expect(result.errors).toBeNull();
    expect(result.data).not.toHaveProperty('saleDatetime');
  });

  it('requires at least one line', () => {
    expect(validateCreateSale(sale({ lines: [] })).errors).toEqual({
      lines: expect.any(String),
    });
  });

  it('keys each line error by its index and field', () => {
    const result = validateCreateSale(
      sale({ lines: [line({ productId: '  ' }), line({ quantity: '' }), line({ quantity: '0' })] }),
    );

    expect(result.errors).toEqual({
      'lines.0.productId': expect.any(String),
      'lines.1.quantity': expect.any(String),
      'lines.2.quantity': expect.any(String),
    });
  });

  it('keys a payment error under the payment field', () => {
    expect(
      validateCreateSale(sale({ initialPayment: { status: 'PAID', amount: '0', method: 'CASH' } }))
        .errors,
    ).toEqual({
      'initialPayment.amount': expect.any(String),
    });
  });

  it('ignores an unrecognized key on the sale', () => {
    expect(validateCreateSale({ ...sale(), status: 'draft' } as SaleFormValues).errors).toBeNull();
  });

  it('requires a unit on a line', () => {
    expect(validateCreateSale(sale({ lines: [line({ productUnitId: '  ' })] })).errors).toEqual({
      'lines.0.productUnitId': expect.any(String),
    });
  });

  it('rejects a line whose unit cannot be sold', () => {
    const result = validateCreateSale(sale({ lines: [line({ sellCapable: false })] }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'lines.0.productUnitId': expect.any(String) });
  });

  it('accepts a sellable unit and drops the fast-forward flag from the payload', () => {
    const result = validateCreateSale(sale({ lines: [line({ sellCapable: true })] }));

    expect(result.errors).toBeNull();
    expect(result.data?.lines[0]).toEqual({
      productId: 'product-1',
      productUnitId: 'unit-1',
      quantity: 2,
    });
    expect(result.data?.lines[0]).not.toHaveProperty('sellCapable');
  });

  it('rejects a quantity that is not a number', () => {
    expect(validateCreateSale(sale({ lines: [line({ quantity: 'abc' })] })).errors).toEqual({
      'lines.0.quantity': expect.any(String),
    });
  });

  it('rejects a negative quantity', () => {
    expect(validateCreateSale(sale({ lines: [line({ quantity: '-1' })] })).errors).toEqual({
      'lines.0.quantity': expect.any(String),
    });
  });

  it('rejects a sale date that is not an instant', () => {
    expect(validateCreateSale(sale({ saleDatetime: 'not-a-date' })).errors).toEqual({
      saleDatetime: expect.any(String),
    });
  });

  it('reads an explicit zone offset as the same instant', () => {
    const result = validateCreateSale(sale({ saleDatetime: '2026-01-05T12:00:00+03:00' }));

    expect(result.errors).toBeNull();
    expect(result.data?.saleDatetime).toEqual(new Date('2026-01-05T09:00:00.000Z'));
  });

  it('rejects a date-only value, which names no instant', () => {
    expect(validateCreateSale(sale({ saleDatetime: '2026-01-05' })).errors).toEqual({
      saleDatetime: expect.any(String),
    });
  });

  it('rejects a naive clock, which names no instant', () => {
    expect(validateCreateSale(sale({ saleDatetime: '2026-01-05T09:00:00' })).errors).toEqual({
      saleDatetime: expect.any(String),
    });
  });

  it('rejects a sale date in the future', () => {
    expect(validateCreateSale(sale({ saleDatetime: '2999-01-01T00:00:00.000Z' })).errors).toEqual({
      saleDatetime: expect.any(String),
    });
  });

  it('rejects a payment amount that is not a number', () => {
    const result = validateInput(createSaleSchema, {
      lines: [line()],
      initialPayment: { status: 'PAID', amount: 'abc', method: 'CASH' },
    });

    expect(result.errors).toEqual({ 'initialPayment.amount': expect.any(String) });
  });

  it('caps the payment detail length', () => {
    const result = validateInput(createSaleSchema, {
      lines: [line()],
      initialPayment: {
        status: 'PAID',
        amount: '5',
        method: 'CASH',
        methodDetail: 'x'.repeat(201),
      },
    });

    expect(result.errors).toEqual({ 'initialPayment.methodDetail': expect.any(String) });
  });

  it('reads a discount as a number', () => {
    expect(validateCreateSale(sale({ discount: '10' })).data?.discount).toBe(10);
  });

  it('leaves a blank discount out of the payload', () => {
    const result = validateCreateSale(sale({ discount: '' }));

    expect(result.errors).toBeNull();
    expect(result.data).not.toHaveProperty('discount');
  });

  it('carries the customer the sale is attributed to', () => {
    expect(validateCreateSale(sale({ customerId: 'cust-1' })).data?.customerId).toBe('cust-1');
  });

  it('leaves a blank customer selection out of the payload', () => {
    const result = validateCreateSale(sale({ customerId: '   ' }));

    expect(result.errors).toBeNull();
    expect(result.data).not.toHaveProperty('customerId');
  });

  it('leaves a sale that names no customer without one', () => {
    expect(validateCreateSale(sale()).data).not.toHaveProperty('customerId');
  });

  it('carries the server the sale is attributed to', () => {
    expect(validateCreateSale(sale({ serverMemberId: 'srv-1' })).data?.serverMemberId).toBe(
      'srv-1',
    );
  });

  it('leaves a blank server selection out of the payload', () => {
    const result = validateCreateSale(sale({ serverMemberId: '   ' }));

    expect(result.errors).toBeNull();
    expect(result.data).not.toHaveProperty('serverMemberId');
  });

  it('leaves a sale that names no server without one', () => {
    expect(validateCreateSale(sale()).data).not.toHaveProperty('serverMemberId');
  });

  it('keeps the discount at the precision it was entered, without rounding', () => {
    expect(validateCreateSale(sale({ discount: '10.126' })).data?.discount).toBe(10.126);
  });

  it('rejects a negative discount', () => {
    expect(validateCreateSale(sale({ discount: '-1' })).errors).toEqual({
      discount: expect.any(String),
    });
  });

  it('rejects a discount that is not a number', () => {
    expect(validateCreateSale(sale({ discount: 'abc' })).errors).toEqual({
      discount: expect.any(String),
    });
  });

  it('rejects a null discount, since a missing discount is an omission', () => {
    const result = validateCreateSale(sale({ discount: null as unknown as string }));

    expect(result.errors).toEqual({ discount: expect.any(String) });
  });
});

describe('validateUpdateSale', () => {
  it('keeps the id of a line being updated and leaves a new line without one', () => {
    const result = validateUpdateSale({
      lines: [line({ id: 'line-1', quantity: '3' }), line()],
    });

    expect(result.errors).toBeNull();
    expect(result.data?.lines.map((entry) => entry.id)).toEqual(['line-1', undefined]);
    expect(result.data?.lines[0]?.quantity).toBe(3);
  });

  it('treats a blank id as a newly added line', () => {
    const result = validateUpdateSale({ lines: [line({ id: '  ' })] });

    expect(result.errors).toBeNull();
    expect(result.data?.lines[0]).not.toHaveProperty('id');
  });

  it('rejects the same line appearing twice', () => {
    const result = validateUpdateSale({ lines: [line({ id: 'line-1' }), line({ id: 'line-1' })] });

    expect(result.errors).toEqual({ lines: expect.any(String) });
  });

  it('rejects an edit line whose unit cannot be sold', () => {
    const result = validateUpdateSale({ lines: [line({ id: 'line-1', sellCapable: false })] });

    expect(result.errors).toEqual({ 'lines.0.productUnitId': expect.any(String) });
  });

  it('strips the fast-forward flag from an edit line', () => {
    const result = validateUpdateSale({ lines: [line({ id: 'line-1', sellCapable: true })] });

    expect(result.errors).toBeNull();
    expect(result.data?.lines[0]).not.toHaveProperty('sellCapable');
  });

  it('rejects an unrecognized key on the sale', () => {
    const result = validateUpdateSale({
      lines: [line()],
      status: 'draft',
    } as UpdateSaleFormValues);

    expect(result.errors).toEqual({ _root: expect.stringContaining('status') });
  });

  it('rejects an unrecognized key on a line', () => {
    const payload = { lines: [{ ...line(), extra: true }] };

    expect(validateUpdateSale(payload as UpdateSaleFormValues).errors).toEqual({
      'lines.0': expect.stringContaining('extra'),
    });
  });

  it('reads a discount on an edit', () => {
    expect(validateUpdateSale({ lines: [line()], discount: '7.5' }).data?.discount).toBe(7.5);
  });

  it('rejects a negative discount on an edit', () => {
    expect(validateUpdateSale({ lines: [line()], discount: '-1' }).errors).toEqual({
      discount: expect.any(String),
    });
  });

  it('carries the customer an edit attributes the sale to', () => {
    const result = validateUpdateSale({ lines: [line()], customerId: 'cust-1' });

    expect(result.errors).toBeNull();
    expect(result.data?.customerId).toBe('cust-1');
  });

  it('leaves a blank customer selection off an edit', () => {
    const result = validateUpdateSale({ lines: [line()], customerId: '  ' });

    expect(result.errors).toBeNull();
    expect(result.data).not.toHaveProperty('customerId');
  });
});

describe('validatePayment', () => {
  it('parses an amount and a method for a partial payment', () => {
    const result = validatePayment({ status: 'PARTIALLY_PAID', amount: '12.50', method: 'CARD' });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ status: 'PARTIALLY_PAID', amount: 12.5, method: 'CARD' });
  });

  it('parses a paid payment with no amount', () => {
    const result = validatePayment({ status: 'PAID', method: 'CASH' });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ status: 'PAID', method: 'CASH' });
  });

  it('parses a pending sale with no payment', () => {
    const result = validatePayment({ status: 'PENDING' });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ status: 'PENDING' });
  });

  it('fails a recorded payment with no method', () => {
    const result = validateInput(recordPaymentSchema, {
      status: 'PARTIALLY_PAID',
      amount: '5',
      method: '',
      methodDetail: '   ',
    });

    expect(result.errors).toEqual({ method: 'Select a payment method' });
  });

  it('strips a blank detail', () => {
    const result = validateInput(recordPaymentSchema, {
      status: 'PARTIALLY_PAID',
      amount: '5',
      method: 'CARD',
      methodDetail: '   ',
    });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ status: 'PARTIALLY_PAID', amount: 5, method: 'CARD' });
    expect(result.data).not.toHaveProperty('methodDetail');
  });

  it('requires a status', () => {
    const result = validateInput(recordPaymentSchema, { amount: '5' });

    expect(result.errors).toEqual({ status: expect.any(String) });
  });

  it('rejects an unknown status', () => {
    const result = validateInput(recordPaymentSchema, { status: 'SETTLED', amount: '5' });

    expect(result.errors).toEqual({ status: expect.any(String) });
  });

  it('requires an amount for a partial payment', () => {
    expect(validatePayment({ status: 'PARTIALLY_PAID', method: 'CASH' }).errors).toEqual({
      amount: expect.any(String),
    });
  });

  it('refuses an amount on a pending sale', () => {
    expect(validatePayment({ status: 'PENDING', amount: '5' }).errors).toEqual({
      amount: expect.any(String),
    });
  });

  it('rejects a non-positive amount', () => {
    expect(
      validatePayment({ status: 'PARTIALLY_PAID', amount: '0', method: 'CASH' }).errors,
    ).toEqual({
      amount: expect.any(String),
    });
  });

  it('rejects an amount that is not a number', () => {
    expect(
      validatePayment({ status: 'PARTIALLY_PAID', amount: 'abc', method: 'CASH' }).errors,
    ).toEqual({ amount: expect.any(String) });
  });

  it('rejects an unknown method', () => {
    expect(
      validatePayment({ status: 'PARTIALLY_PAID', amount: '5', method: 'BITCOIN' as PaymentMethod })
        .errors,
    ).toEqual({ method: expect.any(String) });
  });

  it('rejects an unrecognized key', () => {
    const payload = { status: 'PAID', amount: '5', extra: true };

    expect(validatePayment(payload as unknown as PaymentFormValues).errors).toEqual({
      _root: expect.stringContaining('extra'),
    });
  });

  it('caps the detail length', () => {
    expect(
      validateInput(recordPaymentSchema, {
        status: 'PAID',
        amount: '5',
        method: 'CASH',
        methodDetail: 'x'.repeat(201),
      }).errors,
    ).toEqual({ methodDetail: expect.any(String) });
  });
});

describe('validateVoidSale', () => {
  it('parses a trimmed reason', () => {
    const result = validateVoidSale({ reason: '  wrong order  ' });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ reason: 'wrong order' });
  });

  it('requires a reason', () => {
    expect(validateVoidSale({ reason: '   ' }).errors).toEqual({ reason: expect.any(String) });
  });

  it('caps the reason length', () => {
    expect(validateVoidSale({ reason: 'r'.repeat(501) }).errors).toEqual({
      reason: expect.any(String),
    });
  });
});

describe('validateRefundSale', () => {
  it('parses a reason and the per-line restock choices', () => {
    const result = validateRefundSale({
      reason: 'damaged',
      lines: [{ lineId: 'line-1', restock: false }],
    });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      reason: 'damaged',
      lines: [{ lineId: 'line-1', restock: false }],
    });
  });

  it('spares every line when no line is named', () => {
    const result = validateRefundSale({ reason: 'damaged' });

    expect(result.errors).toBeNull();
    expect(result.data).not.toHaveProperty('lines');
  });

  it('rejects the same line appearing twice', () => {
    const result = validateRefundSale({
      reason: 'damaged',
      lines: [
        { lineId: 'line-1', restock: true },
        { lineId: 'line-1', restock: false },
      ],
    });

    expect(result.errors).toEqual({ lines: expect.any(String) });
  });

  it('requires a restock choice per line', () => {
    const result = validateRefundSale({
      reason: 'damaged',
      lines: [{ lineId: 'line-1' } as RefundSaleLineFormValues],
    });

    expect(result.errors).toEqual({ 'lines.0.restock': expect.any(String) });
  });

  it('requires a reason', () => {
    expect(validateRefundSale({ reason: '   ' }).errors).toEqual({ reason: expect.any(String) });
  });

  it('caps the reason length', () => {
    expect(validateRefundSale({ reason: 'r'.repeat(501) }).errors).toEqual({
      reason: expect.any(String),
    });
  });
});

describe('sale line and refund line validators', () => {
  it('validates a sale line on its own', () => {
    const result = validateSaleLine(line({ quantity: '3' }));

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      productId: 'product-1',
      productUnitId: 'unit-1',
      quantity: 3,
    });
  });

  it('reports a sale line error without a lines prefix', () => {
    expect(validateSaleLine(line({ quantity: '' })).errors).toEqual({
      quantity: expect.any(String),
    });
  });

  it('treats a blank id as a newly added line', () => {
    const result = validateUpdateSaleLine(line({ id: '  ' }));

    expect(result.errors).toBeNull();
    expect(result.data).not.toHaveProperty('id');
  });

  it('validates a refund line on its own', () => {
    const result = validateRefundSaleLine({ lineId: 'line-1', restock: true });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ lineId: 'line-1', restock: true });
  });

  it('requires a line id on a refund line', () => {
    expect(validateRefundSaleLine({ lineId: ' ', restock: true }).errors).toEqual({
      lineId: expect.any(String),
    });
  });

  it('reports a blank unit on an edit line', () => {
    expect(validateUpdateSaleLine(line({ productUnitId: '' })).errors).toEqual({
      productUnitId: expect.any(String),
    });
  });

  it('rejects a sale line whose unit cannot be sold', () => {
    expect(validateSaleLine(line({ sellCapable: false })).errors).toEqual({
      productUnitId: expect.any(String),
    });
  });

  it('rejects an edit line whose unit cannot be sold', () => {
    expect(validateUpdateSaleLine(line({ sellCapable: false })).errors).toEqual({
      productUnitId: expect.any(String),
    });
  });

  it('strips the fast-forward flag from a sale line', () => {
    const result = validateSaleLine(line({ sellCapable: true }));

    expect(result.errors).toBeNull();
    expect(result.data).not.toHaveProperty('sellCapable');
  });

  it('reports a quantity that is not a number on a sale line', () => {
    expect(validateSaleLine(line({ quantity: 'abc' })).errors).toEqual({
      quantity: expect.any(String),
    });
  });

  it('rejects a restock choice that is not a boolean', () => {
    expect(
      validateInput(refundSaleLineSchema, { lineId: 'line-1', restock: 'yes' }).errors,
    ).toEqual({ restock: expect.any(String) });
  });
});

describe('sale schemas', () => {
  it('parse into the payloads the API expects', () => {
    expectTypeOf<output<typeof createSaleSchema>>().toExtend<CreateSaleInput>();
    expectTypeOf<CreateSaleInput>().toExtend<output<typeof createSaleSchema>>();
    expectTypeOf<output<typeof updateSaleSchema>>().toExtend<UpdateSaleInput>();
    expectTypeOf<UpdateSaleInput>().toExtend<output<typeof updateSaleSchema>>();
    expectTypeOf<output<typeof createSaleLineSchema>>().toExtend<CreateSaleLineInput>();
    expectTypeOf<CreateSaleLineInput>().toExtend<output<typeof createSaleLineSchema>>();
    expectTypeOf<output<typeof updateSaleLineSchema>>().toExtend<UpdateSaleLineInput>();
    expectTypeOf<UpdateSaleLineInput>().toExtend<output<typeof updateSaleLineSchema>>();
    expectTypeOf<output<typeof recordPaymentSchema>>().toExtend<RecordPaymentInput>();
    expectTypeOf<RecordPaymentInput>().toExtend<output<typeof recordPaymentSchema>>();
    expectTypeOf<output<typeof voidSaleSchema>>().toExtend<VoidSaleInput>();
    expectTypeOf<VoidSaleInput>().toExtend<output<typeof voidSaleSchema>>();
    expectTypeOf<output<typeof refundSaleSchema>>().toExtend<RefundSaleInput>();
    expectTypeOf<RefundSaleInput>().toExtend<output<typeof refundSaleSchema>>();
    expectTypeOf<output<typeof refundSaleLineSchema>>().toExtend<RefundSaleLineInput>();
    expectTypeOf<RefundSaleLineInput>().toExtend<output<typeof refundSaleLineSchema>>();
  });

  it('take the form values as their input', () => {
    expectTypeOf<SaleFormValues>().toExtend<input<typeof createSaleSchema>>();
    expectTypeOf<input<typeof createSaleSchema>>().toExtend<SaleFormValues>();
    expectTypeOf<UpdateSaleFormValues>().toExtend<input<typeof updateSaleSchema>>();
    expectTypeOf<input<typeof updateSaleSchema>>().toExtend<UpdateSaleFormValues>();
    expectTypeOf<SaleLineFormValues>().toExtend<input<typeof createSaleLineSchema>>();
    expectTypeOf<input<typeof createSaleLineSchema>>().toExtend<SaleLineFormValues>();
    expectTypeOf<UpdateSaleLineFormValues>().toExtend<input<typeof updateSaleLineSchema>>();
    expectTypeOf<input<typeof updateSaleLineSchema>>().toExtend<UpdateSaleLineFormValues>();
    expectTypeOf<PaymentFormValues>().toExtend<input<typeof recordPaymentSchema>>();
    expectTypeOf<input<typeof recordPaymentSchema>>().toExtend<PaymentFormValues>();
    expectTypeOf<RefundSaleFormValues>().toExtend<input<typeof refundSaleSchema>>();
    expectTypeOf<input<typeof refundSaleSchema>>().toExtend<RefundSaleFormValues>();
    expectTypeOf<RefundSaleLineFormValues>().toExtend<input<typeof refundSaleLineSchema>>();
    expectTypeOf<input<typeof refundSaleLineSchema>>().toExtend<RefundSaleLineFormValues>();
  });

  it('keeps the fast-forward flag on the form and off the parsed line', () => {
    expectTypeOf<SaleLineFormValues>().toHaveProperty('sellCapable');
    expectTypeOf<output<typeof createSaleLineSchema>>().not.toHaveProperty('sellCapable');
    expectTypeOf<output<typeof updateSaleLineSchema>>().not.toHaveProperty('sellCapable');
  });

  it('parse the quantity and amount to numbers, the date to a Date, the method to the enum', () => {
    type CreateOutput = output<typeof createSaleSchema>;
    type PaymentOutput = output<typeof recordPaymentSchema>;

    expectTypeOf<CreateOutput['lines'][number]['quantity']>().toEqualTypeOf<number>();
    expectTypeOf<CreateOutput['saleDatetime']>().toEqualTypeOf<Date | undefined>();
    expectTypeOf<NonNullable<CreateOutput['initialPayment']>['amount']>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<PaymentOutput['method']>().toEqualTypeOf<PaymentMethod | undefined>();
  });

  it('accepts a quantity and amount a client has already parsed', () => {
    const result = createSaleSchema.safeParse({
      lines: [{ productId: 'p', productUnitId: 'u', quantity: 2 }],
      initialPayment: { status: 'PARTIALLY_PAID', amount: 20, method: 'CASH' },
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.lines[0]?.quantity).toBe(2);
    expect(result.data?.initialPayment?.amount).toBe(20);
  });
});

describe('unset fields', () => {
  it('reports a missing product on a line', () => {
    expect(
      validateInput(createSaleSchema, {
        lines: [{ productUnitId: 'unit-1', quantity: '2' }],
      }).errors,
    ).toEqual({ 'lines.0.productId': expect.any(String) });
  });

  it('reports a missing quantity on a line', () => {
    expect(
      validateInput(createSaleSchema, {
        lines: [{ productId: 'product-1', productUnitId: 'unit-1' }],
      }).errors,
    ).toEqual({ 'lines.0.quantity': expect.any(String) });
  });

  it('leaves unset optionals out without complaining', () => {
    const result = validateInput(createSaleSchema, {
      lines: [{ ...line(), quantity: '2' }],
    });

    expect(result.errors).toBeNull();
    expect(result.data).not.toHaveProperty('saleDatetime');
    expect(result.data).not.toHaveProperty('initialPayment');
  });

  it('reports a payload that is not an object at the root', () => {
    const result = createSaleSchema.safeParse(undefined);

    expect(result.error?.issues[0]?.path).toEqual([]);
    expect(result.error?.issues[0]?.message).toMatch(/expected object/);
  });
});

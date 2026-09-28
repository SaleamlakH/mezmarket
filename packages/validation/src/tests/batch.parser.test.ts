import { describe, it, expect, expectTypeOf } from 'vitest';
import type { input, output } from 'zod';
import type {
  BatchFormValues,
  BatchLineFormValues,
  CreateBatchInput,
  CreateBatchLineInput,
  UpdateBatchFormValues,
  UpdateBatchInput,
  UpdateBatchLineFormValues,
  UpdateBatchLineInput,
} from '@mez/types';
import {
  createBatchLineSchema,
  createBatchSchema,
  updateBatchLineSchema,
  updateBatchSchema,
} from '../schema/batch.schema.js';
import {
  validateBatchLine,
  validateCreateBatch,
  validateInput,
  validateUpdateBatch,
  validateUpdateBatchLine,
} from '../parser.js';

const BATCH_DATE = '2026-01-05T00:00:00.000Z';
const EXPIRY_DATE = '2026-06-01T00:00:00.000Z';

function line(overrides: Partial<UpdateBatchLineFormValues> = {}): UpdateBatchLineFormValues {
  return {
    productId: 'product-1',
    productUnitId: 'unit-1',
    purchaseQuantity: '2',
    purchaseUnitCost: '10.50',
    ...overrides,
  };
}

function batch(overrides: Partial<BatchFormValues> = {}): BatchFormValues {
  return { batchDate: BATCH_DATE, lines: [line()], ...overrides };
}

/** `values` with `key` left out, as an untyped payload. */
function without<T extends object, K extends keyof T>(values: T, key: K): Omit<T, K> {
  return Object.fromEntries(Object.entries(values).filter(([name]) => name !== key)) as Omit<T, K>;
}

describe('validateCreateBatch', () => {
  it('parses a single line batch, reading numbers and the date the API expects', () => {
    const result = validateCreateBatch(
      batch({ supplierName: '  Mango Co  ', referenceNumber: 'INV-9' }),
    );

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      batchDate: new Date(BATCH_DATE),
      supplierName: 'Mango Co',
      referenceNumber: 'INV-9',
      lines: [
        {
          productId: 'product-1',
          productUnitId: 'unit-1',
          purchaseQuantity: 2,
          purchaseUnitCost: 10.5,
        },
      ],
    });
  });

  it('parses several lines, one row each', () => {
    const result = validateCreateBatch(
      batch({
        lines: [
          line(),
          line({ productId: 'product-2', purchaseQuantity: '0.001', purchaseUnitCost: '0' }),
          line({ expiryDate: EXPIRY_DATE }),
        ],
      }),
    );

    expect(result.errors).toBeNull();
    expect(result.data?.lines).toHaveLength(3);
    expect(result.data?.lines[1]).toMatchObject({ purchaseQuantity: 0.001, purchaseUnitCost: 0 });
    expect(result.data?.lines[2]?.expiryDate).toEqual(new Date(EXPIRY_DATE));
  });

  it('accepts a batch with as many lines as it is given', () => {
    const lines = Array.from({ length: 75 }, () => line());
    const result = validateCreateBatch(batch({ lines }));

    expect(result.errors).toBeNull();
    expect(result.data?.lines).toHaveLength(75);
  });

  it('rounds a number to the precision the column stores', () => {
    const result = validateCreateBatch(
      batch({
        lines: [line({ purchaseQuantity: '1.23456789', purchaseUnitCost: '10.123456' })],
      }),
    );

    expect(result.errors).toBeNull();
    expect(result.data?.lines[0]?.purchaseQuantity).toBe(1.2346);
    expect(result.data?.lines[0]?.purchaseUnitCost).toBe(10.12);
  });

  it('leaves an optional field out when it is blank', () => {
    const result = validateCreateBatch(
      batch({ supplierName: '', referenceNumber: '   ', lines: [line({ expiryDate: '' })] }),
    );

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      batchDate: new Date(BATCH_DATE),
      lines: [
        {
          productId: 'product-1',
          productUnitId: 'unit-1',
          purchaseQuantity: 2,
          purchaseUnitCost: 10.5,
        },
      ],
    });
    expect(result.data).not.toHaveProperty('supplierName');
    expect(result.data).not.toHaveProperty('referenceNumber');
    expect(result.data?.lines[0]).not.toHaveProperty('expiryDate');
  });

  it('ignores an unrecognized key', () => {
    const result = validateCreateBatch({ ...batch(), status: 'draft' } as BatchFormValues);

    expect(result.errors).toBeNull();
  });

  describe('header', () => {
    it('rejects a missing batch date', () => {
      expect(validateCreateBatch(batch({ batchDate: '' })).errors).toEqual({
        batchDate: expect.any(String),
      });
    });

    it('rejects a date that is not a calendar date', () => {
      expect(validateCreateBatch(batch({ batchDate: '05/01/2026' })).errors).toEqual({
        batchDate: expect.any(String),
      });
    });

    it('rejects a batch date without a time zone', () => {
      expect(validateCreateBatch(batch({ batchDate: '2026-01-05T00:00:00' })).errors).toEqual({
        batchDate: expect.any(String),
      });
    });

    it('caps the supplier name length', () => {
      expect(validateCreateBatch(batch({ supplierName: 's'.repeat(81) })).errors).toEqual({
        supplierName: expect.any(String),
      });
    });

    it('caps the reference number length', () => {
      expect(validateCreateBatch(batch({ referenceNumber: 'r'.repeat(61) })).errors).toEqual({
        referenceNumber: expect.any(String),
      });
    });

    it('requires at least one line', () => {
      expect(validateCreateBatch(batch({ lines: [] })).errors).toEqual({
        lines: expect.any(String),
      });
    });
  });

  describe('line', () => {
    it('keys each line error by its index and field', () => {
      const result = validateCreateBatch(
        batch({
          lines: [
            line({ productId: '  ', productUnitId: '' }),
            line({ purchaseQuantity: '', purchaseUnitCost: 'abc' }),
            line({ purchaseQuantity: '0', purchaseUnitCost: '-1' }),
            line({ expiryDate: 'soon' }),
          ],
        }),
      );

      expect(result.errors).toEqual({
        'lines.0.productId': expect.any(String),
        'lines.0.productUnitId': expect.any(String),
        'lines.1.purchaseQuantity': expect.any(String),
        'lines.1.purchaseUnitCost': expect.any(String),
        'lines.2.purchaseQuantity': expect.any(String),
        'lines.2.purchaseUnitCost': expect.any(String),
        'lines.3.expiryDate': expect.any(String),
      });
    });
  });
});

describe('validateUpdateBatch', () => {
  it('keeps the id of a line that is being updated and leaves a new line without one', () => {
    const result = validateUpdateBatch({
      batchDate: BATCH_DATE,
      lines: [line({ id: 'line-1' }), line({ id: 'line-2', purchaseQuantity: '3' }), line()],
    });

    expect(result.errors).toBeNull();
    expect(result.data?.lines.map((entry) => entry.id)).toEqual(['line-1', 'line-2', undefined]);
    expect(result.data?.lines[1]?.purchaseQuantity).toBe(3);
  });

  it('treats a blank id as a newly added line', () => {
    const result = validateUpdateBatch({ batchDate: BATCH_DATE, lines: [line({ id: '  ' })] });

    expect(result.errors).toBeNull();
    expect(result.data?.lines[0]).not.toHaveProperty('id');
  });

  it('rejects the same line appearing twice', () => {
    const result = validateUpdateBatch({
      batchDate: BATCH_DATE,
      lines: [line({ id: 'line-1' }), line({ id: 'line-1' })],
    });

    expect(result.errors).toEqual({ lines: expect.any(String) });
  });

  it('allows the same product on two different lines', () => {
    const result = validateUpdateBatch({
      batchDate: BATCH_DATE,
      lines: [line({ id: 'line-1' }), line({ id: 'line-2', productUnitId: 'unit-2' })],
    });

    expect(result.errors).toBeNull();
    expect(result.data?.lines.map((entry) => entry.productId)).toEqual(['product-1', 'product-1']);
  });

  it('rejects an unrecognized key on the batch', () => {
    const result = validateUpdateBatch({
      batchDate: BATCH_DATE,
      lines: [line()],
      status: 'draft',
    } as UpdateBatchFormValues);

    expect(result.errors).toEqual({ _root: expect.stringContaining('status') });
  });

  it('rejects an unrecognized key on a line', () => {
    const payload = { batchDate: BATCH_DATE, lines: [{ ...line(), extra: true }] };

    expect(validateUpdateBatch(payload as UpdateBatchFormValues).errors).toEqual({
      'lines.0': expect.stringContaining('extra'),
    });
  });
});

describe('batch schemas', () => {
  it('parse into the payloads the API expects', () => {
    expectTypeOf(createBatchSchema.parse).returns.toExtend<CreateBatchInput>();
    expectTypeOf(updateBatchSchema.parse).returns.toExtend<UpdateBatchInput>();
  });

  // The input types are intersections, which `toEqualTypeOf` brands
  // differently from the flattened shape, so each direction is checked as
  // assignability instead. Together they mean the same type.
  it('produce exactly the payloads the API expects', () => {
    expectTypeOf<output<typeof createBatchSchema>>().toExtend<CreateBatchInput>();
    expectTypeOf<CreateBatchInput>().toExtend<output<typeof createBatchSchema>>();
    expectTypeOf<output<typeof updateBatchSchema>>().toExtend<UpdateBatchInput>();
    expectTypeOf<UpdateBatchInput>().toExtend<output<typeof updateBatchSchema>>();
    expectTypeOf<output<typeof createBatchLineSchema>>().toExtend<CreateBatchLineInput>();
    expectTypeOf<CreateBatchLineInput>().toExtend<output<typeof createBatchLineSchema>>();
    expectTypeOf<output<typeof updateBatchLineSchema>>().toExtend<UpdateBatchLineInput>();
    expectTypeOf<UpdateBatchLineInput>().toExtend<output<typeof updateBatchLineSchema>>();
  });

  it('take the form values as their input', () => {
    expectTypeOf<BatchFormValues>().toExtend<input<typeof createBatchSchema>>();
    expectTypeOf<input<typeof createBatchSchema>>().toExtend<BatchFormValues>();
    expectTypeOf<UpdateBatchFormValues>().toExtend<input<typeof updateBatchSchema>>();
    expectTypeOf<input<typeof updateBatchSchema>>().toExtend<UpdateBatchFormValues>();
    expectTypeOf<BatchLineFormValues>().toExtend<input<typeof createBatchLineSchema>>();
    expectTypeOf<input<typeof createBatchLineSchema>>().toExtend<BatchLineFormValues>();
    expectTypeOf<UpdateBatchLineFormValues>().toExtend<input<typeof updateBatchLineSchema>>();
    expectTypeOf<input<typeof updateBatchLineSchema>>().toExtend<UpdateBatchLineFormValues>();
  });

  it('parse quantities and costs to numbers, and the date to a Date', () => {
    type CreateOutput = output<typeof createBatchSchema>;

    expectTypeOf<CreateOutput['batchDate']>().toEqualTypeOf<Date>();
    expectTypeOf<CreateOutput['lines'][number]['purchaseQuantity']>().toEqualTypeOf<number>();
    expectTypeOf<CreateOutput['lines'][number]['purchaseUnitCost']>().toEqualTypeOf<number>();
  });

  it('never leave a set optional key undefined in the output', () => {
    type lineOutput = output<typeof createBatchLineSchema>;

    expectTypeOf<NonNullable<lineOutput['expiryDate']>>().toEqualTypeOf<Date>();
    expectTypeOf<UpdateBatchLineInput['id']>().toEqualTypeOf<string | undefined>();
  });

  it('return numbers and a Date for values entered as text', () => {
    const result = validateCreateBatch(
      batch({
        lines: [
          line({ purchaseQuantity: '2', purchaseUnitCost: '10.50', expiryDate: EXPIRY_DATE }),
        ],
      }),
    );

    expect(result.errors).toBeNull();
    expect(result.data?.batchDate).toBeInstanceOf(Date);
    expect(result.data?.batchDate).toEqual(new Date(BATCH_DATE));
    expect(result.data?.lines[0]?.purchaseQuantity).toBe(2);
    expect(result.data?.lines[0]?.purchaseUnitCost).toBe(10.5);
    expect(result.data?.lines[0]?.expiryDate).toBeInstanceOf(Date);
    expect(result.data?.lines[0]?.expiryDate).toEqual(new Date(EXPIRY_DATE));
  });
});

describe('typed fields accept text input', () => {
  it('parses a quantity written as text', () => {
    const result = validateCreateBatch(batch({ lines: [line({ purchaseQuantity: '2.5' })] }));

    expect(result.errors).toBeNull();
    expect(result.data?.lines[0]?.purchaseQuantity).toBe(2.5);
  });

  it('parses a unit cost written as text', () => {
    const result = validateCreateBatch(batch({ lines: [line({ purchaseUnitCost: '0' })] }));

    expect(result.errors).toBeNull();
    expect(result.data?.lines[0]?.purchaseUnitCost).toBe(0);
  });

  it('parses a UTC instant written as text', () => {
    const result = validateCreateBatch(batch({ batchDate: '2026-12-31T00:00:00.000Z' }));

    expect(result.errors).toBeNull();
    expect(result.data?.batchDate).toEqual(new Date('2026-12-31T00:00:00.000Z'));
  });

  it('still reports a value the number rule cannot use', () => {
    expect(
      validateCreateBatch(batch({ lines: [line({ purchaseQuantity: 'abc' })] })).errors,
    ).toEqual({ 'lines.0.purchaseQuantity': expect.any(String) });
  });

  it('still reports a value the date rule cannot use', () => {
    expect(validateCreateBatch(batch({ batchDate: '2026-02-30T00:00:00.000Z' })).errors).toEqual({
      batchDate: expect.any(String),
    });
  });

  it('rejects a number where a text field is expected', () => {
    const result = createBatchSchema.safeParse({
      batchDate: BATCH_DATE,
      lines: [{ productId: 'p', productUnitId: 'u', purchaseQuantity: 2, purchaseUnitCost: '1' }],
    });

    expect(result.error?.issues[0]).toEqual(
      expect.objectContaining({
        path: ['lines', 0, 'purchaseQuantity'],
        message: expect.any(String),
      }),
    );
  });
});

describe('unset fields', () => {
  // These payloads are deliberately not well typed: a missing key, or a key
  // present with no value, has to come back as a readable message.
  it('reports a missing batch date', () => {
    expect(validateInput(createBatchSchema, { lines: [line()] }).errors).toEqual({
      batchDate: expect.any(String),
    });
  });

  it('reports a batch date passed as undefined', () => {
    expect(
      validateInput(createBatchSchema, { batchDate: undefined, lines: [line()] }).errors,
    ).toEqual({ batchDate: expect.any(String) });
  });

  it('reports a missing quantity', () => {
    expect(
      validateInput(createBatchSchema, {
        batchDate: BATCH_DATE,
        lines: [without(line(), 'purchaseQuantity')],
      }).errors,
    ).toEqual({
      'lines.0.purchaseQuantity': expect.any(String),
    });
  });

  it('reports a quantity passed as undefined', () => {
    const payload = { ...line(), purchaseQuantity: undefined };

    expect(
      validateInput(createBatchSchema, { batchDate: BATCH_DATE, lines: [payload] }).errors,
    ).toEqual({
      'lines.0.purchaseQuantity': expect.any(String),
    });
  });

  it('reports a missing unit cost', () => {
    expect(
      validateInput(createBatchSchema, {
        batchDate: BATCH_DATE,
        lines: [without(line(), 'purchaseUnitCost')],
      }).errors,
    ).toEqual({
      'lines.0.purchaseUnitCost': expect.any(String),
    });
  });

  it('reports a unit cost passed as undefined', () => {
    const payload = { ...line(), purchaseUnitCost: undefined };

    expect(
      validateInput(createBatchSchema, { batchDate: BATCH_DATE, lines: [payload] }).errors,
    ).toEqual({
      'lines.0.purchaseUnitCost': expect.any(String),
    });
  });

  it('reports a missing product', () => {
    expect(
      validateInput(createBatchSchema, {
        batchDate: BATCH_DATE,
        lines: [without(line(), 'productId')],
      }).errors,
    ).toEqual({
      'lines.0.productId': expect.any(String),
    });
  });

  it('reports a missing product unit', () => {
    expect(
      validateInput(createBatchSchema, {
        batchDate: BATCH_DATE,
        lines: [without(line(), 'productUnitId')],
      }).errors,
    ).toEqual({
      'lines.0.productUnitId': expect.any(String),
    });
  });

  it('leaves optional fields unset without complaining', () => {
    const result = validateInput(createBatchSchema, { batchDate: BATCH_DATE, lines: [line()] });

    expect(result.errors).toBeNull();
    expect(result.data).not.toHaveProperty('supplierName');
    expect(result.data).not.toHaveProperty('referenceNumber');
  });

  it('leaves an unset line expiry and id unset', () => {
    const result = validateInput(updateBatchSchema, {
      batchDate: BATCH_DATE,
      lines: [{ ...line(), expiryDate: undefined, id: undefined }],
    });

    expect(result.errors).toBeNull();
    expect(result.data?.lines[0]).not.toHaveProperty('expiryDate');
    expect(result.data?.lines[0]).not.toHaveProperty('id');
  });

  it('reports a payload that is not an object at the root', () => {
    const result = createBatchSchema.safeParse(undefined);

    expect(result.error?.issues[0]?.path).toEqual([]);
    expect(result.error?.issues[0]?.message).toMatch(/expected object/);
  });
});

describe('batch line validators', () => {
  it('validates a line on its own', () => {
    const result = validateBatchLine(line({ purchaseQuantity: '3' }));

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      productId: 'product-1',
      productUnitId: 'unit-1',
      purchaseQuantity: 3,
      purchaseUnitCost: 10.5,
    });
    expect(result.data).not.toHaveProperty('expiryDate');
  });

  it('reports a line error without a lines prefix', () => {
    expect(validateBatchLine(line({ purchaseQuantity: '' })).errors).toEqual({
      purchaseQuantity: expect.any(String),
    });
  });

  it('validates a line that updates an existing row', () => {
    const result = validateUpdateBatchLine(line({ id: '  ' }));

    expect(result.errors).toBeNull();
    expect(result.data).not.toHaveProperty('id');
  });

  it('rejects an unrecognized key on a line being edited', () => {
    const payload = { ...line(), extra: true } as UpdateBatchLineFormValues;

    expect(validateUpdateBatchLine(payload).errors).toEqual({
      _root: expect.stringContaining('extra'),
    });
  });
});

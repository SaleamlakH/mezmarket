import { describe, it, expect, expectTypeOf } from 'vitest';
import z from 'zod';
import type { CreateBatchInput } from '@mez/types';
import { validateInput } from '../parser.js';
import type { FieldErrors } from '../types.js';

interface NestedFixture {
  supplier: { name: string };
  lines: { quantity: number }[];
}

const nestedSchema: z.ZodType<NestedFixture> = z.object({
  supplier: z.object({
    name: z.string().trim().min(1, 'Supplier is required'),
  }),
  lines: z
    .array(
      z.object({
        quantity: z.number({
          error: (issue) =>
            issue.input === undefined ? 'Quantity is required' : 'Enter a valid number',
        }),
      }),
    )
    .min(1, 'Add at least one line'),
});

describe('validateInput', () => {
  it('returns the parsed data and no errors when the input is valid', () => {
    const result = validateInput(nestedSchema, {
      supplier: { name: 'Mango Co' },
      lines: [{ quantity: 1 }],
    });

    expect(result).toEqual({
      data: { supplier: { name: 'Mango Co' }, lines: [{ quantity: 1 }] },
      errors: null,
    });
  });

  it('keys a top-level field error by its own name', () => {
    const schema = z.object({ name: z.string().min(1, 'Name is required') });

    expect(validateInput(schema, { name: '' }).errors).toEqual({ name: 'Name is required' });
  });

  it('keys a nested object field error by its dotted path', () => {
    const result = validateInput(nestedSchema, {
      supplier: { name: '  ' },
      lines: [{ quantity: 1 }],
    });

    expect(result.errors).toEqual({ 'supplier.name': 'Supplier is required' });
  });

  it('keys a field inside a list by its index and name', () => {
    const result = validateInput(nestedSchema, {
      supplier: { name: 'Mango Co' },
      lines: [{ quantity: 1 }, { quantity: undefined }],
    });

    expect(result.errors).toEqual({ 'lines.1.quantity': 'Quantity is required' });
  });

  it('reports the object structure and the listed condition from one payload', () => {
    const result = validateInput(nestedSchema, {
      supplier: { name: '' },
      lines: [{ quantity: 'nope' }, { quantity: 2 }],
    });

    expect(result.errors).toEqual({
      'supplier.name': 'Supplier is required',
      'lines.0.quantity': 'Enter a valid number',
    });
  });

  it('keys a failure of the value as a whole to _root', () => {
    const schema = z
      .object({ password: z.string(), confirmPassword: z.string() })
      .refine((data) => data.password === data.confirmPassword, {
        error: "Passwords don't match",
        path: ['confirmPassword'],
      })
      .refine((data) => data.password.length > 0, { error: 'Password is required' });

    const result = validateInput(schema, { password: '', confirmPassword: '' });

    expect(result.errors).toEqual({ _root: 'Password is required' });
  });

  it('keys an unrecognized key to _root when it carries no path of its own', () => {
    const schema = z.object({ name: z.string() }).strict();

    expect(validateInput(schema, { name: 'shop', id: 'x' }).errors).toEqual({
      _root: 'Unrecognized key: "id"',
    });
  });

  it('keeps the first message reported for a path', () => {
    const schema = z
      .object({ name: z.string().min(3, 'Name must be at least 3 characters') })
      .refine((data) => !data.name.includes(' '), { error: 'Name cannot contain spaces' });

    expect(validateInput(schema, { name: 'a' }).errors).toEqual({
      name: 'Name must be at least 3 characters',
    });
  });

  it('keys a list-level failure to the list itself', () => {
    const result = validateInput(nestedSchema, { supplier: { name: 'Mango Co' }, lines: [] });

    expect(result.errors).toEqual({ lines: 'Add at least one line' });
  });
});

describe('FieldErrors', () => {
  it('accepts a nested path and a listed field path', () => {
    const errors: FieldErrors<CreateBatchInput> = {
      batchDate: 'Batch date is required',
      'lines.0.purchaseQuantity': 'Quantity is required',
      _root: 'Invalid request',
    };

    expect(errors['lines.0.purchaseQuantity']).toBe('Quantity is required');
  });

  it('reads a listed field path built at runtime', () => {
    const errors: FieldErrors<CreateBatchInput> = {
      'lines.1.purchaseUnitCost': 'Unit cost is required',
    };

    expect(errors[`lines.${1}.purchaseUnitCost`]).toBe('Unit cost is required');
  });

  it('reads a top-level field by its own name', () => {
    const errors: FieldErrors<CreateBatchInput> = { batchDate: 'Batch date is required' };

    expectTypeOf(errors.batchDate).toEqualTypeOf<string | undefined>();
  });

  it('stays assignable to the record the API error envelope carries', () => {
    const details: Record<string, string> = { 'lines.0.purchaseQuantity': 'Quantity is required' };

    expectTypeOf<FieldErrors<CreateBatchInput>>().toExtend<Record<string, string>>();
    expect(details['lines.0.purchaseQuantity']).toBe('Quantity is required');
  });

  it('can be indexed by a key of the payload it describes', () => {
    const readTopLevel = <T>(errors: FieldErrors<T> | null, field: keyof T) => errors?.[field];

    expect(
      readTopLevel<CreateBatchInput>({ batchDate: 'Batch date is required' }, 'batchDate'),
    ).toBe('Batch date is required');
  });
});

import { describe, it, expect, expectTypeOf } from 'vitest';
import type { input, output } from 'zod';
import type { CreateCustomerInput, CustomerFormValues } from '@mez/types';
import { createCustomerSchema } from '../schema/customer.schema.js';
import { validateCreateCustomer, validateInput } from '../parser.js';

describe('validateCreateCustomer', () => {
  it('parses a customer that gives only a name', () => {
    const result = validateCreateCustomer({ name: 'Abebe' });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ name: 'Abebe' });
  });

  it('parses the optional contact details alongside the name', () => {
    const result = validateCreateCustomer({
      name: 'Abebe',
      contactPhone: '0911 234 567',
      contactEmail: 'abebe@example.com',
    });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      name: 'Abebe',
      contactPhone: '0911 234 567',
      contactEmail: 'abebe@example.com',
    });
  });

  it('trims the name', () => {
    expect(validateCreateCustomer({ name: '  Abebe  ' }).data?.name).toBe('Abebe');
  });

  it('leaves blank contact details out of the payload', () => {
    const result = validateCreateCustomer({ name: 'Abebe', contactPhone: '   ', contactEmail: '' });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ name: 'Abebe' });
    expect(result.data).not.toHaveProperty('contactPhone');
    expect(result.data).not.toHaveProperty('contactEmail');
  });

  it('requires a name', () => {
    expect(validateCreateCustomer({ name: '' }).errors).toEqual({ name: expect.any(String) });
  });

  it('caps the name length', () => {
    const result = validateCreateCustomer({ name: 'x'.repeat(81) });

    expect(result.errors).toEqual({ name: expect.any(String) });
  });

  it('rejects an email that is not an address', () => {
    const result = validateCreateCustomer({ name: 'Abebe', contactEmail: 'not-an-email' });

    expect(result.errors).toEqual({ contactEmail: expect.any(String) });
  });

  it('caps the phone number length', () => {
    const result = validateCreateCustomer({ name: 'Abebe', contactPhone: '1'.repeat(31) });

    expect(result.errors).toEqual({ contactPhone: expect.any(String) });
  });

  it('accepts an already-typed number-free payload through the shared parser', () => {
    expect(validateInput(createCustomerSchema, { name: 'Abebe' }).errors).toBeNull();
  });
});

describe('createCustomerSchema types', () => {
  it('takes text form values and yields the API input', () => {
    expectTypeOf<input<typeof createCustomerSchema>>().toEqualTypeOf<CustomerFormValues>();
    expectTypeOf<output<typeof createCustomerSchema>>().toEqualTypeOf<CreateCustomerInput>();
  });
});

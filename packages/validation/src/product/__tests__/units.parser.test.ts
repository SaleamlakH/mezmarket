import { describe, it, expect } from 'vitest';
import type { CreateCustomUnitFormValues, CreateProductFormValues } from '@mez/types';
import {
  validateCreateProduct,
  validateCreateProductUnit,
  validateInput,
  validateUpdateProductUnits,
} from '../../parser.js';
import { createProductFormSchema } from '../create.schema.js';
import { createProductUnitSchema, updateProductUnitsSchema } from '../units.schema.js';

/** The fields a create request writes when the optional ones are left empty. */
const emptyProductFields = {
  brand: null,
  description: null,
  lowStockThreshold: null,
  trackAsPartial: false,
  categoryId: null,
};

/** A minimal request body: no dimension, because the API resolves it from the unit. */
function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Shirt',
    baseUnit: { unitId: 'kg-1', price: '120.50' },
    customUnits: [],
    ...overrides,
  } as unknown as CreateProductFormValues;
}

/** The same product as the form holds it, where both units carry their dimension. */
function validFormValues(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Shirt',
    baseUnit: { unitId: 'kg-1', dimensionId: 'd-1', price: '120.50' },
    customUnits: [],
    ...overrides,
  } as unknown as CreateProductFormValues;
}

/** One custom unit as a request body carries it: the rate and the price are numbers. */
function validUnit(overrides: Record<string, unknown> = {}) {
  return {
    name: 'shot',
    dependsOn: 'BASE',
    conversionRate: 0.125,
    price: 45,
    ...overrides,
  };
}

/** The same unit as a form row holds it, with the rate and the price as text. */
function validFormUnit(overrides: Record<string, unknown> = {}) {
  return {
    name: 'shot',
    dependsOn: 'BASE',
    conversionRate: '0.125',
    price: '45',
    purchaseCapable: true,
    sellCapable: true,
    ...overrides,
  } as CreateCustomUnitFormValues;
}

describe('validateUpdateProductUnits', () => {
  it('writes every row by the role it names', () => {
    const result = validateUpdateProductUnits({
      units: [
        { unitRole: 'BASE', id: 'pu-base', price: '12.50' },
        { unitRole: 'MOU', id: 'pu-mou', price: '' },
        {
          unitRole: 'CUSTOM',
          id: 'pu-custom',
          name: '  Shot  ',
          price: '15',
          purchaseCapable: true,
          sellCapable: true,
        },
      ],
    });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      units: [
        { unitRole: 'BASE', id: 'pu-base', price: 12.5 },
        { unitRole: 'MOU', id: 'pu-mou', price: null },
        {
          unitRole: 'CUSTOM',
          id: 'pu-custom',
          name: 'Shot',
          price: 15,
          purchaseCapable: true,
          sellCapable: true,
        },
      ],
    });
  });

  it('accepts prices already sent as numbers', () => {
    const result = validateUpdateProductUnits({
      units: [
        { unitRole: 'BASE', id: 'pu-base', price: 45 },
        { unitRole: 'MOU', id: 'pu-mou', price: 20 },
      ],
    });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      units: [
        { unitRole: 'BASE', id: 'pu-base', price: 45 },
        { unitRole: 'MOU', id: 'pu-mou', price: 20 },
      ],
    });
  });

  it('clears the content-unit price when it is absent', () => {
    const result = validateUpdateProductUnits({
      units: [{ unitRole: 'MOU', id: 'pu-mou' }],
    });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      units: [{ unitRole: 'MOU', id: 'pu-mou', price: null }],
    });
  });

  it('requires a price for a sellable custom row', () => {
    const result = validateUpdateProductUnits({
      units: [
        {
          unitRole: 'CUSTOM',
          id: 'pu-custom',
          name: 'Shot',
          purchaseCapable: true,
          sellCapable: true,
        },
      ],
    });

    expect(result.errors?.['units.0.price']).toEqual(expect.any(String));
  });

  it('leaves the price out of a purchase-only custom row', () => {
    const result = validateUpdateProductUnits({
      units: [
        {
          unitRole: 'CUSTOM',
          id: 'pu-custom',
          name: 'Bottle',
          purchaseCapable: true,
          sellCapable: false,
        },
      ],
    });

    expect(result.errors).toBeNull();
    expect(result.data?.units[0]).toEqual({
      unitRole: 'CUSTOM',
      id: 'pu-custom',
      name: 'Bottle',
      purchaseCapable: true,
      sellCapable: false,
    });
  });

  it('refuses a custom row usable for neither buying nor selling', () => {
    const result = validateUpdateProductUnits({
      units: [
        {
          unitRole: 'CUSTOM',
          id: 'pu-custom',
          name: 'Shot',
          purchaseCapable: false,
          sellCapable: false,
        },
      ],
    });

    expect(result.errors?.['units.0.sellCapable']).toEqual(expect.any(String));
  });

  it('reports a bad row by its position', () => {
    const result = validateUpdateProductUnits({
      units: [
        { unitRole: 'BASE', id: 'pu-base', price: '5' },
        { unitRole: 'MOU', id: '', price: '5' },
      ],
    });

    expect(result.errors).toEqual({ 'units.1.id': expect.any(String) });
  });

  it('rejects a row with no known role', () => {
    const result = validateUpdateProductUnits({
      units: [{ unitRole: 'STANDARD', id: 'pu-1', price: '5' }],
    });

    expect(result.data).toBeNull();
    expect(result.errors).not.toBeNull();
  });

  it('rejects unknown top-level keys and a missing list', () => {
    expect(validateUpdateProductUnits({ units: [], extra: true }).errors).not.toBeNull();
    expect(validateUpdateProductUnits({}).errors).toEqual({ units: expect.any(String) });
  });
});

describe('updateProductUnitsSchema', () => {
  it('parses on its own, so a form resolver can read it', () => {
    expect(
      updateProductUnitsSchema.parse({
        units: [{ unitRole: 'BASE', id: 'pu-1', price: '5' }],
      }),
    ).toEqual({
      units: [{ unitRole: 'BASE', id: 'pu-1', price: 5 }],
    });
  });
});

describe('validateCreateProductUnit', () => {
  it('coerces a unit that can be bought and sold, with a price', () => {
    const result = validateCreateProductUnit({
      name: '  Shot  ',
      dependsOn: 'BASE',
      conversionRate: '25',
      purchaseCapable: true,
      sellCapable: true,
      price: '15',
    });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      unitRole: 'CUSTOM',
      name: 'Shot',
      dependsOn: 'BASE',
      conversionRate: 25,
      purchaseCapable: true,
      sellCapable: true,
      price: 15,
    });
  });

  it('defaults both uses to on and leaves the price out of a purchase-only unit', () => {
    const result = validateCreateProductUnit({
      name: 'Bottle',
      dependsOn: 'BASE',
      conversionRate: '1',
      sellCapable: false,
    });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      unitRole: 'CUSTOM',
      name: 'Bottle',
      dependsOn: 'BASE',
      conversionRate: 1,
      purchaseCapable: true,
      sellCapable: false,
    });
  });

  it('refuses a sellable unit with no price', () => {
    const result = validateCreateProductUnit({
      name: 'Shot',
      dependsOn: 'BASE',
      conversionRate: '25',
      sellCapable: true,
    });

    expect(result.errors?.price).toEqual(expect.any(String));
  });

  it('refuses a unit that is neither bought nor sold', () => {
    const result = validateCreateProductUnit({
      name: 'Shot',
      dependsOn: 'BASE',
      conversionRate: '25',
      purchaseCapable: false,
      sellCapable: false,
    });

    expect((result.errors as Record<string, string | undefined> | null)?.['sellCapable']).toEqual(
      expect.any(String),
    );
  });

  it('refuses a missing name and an unknown key', () => {
    expect(
      (
        validateCreateProductUnit({ dependsOn: 'BASE', conversionRate: '25' }).errors as Record<
          string,
          string | undefined
        > | null
      )?.['name'],
    ).toBeDefined();
    expect(
      validateCreateProductUnit({
        name: 'Shot',
        dependsOn: 'BASE',
        conversionRate: '25',
        bogus: 'x',
      }).errors,
    ).not.toBeNull();
  });

  it('reads a body with no role as a custom unit', () => {
    const result = validateCreateProductUnit({
      name: 'Shot',
      dependsOn: 'BASE',
      conversionRate: '25',
      sellCapable: false,
    });

    expect(result.errors).toBeNull();
    expect(result.data).toMatchObject({ unitRole: 'CUSTOM', name: 'Shot' });
  });

  it('coerces a content unit named by a standard unit', () => {
    const result = validateCreateProductUnit({
      unitRole: 'MOU',
      unitId: 'unit-ml',
      conversionRate: '750',
      price: '40',
    });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      unitRole: 'MOU',
      unitId: 'unit-ml',
      conversionRate: 750,
      price: 40,
    });
  });

  it('leaves the price out of a content unit that carries none', () => {
    const result = validateCreateProductUnit({
      unitRole: 'MOU',
      unitId: 'unit-ml',
      conversionRate: '750',
    });

    expect(result.errors).toBeNull();
    expect(result.data).not.toHaveProperty('price');
  });

  it('refuses a content unit with no standard unit and an unknown key', () => {
    expect(
      (
        validateCreateProductUnit({ unitRole: 'MOU', conversionRate: '750' }).errors as Record<
          string,
          string | undefined
        > | null
      )?.['unitId'],
    ).toBeDefined();
    expect(
      validateCreateProductUnit({
        unitRole: 'MOU',
        unitId: 'unit-ml',
        conversionRate: '750',
        name: 'ml',
      }).errors,
    ).not.toBeNull();
  });
});

describe('createProductUnitSchema', () => {
  it('parses on its own, so a form resolver can read it', () => {
    expect(
      createProductUnitSchema.parse({
        name: 'Shot',
        dependsOn: 'BASE',
        conversionRate: '25',
        sellCapable: false,
      }),
    ).toEqual({
      unitRole: 'CUSTOM',
      name: 'Shot',
      dependsOn: 'BASE',
      conversionRate: 25,
      purchaseCapable: true,
      sellCapable: false,
    });
  });
});

/**
 * A product's own units are configured as it is created, so they ride on the same
 * body as everything else. Every rule below is the unit's own, except the last two,
 * which are about the product it is joining.
 */
describe('custom units on a create-product body', () => {
  it('accepts a set of units', () => {
    const result = validateCreateProduct(
      validBody({
        customUnits: [validUnit({ name: 'slice' }), validUnit({ name: 'box' })],
      }),
    );

    expect(result.errors).toBeNull();
    expect(result.data?.customUnits).toEqual([
      {
        name: 'slice',
        dependsOn: 'BASE',
        conversionRate: 0.125,
        price: 45,
        purchaseCapable: true,
        sellCapable: true,
      },
      {
        name: 'box',
        dependsOn: 'BASE',
        conversionRate: 0.125,
        price: 45,
        purchaseCapable: true,
        sellCapable: true,
      },
    ]);
  });

  it('sends nothing at all for a product with no custom units', () => {
    const result = validateCreateProduct(validBody());

    expect(result.errors).toBeNull();
    expect(result.data?.customUnits).toBeUndefined();
    expect(JSON.parse(JSON.stringify(result.data))).not.toHaveProperty('customUnits');
  });

  it('carries a rate above one, because a pack is as ordinary as a portion', () => {
    const result = validateCreateProduct(
      validBody({ customUnits: [validUnit({ name: 'box', conversionRate: 12 })] }),
    );

    expect(result.errors).toBeNull();
    expect(result.data?.customUnits?.[0]?.conversionRate).toBe(12);
  });

  it('rejects a unit with no name', () => {
    for (const name of [undefined, '   ']) {
      const result = validateCreateProduct(validBody({ customUnits: [validUnit({ name })] }));

      expect(result.errors).toEqual({ 'customUnits.0.name': expect.any(String) });
    }
  });

  it('rejects a name longer than 50 characters', () => {
    const result = validateCreateProduct(
      validBody({ customUnits: [validUnit({ name: 'a'.repeat(51) })] }),
    );

    expect(result.errors).toEqual({ 'customUnits.0.name': expect.any(String) });
  });

  it('rejects a basis that is neither the base nor the content unit', () => {
    for (const dependsOn of ['shot', 'STANDARD', '']) {
      const result = validateCreateProduct(validBody({ customUnits: [validUnit({ dependsOn })] }));

      expect(result.errors).toEqual({ 'customUnits.0.dependsOn': expect.any(String) });
    }
  });

  it('rejects a rate that is not a number, and one that is not above zero', () => {
    for (const conversionRate of ['abc', '-1', '0', '']) {
      const result = validateCreateProduct(
        validBody({ customUnits: [validUnit({ conversionRate })] }),
      );

      expect(result.errors).toEqual({ 'customUnits.0.conversionRate': expect.any(String) });
    }
  });

  /**
   * The acceptance case: a unit the owner can offer and then not charge for. This is
   * the one rule a field cannot make on its own, since it is about what the unit may
   * be used for rather than about the price.
   */
  it('rejects a sellable unit that carries no price', () => {
    const result = validateCreateProduct(
      validBody({ customUnits: [validUnit({ sellCapable: true, price: undefined })] }),
    );

    expect(result.errors).toEqual({ 'customUnits.0.price': expect.any(String) });
  });

  it('leaves the price out of a unit that is only bought', () => {
    const result = validateCreateProduct(
      validBody({
        customUnits: [validUnit({ sellCapable: false, purchaseCapable: true, price: undefined })],
      }),
    );

    expect(result.errors).toBeNull();
    expect(result.data?.customUnits?.[0]).not.toHaveProperty('price');
  });

  it('rejects a unit usable for neither buying nor selling', () => {
    const result = validateCreateProduct(
      validBody({
        customUnits: [validUnit({ sellCapable: false, purchaseCapable: false, price: undefined })],
      }),
    );

    expect(result.errors).toEqual({ 'customUnits.0.sellCapable': expect.any(String) });
  });

  it("ignores the unit role, which is not the caller's to choose", () => {
    for (const extra of [{ id: 'pu-1' }, { unitRole: 'BASE' }]) {
      const result = validateCreateProduct(validBody({ customUnits: [validUnit(extra)] }));

      expect(result.errors).not.toBeNull();
    }
  });

  it('rejects two units sharing a name, however they are cased', () => {
    const result = validateCreateProduct(
      validBody({
        customUnits: [validUnit({ name: 'Shot' }), validUnit({ name: 'shot ' })],
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'customUnits.1.name': expect.any(String) });
  });

  it('rejects a unit based on a content unit the product does not have', () => {
    const result = validateCreateProduct(
      validBody({ customUnits: [validUnit({ dependsOn: 'MOU', conversionRate: 25 })] }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'customUnits.0.dependsOn': expect.any(String) });
  });

  it('accepts a unit based on a content unit the product does have', () => {
    const result = validateCreateProduct(
      validBody({
        mou: { unitId: 'ml-1', conversionRate: 350 },
        customUnits: [validUnit({ dependsOn: 'MOU', conversionRate: 25 })],
      }),
    );

    expect(result.errors).toBeNull();
  });

  it('does not reach a unit based on a content unit until that unit is filled in', () => {
    const result = validateCreateProduct(
      validBody({
        mou: { unitId: '', conversionRate: '', price: '' },
        customUnits: [validUnit({ dependsOn: 'MOU' })],
      }),
    );

    expect(result.errors).toEqual({ 'customUnits.0.dependsOn': expect.any(String) });
  });

  it('rejects a set that is not a list', () => {
    const result = validateCreateProduct(validBody({ customUnits: 'shot' }));

    expect(result.data).toBeNull();
    expect(result.errors).not.toBeNull();
  });
});

/**
 * The form's copy, which holds the rate and the price as text. The rules are the
 * same ones the body applies — there is no separate form copy of them, only a
 * different way of writing the same two numbers.
 */
describe('custom units on the create-product form', () => {
  it('transforms a form row down to the payload the body carries', () => {
    const result = validateInput(createProductFormSchema, {
      ...validFormValues({
        mou: { unitId: 'ml-1', dimensionId: 'd-2', conversionRate: '350' },
        customUnits: [validFormUnit()],
      }),
    });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      ...emptyProductFields,
      name: 'Shirt',
      baseUnit: { unitId: 'kg-1', price: 120.5 },
      mou: { unitId: 'ml-1', conversionRate: 350 },
      customUnits: [
        {
          name: 'shot',
          dependsOn: 'BASE',
          conversionRate: 0.125,
          price: 45,
          purchaseCapable: true,
          sellCapable: true,
        },
      ],
    });
  });

  it('applies the same sellable-price rule as the body', () => {
    const result = validateInput(createProductFormSchema, {
      ...validFormValues({ customUnits: [validFormUnit({ price: '' })] }),
    });

    expect(result.errors).toEqual({ 'customUnits.0.price': expect.any(String) });
  });

  it('lets a purchase-only form unit omit its price', () => {
    const result = validateInput(createProductFormSchema, {
      ...validFormValues({
        customUnits: [validFormUnit({ sellCapable: false, price: undefined })],
      }),
    });

    expect(result.errors).toBeNull();
    expect(result.data?.customUnits?.[0]).not.toHaveProperty('price');
  });

  it('applies the same duplicate-name rule as the body', () => {
    const result = validateInput(createProductFormSchema, {
      ...validFormValues({
        customUnits: [validFormUnit({ name: 'Shot' }), validFormUnit({ name: 'SHOT' })],
      }),
    });

    expect(result.errors).toEqual({ 'customUnits.1.name': expect.any(String) });
  });

  it('applies the same missing-content-unit rule as the body', () => {
    const result = validateInput(createProductFormSchema, {
      ...validFormValues({ customUnits: [validFormUnit({ dependsOn: 'MOU' })] }),
    });

    expect(result.errors).toEqual({ 'customUnits.0.dependsOn': expect.any(String) });
  });
});

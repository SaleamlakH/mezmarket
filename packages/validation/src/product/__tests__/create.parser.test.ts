import { describe, it, expect } from 'vitest';
import { validateCreateProduct, validateInput } from '../../parser.js';
import {
  createProductFormSchema,
  type CreateCustomUnitFormValues,
  type CreateProductFormValues,
} from '../create.schema.js';

/** A minimal request body: no dimension, because the API resolves it from the unit. */
function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Shirt',
    baseUnit: { unitId: 'kg-1', price: '120.50' },
    ...overrides,
  } as CreateProductFormValues;
}

/** The same product as the form holds it, where both units carry their dimension. */
function validFormValues(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Shirt',
    baseUnit: { unitId: 'kg-1', dimensionId: 'd-1', price: '120.50' },
    ...overrides,
  } as CreateProductFormValues;
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

describe('validateCreateProduct', () => {
  it('accepts a minimal valid product', () => {
    const result = validateCreateProduct(validBody());

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      name: 'Shirt',
      baseUnit: { unitId: 'kg-1', price: 120.5 },
    });
  });

  it('allows an integer price string of "0" style trimmed values', () => {
    const result = validateCreateProduct({
      name: 'Shirt',
      baseUnit: { unitId: 'kg-1', price: ' 50 ' },
    });

    expect(result.errors).toBeNull();
    expect(result.data?.baseUnit.price).toBe(50);
  });

  it('rejects an empty name', () => {
    const result = validateCreateProduct(validBody({ name: '' }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ name: expect.any(String) });
  });

  it('rejects a name over 100 characters', () => {
    const result = validateCreateProduct(validBody({ name: 'a'.repeat(101) }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ name: expect.any(String) });
  });

  it('rejects a missing baseUnit', () => {
    const result = validateCreateProduct({ name: 'Shirt' } as CreateProductFormValues);

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ baseUnit: expect.any(String) });
  });

  it('rejects an undefined baseUnit', () => {
    const result = validateCreateProduct(validBody({ baseUnit: undefined }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ baseUnit: expect.any(String) });
  });

  it('rejects a non-decimal price string', () => {
    const result = validateCreateProduct(
      validBody({
        baseUnit: { unitId: 'kg-1', price: 'abc' },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'baseUnit.price': expect.any(String) });
  });

  it('accepts a price string with more than two decimals', () => {
    const result = validateCreateProduct(
      validBody({
        baseUnit: { unitId: 'kg-1', price: '10.123' },
      }),
    );

    expect(result.errors).toBeNull();
    expect(result.data?.baseUnit.price).toBe(10.123);
  });

  it('rejects a zero price', () => {
    const result = validateCreateProduct(
      validBody({
        baseUnit: { unitId: 'kg-1', price: '0' },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'baseUnit.price': expect.any(String) });
  });

  it('rejects a negative price', () => {
    const result = validateCreateProduct(
      validBody({
        baseUnit: { unitId: 'kg-1', price: '-5' },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'baseUnit.price': expect.any(String) });
  });

  it('rejects an undefined price', () => {
    const result = validateCreateProduct(
      validBody({
        baseUnit: { unitId: 'kg-1', price: undefined },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'baseUnit.price': expect.any(String) });
  });

  it('rejects an undefined unitId on the base unit', () => {
    const result = validateCreateProduct(
      validBody({
        baseUnit: { unitId: undefined, price: '120.50' },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'baseUnit.unitId': expect.any(String) });
  });

  it('rejects an undefined name', () => {
    const result = validateCreateProduct(validBody({ name: undefined }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ name: expect.any(String) });
  });

  it('rejects a negative conversion rate on the MOU', () => {
    const result = validateCreateProduct(
      validBody({
        mou: { unitId: 'pc-1', conversionRate: -1 },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({
      'mou.conversionRate': expect.any(String),
    });
  });

  it('rejects an undefined conversionRate on the MOU', () => {
    const result = validateCreateProduct(
      validBody({
        mou: { unitId: 'pc-1', conversionRate: undefined },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({
      'mou.conversionRate': expect.any(String),
    });
  });

  it('rejects an MOU equal to the base unit', () => {
    const result = validateCreateProduct(
      validBody({
        mou: { unitId: 'kg-1', conversionRate: 1 },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'mou.unitId': expect.any(String) });
  });

  it('accepts trackAsPartial without an MOU', () => {
    const result = validateCreateProduct(validBody({ trackAsPartial: true }));

    expect(result.errors).toBeNull();
  });

  it('accepts trackAsPartial when an MOU is provided', () => {
    const result = validateCreateProduct(
      validBody({
        trackAsPartial: true,
        mou: { unitId: 'pc-1', conversionRate: 10 },
      }),
    );

    expect(result.errors).toBeNull();
  });

  it('drops an MOU that has no content unit selected', () => {
    const result = validateCreateProduct(
      validBody({
        mou: { unitId: '', conversionRate: '' },
      }),
    );

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ name: 'Shirt', baseUnit: { unitId: 'kg-1', price: 120.5 } });
    expect(result.data?.mou).toBeUndefined();
  });

  it('drops an MOU whose content unit is only whitespace', () => {
    const result = validateCreateProduct(
      validBody({ mou: { unitId: '   ', conversionRate: '10' } }),
    );

    expect(result.errors).toBeNull();
    expect(result.data?.mou).toBeUndefined();
  });

  it('stops requiring a conversion rate once the content unit is unset', () => {
    const withUnit = validateCreateProduct(
      validBody({ mou: { unitId: 'pc-1', conversionRate: '' } }),
    );
    const withoutUnit = validateCreateProduct(
      validBody({ mou: { unitId: '', conversionRate: '' } }),
    );

    expect(withUnit.errors).toEqual({ 'mou.conversionRate': expect.any(String) });
    expect(withoutUnit.errors).toBeNull();
    expect(withoutUnit.data?.mou).toBeUndefined();
  });

  it('returns the root error when the whole payload is undefined', () => {
    const result = validateCreateProduct(undefined as unknown as CreateProductFormValues);

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ _root: expect.any(String) });
  });

  it('rejects unknown top-level fields', () => {
    const result = validateCreateProduct(validBody({ id: 'product-1' }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ _root: expect.any(String) });
  });

  it('rejects unknown fields inside the base unit', () => {
    const result = validateCreateProduct(
      validBody({
        baseUnit: { unitId: 'kg-1', price: '120.50', dimensionId: 'd-1' },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ baseUnit: expect.any(String) });
  });

  it('rejects a negative low stock threshold', () => {
    const result = validateCreateProduct(validBody({ lowStockThreshold: -1 }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ lowStockThreshold: expect.any(String) });
  });
});

/**
 * The cross-field MOU rules are chained after the product object, so a fatal
 * field error used to abort the whole parse and skip every one of them. An empty
 * sell price was the common case: it coerced to `NaN` and the content unit
 * conflict stayed invisible until a price had been typed.
 *
 * Each case pins the rule that the conflict is reported together with the
 * offending field, rather than only after the rest of the form becomes valid.
 * Only the error keys are asserted, since the copy lives in this schema.
 */
describe('cross-field MOU rules are independent of the other fields', () => {
  /** Same unit as the base unit, so `mou.unitId` is in conflict. */
  const sameUnitMou = { unitId: 'kg-1', conversionRate: 10 };

  it('reports the unit conflict while the price is empty', () => {
    const result = validateCreateProduct(
      validBody({
        baseUnit: { unitId: 'kg-1', price: '' },
        mou: sameUnitMou,
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual(
      expect.objectContaining({
        'baseUnit.price': expect.any(String),
        'mou.unitId': expect.any(String),
      }),
    );
  });

  it('reports the unit conflict while the price is not a number', () => {
    const result = validateCreateProduct(
      validBody({
        baseUnit: { unitId: 'kg-1', price: 'abc' },
        mou: sameUnitMou,
      }),
    );

    expect(result.errors).toEqual(
      expect.objectContaining({
        'baseUnit.price': expect.any(String),
        'mou.unitId': expect.any(String),
      }),
    );
  });

  it('reports the unit conflict while the conversion rate is not a number', () => {
    const result = validateCreateProduct(
      validBody({
        mou: { ...sameUnitMou, conversionRate: 'abc' },
      }),
    );

    expect(result.errors).toEqual(
      expect.objectContaining({
        'mou.conversionRate': expect.any(String),
        'mou.unitId': expect.any(String),
      }),
    );
  });

  it('reports the unit conflict while the name is missing', () => {
    const result = validateCreateProduct(validBody({ name: undefined, mou: sameUnitMou }));

    expect(result.errors).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        'mou.unitId': expect.any(String),
      }),
    );
  });

  it('reports the unit conflict while the low stock threshold is not a number', () => {
    const result = validateCreateProduct(validBody({ lowStockThreshold: 'abc', mou: sameUnitMou }));

    expect(result.errors).toEqual(
      expect.objectContaining({
        lowStockThreshold: expect.any(String),
        'mou.unitId': expect.any(String),
      }),
    );
  });
});

/**
 * The form carries a dimension on each unit; the body does not. The dimension
 * rules therefore only exist here, so they are checked against the form schema
 * rather than through `validateCreateProduct`.
 */
describe('createProductFormSchema', () => {
  it('accepts a product with a MOU in a different dimension', () => {
    const result = validateInput(
      createProductFormSchema,
      validFormValues({
        brand: 'Nike',
        description: 'Cotton t-shirt',
        trackAsPartial: false,
        lowStockThreshold: 5,
        uploadId: 'u-1',
        baseUnit: { unitId: 'kg-1', dimensionId: 'd-1', price: '120.50' },
        mou: { unitId: 'pc-1', dimensionId: 'd-2', conversionRate: 10, price: 15 },
      }),
    );

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      name: 'Shirt',
      brand: 'Nike',
      description: 'Cotton t-shirt',
      trackAsPartial: false,
      lowStockThreshold: 5,
      uploadId: 'u-1',
      baseUnit: { unitId: 'kg-1', price: 120.5 },
      mou: { unitId: 'pc-1', conversionRate: 10, price: 15 },
    });
  });

  it('requires a dimensionId and emits none', () => {
    const result = validateInput(
      createProductFormSchema,
      validFormValues({
        mou: { unitId: 'pc-1', dimensionId: 'd-2', conversionRate: 10 },
      }),
    );
    const data = result.data as Record<string, unknown>;

    expect(data.baseUnit).not.toHaveProperty('dimensionId');
    expect(data.mou as Record<string, unknown>).not.toHaveProperty('dimensionId');
  });

  it('rejects a missing dimensionId on the base unit', () => {
    const result = validateInput(
      createProductFormSchema,
      validFormValues({
        baseUnit: { unitId: 'kg-1', price: '120.50' },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({
      'baseUnit.dimensionId': expect.any(String),
    });
  });

  it('rejects an undefined dimensionId on the base unit', () => {
    const result = validateInput(
      createProductFormSchema,
      validFormValues({
        baseUnit: { unitId: 'kg-1', dimensionId: undefined, price: '120.50' },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({
      'baseUnit.dimensionId': expect.any(String),
    });
  });

  it('rejects a MOU in the same dimension as the base unit', () => {
    const result = validateInput(
      createProductFormSchema,
      validFormValues({
        mou: { unitId: 'g-1', dimensionId: 'd-1', conversionRate: 1000 },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'mou.dimensionId': expect.any(String) });
  });

  it('still requires the dimension once a content unit is selected', () => {
    const result = validateInput(
      createProductFormSchema,
      validFormValues({ mou: { unitId: 'pc-1', conversionRate: '10' } }),
    );

    expect(result.errors).toEqual({ 'mou.dimensionId': expect.any(String) });
  });

  it('reports the dimension conflict while the price is empty', () => {
    const result = validateInput(
      createProductFormSchema,
      validFormValues({
        baseUnit: { unitId: 'kg-1', dimensionId: 'd-1', price: '' },
        mou: { unitId: 'pc-1', dimensionId: 'd-1', conversionRate: 10 },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual(
      expect.objectContaining({
        'baseUnit.price': expect.any(String),
        'mou.dimensionId': expect.any(String),
      }),
    );
  });

  it('reports the missing MOU dimension while the name is missing', () => {
    const result = validateInput(
      createProductFormSchema,
      validFormValues({
        name: undefined,
        mou: { unitId: 'pc-1', conversionRate: 10 },
      }),
    );

    expect(result.errors).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        'mou.dimensionId': expect.any(String),
      }),
    );
  });
});

/**
 * The body contract, exercised on its own: the API takes no dimension, because
 * the repository resolves it from the unit it looks up.
 */
describe('validateCreateProduct on a request body', () => {
  it('accepts a price sent as a numeric string or as a JSON number', () => {
    const asString = validateCreateProduct({
      name: 'Shirt',
      baseUnit: { unitId: 'kg-1', price: '120.50' },
    });
    const asNumber = validateCreateProduct({
      name: 'Shirt',
      baseUnit: { unitId: 'kg-1', price: 120.5 },
    });

    expect(asString.errors).toBeNull();
    expect(asString.data).toEqual({
      name: 'Shirt',
      baseUnit: { unitId: 'kg-1', price: 120.5 },
    });
    expect(asString.data).toEqual(asNumber.data);
  });

  /**
   * The regression this split exists for: the form and the API used to share one
   * schema, so the payload the form produced was rejected by the check meant for the
   * form's own input, and creating a product returned a 400.
   */
  it('accepts the payload the form puts on the wire', () => {
    const parsed = createProductFormSchema.safeParse({
      name: 'Shirt',
      baseUnit: { unitId: 'kg-1', dimensionId: 'd-1', price: '120.50' },
      mou: { unitId: 'pc-1', dimensionId: 'd-2', conversionRate: '10', price: '15' },
    } as CreateProductFormValues);
    expect(parsed.success).toBe(true);

    const body = JSON.parse(JSON.stringify(parsed.data));
    expect(body.baseUnit).not.toHaveProperty('dimensionId');
    expect(body.mou).not.toHaveProperty('dimensionId');

    const result = validateCreateProduct(body);

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      name: 'Shirt',
      baseUnit: { unitId: 'kg-1', price: 120.5 },
      mou: { unitId: 'pc-1', conversionRate: 10, price: 15 },
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

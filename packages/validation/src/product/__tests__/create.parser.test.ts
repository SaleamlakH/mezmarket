import { describe, it, expect } from 'vitest';
import type { CreateProductFormValues } from '@mez/types';
import { validateCreateProduct, validateInput } from '../../parser.js';
import { createProductFormSchema } from '../create.schema.js';

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

describe('validateCreateProduct', () => {
  it('accepts a minimal valid product', () => {
    const result = validateCreateProduct(validBody());

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      ...emptyProductFields,
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
    expect(result.data).toEqual({
      ...emptyProductFields,
      name: 'Shirt',
      baseUnit: { unitId: 'kg-1', price: 120.5 },
    });
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
      ...emptyProductFields,
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
      ...emptyProductFields,
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
      customUnits: [],
    } as CreateProductFormValues);
    expect(parsed.success).toBe(true);

    const body = JSON.parse(JSON.stringify(parsed.data));
    expect(body.baseUnit).not.toHaveProperty('dimensionId');
    expect(body.mou).not.toHaveProperty('dimensionId');

    const result = validateCreateProduct(body);

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      ...emptyProductFields,
      name: 'Shirt',
      baseUnit: { unitId: 'kg-1', price: 120.5 },
      mou: { unitId: 'pc-1', conversionRate: 10, price: 15 },
    });
  });
});

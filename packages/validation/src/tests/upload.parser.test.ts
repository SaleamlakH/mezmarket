import { describe, it, expect } from 'vitest';
import { validateCreateUpload, validateUpdateUpload } from '../parser.js';
import type { CreateUploadClientInput, UpdateUploadClientInput } from '../schema/upload.schema.js';
import {
  MAX_UPLOAD_SIZE_BYTES,
  createUploadSchema,
  updateUploadSchema,
} from '../schema/upload.schema.js';

function validUpload(overrides: Record<string, unknown> = {}) {
  return {
    record: 'PRODUCT',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    ...overrides,
  } as CreateUploadClientInput;
}

describe('validateCreateUpload', () => {
  it('accepts a valid upload', () => {
    const result = validateCreateUpload(validUpload());

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ record: 'PRODUCT', mimeType: 'image/jpeg', sizeBytes: 1024 });
  });

  it('accepts an upload without a size', () => {
    const result = validateCreateUpload({ record: 'PRODUCT', mimeType: 'image/png' });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ record: 'PRODUCT', mimeType: 'image/png', sizeBytes: undefined });
  });

  it('accepts an explicitly undefined sizeBytes', () => {
    const result = validateCreateUpload(validUpload({ sizeBytes: undefined }));

    expect(result.errors).toBeNull();
  });

  it('accepts every supported image mime type', () => {
    for (const mimeType of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']) {
      const result = validateCreateUpload(validUpload({ mimeType }));
      expect(result.errors, mimeType).toBeNull();
    }
  });

  it('rejects a missing record', () => {
    const result = validateCreateUpload({
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
    } as CreateUploadClientInput);

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ record: expect.any(String) });
  });

  it('rejects an explicitly undefined record', () => {
    const result = validateCreateUpload({
      record: undefined,
      mimeType: 'image/jpeg',
    } as unknown as CreateUploadClientInput);

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ record: expect.any(String) });
  });

  it('rejects an unsupported record type', () => {
    const result = validateCreateUpload(validUpload({ record: 'PHOTO' }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ record: expect.any(String) });
  });

  it('rejects a missing mime type', () => {
    const result = validateCreateUpload({
      record: 'PRODUCT',
      sizeBytes: 1024,
    } as CreateUploadClientInput);

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ mimeType: expect.any(String) });
  });

  it('rejects an explicitly undefined mimeType', () => {
    const result = validateCreateUpload({
      record: 'PRODUCT',
      mimeType: undefined,
    } as unknown as CreateUploadClientInput);

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ mimeType: expect.any(String) });
  });

  it('rejects a non-image mime type', () => {
    const result = validateCreateUpload(validUpload({ mimeType: 'application/pdf' }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ mimeType: expect.any(String) });
  });

  it('rejects a zero size', () => {
    const result = validateCreateUpload(validUpload({ sizeBytes: 0 }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ sizeBytes: expect.any(String) });
  });

  it('rejects a negative size', () => {
    const result = validateCreateUpload(validUpload({ sizeBytes: -10 }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ sizeBytes: expect.any(String) });
  });

  it('rejects a non-integer size', () => {
    const result = validateCreateUpload(validUpload({ sizeBytes: 10.5 }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ sizeBytes: expect.any(String) });
  });

  it('rejects a size over the 10MB limit', () => {
    const result = validateCreateUpload(validUpload({ sizeBytes: MAX_UPLOAD_SIZE_BYTES + 1 }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ sizeBytes: expect.any(String) });
  });

  it('returns the root error when the whole payload is undefined', () => {
    const result = validateCreateUpload(undefined as unknown as CreateUploadClientInput);

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ _root: expect.any(String) });
  });

  it('rejects unknown fields', () => {
    const result = validateCreateUpload(validUpload({ filename: 'photo.jpg' }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ _root: expect.any(String) });
  });
});

describe('validateUpdateUpload', () => {
  it('is the create upload rules, since the request is the same shape', () => {
    expect(updateUploadSchema).toBe(createUploadSchema);
  });

  it('accepts a valid update', () => {
    const result = validateUpdateUpload({
      record: 'PRODUCT',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
    });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      record: 'PRODUCT',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
    });
  });

  it('accepts an update without a size', () => {
    const result = validateUpdateUpload({ record: 'PRODUCT', mimeType: 'image/png' });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      record: 'PRODUCT',
      mimeType: 'image/png',
      sizeBytes: undefined,
    });
  });

  it('rejects a missing record', () => {
    const result = validateUpdateUpload({ mimeType: 'image/jpeg' } as UpdateUploadClientInput);

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ record: expect.any(String) });
  });

  it('rejects an unsupported record type', () => {
    const result = validateUpdateUpload({
      record: 'PHOTO',
      mimeType: 'image/jpeg',
    } as unknown as UpdateUploadClientInput);

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ record: expect.any(String) });
  });

  it('rejects a missing mime type', () => {
    const result = validateUpdateUpload({ record: 'PRODUCT' } as UpdateUploadClientInput);

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ mimeType: expect.any(String) });
  });

  it('rejects a size over the 10MB limit', () => {
    const result = validateUpdateUpload({
      record: 'PRODUCT',
      mimeType: 'image/jpeg',
      sizeBytes: MAX_UPLOAD_SIZE_BYTES + 1,
    });

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ sizeBytes: expect.any(String) });
  });

  it('rejects unknown fields', () => {
    const result = validateUpdateUpload({
      record: 'PRODUCT',
      mimeType: 'image/jpeg',
      filename: 'photo.jpg',
    } as unknown as UpdateUploadClientInput);

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ _root: expect.any(String) });
  });

  it('returns the root error when the whole payload is undefined', () => {
    const result = validateUpdateUpload(undefined as unknown as UpdateUploadClientInput);

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ _root: expect.any(String) });
  });
});

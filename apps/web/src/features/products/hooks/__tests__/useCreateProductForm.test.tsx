import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CreateProductResponse, UnitsResponse } from '@mez/types';
import { MAX_UPLOAD_SIZE_BYTES, type CreateProductFormValues } from '@mez/validation';
import { useCreateProductForm } from '../useCreateProductForm';
import { productsService } from '@/features/products/api/productsService';
import { unitsService } from '@/features/products/api/unitsService';

vi.mock('@/features/products/api/productsService', () => ({
  productsService: {
    listProducts: vi.fn(),
    createProduct: vi.fn(),
    createProductUpload: vi.fn(),
    putFile: vi.fn(),
    getProductUploadUrls: vi.fn(),
  },
}));

vi.mock('@/features/products/api/unitsService', () => ({
  unitsService: { listUnits: vi.fn() },
}));

const units: UnitsResponse = {
  dimensions: [
    {
      id: 'd-1',
      name: 'Weight',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      units: [
        {
          id: 'u-1',
          dimensionId: 'd-1',
          name: 'Kilogram',
          symbol: 'kg',
          ratioToReferenceUnit: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
    {
      id: 'd-2',
      name: 'Volume',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      units: [
        {
          id: 'u-3',
          dimensionId: 'd-2',
          name: 'Liter',
          symbol: 'L',
          ratioToReferenceUnit: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
  ],
};

const created: CreateProductResponse = {
  id: 'p-1',
  businessId: 'b-1',
  branchId: 'br-1',
  categoryId: null,
  name: 'Honey',
  brand: null,
  description: null,
  trackAsPartial: false,
  lowStockThreshold: null,
  currentSealedStock: 0,
  active: true,
  uploadId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  units: [],
};

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function renderForm(onCreated = vi.fn()) {
  return renderHook(() => useCreateProductForm({ businessId: 'b-1', onCreated }), {
    wrapper: wrapper(createClient()),
  });
}

function fillBaseUnit(form: ReturnType<typeof useCreateProductForm>) {
  act(() => {
    form.setValue('name', 'Honey');
    form.setValue('baseUnit.unitId', 'u-1');
    form.setValue('baseUnit.dimensionId', 'd-1');
    form.setValue('baseUnit.price', '250');
  });
}

async function submit(form: ReturnType<typeof useCreateProductForm>) {
  await act(async () => {
    await form.handleSubmit();
  });
}

async function blurField(
  form: ReturnType<typeof useCreateProductForm>,
  name: 'mou.unitId' | 'mou.conversionRate',
) {
  await act(async () => {
    await form.trigger(name);
  });
}

function createProductPayload() {
  const call = vi.mocked(productsService.createProduct).mock.calls[0];
  if (!call) throw new Error('createProduct was not called');
  return call[1];
}

type MouValues = NonNullable<CreateProductFormValues['mou']>;

/**
 * The schema treats `conversionRate` as required, but the form values type
 * declares it as a required string, so an actually-absent key can only be
 * expressed with a cast. This is the shape a touched-but-incomplete form
 * submits, and it is the only way to reach the schema's required branch.
 */
const mouWithoutRate = { unitId: 'u-3', dimensionId: 'd-2' } as MouValues;

/**
 * Validation copy lives in `@mez/validation` and is expected to change, so the
 * tests only assert that a message is present, never what it says.
 */
function expectMessage(message: string | undefined) {
  expect(message).toEqual(expect.any(String));
  expect(message).not.toHaveLength(0);
}

describe('useCreateProductForm', () => {
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(unitsService.listUnits).mockResolvedValue(units as never);
    vi.mocked(productsService.createProduct).mockResolvedValue(created as never);
    vi.mocked(productsService.createProductUpload).mockResolvedValue({
      upload: { id: 'up-1' },
      uploadUrl: 'https://bucket.example/up-1',
    } as never);
    vi.mocked(productsService.putFile).mockResolvedValue(undefined as never);
  });

  it('initializes with empty default values and no errors', () => {
    const { result } = renderForm(onCreated);

    expect(result.current.getValues()).toEqual({
      name: '',
      baseUnit: { unitId: '', dimensionId: '', price: '' },
    });
    expect(result.current.formState.errors).toEqual({});
    expect(result.current.file).toBeNull();
    expect(result.current.imageError).toBeNull();
    expect(result.current.formError).toBeUndefined();
  });

  it('exposes the unit reference data once the units query resolves', async () => {
    const { result } = renderForm(onCreated);

    await waitFor(() => expect(result.current.unitsLoading).toBe(false));
    expect(result.current.dimensions).toEqual(units.dimensions);
    expect(result.current.dimensionByUnitId.get('u-1')).toBe('d-1');
    expect(result.current.dimensionByUnitId.get('u-3')).toBe('d-2');
    expect(result.current.unitName('u-1')).toBe('Kilogram');
  });

  it('resolves unit names to an empty string for a missing or absent id', async () => {
    const { result } = renderForm(onCreated);

    await waitFor(() => expect(result.current.unitsLoading).toBe(false));
    expect(result.current.unitName()).toBe('');
    expect(result.current.unitName('nope')).toBe('');
  });

  it('blocks submission when the form is empty', async () => {
    const { result } = renderForm(onCreated);

    await submit(result.current);

    expect(productsService.createProduct).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('reports a message for every required field on an empty submit', async () => {
    const { result } = renderForm(onCreated);

    await submit(result.current);

    expectMessage(result.current.formState.errors.name?.message);
    expectMessage(result.current.formState.errors.baseUnit?.unitId?.message);
    expectMessage(result.current.formState.errors.baseUnit?.dimensionId?.message);
    expectMessage(result.current.formState.errors.baseUnit?.price?.message);
    expect(productsService.createProduct).not.toHaveBeenCalled();
  });

  it('reports a message when the price is not a positive number', async () => {
    const { result } = renderForm(onCreated);

    act(() => {
      result.current.setValue('name', 'Honey');
      result.current.setValue('baseUnit.unitId', 'u-1');
      result.current.setValue('baseUnit.dimensionId', 'd-1');
      result.current.setValue('baseUnit.price', '0');
    });
    await submit(result.current);

    expectMessage(result.current.formState.errors.baseUnit?.price?.message);
    expect(productsService.createProduct).not.toHaveBeenCalled();
  });

  it('reports a message when the MOU reuses the base unit', async () => {
    const { result } = renderForm(onCreated);

    fillBaseUnit(result.current);
    act(() => {
      result.current.setValue('mou', {
        unitId: 'u-1',
        dimensionId: 'd-1',
        conversionRate: '4',
        price: '350',
      });
    });
    await submit(result.current);

    expectMessage(result.current.formState.errors.mou?.unitId?.message);
    expect(productsService.createProduct).not.toHaveBeenCalled();
  });

  it('reports a conversion rate error only once an MOU is provided', async () => {
    const { result } = renderForm(onCreated);

    fillBaseUnit(result.current);
    await submit(result.current);

    expect(productsService.createProduct).toHaveBeenCalledTimes(1);
    expect(result.current.formState.errors.mou).toBeUndefined();
    expect(result.current.formState.errors.mou?.conversionRate?.message).toBeUndefined();
  });

  it('drops the MOU from the payload when no content unit was selected', async () => {
    const { result } = renderForm(onCreated);

    fillBaseUnit(result.current);
    act(() => {
      result.current.setValue('mou', { unitId: '', dimensionId: '', conversionRate: '' });
    });
    await submit(result.current);

    expect(result.current.formState.errors.mou).toBeUndefined();
    expect(productsService.createProduct).toHaveBeenCalledTimes(1);
    expect(createProductPayload().mou).toBeUndefined();
  });

  it('stays silent when the MOU fields are blurred without a selection', async () => {
    const { result } = renderForm(onCreated);

    fillBaseUnit(result.current);
    act(() => {
      result.current.setValue('mou', { unitId: '', dimensionId: '', conversionRate: '' });
    });

    await blurField(result.current, 'mou.unitId');
    await blurField(result.current, 'mou.conversionRate');

    expect(result.current.formState.errors.mou).toBeUndefined();
    expect(result.current.formState.errors.mou?.conversionRate?.message).toBeUndefined();
  });

  it('reports a conversion rate error when an MOU leaves the rate blank', async () => {
    const { result } = renderForm(onCreated);

    fillBaseUnit(result.current);
    act(() => {
      result.current.setValue('mou', { unitId: 'u-3', dimensionId: 'd-2', conversionRate: '' });
    });
    await submit(result.current);

    expectMessage(result.current.formState.errors.mou?.conversionRate?.message);
    expect(productsService.createProduct).not.toHaveBeenCalled();
  });

  it('reports a conversion rate error when an MOU omits the rate entirely', async () => {
    const { result } = renderForm(onCreated);

    fillBaseUnit(result.current);
    act(() => {
      result.current.setValue('mou', mouWithoutRate);
    });
    await submit(result.current);

    expectMessage(result.current.formState.errors.mou?.conversionRate?.message);
    expect(productsService.createProduct).not.toHaveBeenCalled();
  });

  it('reports a conversion rate error when an MOU sets it to zero', async () => {
    const { result } = renderForm(onCreated);

    fillBaseUnit(result.current);
    act(() => {
      result.current.setValue('mou', {
        unitId: 'u-3',
        dimensionId: 'd-2',
        conversionRate: '0',
      });
    });
    await submit(result.current);

    expectMessage(result.current.formState.errors.mou?.conversionRate?.message);
    expect(productsService.createProduct).not.toHaveBeenCalled();
  });

  it('submits the adapted payload drawn from the form values', async () => {
    const { result } = renderForm(onCreated);

    fillBaseUnit(result.current);
    await submit(result.current);

    expect(productsService.createProduct).toHaveBeenCalledWith(
      'b-1',
      expect.objectContaining({
        name: 'Honey',
        baseUnit: { unitId: 'u-1', price: 250 },
      }),
    );
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(result.current.formState.isSubmitting).toBe(false);
  });

  it('coerces the low-stock threshold and MOU numbers into the payload', async () => {
    const { result } = renderForm(onCreated);

    fillBaseUnit(result.current);
    act(() => {
      result.current.setValue('lowStockThreshold', '10');
      result.current.setValue('trackAsPartial', true);
      result.current.setValue('mou', {
        unitId: 'u-3',
        dimensionId: 'd-2',
        conversionRate: '4',
        price: '350',
      });
    });

    await submit(result.current);

    expect(productsService.createProduct).toHaveBeenCalledWith(
      'b-1',
      expect.objectContaining({
        name: 'Honey',
        trackAsPartial: true,
        lowStockThreshold: 10,
        mou: { unitId: 'u-3', conversionRate: 4, price: 350 },
      }),
    );
  });

  it('omits the uploadId key entirely when no image was picked', async () => {
    const { result } = renderForm(onCreated);

    fillBaseUnit(result.current);
    await submit(result.current);

    expect(productsService.createProductUpload).not.toHaveBeenCalled();
    expect(productsService.putFile).not.toHaveBeenCalled();
    expect(Object.hasOwn(createProductPayload(), 'uploadId')).toBe(false);
  });

  it('requests upload authorization as soon as an acceptable image is picked', async () => {
    const { result } = renderForm(onCreated);

    const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await act(async () => {
      result.current.pickImage(photo);
    });

    expect(result.current.file).toBe(photo);
    expect(result.current.imageError).toBeNull();
    expect(productsService.createProductUpload).toHaveBeenCalledWith('b-1', {
      record: 'PRODUCT',
      mimeType: 'image/jpeg',
      sizeBytes: photo.size,
    });
    // The bytes are only sent at submission, once a product references them.
    expect(productsService.putFile).not.toHaveBeenCalled();
    expect(productsService.createProduct).not.toHaveBeenCalled();
  });

  it('never requests authorization for a file that fails validation', async () => {
    const { result } = renderForm(onCreated);

    await act(async () => {
      result.current.pickImage(new File(['x'], 'doc.txt', { type: 'text/plain' }));
    });

    expect(productsService.createProductUpload).not.toHaveBeenCalled();
  });

  it('uploads the picked image and attaches its uploadId at submission', async () => {
    const { result } = renderForm(onCreated);

    const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await act(async () => {
      result.current.pickImage(photo);
    });

    fillBaseUnit(result.current);
    await submit(result.current);

    expect(productsService.createProductUpload).toHaveBeenCalledTimes(1);
    expect(productsService.putFile).toHaveBeenCalledWith('https://bucket.example/up-1', photo);
    expect(productsService.createProduct).toHaveBeenCalledWith(
      'b-1',
      expect.objectContaining({ uploadId: 'up-1' }),
    );
    expect(createProductPayload().uploadId).toBe('up-1');
  });

  it('waits for an authorization request that is still in flight at submission', async () => {
    let release!: (value: { upload: { id: string }; uploadUrl: string }) => void;
    vi.mocked(productsService.createProductUpload).mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }) as never,
    );

    const { result } = renderForm(onCreated);

    const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await act(async () => {
      result.current.pickImage(photo);
    });

    fillBaseUnit(result.current);

    let submitting!: Promise<unknown>;
    act(() => {
      submitting = result.current.handleSubmit();
    });

    // The product cannot be created yet, because the upload id it needs is
    // still on its way.
    expect(productsService.createProduct).not.toHaveBeenCalled();

    await act(async () => {
      release({ upload: { id: 'up-1' }, uploadUrl: 'https://bucket.example/up-1' });
      await submitting;
    });

    expect(productsService.createProduct).toHaveBeenCalledWith(
      'b-1',
      expect.objectContaining({ uploadId: 'up-1' }),
    );
    expect(productsService.putFile).toHaveBeenCalledWith('https://bucket.example/up-1', photo);
  });

  it('drops the image and reports a message when authorization fails', async () => {
    vi.mocked(productsService.createProductUpload).mockRejectedValue(
      new Error('The image could not be prepared'),
    );

    const { result } = renderForm(onCreated);

    await act(async () => {
      result.current.pickImage(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }));
    });

    expect(result.current.file).toBeNull();
    expect(result.current.previewUrl).toBeNull();
    expect(result.current.imageError).toBe('The image could not be prepared');
    expect(productsService.putFile).not.toHaveBeenCalled();
  });

  it('creates the product without an image when authorization fails', async () => {
    vi.mocked(productsService.createProductUpload).mockRejectedValue(new Error('nope'));

    const { result } = renderForm(onCreated);

    await act(async () => {
      result.current.pickImage(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }));
    });

    fillBaseUnit(result.current);
    await submit(result.current);

    expect(productsService.createProduct).toHaveBeenCalledTimes(1);
    expect(Object.hasOwn(createProductPayload(), 'uploadId')).toBe(false);
    expect(onCreated).toHaveBeenCalledWith(created);
  });

  it('ignores the response of a selection that has been superseded', async () => {
    const first = new File(['x'], 'first.jpg', { type: 'image/jpeg' });
    const second = new File(['x'], 'second.jpg', { type: 'image/jpeg' });

    let releaseFirst!: (value: { upload: { id: string }; uploadUrl: string }) => void;
    vi.mocked(productsService.createProductUpload)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          releaseFirst = resolve;
        }) as never,
      )
      .mockResolvedValue({
        upload: { id: 'up-2' },
        uploadUrl: 'https://bucket.example/up-2',
      } as never);

    const { result } = renderForm(onCreated);

    await act(async () => {
      result.current.pickImage(first);
    });
    await act(async () => {
      result.current.pickImage(second);
    });

    await act(async () => {
      releaseFirst({ upload: { id: 'up-1' }, uploadUrl: 'https://bucket.example/up-1' });
    });

    fillBaseUnit(result.current);
    await submit(result.current);

    expect(productsService.putFile).toHaveBeenCalledWith('https://bucket.example/up-2', second);
    expect(createProductPayload().uploadId).toBe('up-2');
  });

  it('ignores a superseded selection that fails after being replaced', async () => {
    let rejectFirst!: (reason: Error) => void;
    vi.mocked(productsService.createProductUpload)
      .mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectFirst = reject;
        }) as never,
      )
      .mockResolvedValue({
        upload: { id: 'up-2' },
        uploadUrl: 'https://bucket.example/up-2',
      } as never);

    const { result } = renderForm(onCreated);

    await act(async () => {
      result.current.pickImage(new File(['x'], 'first.jpg', { type: 'image/jpeg' }));
    });
    const second = new File(['x'], 'second.jpg', { type: 'image/jpeg' });
    await act(async () => {
      result.current.pickImage(second);
    });

    await act(async () => {
      rejectFirst(new Error('too late'));
    });

    expect(result.current.file).toBe(second);
    expect(result.current.imageError).toBeNull();

    fillBaseUnit(result.current);
    await submit(result.current);

    expect(createProductPayload().uploadId).toBe('up-2');
  });

  it('does not block product creation when the direct file transfer fails', async () => {
    vi.mocked(productsService.putFile).mockRejectedValue(new Error('upload exploded'));

    const { result } = renderForm(onCreated);

    const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await act(async () => {
      result.current.pickImage(photo);
    });

    fillBaseUnit(result.current);
    await submit(result.current);

    expect(productsService.createProductUpload).toHaveBeenCalled();
    expect(productsService.createProduct).toHaveBeenCalledWith(
      'b-1',
      expect.objectContaining({ uploadId: 'up-1' }),
    );
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(result.current.formState.errors.root?.message).toBeUndefined();
    expect(result.current.formState.isSubmitting).toBe(false);
  });

  it('clears the picked image and reports a message for an unsupported type', () => {
    const { result } = renderForm(onCreated);

    act(() => result.current.pickImage(new File(['x'], 'doc.txt', { type: 'text/plain' })));

    expect(result.current.file).toBeNull();
    expectMessage(result.current.imageError ?? undefined);
  });

  it('clears the picked image and reports a message for an oversized file', () => {
    const { result } = renderForm(onCreated);

    const bytes = new Uint8Array(MAX_UPLOAD_SIZE_BYTES + 1);
    const photo = new File([bytes], 'photo.png', { type: 'image/png' });
    act(() => result.current.pickImage(photo));

    expect(result.current.file).toBeNull();
    expectMessage(result.current.imageError ?? undefined);
  });

  it('keeps a valid image and clears a previous error when re-picked', () => {
    const { result } = renderForm(onCreated);

    act(() => result.current.pickImage(new File(['x'], 'doc.txt', { type: 'text/plain' })));
    expect(result.current.imageError).not.toBeNull();

    const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    act(() => result.current.pickImage(photo));

    expect(result.current.file).toBe(photo);
    expect(result.current.imageError).toBeNull();
  });

  it('resets the picked image and its error when the selection is cleared', () => {
    const { result } = renderForm(onCreated);

    const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    act(() => result.current.pickImage(photo));
    act(() => result.current.pickImage(null));

    expect(result.current.file).toBeNull();
    expect(result.current.imageError).toBeNull();
  });

  it('prepends the created product to the cached list', async () => {
    const client = createClient();
    const { result } = renderHook(() => useCreateProductForm({ businessId: 'b-1', onCreated }), {
      wrapper: wrapper(client),
    });

    fillBaseUnit(result.current);
    await submit(result.current);

    await waitFor(() => expect(client.getQueryData(['products', 'b-1'])).toEqual([created]));
  });

  it('prepends to the existing cache entries rather than replacing them', async () => {
    const client = createClient();
    const existing = { ...created, id: 'p-0' };
    client.setQueryData(['products', 'b-1'], [existing]);

    const { result } = renderHook(() => useCreateProductForm({ businessId: 'b-1', onCreated }), {
      wrapper: wrapper(client),
    });

    fillBaseUnit(result.current);
    await submit(result.current);

    await waitFor(() =>
      expect(client.getQueryData(['products', 'b-1'])).toEqual([created, existing]),
    );
  });

  it('surfaces the creation failure and skips onCreated', async () => {
    vi.mocked(productsService.createProduct).mockRejectedValue(new Error('Creation failed'));

    const { result } = renderForm(onCreated);

    fillBaseUnit(result.current);
    await submit(result.current);

    expect(productsService.createProduct).toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.formError).toBe('Creation failed'));
  });

  it('falls back to a generic message when the failure is not an Error', async () => {
    vi.mocked(productsService.createProduct).mockRejectedValue('boom');

    const { result } = renderForm(onCreated);

    fillBaseUnit(result.current);
    await submit(result.current);

    await waitFor(() => expect(result.current.formError).toBe('Something went wrong'));
  });

  it('keeps the picked image when creation fails', async () => {
    vi.mocked(productsService.createProduct).mockRejectedValue(new Error('Creation failed'));

    const { result } = renderForm(onCreated);

    const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    act(() => result.current.pickImage(photo));
    fillBaseUnit(result.current);
    await submit(result.current);

    await waitFor(() => expect(result.current.formError).toBe('Creation failed'));
    expect(result.current.file).toBe(photo);
  });

  it('exposes a preview url for the picked image', () => {
    const { result } = renderForm(onCreated);
    const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

    act(() => result.current.pickImage(photo));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(photo);
    expect(result.current.previewUrl).toBe(vi.mocked(URL.createObjectURL).mock.results[0]?.value);
  });

  it('revokes the superseded preview url when a new image is picked', () => {
    const { result } = renderForm(onCreated);

    act(() => result.current.pickImage(new File(['x'], 'first.jpg', { type: 'image/jpeg' })));
    const first = result.current.previewUrl;
    expect(first).not.toBeNull();

    act(() => result.current.pickImage(new File(['x'], 'second.jpg', { type: 'image/jpeg' })));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(first);
    expect(result.current.previewUrl).not.toBe(first);
  });

  it('revokes the preview url and clears it when the image is removed', () => {
    const { result } = renderForm(onCreated);

    act(() => result.current.pickImage(new File(['x'], 'photo.jpg', { type: 'image/jpeg' })));
    const preview = result.current.previewUrl;
    act(() => result.current.pickImage(null));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(preview);
    expect(result.current.previewUrl).toBeNull();
  });

  it('revokes the preview url when a rejected pick clears the held image', () => {
    const { result } = renderForm(onCreated);

    act(() => result.current.pickImage(new File(['x'], 'photo.jpg', { type: 'image/jpeg' })));
    const preview = result.current.previewUrl;
    act(() => result.current.pickImage(new File(['x'], 'doc.txt', { type: 'text/plain' })));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(preview);
    expect(result.current.previewUrl).toBeNull();
  });

  it('revokes the preview url on unmount', () => {
    const { result, unmount } = renderForm(onCreated);

    act(() => result.current.pickImage(new File(['x'], 'photo.jpg', { type: 'image/jpeg' })));
    const preview = result.current.previewUrl;
    expect(preview).not.toBeNull();

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(preview);
  });

  it('keeps the preview url stable when the form re-renders', async () => {
    const { result } = renderForm(onCreated);

    act(() => result.current.pickImage(new File(['x'], 'photo.jpg', { type: 'image/jpeg' })));
    const { previewUrl } = result.current;
    expect(previewUrl).not.toBeNull();

    // `setValue` on an uncontrolled field does not re-render the hook, so the
    // re-render is forced through `errors`, which the hook reads while rendering.
    await act(async () => {
      await result.current.trigger('name');
    });

    expect(result.current.formState.errors.name).toBeDefined();
    expect(result.current.previewUrl).toBe(previewUrl);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});

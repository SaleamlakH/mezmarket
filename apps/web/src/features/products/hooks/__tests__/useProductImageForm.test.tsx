import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { imageCache } from '@/lib/imageCache';
import { productsService } from '@/features/products/api/productsService';
import { useProductImageForm } from '../useProductImageForm';
import { makeProduct } from './fixtures';

vi.mock('@/features/products/api/productsService', () => ({
  productsService: {
    updateProductUpload: vi.fn(),
    putFile: vi.fn(),
  },
}));

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function renderForm(onSaved = vi.fn()) {
  const product = makeProduct();
  return renderHook(() => useProductImageForm({ businessId: 'b-1', product, onSaved }), {
    wrapper: wrapper(createClient()),
  });
}

function photo(name = 'photo.jpg') {
  return new File(['x'], name, { type: 'image/jpeg' });
}

/**
 * Validation copy lives in `@mez/validation` and is expected to change, so the
 * tests only assert that a message is present, never what it says.
 */
function expectMessage(message: string | undefined) {
  expect(message).toEqual(expect.any(String));
  expect(message).not.toHaveLength(0);
}

describe('useProductImageForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productsService.updateProductUpload).mockResolvedValue({
      upload: { id: 'up-9' },
      uploadUrl: 'https://bucket.example/up-9',
    } as never);
    vi.mocked(productsService.putFile).mockResolvedValue(undefined as never);
  });

  it('starts empty', () => {
    const { result } = renderForm();

    expect(result.current.file).toBeNull();
    expect(result.current.previewUrl).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('never authorizes a file that fails validation', async () => {
    const { result } = renderForm();

    await act(async () => {
      result.current.pick(new File(['x'], 'doc.txt', { type: 'text/plain' }));
    });

    expect(productsService.updateProductUpload).not.toHaveBeenCalled();
    expect(result.current.file).toBeNull();
    expectMessage(result.current.error ?? undefined);
  });

  it('authorizes as soon as a usable image is picked, without writing the bytes', async () => {
    const { result } = renderForm();
    const picked = photo();

    await act(async () => {
      result.current.pick(picked);
    });

    expect(productsService.updateProductUpload).toHaveBeenCalledWith('b-1', 'p-1', {
      record: 'PRODUCT',
      mimeType: 'image/jpeg',
      sizeBytes: picked.size,
    });
    expect(productsService.putFile).not.toHaveBeenCalled();
    expect(result.current.file).toBe(picked);
    expect(result.current.previewUrl).not.toBeNull();
    expect(result.current.isDirty).toBe(true);
  });

  it('writes the bytes and attaches the new upload to the product on save', async () => {
    const removeSpy = vi.spyOn(imageCache, 'remove');
    const onSaved = vi.fn();
    const { result } = renderForm(onSaved);
    const picked = photo();

    await act(async () => {
      result.current.pick(picked);
    });
    await act(async () => {
      await result.current.save();
    });

    expect(productsService.putFile).toHaveBeenCalledWith('https://bucket.example/up-9', picked);
    expect(removeSpy).toHaveBeenCalledWith('up-9');
    expect(result.current.file).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(onSaved).toHaveBeenCalledWith('Photo updated.');
    removeSpy.mockRestore();
  });

  it('waits for an authorization request still in flight at save', async () => {
    let release!: (value: { upload: { id: string }; uploadUrl: string }) => void;
    vi.mocked(productsService.updateProductUpload).mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }) as never,
    );
    const { result } = renderForm();
    const picked = photo();

    await act(async () => {
      result.current.pick(picked);
    });

    let saving!: Promise<boolean>;
    act(() => {
      saving = result.current.save();
    });

    expect(productsService.putFile).not.toHaveBeenCalled();

    await act(async () => {
      release({ upload: { id: 'up-9' }, uploadUrl: 'https://bucket.example/up-9' });
      await saving;
    });

    expect(productsService.putFile).toHaveBeenCalledWith('https://bucket.example/up-9', picked);
  });

  it('ignores the authorization response of a superseded selection', async () => {
    let releaseFirst!: (value: { upload: { id: string }; uploadUrl: string }) => void;
    vi.mocked(productsService.updateProductUpload)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          releaseFirst = resolve;
        }) as never,
      )
      .mockResolvedValue({
        upload: { id: 'up-2' },
        uploadUrl: 'https://bucket.example/up-2',
      } as never);
    const { result } = renderForm();

    await act(async () => {
      result.current.pick(photo('first.jpg'));
    });
    const second = photo('second.jpg');
    await act(async () => {
      result.current.pick(second);
    });

    await act(async () => {
      releaseFirst({ upload: { id: 'up-1' }, uploadUrl: 'https://bucket.example/up-1' });
    });
    await act(async () => {
      await result.current.save();
    });

    expect(productsService.putFile).toHaveBeenCalledWith('https://bucket.example/up-2', second);
  });

  it('keeps the picked image and reports a message when writing fails', async () => {
    vi.mocked(productsService.putFile).mockRejectedValue(new Error('upload exploded'));
    const { result } = renderForm();
    const picked = photo();

    await act(async () => {
      result.current.pick(picked);
    });
    await act(async () => {
      await result.current.save();
    });

    expect(result.current.isSaving).toBe(false);
    expect(result.current.file).toBe(picked);
    expect(result.current.error).toBe('upload exploded');
  });

  it('clears the picked image and the preview when discarded', async () => {
    const { result } = renderForm();
    await act(async () => {
      result.current.pick(photo());
    });
    const preview = result.current.previewUrl;

    act(() => result.current.discard());

    expect(result.current.file).toBeNull();
    expect(result.current.previewUrl).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(preview);
  });
});

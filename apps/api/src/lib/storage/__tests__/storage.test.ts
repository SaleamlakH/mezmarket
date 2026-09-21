import { describe, it, expect, vi } from 'vitest';
import { createSupabaseStorage, type SupabaseStorageLike } from '../storage.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';

const BUCKET = 'products';

type FakeStorageMethods = {
  createSignedUploadUrl: ReturnType<typeof vi.fn>;
  createSignedUrl: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
};

function fakeSupabase(): { supabase: SupabaseStorageLike; methods: FakeStorageMethods } {
  const methods: FakeStorageMethods = {
    createSignedUploadUrl: vi.fn(),
    createSignedUrl: vi.fn(),
    info: vi.fn(),
  };

  const supabase = {
    storage: {
      from: (bucket: string) => (bucket === BUCKET ? methods : null),
    },
  } as unknown as SupabaseStorageLike;

  return { supabase, methods };
}

describe('storage', () => {
  describe('createUploadUrl', () => {
    it('returns the signed url from the storage client', async () => {
      const { supabase, methods } = fakeSupabase();
      const storage = createSupabaseStorage(supabase, BUCKET);
      methods.createSignedUploadUrl.mockResolvedValue({
        data: { signedUrl: 'https://file/signed-upload', token: 'token', path: 'uploads/x.jpg' },
        error: null,
      });

      await expect(storage.createUploadUrl('uploads/x.jpg')).resolves.toBe(
        'https://file/signed-upload',
      );
      expect(methods.createSignedUploadUrl).toHaveBeenCalledWith('uploads/x.jpg', {
        upsert: false,
      });
    });

    it('throws an INTERNAL_ERROR when the storage client fails', async () => {
      const { supabase, methods } = fakeSupabase();
      const storage = createSupabaseStorage(supabase, BUCKET);
      methods.createSignedUploadUrl.mockResolvedValue({
        data: null,
        error: new Error('storage boom'),
      });

      await expect(storage.createUploadUrl('uploads/x.jpg')).rejects.toEqual(
        new AppError(ERROR_CODES.INTERNAL_ERROR, 'Failed to create presigned upload url', 500),
      );
    });
  });

  describe('objectExists', () => {
    it('returns true when the object exists', async () => {
      const { supabase, methods } = fakeSupabase();
      const storage = createSupabaseStorage(supabase, BUCKET);
      methods.info.mockResolvedValue({ data: { name: 'x.jpg', id: 'obj-1' }, error: null });

      await expect(storage.objectExists('uploads/x.jpg')).resolves.toBe(true);
      expect(methods.info).toHaveBeenCalledWith('uploads/x.jpg');
    });

    it('returns false when the object does not exist', async () => {
      const { supabase, methods } = fakeSupabase();
      const storage = createSupabaseStorage(supabase, BUCKET);
      methods.info.mockResolvedValue({ data: null, error: new Error('object not found') });

      await expect(storage.objectExists('uploads/x.jpg')).resolves.toBe(false);
    });
  });

  describe('createDownloadUrl', () => {
    it('returns the signed download url with a 15 minute expiry', async () => {
      const { supabase, methods } = fakeSupabase();
      const storage = createSupabaseStorage(supabase, BUCKET);
      methods.createSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://file/signed-download' },
        error: null,
      });

      await expect(storage.createDownloadUrl('uploads/x.jpg')).resolves.toBe(
        'https://file/signed-download',
      );
      expect(methods.createSignedUrl).toHaveBeenCalledWith('uploads/x.jpg', 900);
    });

    it('throws an INTERNAL_ERROR when the storage client fails', async () => {
      const { supabase, methods } = fakeSupabase();
      const storage = createSupabaseStorage(supabase, BUCKET);
      methods.createSignedUrl.mockResolvedValue({
        data: null,
        error: new Error('storage boom'),
      });

      await expect(storage.createDownloadUrl('uploads/x.jpg')).rejects.toEqual(
        new AppError(ERROR_CODES.INTERNAL_ERROR, 'Failed to create presigned download url', 500),
      );
    });
  });
});

import { createClient } from '@supabase/supabase-js';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';

export interface CreateUploadUrlOptions {
  /**
   * Allow the signed write to overwrite an existing object at the same key.
   * Used when replacing a record's file
   */
  upsert?: boolean;
}

export type StorageClient = {
  createUploadUrl(key: string, options?: CreateUploadUrlOptions): Promise<string>;
  objectExists(key: string): Promise<boolean>;
  createDownloadUrl(key: string): Promise<string>;
};

type SignedObjectResponse = Promise<{
  data: { signedUrl: string } | null;
  error: unknown;
}>;

export type SupabaseStorageLike = {
  storage: {
    from(bucket: string): {
      createSignedUploadUrl(path: string, options: { upsert: boolean }): SignedObjectResponse;
      createSignedUrl(path: string, expiresIn: number): SignedObjectResponse;
      info(path: string): Promise<{ data: unknown; error: unknown }>;
    };
  };
};

export function createSupabaseClient(url: string, serviceRoleKey: string): SupabaseStorageLike {
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

export function createSupabaseStorage(
  supabase: SupabaseStorageLike,
  bucket: string,
): StorageClient {
  return {
    async createUploadUrl(key: string, options?: CreateUploadUrlOptions): Promise<string> {
      const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(key, {
        upsert: options?.upsert ?? false,
      });

      if (error || !data?.signedUrl) {
        throw new AppError(
          ERROR_CODES.INTERNAL_ERROR,
          'Failed to create presigned upload url',
          500,
        );
      }

      return data.signedUrl;
    },

    async objectExists(key: string): Promise<boolean> {
      const { data, error } = await supabase.storage.from(bucket).info(key);

      return Boolean(data) && !error;
    },

    async createDownloadUrl(key: string): Promise<string> {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 900);

      if (error || !data?.signedUrl) {
        throw new AppError(
          ERROR_CODES.INTERNAL_ERROR,
          'Failed to create presigned download url',
          500,
        );
      }

      return data.signedUrl;
    },
  };
}

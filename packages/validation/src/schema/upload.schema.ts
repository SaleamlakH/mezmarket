import z from 'zod';
import type { AttachmentRecordType, CreateUploadInput } from '@mez/types';

export const UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

export type UploadMimeType = (typeof UPLOAD_MIME_TYPES)[number];

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

const recordTypeValues = {
  PRODUCT: 'PRODUCT',
} satisfies Record<AttachmentRecordType, AttachmentRecordType>;

const recordTypeSchema = z.enum(
  Object.values(recordTypeValues),
  `Record type must be one of: ${Object.values(recordTypeValues).join(', ')}`,
);

/**
 * Payload a client sends automatically when requesting an upload —
 * `record` is the entity the file belongs to and `mimeType`/`sizeBytes` are
 * extracted from the selected file, not entered by the user.
 * `mimeType` is required (instead of optional) because the API has
 * to derive the storage key extension from it.
 */
export type CreateUploadClientInput = Omit<CreateUploadInput, 'mimeType'> & {
  mimeType: UploadMimeType;
};

export const createUploadSchema = z
  .object({
    record: recordTypeSchema,
    mimeType: z.enum(UPLOAD_MIME_TYPES, 'Unsupported image mime type'),
    sizeBytes: z
      .number()
      .int('Upload size must be a whole number of bytes')
      .positive('Upload size must be greater than 0')
      .max(MAX_UPLOAD_SIZE_BYTES, `Upload size must be at most ${MAX_UPLOAD_SIZE_BYTES} bytes`)
      .optional(),
  })
  .strict();

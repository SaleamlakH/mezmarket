export type UploadStatus = 'PENDING' | 'ACTIVE' | 'FAILED';

/** The kind of record an upload is attached to. */
export type AttachmentRecordType = 'PRODUCT';

/**
 * Forces `T` to mirror every key of `Source`, so a response type cannot silently
 * drop a field the domain type has.
 */
type RequireAllKeys<Source, T extends Record<keyof Source, unknown>> = T;

/** An Upload as stored in the database. */
export interface Upload {
  id: string;
  storageKey: string;
  mimeType: string | null;
  sizeBytes: number | null;
  status: UploadStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** JSON form sent to the client; timestamps become strings. */
export type UploadResponse = RequireAllKeys<
  Upload,
  Omit<Upload, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  }
>;

/** A new upload: the record it is for, and the file's reported type and size. */
export interface CreateUploadInput {
  record: AttachmentRecordType;
  mimeType?: string;
  sizeBytes?: number;
}

/** A created upload plus the signed URL to write its bytes to. */
export interface CreateUploadResult {
  upload: Upload;
  uploadUrl: string;
}

/** JSON form sent to the client. */
export type CreateUploadResponse = RequireAllKeys<
  CreateUploadResult,
  { upload: UploadResponse; uploadUrl: string }
>;

/** Same shape as creation: the record names which upload to resolve. */
export type UpdateUploadInput = CreateUploadInput;

/** The same upload, re-signed. */
export type UpdateUploadResult = CreateUploadResult;

/** JSON form sent to the client. */
export type UpdateUploadResponse = CreateUploadResponse;

/** A signed URL to read one upload. */
export type DownloadUrlResult = {
  url: string;
};

/** JSON form sent to the client. */
export type DownloadUrlResponse = DownloadUrlResult;

/** One signed URL per upload; a failed upload gives `null`. */
export type DownloadUrlsResult = {
  uploadId: string;
  url: string | null;
}[];

/** JSON form sent to the client. */
export type DownloadUrlsResponse = DownloadUrlsResult;

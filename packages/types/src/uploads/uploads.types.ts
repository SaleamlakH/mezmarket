export type UploadStatus = 'PENDING' | 'ACTIVE' | 'FAILED';

export type AttachmentRecordType = 'PRODUCT';

/**
 * Constrains `T` so every key of `Source` must be present, forcing derived
 * response types to mirror the source type's keys.
 */
type RequireAllKeys<Source, T extends Record<keyof Source, unknown>> = T;

/**
 * Domain shape of an Upload as stored in the database.
 */
export interface Upload {
  id: string;
  storageKey: string;
  mimeType: string | null;
  sizeBytes: number | null;
  status: UploadStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JSON-serialized form sent to the frontend.
 */
export type UploadResponse = RequireAllKeys<
  Upload,
  Omit<Upload, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  }
>;

export interface CreateUploadInput {
  record: AttachmentRecordType;
  mimeType?: string;
  sizeBytes?: number;
}

/**
 * Domain shape of a created Upload.
 */
export interface CreateUploadResult {
  upload: Upload;
  uploadUrl: string;
}

/**
 * JSON-serialized form sent to the frontend.
 */
export type CreateUploadResponse = RequireAllKeys<
  CreateUploadResult,
  { upload: UploadResponse; uploadUrl: string }
>;

export type DownloadUrlResult = {
  url: string;
};

/**
 * JSON-serialized form sent to the frontend.
 */
export type DownloadUrlResponse = DownloadUrlResult;

export type DownloadUrlsResult = {
  uploadId: string;
  url: string | null;
}[];

/**
 * JSON-serialized form sent to the frontend.
 */
export type DownloadUrlsResponse = DownloadUrlsResult;

import type {
  UploadStatus,
  CreateUploadInput,
  CreateUploadResult,
  DownloadUrlResult,
  DownloadUrlsResult,
} from '@mez/types';

import type { Upload as UploadRecord } from '../../../generated/prisma/client.js';

export type {
  UploadStatus,
  CreateUploadInput,
  CreateUploadResult,
  DownloadUrlResult,
  DownloadUrlsResult,
  UploadRecord,
};

export type UploadRepository = {
  create(input: {
    id: string;
    storageKey: string;
    mimeType: string | null;
    sizeBytes: number | null;
  }): Promise<UploadRecord>;
  getById(uploadId: string): Promise<UploadRecord | null>;
  getManyByIds(uploadIds: string[]): Promise<UploadRecord[]>;
  setStatus(uploadId: string, status: UploadStatus): Promise<UploadRecord>;
};

export type UploadService = {
  createUpload(input: CreateUploadInput): Promise<CreateUploadResult>;
  getUploadUrl(uploadId: string | undefined): Promise<DownloadUrlResult>;
  getUploadUrls(uploadIds: string[] | undefined): Promise<DownloadUrlsResult>;
};

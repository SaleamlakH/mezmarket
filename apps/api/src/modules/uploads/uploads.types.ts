import type {
  UploadStatus,
  AttachmentRecordType,
  CreateUploadInput,
  CreateUploadResult,
  UpdateUploadInput,
  UpdateUploadResult,
  DownloadUrlResult,
  DownloadUrlsResult,
} from '@mez/types';

import type {
  Attachment as AttachmentRecord,
  Upload as UploadRecord,
} from '../../../generated/prisma/client.js';

export type {
  UploadStatus,
  AttachmentRecordType,
  CreateUploadInput,
  CreateUploadResult,
  UpdateUploadInput,
  UpdateUploadResult,
  DownloadUrlResult,
  DownloadUrlsResult,
  UploadRecord,
  AttachmentRecord,
};

/** The reported metadata a replacement restates, always resetting to `PENDING`. */
export type UpdateReportedInput = {
  mimeType: string | null;
  sizeBytes: number | null;
};

/** One claim of an upload by an owning record. */
export type ClaimUploadInput = {
  uploadId: string;
  recordType: AttachmentRecordType;
  recordId: string;
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
  updateReported(uploadId: string, input: UpdateReportedInput): Promise<UploadRecord>;
  claim(input: ClaimUploadInput): Promise<AttachmentRecord>;
};

export type UploadService = {
  createUpload(input: CreateUploadInput): Promise<CreateUploadResult>;
  updateUpload(
    input: UpdateUploadInput,
    recordId: string,
    existingUploadId: string | undefined,
  ): Promise<UpdateUploadResult>;
  getUploadUrl(uploadId: string | undefined): Promise<DownloadUrlResult>;
  getUploadUrls(uploadIds: string[] | undefined): Promise<DownloadUrlsResult>;
};

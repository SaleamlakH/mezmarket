import type {
  Attachment as AttachmentRecord,
  AttachmentRecordType,
  Upload as UploadRecord,
  UploadStatus,
} from '../../../generated/prisma/client.js';

export type { AttachmentRecord, UploadRecord, UploadStatus };

export type CreateUploadInput = {
  record: AttachmentRecordType;
  mimeType?: string;
  sizeBytes?: number;
};

export type CreateUploadRecord = Omit<UploadRecord, 'storageKey'>;

export type CreateUploadResult = {
  upload: CreateUploadRecord;
  uploadUrl: string;
};

export type DownloadUrlResult = {
  url: string;
};

export type DownloadUrlsResult = {
  uploadId: string;
  url: string | null;
}[];

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

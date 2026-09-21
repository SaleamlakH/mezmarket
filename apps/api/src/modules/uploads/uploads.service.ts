import { generateStorageKey } from '../../lib/storage/storage-keys.js';
import { UploadStatus } from '../../../generated/prisma/client.js';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import type { StorageClient } from '../../lib/storage/storage.js';
import type {
  CreateUploadInput,
  CreateUploadResult,
  DownloadUrlResult,
  DownloadUrlsResult,
  UploadRecord,
  UploadRepository,
  UploadService,
} from './uploads.types.js';
import { ulid } from 'ulid';

function withoutStorageKey(record: UploadRecord): CreateUploadResult['upload'] {
  const { storageKey: _storageKey, ...upload } = record;
  void _storageKey;
  return upload;
}

export function createUploadsService(
  repository: UploadRepository,
  storage: StorageClient,
): UploadService {
  return {
    async createUpload(input: CreateUploadInput): Promise<CreateUploadResult> {
      const id = ulid();
      const storageKey = generateStorageKey(input.record, id, input.mimeType);

      const record = await repository.create({
        id,
        storageKey,
        mimeType: input.mimeType ?? null,
        sizeBytes: input.sizeBytes ?? null,
      });

      const uploadUrl = await storage.createUploadUrl(storageKey);

      return { upload: withoutStorageKey(record), uploadUrl };
    },

    async getUploadUrl(uploadId: string | undefined): Promise<DownloadUrlResult> {
      if (!uploadId) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, 'Missing upload id', 400);
      }

      const upload = await repository.getById(uploadId);
      if (!upload || upload.status === UploadStatus.FAILED) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Upload not found', 404);
      }

      if (upload.status !== UploadStatus.ACTIVE) {
        const exists = await storage.objectExists(upload.storageKey);

        if (!exists) {
          await repository.setStatus(upload.id, UploadStatus.FAILED);
          throw new AppError(ERROR_CODES.NOT_FOUND, 'Upload not found', 404);
        }

        await repository.setStatus(upload.id, UploadStatus.ACTIVE);
      }

      const url = await storage.createDownloadUrl(upload.storageKey);

      return { url };
    },

    async getUploadUrls(uploadIds: string[] | undefined): Promise<DownloadUrlsResult> {
      if (!Array.isArray(uploadIds)) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, 'Missing upload ids', 400);
      }

      if (uploadIds.length === 0) return [];

      const records = await repository.getManyByIds(uploadIds);

      const resolvedUrl = await Promise.all(
        records.map(async (upload) => {
          if (upload.status === UploadStatus.FAILED) return null;

          // check storage existence
          if (upload.status !== UploadStatus.ACTIVE) {
            const exists = await storage.objectExists(upload.storageKey);

            // set status to failed
            if (!exists) {
              await repository.setStatus(upload.id, UploadStatus.FAILED);
              return null;
            }

            await repository.setStatus(upload.id, UploadStatus.ACTIVE);
          }

          const url = await storage.createDownloadUrl(upload.storageKey);
          return { uploadId: upload.id, url };
        }),
      );

      return resolvedUrl.filter(
        (entry): entry is { uploadId: string; url: string } => entry !== null,
      );
    },
  };
}
